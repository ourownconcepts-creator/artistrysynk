CREATE POLICY "Proposal sender uploads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'proposal-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Proposal participants read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'proposal-files' AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text));
CREATE POLICY "Proposal sender deletes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'proposal-files' AND (storage.foldername(name))[1] = auth.uid()::text);