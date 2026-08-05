ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS section_key text NOT NULL DEFAULT 'default';
ALTER TABLE public.socials ADD COLUMN IF NOT EXISTS icon_url text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_key text NOT NULL,
  label text NOT NULL,
  eyebrow text NOT NULL DEFAULT '',
  heading text NOT NULL DEFAULT '',
  heading_accent text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page, section_key)
);

GRANT SELECT ON public.page_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_sections TO authenticated;
GRANT ALL ON public.page_sections TO service_role;

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.page_sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.page_sections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_page_sections BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO public.page_sections (page, section_key, label, eyebrow, heading, heading_accent, intro, sort_order) VALUES
  ('home', 'about', 'Home — About me', 'About Me', 'A quiet eye, fifteen years in.', '', '', 0),
  ('home', 'featured', 'Home — Featured work', 'Featured Work', 'A handful of favourites.', '', 'A rotating selection from recent commissions. Click any frame to open it full screen.', 1),
  ('home', 'editing', 'Home — Power of editing', 'The Power of Editing', 'Same frame. Two different photographs.', '', 'Drag the handle across the image to reveal the unedited capture on one side and the finished, hand-graded frame on the other.', 2),
  ('home', 'services', 'Home — Services', 'Services', 'What I can photograph for you.', '', 'Every engagement is quoted individually — these are the starting points.', 3),
  ('home', 'experience', 'Home — The Experience', 'The Experience', 'Easy from first hello', 'to final frame.', '', 4),
  ('home', 'testimonials', 'Home — Testimonials', '', '', '', '', 5),
  ('home', 'connect', 'Home — Connect with me', 'Connect With Me', 'Follow the work in progress.', '', 'New frames, behind-the-scenes and the occasional 4am street photograph.', 6),
  ('about', 'experience', 'About page — The Experience', 'The Experience', 'How you can work', 'with me.', '', 0),
  ('services', 'experience', 'Services page — The Experience', 'The Experience', 'Easy from first hello', 'to final frame.', '', 0)
ON CONFLICT (page, section_key) DO NOTHING;

INSERT INTO public.process_steps (step, title, detail, sort_order, section_key)
SELECT step, title, detail, sort_order, 'about'
FROM public.process_steps WHERE section_key = 'default';