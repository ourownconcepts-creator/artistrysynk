DROP POLICY IF EXISTS "Request trust" ON public.trusted_relationships;

CREATE POLICY "Request trust" ON public.trusted_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = related_user_id
      AND auth.uid() <> user_id
      AND status = 'pending'
      AND source <> 'trusted_introduction'
      AND introduced_by IS NULL
    )
    OR (
      auth.uid() = introduced_by
      AND source = 'trusted_introduction'
      AND status = 'pending'
      AND auth.uid() <> user_id
      AND auth.uid() <> related_user_id
    )
  );