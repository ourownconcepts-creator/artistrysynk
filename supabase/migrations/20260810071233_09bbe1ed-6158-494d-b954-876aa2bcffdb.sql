REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Users upload own voice notes" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Conversation participants can read voice notes" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'voice-notes' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.media_url = storage.objects.name
        AND public.is_conversation_participant(auth.uid(), m.conversation_id)
    )
  )
);

CREATE POLICY "Users delete own voice notes" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'voice-notes' AND (storage.foldername(name))[1] = auth.uid()::text
);