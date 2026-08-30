CREATE POLICY "CRM admins can view preview jobs"
ON public.crm_preview_jobs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can create preview jobs"
ON public.crm_preview_jobs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can update preview jobs"
ON public.crm_preview_jobs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "CRM admins can delete preview jobs"
ON public.crm_preview_jobs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));