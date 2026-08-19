-- ============ CRM CORE ============

CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage contacts" ON public.crm_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'new',
  value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  expected_date date,
  source text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage leads" ON public.crm_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  starts_at timestamptz,
  ends_at timestamptz,
  location text NOT NULL DEFAULT '',
  package text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'tentative',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_bookings TO authenticated;
GRANT ALL ON public.crm_bookings TO service_role;
ALTER TABLE public.crm_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage bookings" ON public.crm_bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.crm_bookings(id) ON DELETE SET NULL,
  number text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  amount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  issued_on date,
  due_on date,
  paid_on date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_invoices TO authenticated;
GRANT ALL ON public.crm_invoices TO service_role;
ALTER TABLE public.crm_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage invoices" ON public.crm_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  due_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal',
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.crm_bookings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage tasks" ON public.crm_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  kind text NOT NULL DEFAULT 'note',
  message text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activity TO authenticated;
GRANT ALL ON public.crm_activity TO service_role;
ALTER TABLE public.crm_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage activity" ON public.crm_activity FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CONTRACTS ============

CREATE TABLE public.crm_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.crm_bookings(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  file_path text NOT NULL DEFAULT '',
  signed_path text NOT NULL DEFAULT '',
  page_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  access_code text NOT NULL DEFAULT '',
  password_hash text NOT NULL DEFAULT '',
  expires_at timestamptz,
  message text NOT NULL DEFAULT '',
  signer_name text NOT NULL DEFAULT '',
  signer_email text NOT NULL DEFAULT '',
  signer_phone text NOT NULL DEFAULT '',
  signed_at timestamptz,
  signed_ip text NOT NULL DEFAULT '',
  signed_user_agent text NOT NULL DEFAULT '',
  drive_file_id text NOT NULL DEFAULT '',
  drive_link text NOT NULL DEFAULT '',
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contracts TO authenticated;
GRANT ALL ON public.crm_contracts TO service_role;
ALTER TABLE public.crm_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage contracts" ON public.crm_contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_contract_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.crm_contracts(id) ON DELETE CASCADE,
  page integer NOT NULL DEFAULT 1,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  w numeric NOT NULL DEFAULT 0.2,
  h numeric NOT NULL DEFAULT 0.04,
  kind text NOT NULL DEFAULT 'text',
  label text NOT NULL DEFAULT '',
  placeholder text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT true,
  value text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_contract_fields_contract_idx ON public.crm_contract_fields(contract_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contract_fields TO authenticated;
GRANT ALL ON public.crm_contract_fields TO service_role;
ALTER TABLE public.crm_contract_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage contract fields" ON public.crm_contract_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CLIENT GALLERIES ============

CREATE TABLE public.crm_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'cull',
  title text NOT NULL DEFAULT '',
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.crm_bookings(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  drive_folder_id text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  access_code text NOT NULL DEFAULT '',
  password_hash text NOT NULL DEFAULT '',
  client_password_hash text NOT NULL DEFAULT '',
  allow_client_password boolean NOT NULL DEFAULT true,
  allow_download boolean NOT NULL DEFAULT false,
  watermark boolean NOT NULL DEFAULT true,
  max_picks integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  message text NOT NULL DEFAULT '',
  expires_at timestamptz,
  submitted_at timestamptz,
  last_opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_galleries TO authenticated;
GRANT ALL ON public.crm_galleries TO service_role;
ALTER TABLE public.crm_galleries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage galleries" ON public.crm_galleries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.crm_galleries(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  preview_path text NOT NULL DEFAULT '',
  thumb_path text NOT NULL DEFAULT '',
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  bytes bigint NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_gallery_images_gallery_idx ON public.crm_gallery_images(gallery_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_gallery_images TO authenticated;
GRANT ALL ON public.crm_gallery_images TO service_role;
ALTER TABLE public.crm_gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage gallery images" ON public.crm_gallery_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_gallery_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.crm_galleries(id) ON DELETE CASCADE,
  image_id uuid NOT NULL REFERENCES public.crm_gallery_images(id) ON DELETE CASCADE,
  picked boolean NOT NULL DEFAULT false,
  rating integer NOT NULL DEFAULT 0,
  label text NOT NULL DEFAULT '',
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, image_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_gallery_picks TO authenticated;
GRANT ALL ON public.crm_gallery_picks TO service_role;
ALTER TABLE public.crm_gallery_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage gallery picks" ON public.crm_gallery_picks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ GOOGLE DRIVE CONNECTION (server-only) ============

CREATE TABLE public.crm_google_account (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  email text NOT NULL DEFAULT '',
  access_token text NOT NULL DEFAULT '',
  refresh_token text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT '',
  expires_at timestamptz,
  connected_by uuid,
  connected_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.crm_google_account TO service_role;
ALTER TABLE public.crm_google_account ENABLE ROW LEVEL SECURITY;

-- ============ CRM SETTINGS ============

CREATE TABLE public.crm_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  drive_contracts_folder_id text NOT NULL DEFAULT '',
  drive_raw_parent_folder_id text NOT NULL DEFAULT '',
  drive_final_parent_folder_id text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  invoice_prefix text NOT NULL DEFAULT 'INV-',
  invoice_next_number integer NOT NULL DEFAULT 1,
  pipeline_stages text[] NOT NULL DEFAULT ARRAY['new','contacted','quoted','booked','delivered','lost'],
  lead_sources text[] NOT NULL DEFAULT ARRAY['Instagram','Referral','Website','Walk-in'],
  watermark_text text NOT NULL DEFAULT '',
  watermark_opacity integer NOT NULL DEFAULT 25,
  watermark_size integer NOT NULL DEFAULT 4,
  preview_max_px integer NOT NULL DEFAULT 2048,
  thumb_max_px integer NOT NULL DEFAULT 640,
  preview_quality integer NOT NULL DEFAULT 78,
  gallery_grid_desktop text NOT NULL DEFAULT 'masonry',
  gallery_grid_tablet text NOT NULL DEFAULT 'grid-2',
  gallery_grid_mobile text NOT NULL DEFAULT 'grid-1',
  gallery_accent text NOT NULL DEFAULT '',
  gallery_welcome text NOT NULL DEFAULT '',
  gallery_show_filenames boolean NOT NULL DEFAULT false,
  cull_allow_rating boolean NOT NULL DEFAULT true,
  cull_allow_labels boolean NOT NULL DEFAULT true,
  cull_allow_comments boolean NOT NULL DEFAULT true,
  contract_footer_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.crm_settings TO authenticated;
GRANT ALL ON public.crm_settings TO service_role;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage crm settings" ON public.crm_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.crm_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ============ updated_at triggers ============

CREATE TRIGGER touch_crm_contacts BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_leads BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_bookings BEFORE UPDATE ON public.crm_bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_invoices BEFORE UPDATE ON public.crm_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_tasks BEFORE UPDATE ON public.crm_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_contracts BEFORE UPDATE ON public.crm_contracts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_contract_fields BEFORE UPDATE ON public.crm_contract_fields FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_galleries BEFORE UPDATE ON public.crm_galleries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_gallery_images BEFORE UPDATE ON public.crm_gallery_images FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_gallery_picks BEFORE UPDATE ON public.crm_gallery_picks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_settings BEFORE UPDATE ON public.crm_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_crm_google_account BEFORE UPDATE ON public.crm_google_account FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();