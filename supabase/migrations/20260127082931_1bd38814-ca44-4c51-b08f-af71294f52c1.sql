-- Fix the buggy RLS policy for projects table
-- The issue is that pm.project_id = pm.id should be pm.project_id = projects.id

DROP POLICY IF EXISTS "Projects are viewable by members" ON public.projects;

CREATE POLICY "Projects are viewable by members" 
ON public.projects 
FOR SELECT 
USING (
  (auth.uid() = created_by) 
  OR (EXISTS ( 
    SELECT 1 
    FROM project_members pm 
    WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
  ))
);