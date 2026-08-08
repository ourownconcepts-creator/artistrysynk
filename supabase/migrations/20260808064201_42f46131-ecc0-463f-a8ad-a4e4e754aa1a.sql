DROP POLICY IF EXISTS "Admin upload access for email assets" ON storage.objects;
CREATE POLICY "Admin upload access for email assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'email-assets'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);