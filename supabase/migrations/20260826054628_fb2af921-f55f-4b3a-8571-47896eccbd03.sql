ALTER TABLE public.crm_galleries
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS raw_folder_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_folder_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_folder_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS compression text NOT NULL DEFAULT 'balanced';

ALTER TABLE public.crm_gallery_images
  ADD COLUMN IF NOT EXISTS original_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS drive_raw_file_id text NOT NULL DEFAULT '';

ALTER TABLE public.crm_gallery_picks
  ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS done boolean NOT NULL DEFAULT false;

UPDATE public.crm_gallery_images SET original_name = name WHERE original_name = '';
UPDATE public.crm_galleries SET source = 'drive' WHERE drive_folder_id <> '';