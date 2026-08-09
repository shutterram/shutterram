DROP POLICY IF EXISTS "public read" ON public.image_settings;
CREATE POLICY "public read non-private" ON public.image_settings
FOR SELECT TO anon, authenticated
USING (is_private = false OR has_role(auth.uid(), 'admin'::app_role));