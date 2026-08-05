-- Site copy library
CREATE TABLE IF NOT EXISTS public.site_copy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_key text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  group_name text NOT NULL DEFAULT 'General',
  value text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_copy TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_copy TO authenticated;
GRANT ALL ON public.site_copy TO service_role;

ALTER TABLE public.site_copy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON public.site_copy;
CREATE POLICY "public read" ON public.site_copy FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin write" ON public.site_copy;
CREATE POLICY "admin write" ON public.site_copy FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS touch_site_copy ON public.site_copy;
CREATE TRIGGER touch_site_copy BEFORE UPDATE ON public.site_copy
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client reviews
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS occasion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

DROP POLICY IF EXISTS "public read" ON public.testimonials;
CREATE POLICY "public read" ON public.testimonials FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));

-- Logo placement controls
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS logo_header_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_header_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_header_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_mobile_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_mobile_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_mobile_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_footer_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_footer_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_footer_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_loader_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_loader_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_loader_offset_y integer NOT NULL DEFAULT 0;

GRANT SELECT (id,name,tagline,email,phone,location,about_short,about_long,budget_ranges,hour_options,loader_shape,loader_size,loader_pulse_scale,loader_fade,logo_header,logo_footer,logo_mobile,logo_loader,logo_favicon,logo_invert,logo_header_height,logo_header_offset_x,logo_header_offset_y,logo_mobile_height,logo_mobile_offset_x,logo_mobile_offset_y,logo_footer_height,logo_footer_offset_x,logo_footer_offset_y,logo_loader_height,logo_loader_offset_x,logo_loader_offset_y,updated_at)
  ON public.settings TO anon;