-- Create trigger function for project application notifications
CREATE OR REPLACE FUNCTION public.notify_project_application()
RETURNS TRIGGER AS $$
DECLARE
  project_title TEXT;
  project_owner_id UUID;
  applicant_name TEXT;
BEGIN
  -- Get project details
  SELECT p.title, p.created_by INTO project_title, project_owner_id
  FROM public.projects p WHERE p.id = NEW.project_id;

  -- Get applicant name
  SELECT pr.full_name INTO applicant_name
  FROM public.profiles pr WHERE pr.id = NEW.applicant_id;

  -- Notify project owner about new application
  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    project_owner_id,
    'project_application',
    'New Project Application',
    applicant_name || ' applied to join "' || project_title || '"',
    jsonb_build_object('project_id', NEW.project_id, 'application_id', NEW.id, 'applicant_id', NEW.applicant_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new applications
DROP TRIGGER IF EXISTS trigger_notify_project_application ON public.project_applications;
CREATE TRIGGER trigger_notify_project_application
  AFTER INSERT ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_application();

-- Create trigger function for application status changes
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  project_title TEXT;
BEGIN
  -- Only trigger on status changes (not initial insert)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get project title
  SELECT p.title INTO project_title
  FROM public.projects p WHERE p.id = NEW.project_id;

  -- Notify applicant about status change
  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    NEW.applicant_id,
    'application_status',
    CASE 
      WHEN NEW.status = 'accepted' THEN 'Application Accepted! 🎉'
      WHEN NEW.status = 'rejected' THEN 'Application Update'
      ELSE 'Application Status Changed'
    END,
    CASE 
      WHEN NEW.status = 'accepted' THEN 'Your application to "' || project_title || '" has been accepted!'
      WHEN NEW.status = 'rejected' THEN 'Your application to "' || project_title || '" was not selected.'
      ELSE 'Your application status for "' || project_title || '" changed to ' || NEW.status
    END,
    jsonb_build_object('project_id', NEW.project_id, 'application_id', NEW.id, 'status', NEW.status)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for application status updates
DROP TRIGGER IF EXISTS trigger_notify_application_status ON public.project_applications;
CREATE TRIGGER trigger_notify_application_status
  AFTER UPDATE ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();