-- Allow admins to view all conversations
CREATE POLICY "Admins can view all conversations"
ON public.conversations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to delete conversations
CREATE POLICY "Admins can delete conversations"
ON public.conversations
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to delete messages
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to view all projects
CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to update all projects
CREATE POLICY "Admins can update all projects"
ON public.projects
FOR UPDATE
USING (
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow super admins to delete projects
CREATE POLICY "Super admins can delete projects"
ON public.projects
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to view project members
CREATE POLICY "Admins can view all project members"
ON public.project_members
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to view project tasks
CREATE POLICY "Admins can view all project tasks"
ON public.project_tasks
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to view project files
CREATE POLICY "Admins can view all project files"
ON public.project_files
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'master_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);