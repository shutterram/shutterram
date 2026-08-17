-- 1. Cursor row: where the site currently sits on the change timeline
CREATE TABLE IF NOT EXISTS public.content_cursor (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  change_id uuid,
  change_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_cursor TO authenticated;
GRANT ALL ON public.content_cursor TO service_role;

ALTER TABLE public.content_cursor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read the timeline cursor" ON public.content_cursor;
CREATE POLICY "Admins can read the timeline cursor"
ON public.content_cursor FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.content_cursor (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- 2. Helpers: primary key aware row apply/delete
CREATE OR REPLACE FUNCTION public.pk_where_clause(_table text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rel regclass := ('public.' || quote_ident(_table))::regclass;
  cond text := '';
  c record;
BEGIN
  FOR c IN
    SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS coltype
    FROM pg_index i
    JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
    WHERE i.indrelid = rel AND i.indisprimary
    ORDER BY 1
  LOOP
    cond := cond || CASE WHEN cond = '' THEN '' ELSE ' AND ' END
      || format('%I = ($1->>%L)::%s', c.attname, c.attname, c.coltype);
  END LOOP;
  IF cond = '' THEN
    RAISE EXCEPTION 'Table % has no primary key', _table;
  END IF;
  RETURN cond;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_row(_table text, _row jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cond text := public.pk_where_clause(_table);
BEGIN
  EXECUTE format('DELETE FROM public.%I WHERE %s', _table, cond) USING _row;
  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1)', _table, _table
  ) USING _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_row(_table text, _row jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cond text := public.pk_where_clause(_table);
BEGIN
  EXECUTE format('DELETE FROM public.%I WHERE %s', _table, cond) USING _row;
END;
$$;

-- 3. Change logging: skip while time travelling, and follow the live edge
CREATE OR REPLACE FUNCTION public.log_content_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_at timestamptz;
  new_id uuid;
  new_at timestamptz;
BEGIN
  IF coalesce(current_setting('app.skip_change_log', true), '') = 'on' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.content_changes (table_name, row_id, op, before, after, changed_by)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD) ->> 'id') ELSE (to_jsonb(NEW) ->> 'id') END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  )
  RETURNING id, created_at INTO new_id, new_at;

  UPDATE public.content_cursor
  SET change_id = new_id, change_at = new_at, updated_at = now()
  WHERE id;

  SELECT max(created_at) INTO last_at FROM public.site_versions;
  IF last_at IS NULL OR last_at < now() - interval '5 minutes' THEN
    INSERT INTO public.site_versions (label, kind, scope, tables, data, created_by)
    VALUES ('Automatic snapshot', 'auto', 'all', public.content_tables(),
            public.content_snapshot(NULL), auth.uid());
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Timeline navigation
CREATE OR REPLACE FUNCTION public.timeline_state()
RETURNS TABLE(change_id uuid, change_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.change_id,
         coalesce(c.change_at, (SELECT max(created_at) FROM public.content_changes))
  FROM public.content_cursor c
  WHERE c.id
$$;

CREATE OR REPLACE FUNCTION public.timeline_goto(_change_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_at timestamptz;
  cur_at timestamptz;
  r record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT created_at INTO target_at FROM public.content_changes WHERE id = _change_id;
  IF target_at IS NULL THEN
    RAISE EXCEPTION 'That change no longer exists.';
  END IF;

  SELECT coalesce(c.change_at, (SELECT max(created_at) FROM public.content_changes))
    INTO cur_at FROM public.content_cursor c WHERE c.id;
  cur_at := coalesce(cur_at, target_at);

  PERFORM set_config('app.skip_change_log', 'on', true);

  IF target_at < cur_at THEN
    FOR r IN
      SELECT * FROM public.content_changes
      WHERE created_at > target_at AND created_at <= cur_at
      ORDER BY created_at DESC, id DESC
    LOOP
      IF NOT (r.table_name = ANY (public.content_tables())) THEN CONTINUE; END IF;
      IF r.op = 'INSERT' THEN
        PERFORM public.delete_row(r.table_name, r.after);
      ELSE
        PERFORM public.apply_row(r.table_name, r.before);
      END IF;
    END LOOP;
  ELSIF target_at > cur_at THEN
    FOR r IN
      SELECT * FROM public.content_changes
      WHERE created_at > cur_at AND created_at <= target_at
      ORDER BY created_at ASC, id ASC
    LOOP
      IF NOT (r.table_name = ANY (public.content_tables())) THEN CONTINUE; END IF;
      IF r.op = 'DELETE' THEN
        PERFORM public.delete_row(r.table_name, r.before);
      ELSE
        PERFORM public.apply_row(r.table_name, r.after);
      END IF;
    END LOOP;
  END IF;

  UPDATE public.content_cursor
  SET change_id = _change_id, change_at = target_at, updated_at = now()
  WHERE id;
END;
$$;

-- 5. Lock down execution
REVOKE ALL ON FUNCTION public.pk_where_clause(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_row(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_row(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.timeline_goto(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.timeline_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.timeline_goto(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.timeline_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pk_where_clause(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_row(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_row(text, jsonb) TO service_role;