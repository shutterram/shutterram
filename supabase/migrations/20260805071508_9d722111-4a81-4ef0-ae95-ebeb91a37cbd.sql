ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS loader_shape text NOT NULL DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS loader_size integer NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS loader_pulse_scale numeric NOT NULL DEFAULT 1.8,
  ADD COLUMN IF NOT EXISTS loader_fade text NOT NULL DEFAULT 'out';

GRANT SELECT (loader_shape, loader_size, loader_pulse_scale, loader_fade) ON public.settings TO anon;
GRANT SELECT (loader_shape, loader_size, loader_pulse_scale, loader_fade) ON public.settings TO authenticated;