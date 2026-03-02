CREATE POLICY "Users can mark messages as read in their conversations"
ON public.messages
FOR UPDATE
USING (
  sender_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    JOIN matches m ON c.match_id = m.id
    WHERE c.id = messages.conversation_id
    AND (m.user_id_1 = auth.uid() OR m.user_id_2 = auth.uid())
  )
)
WITH CHECK (
  sender_id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    JOIN matches m ON c.match_id = m.id
    WHERE c.id = messages.conversation_id
    AND (m.user_id_1 = auth.uid() OR m.user_id_2 = auth.uid())
  )
);