create policy "admins manage site images" on storage.objects for all to authenticated
using (bucket_id = 'site-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'site-images' and public.has_role(auth.uid(), 'admin'));