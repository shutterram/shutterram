CREATE TABLE public.custom_fonts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family text NOT NULL,
  source text NOT NULL DEFAULT 'google',
  css_url text NOT NULL DEFAULT '',
  weights text[] NOT NULL DEFAULT '{300,400,500,600,700}'::text[],
  styles text[] NOT NULL DEFAULT '{normal}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_fonts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_fonts TO authenticated;
GRANT ALL ON public.custom_fonts TO service_role;

ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.custom_fonts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.custom_fonts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER custom_fonts_touch BEFORE UPDATE ON public.custom_fonts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();