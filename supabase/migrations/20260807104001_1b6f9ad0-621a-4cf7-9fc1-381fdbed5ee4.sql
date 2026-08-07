CREATE OR REPLACE FUNCTION public.share_link_og_image(_token text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.og_image FROM public.share_links s WHERE s.token = _token LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.share_link_og_image(text) TO anon, authenticated;