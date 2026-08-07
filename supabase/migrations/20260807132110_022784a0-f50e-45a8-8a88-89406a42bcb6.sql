REVOKE ALL ON FUNCTION public.resolve_share_link(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.share_link_og_image(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_view_duration(uuid, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_share_link(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.share_link_og_image(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_view_duration(uuid, integer) TO service_role;