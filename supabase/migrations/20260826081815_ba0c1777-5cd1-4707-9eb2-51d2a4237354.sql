ALTER TABLE public.crm_gallery_images
  ADD COLUMN IF NOT EXISTS original_path text NOT NULL DEFAULT '';