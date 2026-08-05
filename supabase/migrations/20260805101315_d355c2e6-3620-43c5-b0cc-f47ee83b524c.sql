ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS og_image text NOT NULL DEFAULT '/placeholders/og-cover.jpg';
UPDATE public.settings SET og_image = '/placeholders/og-cover.jpg' WHERE og_image IS NULL OR og_image = '';
GRANT SELECT (og_image) ON public.settings TO anon, authenticated;