ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS logo_invoice text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_invoice_height integer NOT NULL DEFAULT 64;

ALTER TABLE public.crm_settings
  ADD COLUMN IF NOT EXISTS invoice_header_info text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bill_prefix text NOT NULL DEFAULT 'BILL-',
  ADD COLUMN IF NOT EXISTS bill_next_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS bill_footer text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.crm_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.crm_invoices(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  number text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'INR',
  amount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  paid_on date,
  method text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  header_info text NOT NULL DEFAULT '',
  footer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_bills TO authenticated;
GRANT ALL ON public.crm_bills TO service_role;

ALTER TABLE public.crm_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bills" ON public.crm_bills
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER crm_bills_touch BEFORE UPDATE ON public.crm_bills
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();