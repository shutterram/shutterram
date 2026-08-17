ALTER TABLE public.image_settings
  ADD COLUMN IF NOT EXISTS shadow_dark boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shadow_light boolean NOT NULL DEFAULT false;