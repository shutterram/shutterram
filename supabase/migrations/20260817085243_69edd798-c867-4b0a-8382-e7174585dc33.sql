REVOKE ALL ON FUNCTION public.timeline_goto(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.timeline_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.timeline_goto(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.timeline_state() TO service_role;