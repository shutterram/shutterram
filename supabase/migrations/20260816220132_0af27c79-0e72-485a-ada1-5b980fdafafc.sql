REVOKE ALL ON FUNCTION public.log_content_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.content_snapshot(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.restore_snapshot(jsonb, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_content_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.content_snapshot(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(jsonb, text[]) TO service_role;