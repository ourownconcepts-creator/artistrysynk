DROP POLICY IF EXISTS "Anyone views availability" ON public.availability_slots;
REVOKE SELECT ON public.availability_slots FROM anon;
CREATE POLICY "Members view availability unless blocked" ON public.availability_slots
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR NOT EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.blocker_id = availability_slots.user_id AND b.blocked_id = auth.uid())
       OR (b.blocker_id = auth.uid() AND b.blocked_id = availability_slots.user_id)
  )
);