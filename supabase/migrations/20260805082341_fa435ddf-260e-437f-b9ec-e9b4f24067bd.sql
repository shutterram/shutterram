CREATE TABLE public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  keywords text NOT NULL DEFAULT '',
  og_title text NOT NULL DEFAULT '',
  og_description text NOT NULL DEFAULT '',
  og_image text NOT NULL DEFAULT '',
  canonical text NOT NULL DEFAULT '',
  robots text NOT NULL DEFAULT 'index, follow',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_pages TO authenticated;
GRANT ALL ON public.seo_pages TO service_role;

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.seo_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.seo_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER seo_pages_touch BEFORE UPDATE ON public.seo_pages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.seo_pages (path, label, title, description, keywords, og_title, og_description, canonical, robots, sort_order) VALUES
('/', 'Home', 'Shutter Ram — Wedding, Portrait & Corporate Photography', 'Shutter Ram is a one-person photography studio covering weddings, corporate brands, portraits and headshots. Clicking today, for a memory that lives forever.', 'wedding photographer, portrait photography, corporate photography, headshots, event photographer', 'Shutter Ram — Wedding, Portrait & Corporate Photography', 'Weddings, brands, portraits and headshots, photographed with a documentary eye.', 'https://shutterram.lovable.app/', 'index, follow', 1),
('/gallery', 'Gallery', 'Photography Portfolio & Gallery | Shutter Ram', 'Browse the Shutter Ram portfolio: wedding days, corporate brand work, portraits, headshots and events, filterable by category.', 'photography portfolio, wedding gallery, portrait gallery', 'Photography Portfolio & Gallery | Shutter Ram', 'Selected wedding, brand, portrait and event photography.', 'https://shutterram.lovable.app/gallery', 'index, follow', 2),
('/services', 'Services', 'Photography Services & Rates | Shutter Ram', 'Wedding, corporate, portrait, headshot, event and product photography services with what is included and starting rates.', 'photography services, wedding packages, headshot rates', 'Photography Services & Rates | Shutter Ram', 'Coverage, deliverables and starting rates for every service.', 'https://shutterram.lovable.app/services', 'index, follow', 3),
('/about', 'About', 'About Ram — The Photographer | Shutter Ram', 'Meet Ram, the photographer behind Shutter Ram: years of documentary and editorial work across weddings, brands and portraits.', 'about photographer, documentary photographer', 'About Ram — The Photographer | Shutter Ram', 'The person behind the camera, and how I like to work.', 'https://shutterram.lovable.app/about', 'index, follow', 4),
('/contact', 'Contact', 'Contact & Book Your Date | Shutter Ram', 'Send Shutter Ram a message or request a tailored photography quote for your wedding, brand shoot, portrait session or event.', 'book photographer, photography quote, contact photographer', 'Contact & Book Your Date | Shutter Ram', 'Message me, or request a tailored quote for your date.', 'https://shutterram.lovable.app/contact', 'index, follow', 5),
('/review', 'Client review page', 'Leave a Review | Shutter Ram', 'A private page for Shutter Ram clients to leave a review of their shoot.', '', 'Leave a Review | Shutter Ram', 'Share a few words about your shoot with Shutter Ram.', 'https://shutterram.lovable.app/review', 'noindex, nofollow', 6);