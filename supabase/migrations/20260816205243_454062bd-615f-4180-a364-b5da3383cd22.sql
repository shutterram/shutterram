ALTER TABLE public.text_inverts
  ADD COLUMN IF NOT EXISTS shadow_dark boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shadow_light boolean NOT NULL DEFAULT false;

INSERT INTO public.text_inverts (key, label, group_label, hint, sort_order)
VALUES ('nav.links', 'Navigation menu text', 'Navigation', 'Header links and the mobile menu, which sit over the hero photo at the top of a page.', 9)
ON CONFLICT (key) DO NOTHING;