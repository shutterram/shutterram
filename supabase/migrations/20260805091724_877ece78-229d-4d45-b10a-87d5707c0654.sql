CREATE TABLE public.admin_settings (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  form_endpoint text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage form endpoint"
ON public.admin_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_admin_settings
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.admin_settings (id, form_endpoint)
SELECT true, COALESCE(s.form_endpoint, '') FROM public.settings s LIMIT 1;

INSERT INTO public.admin_settings (id, form_endpoint)
SELECT true, '' WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);

ALTER TABLE public.settings DROP COLUMN form_endpoint;

REVOKE SELECT ON public.settings FROM anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;