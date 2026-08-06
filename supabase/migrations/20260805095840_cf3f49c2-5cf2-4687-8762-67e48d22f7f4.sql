REVOKE SELECT ON public.testimonials FROM anon, authenticated;

GRANT SELECT (id, quote, name, role, rating, sort_order, updated_at, status, occasion, images, submitted_at)
  ON public.testimonials TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;