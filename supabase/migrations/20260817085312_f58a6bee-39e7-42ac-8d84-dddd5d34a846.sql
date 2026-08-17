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

REVOKE ALL ON FUNCTION public.timeline_goto(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.timeline_goto(uuid) TO service_role;