ALTER TABLE public.crm_galleries
  ADD COLUMN IF NOT EXISTS preview_max_bytes bigint NOT NULL DEFAULT 10485760,
  ADD COLUMN IF NOT EXISTS default_sort text NOT NULL DEFAULT 'default';

ALTER TABLE public.crm_galleries
  DROP CONSTRAINT IF EXISTS crm_galleries_preview_max_bytes_check,
  DROP CONSTRAINT IF EXISTS crm_galleries_default_sort_check;

ALTER TABLE public.crm_galleries
  ADD CONSTRAINT crm_galleries_preview_max_bytes_check
    CHECK (preview_max_bytes BETWEEN 262144 AND 20971520),
  ADD CONSTRAINT crm_galleries_default_sort_check
    CHECK (default_sort IN ('default', 'name', 'name-desc', 'picked'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_galleries TO authenticated;
GRANT ALL ON public.crm_galleries TO service_role;