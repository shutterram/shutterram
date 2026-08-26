CREATE POLICY "admins manage google account"
ON public.crm_google_account
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));