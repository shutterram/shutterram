ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.record_view_duration(_id uuid, _seconds integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.page_views
  SET duration_seconds = LEAST(GREATEST(_seconds, 0), 7200)
  WHERE id = _id AND duration_seconds = 0;
$$;

GRANT EXECUTE ON FUNCTION public.record_view_duration(uuid, integer) TO anon, authenticated, service_role;