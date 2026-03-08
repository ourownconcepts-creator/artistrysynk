
-- Add admin SELECT policy for matches
CREATE POLICY "Admins can view all matches"
ON public.matches
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'master_admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add admin INSERT policy for activity_logs
CREATE POLICY "Admins can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'master_admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add admin UPDATE policy for user_sessions (for force logout)
CREATE POLICY "Admins can update sessions"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'master_admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add admin SELECT policy for portfolio_items
CREATE POLICY "Admins can view all portfolio items"
ON public.portfolio_items
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'master_admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to delete swipes (for rewind functionality tracking)
CREATE POLICY "Users can delete their own swipes"
ON public.swipes
FOR DELETE
TO authenticated
USING (auth.uid() = swiper_id);
