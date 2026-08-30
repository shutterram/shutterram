ALTER TABLE public.crm_settings ALTER COLUMN currency SET DEFAULT 'USD';
UPDATE public.crm_settings SET currency = 'USD' WHERE currency IS NULL OR currency = '' OR currency = 'INR';
ALTER TABLE public.crm_invoices ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE public.crm_bills ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE public.crm_leads ALTER COLUMN currency SET DEFAULT 'USD';