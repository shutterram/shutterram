ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT '';
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS og_image text NOT NULL DEFAULT '';
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS path text NOT NULL DEFAULT '';