ALTER TABLE public.image_settings
  ADD COLUMN IF NOT EXISTS glow_color_dark text NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS glow_color_light text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS glow_strength_dark integer NOT NULL DEFAULT 55,
  ADD COLUMN IF NOT EXISTS glow_strength_light integer NOT NULL DEFAULT 55,
  ADD COLUMN IF NOT EXISTS glow_spread integer NOT NULL DEFAULT 140;