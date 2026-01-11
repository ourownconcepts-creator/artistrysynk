-- Create job_applications table for tracking job applications
CREATE TABLE public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent duplicate applications
ALTER TABLE public.job_applications ADD CONSTRAINT unique_job_application UNIQUE (job_id, applicant_id);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.job_applications
FOR SELECT
USING (auth.uid() = applicant_id);

-- Policy: Job posters can view applications for their jobs
CREATE POLICY "Job posters can view applications for their jobs"
ON public.job_applications
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.job_postings 
  WHERE id = job_applications.job_id 
  AND user_id = auth.uid()
));

-- Policy: Users can submit applications
CREATE POLICY "Users can submit applications"
ON public.job_applications
FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

-- Policy: Job posters can update application status
CREATE POLICY "Job posters can update application status"
ON public.job_applications
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.job_postings 
  WHERE id = job_applications.job_id 
  AND user_id = auth.uid()
));

-- Create project_activity_logs table for tracking project activity
CREATE TABLE public.project_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Project members can view activity
CREATE POLICY "Project members can view activity"
ON public.project_activity_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_activity_logs.project_id
  AND (p.created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
  ))
));

-- Policy: Project members can insert activity
CREATE POLICY "Project members can insert activity"
ON public.project_activity_logs
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_activity_logs.project_id
  AND (p.created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
  ))
));

-- Function to log project activity
CREATE OR REPLACE FUNCTION public.log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log task creation
  IF TG_TABLE_NAME = 'project_tasks' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (NEW.project_id, NEW.created_by, 'task_created', 'Created task: ' || NEW.title, jsonb_build_object('task_id', NEW.id));
  END IF;
  
  -- Log task status updates
  IF TG_TABLE_NAME = 'project_tasks' AND TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (NEW.project_id, COALESCE(NEW.assigned_to, NEW.created_by), 'task_status_changed', 
      'Task "' || NEW.title || '" status changed to ' || NEW.status, 
      jsonb_build_object('task_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  
  -- Log file uploads
  IF TG_TABLE_NAME = 'project_files' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (NEW.project_id, NEW.uploaded_by, 'file_uploaded', 'Uploaded file: ' || NEW.file_name, jsonb_build_object('file_id', NEW.id));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for activity logging
CREATE TRIGGER trigger_log_task_activity
AFTER INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_project_activity();

CREATE TRIGGER trigger_log_file_activity
AFTER INSERT ON public.project_files
FOR EACH ROW EXECUTE FUNCTION public.log_project_activity();

-- Enable realtime for job_applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;

-- Enable realtime for project_activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity_logs;