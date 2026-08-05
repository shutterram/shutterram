ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS glow_size integer NOT NULL DEFAULT 544,
  ADD COLUMN IF NOT EXISTS glow_blend text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS glow_softness integer NOT NULL DEFAULT 68;