ALTER TABLE public.crm_galleries
  ADD COLUMN IF NOT EXISTS cover_mode text NOT NULL DEFAULT 'first',
  ADD COLUMN IF NOT EXISTS cover_image_id uuid REFERENCES public.crm_gallery_images(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_message boolean NOT NULL DEFAULT true;