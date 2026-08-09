CREATE POLICY "Anyone can upload copyright evidence"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'copyright-evidence');

CREATE POLICY "Staff read copyright evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'copyright-evidence' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'trust_safety_admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'compliance_admin')
  )
);

CREATE POLICY "Staff delete copyright evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'copyright-evidence' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'trust_safety_admin')
    OR public.has_role(auth.uid(), 'compliance_admin')
  )
);