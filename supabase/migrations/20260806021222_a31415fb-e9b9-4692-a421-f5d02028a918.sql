ALTER TABLE public.theme_tokens
  ADD COLUMN IF NOT EXISTS default_dark_value text,
  ADD COLUMN IF NOT EXISTS default_dark_opacity integer,
  ADD COLUMN IF NOT EXISTS default_light_value text,
  ADD COLUMN IF NOT EXISTS default_light_opacity integer;

UPDATE public.theme_tokens
SET default_dark_value = COALESCE(default_dark_value, dark_value),
    default_dark_opacity = COALESCE(default_dark_opacity, dark_opacity),
    default_light_value = COALESCE(default_light_value, light_value),
    default_light_opacity = COALESCE(default_light_opacity, light_opacity);

INSERT INTO public.theme_tokens (token, label, group_label, hint, dark_value, dark_opacity, light_value, light_opacity, sort_order, default_dark_value, default_dark_opacity, default_light_value, default_light_opacity)
SELECT 'nav-surface', 'Mobile menu background', 'Surfaces', 'Background of the full-screen mobile navigation panel.', '#0a0a0a', 100, '#fafafa', 100, 55, '#0a0a0a', 100, '#fafafa', 100
WHERE NOT EXISTS (SELECT 1 FROM public.theme_tokens WHERE token = 'nav-surface');