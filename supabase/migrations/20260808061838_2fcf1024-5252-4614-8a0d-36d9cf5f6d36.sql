-- 1. Upload lifecycle on project files
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS upload_status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS upload_progress integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.validate_project_file_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.upload_status NOT IN ('queued','uploading','processing','ready','failed') THEN
    RAISE EXCEPTION 'Invalid upload status: %', NEW.upload_status;
  END IF;
  NEW.upload_progress := GREATEST(0, LEAST(100, COALESCE(NEW.upload_progress, 0)));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_project_file_status ON public.project_files;
CREATE TRIGGER trg_validate_project_file_status
BEFORE INSERT OR UPDATE ON public.project_files
FOR EACH ROW EXECUTE FUNCTION public.validate_project_file_status();

CREATE POLICY "Uploaders and creators can update project files"
ON public.project_files FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id))
WITH CHECK (uploaded_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id));

CREATE POLICY "Uploaders and creators can delete project files"
ON public.project_files FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR public.is_project_creator(auth.uid(), project_id));

-- 2. Activity log coverage: joins, role changes, milestones, finished uploads
CREATE OR REPLACE FUNCTION public.log_member_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT COALESCE(NULLIF(full_name, ''), username, 'A creative') INTO v_name
  FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (NEW.project_id, NEW.user_id, 'member_joined',
      v_name || ' joined the project' || COALESCE(' as ' || NEW.role, ''),
      jsonb_build_object('role', NEW.role));
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.role, '') IS DISTINCT FROM COALESCE(NEW.role, '') THEN
    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (NEW.project_id, NEW.user_id, 'role_changed',
      v_name || ' is now ' || COALESCE(NEW.role, 'a member'),
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_member_activity ON public.project_members;
CREATE TRIGGER trg_log_member_activity
AFTER INSERT OR UPDATE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.log_member_activity();

CREATE OR REPLACE FUNCTION public.log_project_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (NEW.id, COALESCE(auth.uid(), NEW.created_by), 'milestone',
      'Project status changed to ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_project_milestone ON public.projects;
CREATE TRIGGER trg_log_project_milestone
AFTER UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.log_project_milestone();

CREATE OR REPLACE FUNCTION public.log_file_ready_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.upload_status IS DISTINCT FROM NEW.upload_status AND NEW.upload_status = 'ready' THEN
    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (NEW.project_id, NEW.uploaded_by, 'file_uploaded',
      'Uploaded file: ' || NEW.file_name, jsonb_build_object('file_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_file_ready_activity ON public.project_files;
CREATE TRIGGER trg_log_file_ready_activity
AFTER UPDATE ON public.project_files
FOR EACH ROW EXECUTE FUNCTION public.log_file_ready_activity();