ALTER TABLE public.crm_settings
  ADD COLUMN IF NOT EXISTS invoice_from text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_terms text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_footer text NOT NULL DEFAULT '';