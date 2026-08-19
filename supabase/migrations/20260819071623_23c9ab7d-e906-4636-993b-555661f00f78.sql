ALTER TABLE public.crm_contract_fields
  ADD COLUMN IF NOT EXISTS font_size integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bold boolean NOT NULL DEFAULT false;

ALTER TABLE public.crm_settings
  ADD COLUMN IF NOT EXISTS contract_field_font_size integer NOT NULL DEFAULT 11,
  ADD COLUMN IF NOT EXISTS contract_date_font_size integer NOT NULL DEFAULT 11;