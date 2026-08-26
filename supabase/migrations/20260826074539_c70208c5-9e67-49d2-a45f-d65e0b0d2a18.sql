ALTER TABLE public.crm_galleries
  ADD COLUMN IF NOT EXISTS grid_desktop text NOT NULL DEFAULT '4',
  ADD COLUMN IF NOT EXISTS grid_tablet text NOT NULL DEFAULT '3',
  ADD COLUMN IF NOT EXISTS grid_mobile text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS og_image_id uuid REFERENCES public.crm_gallery_images(id) ON DELETE SET NULL;

UPDATE public.crm_galleries
SET
  grid_desktop = CASE WHEN grid_desktop ~ '^[1-8]$' THEN grid_desktop ELSE '4' END,
  grid_tablet = CASE WHEN grid_tablet ~ '^[1-8]$' THEN grid_tablet ELSE '3' END,
  grid_mobile = CASE WHEN grid_mobile ~ '^[1-8]$' THEN grid_mobile ELSE '2' END;

ALTER TABLE public.crm_galleries
  DROP CONSTRAINT IF EXISTS crm_galleries_grid_desktop_check,
  DROP CONSTRAINT IF EXISTS crm_galleries_grid_tablet_check,
  DROP CONSTRAINT IF EXISTS crm_galleries_grid_mobile_check;

ALTER TABLE public.crm_galleries
  ADD CONSTRAINT crm_galleries_grid_desktop_check CHECK (grid_desktop ~ '^[1-8]$'),
  ADD CONSTRAINT crm_galleries_grid_tablet_check CHECK (grid_tablet ~ '^[1-8]$'),
  ADD CONSTRAINT crm_galleries_grid_mobile_check CHECK (grid_mobile ~ '^[1-8]$');