ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS code text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS share_links_code_key ON public.share_links (code) WHERE code <> '';

CREATE TABLE IF NOT EXISTS public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  target_url text NOT NULL DEFAULT '',
  og_image text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "short_links managed by admins" ON public.short_links
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_short_links BEFORE UPDATE ON public.short_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();