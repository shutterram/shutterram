-- Snapshot / history storage -------------------------------------------------
CREATE TABLE public.site_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Snapshot',
  kind text NOT NULL DEFAULT 'auto',
  scope text NOT NULL DEFAULT 'all',
  tables text[] NOT NULL DEFAULT '{}',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.site_versions TO authenticated;
GRANT ALL ON public.site_versions TO service_role;
ALTER TABLE public.site_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage versions" ON public.site_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX site_versions_created_at_idx ON public.site_versions (created_at DESC);

CREATE TABLE public.content_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_id text,
  op text NOT NULL,
  before jsonb,
  after jsonb,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.content_changes TO authenticated;
GRANT ALL ON public.content_changes TO service_role;
ALTER TABLE public.content_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read change log" ON public.content_changes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins clear change log" ON public.content_changes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX content_changes_created_at_idx ON public.content_changes (created_at DESC);

-- Which tables belong to the editable content set, child-first ---------------
CREATE OR REPLACE FUNCTION public.content_tables()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'photos','services','edit_samples','process_steps','stats','experience',
    'testimonials','page_sections','site_copy','theme_tokens','type_tokens',
    'custom_fonts','text_inverts','image_settings','seo_pages','socials',
    'categories','settings','admin_settings'
  ]::text[]
$$;

-- Build a snapshot of some or all content tables ------------------------------
CREATE OR REPLACE FUNCTION public.content_snapshot(_tables text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  wanted text[] := COALESCE(_tables, public.content_tables());
  out jsonb := '{}'::jsonb;
  rows jsonb;
BEGIN
  FOREACH t IN ARRAY wanted LOOP
    IF NOT (t = ANY (public.content_tables())) THEN
      CONTINUE;
    END IF;
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM public.%I x', t)
      INTO rows;
    out := out || jsonb_build_object(t, rows);
  END LOOP;
  RETURN out;
END;
$$;
REVOKE ALL ON FUNCTION public.content_snapshot(text[]) FROM PUBLIC, anon, authenticated;

-- Restore a snapshot (admin only) --------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_snapshot(_data jsonb, _tables text[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ordered text[] := public.content_tables();
  wanted text[] := COALESCE(_tables, ARRAY(SELECT jsonb_object_keys(_data)));
  t text;
  i int;
  rows jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can restore content';
  END IF;

  -- delete child-first
  FOR i IN 1 .. array_length(ordered, 1) LOOP
    t := ordered[i];
    IF t = ANY (wanted) AND _data ? t THEN
      EXECUTE format('DELETE FROM public.%I', t);
    END IF;
  END LOOP;

  -- insert parent-first
  FOR i IN REVERSE array_length(ordered, 1) .. 1 LOOP
    t := ordered[i];
    IF t = ANY (wanted) AND _data ? t THEN
      rows := _data -> t;
      IF jsonb_typeof(rows) = 'array' AND jsonb_array_length(rows) > 0 THEN
        EXECUTE format(
          'INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1)', t, t
        ) USING rows;
      END IF;
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_snapshot(jsonb, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(jsonb, text[]) TO authenticated;

-- Change log + automatic snapshots -------------------------------------------
CREATE OR REPLACE FUNCTION public.log_content_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_at timestamptz;
BEGIN
  INSERT INTO public.content_changes (table_name, row_id, op, before, after, changed_by)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD) ->> 'id') ELSE (to_jsonb(NEW) ->> 'id') END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );

  SELECT max(created_at) INTO last_at FROM public.site_versions;
  IF last_at IS NULL OR last_at < now() - interval '5 minutes' THEN
    INSERT INTO public.site_versions (label, kind, scope, tables, data, created_by)
    VALUES ('Automatic snapshot', 'auto', 'all', public.content_tables(),
            public.content_snapshot(NULL), auth.uid());
  END IF;

  RETURN NULL;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY public.content_tables() LOOP
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.log_content_change()',
      'log_change_' || t, t
    );
  END LOOP;
END $$;