ALTER TABLE public.crm_invoices
  ADD COLUMN IF NOT EXISTS header_info text NOT NULL DEFAULT '';