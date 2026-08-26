CREATE TABLE public.crm_preview_jobs (
  gallery_id uuid PRIMARY KEY REFERENCES public.crm_galleries(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  total integer NOT NULL DEFAULT 0,
  done integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.crm_preview_jobs TO service_role;
ALTER TABLE public.crm_preview_jobs ENABLE ROW LEVEL SECURITY;