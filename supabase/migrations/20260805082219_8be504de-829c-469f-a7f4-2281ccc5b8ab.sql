DROP POLICY IF EXISTS "public read" ON public.testimonials;

CREATE POLICY "anon read approved" ON public.testimonials
FOR SELECT TO anon
USING (status = 'approved');

CREATE POLICY "auth read approved or admin" ON public.testimonials
FOR SELECT TO authenticated
USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'::app_role));