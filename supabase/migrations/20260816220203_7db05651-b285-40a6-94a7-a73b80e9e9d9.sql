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
  FOR i IN 1 .. array_length(ordered, 1) LOOP
    t := ordered[i];
    IF t = ANY (wanted) AND _data ? t THEN
      EXECUTE format('DELETE FROM public.%I', t);
    END IF;
  END LOOP;

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
REVOKE ALL ON FUNCTION public.restore_snapshot(jsonb, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(jsonb, text[]) TO service_role;