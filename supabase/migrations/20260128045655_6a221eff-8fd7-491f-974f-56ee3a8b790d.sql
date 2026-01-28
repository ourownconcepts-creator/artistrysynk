-- Fix infinite recursion by creating security definer functions

-- Function to check if user is a project member
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE user_id = _user_id
      AND project_id = _project_id
  )
$$;

-- Function to check if user is project creator
CREATE OR REPLACE FUNCTION public.is_project_creator(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = _project_id
      AND created_by = _user_id
  )
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Projects are viewable by members" ON public.projects;
DROP POLICY IF EXISTS "Project members are viewable by project members" ON public.project_members;

-- Recreate projects policy without recursion
CREATE POLICY "Projects are viewable by members"
ON public.projects
FOR SELECT
USING (
  auth.uid() = created_by 
  OR public.is_project_member(auth.uid(), id)
);

-- Recreate project_members policy without recursion  
CREATE POLICY "Project members are viewable by project members"
ON public.project_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_project_creator(auth.uid(), project_id)
);