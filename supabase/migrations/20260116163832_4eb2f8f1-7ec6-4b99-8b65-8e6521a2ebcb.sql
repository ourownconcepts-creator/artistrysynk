-- Fix the syntax - CREATE POLICY doesn't support IF NOT EXISTS
-- First drop if exists, then create
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications"
ON public.user_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);