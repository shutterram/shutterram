ALTER TABLE public.crm_galleries
  ADD COLUMN IF NOT EXISTS downscale_previews boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS preview_max_px integer NOT NULL DEFAULT 1600;

ALTER TABLE public.crm_galleries
  DROP CONSTRAINT IF EXISTS crm_galleries_preview_max_px_check;

ALTER TABLE public.crm_galleries
  ADD CONSTRAINT crm_galleries_preview_max_px_check
  CHECK (preview_max_px BETWEEN 640 AND 3200);