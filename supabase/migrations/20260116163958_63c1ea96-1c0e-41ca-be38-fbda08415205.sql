-- Fix remaining system INSERT policies by removing WITH CHECK (true) and using proper checks

-- 1. Fix activity_logs - only admins should be able to insert (already fixed via admin insert)
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

-- 2. Fix admin_notifications - only admins can create
DROP POLICY IF EXISTS "System can create notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Authenticated can create admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can create admin notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master_admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 3. Fix conversations - only match participants can create (triggered by match)
DROP POLICY IF EXISTS "System can create conversations" ON public.conversations;

-- 4. Fix matches - handled by check_mutual_like trigger, no direct insert needed
DROP POLICY IF EXISTS "System can create matches" ON public.matches;

-- 5. Fix revenue_transactions - only admins
DROP POLICY IF EXISTS "System can create revenue records" ON public.revenue_transactions;

-- 6. Fix user_notifications - users can only receive notifications for themselves
DROP POLICY IF EXISTS "System can create notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Authenticated users receive notifications" ON public.user_notifications;
CREATE POLICY "Users receive own notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);