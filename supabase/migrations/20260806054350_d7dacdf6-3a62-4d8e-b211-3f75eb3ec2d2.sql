CREATE TABLE public.image_settings (
  path text PRIMARY KEY,
  indexable boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.image_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_settings TO authenticated;
GRANT ALL ON public.image_settings TO service_role;
ALTER TABLE public.image_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.image_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.image_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER touch_image_settings BEFORE UPDATE ON public.image_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();