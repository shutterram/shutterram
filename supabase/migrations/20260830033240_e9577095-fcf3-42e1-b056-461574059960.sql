ALTER TABLE public.crm_invoices
  ADD COLUMN IF NOT EXISTS public_token text;

UPDATE public.crm_invoices
SET public_token = encode(gen_random_bytes(16), 'hex')
WHERE public_token IS NULL OR public_token = '';

ALTER TABLE public.crm_invoices
  ALTER COLUMN public_token SET DEFAULT encode(gen_random_bytes(16), 'hex'),
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS crm_invoices_public_token_key
  ON public.crm_invoices (public_token);

ALTER TABLE public.crm_bills
  ADD COLUMN IF NOT EXISTS public_token text;

UPDATE public.crm_bills
SET public_token = encode(gen_random_bytes(16), 'hex')
WHERE public_token IS NULL OR public_token = '';

ALTER TABLE public.crm_bills
  ALTER COLUMN public_token SET DEFAULT encode(gen_random_bytes(16), 'hex'),
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS crm_bills_public_token_key
  ON public.crm_bills (public_token);