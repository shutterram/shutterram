INSERT INTO public.theme_tokens (token, label, group_label, hint, dark_value, dark_opacity, light_value, light_opacity, sort_order)
VALUES ('cursor-glow', 'Cursor glow', 'Lines & effects', 'The soft light that follows the mouse pointer around the site.', '#ffffff', 10, '#000000', 8, 240)
ON CONFLICT (token) DO NOTHING;