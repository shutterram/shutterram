-- 1. Private flag on any uploaded image (keyed by storage path, like indexable)
ALTER TABLE public.image_settings
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 2. About photo + per-device default grid views
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS about_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS grid_home_desktop text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_home_tablet text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_home_mobile text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_gallery_desktop text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_gallery_tablet text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_gallery_mobile text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_category_desktop text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_category_tablet text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_category_mobile text NOT NULL DEFAULT '2';

-- 3. Per-text "invert colours" switches for text sitting on photos
CREATE TABLE IF NOT EXISTS public.text_inverts (
  key text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  group_label text NOT NULL DEFAULT 'General',
  hint text NOT NULL DEFAULT '',
  inverted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.text_inverts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.text_inverts TO authenticated;
GRANT ALL ON public.text_inverts TO service_role;
ALTER TABLE public.text_inverts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "text_inverts readable by everyone" ON public.text_inverts
  FOR SELECT USING (true);
CREATE POLICY "text_inverts writable by admins" ON public.text_inverts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_text_inverts BEFORE UPDATE ON public.text_inverts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.text_inverts (key, label, group_label, hint, sort_order) VALUES
  ('hero.title',      'Hero — category title',      'Home hero',      'Large title over the hero photo', 0),
  ('hero.eyebrow',    'Hero — small label',         'Home hero',      'The "01 — Wedding" line', 1),
  ('hero.tagline',    'Hero — tagline paragraph',   'Home hero',      'Sentence under the hero title', 2),
  ('hero.brand',      'Hero — ShutterRam wordmark', 'Home hero',      'The big studio name over the photo', 3),
  ('hero.buttons',    'Hero — buttons',             'Home hero',      'View more / Book your date', 4),
  ('category.cover',  'Category page — cover text', 'Category pages', 'Title and tagline over the cover photo', 5),
  ('gallery.caption', 'Gallery — hover caption',    'Galleries',      'Caption shown when hovering a photo', 6),
  ('service.card',    'Services — card text',       'Services',       'Title and subtitle over a service photo', 7),
  ('beforeafter.labels', 'Before / After labels',   'Editing samples','The BEFORE and AFTER tags on the slider', 8)
ON CONFLICT (key) DO NOTHING;

-- 4. Shareable category / gallery links
CREATE TABLE IF NOT EXISTS public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'category',
  category_slug text NOT NULL DEFAULT '',
  include_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share_links managed by admins" ON public.share_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_share_links BEFORE UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Token lookup for visitors: returns a single row only for an exact token match,
-- so the link list itself is never readable by the public.
CREATE OR REPLACE FUNCTION public.resolve_share_link(_token text)
RETURNS TABLE (scope text, category_slug text, include_private boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.scope, s.category_slug, s.include_private
  FROM public.share_links s
  WHERE s.token = _token
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.resolve_share_link(text) TO anon, authenticated;