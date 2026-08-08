-- ============ 1. Role change approvals ============
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS can_approve_roles boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.project_role_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  previous_role text,
  requested_role text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_role_changes TO authenticated;
GRANT ALL ON public.project_role_changes TO service_role;
ALTER TABLE public.project_role_changes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_approve_project_roles(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = _project_id AND p.created_by = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = _project_id AND pm.user_id = _user_id AND pm.can_approve_roles = true
    )
  )
$$;

CREATE POLICY "Project people can view role changes"
ON public.project_role_changes FOR SELECT TO authenticated
USING (
  member_id = auth.uid()
  OR requested_by = auth.uid()
  OR public.is_project_member(auth.uid(), project_id)
  OR public.is_project_creator(auth.uid(), project_id)
);

CREATE POLICY "Project people can request role changes"
ON public.project_role_changes FOR INSERT TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND (
    public.is_project_member(auth.uid(), project_id)
    OR public.is_project_creator(auth.uid(), project_id)
  )
);

CREATE POLICY "Approvers can review role changes"
ON public.project_role_changes FOR UPDATE TO authenticated
USING (public.can_approve_project_roles(auth.uid(), project_id) OR requested_by = auth.uid())
WITH CHECK (public.can_approve_project_roles(auth.uid(), project_id) OR requested_by = auth.uid());

CREATE POLICY "Requesters can withdraw role changes"
ON public.project_role_changes FOR DELETE TO authenticated
USING (requested_by = auth.uid() OR public.can_approve_project_roles(auth.uid(), project_id));

CREATE TRIGGER trg_project_role_changes_updated_at
BEFORE UPDATE ON public.project_role_changes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Project creators can update members"
ON public.project_members FOR UPDATE TO authenticated
USING (public.is_project_creator(auth.uid(), project_id))
WITH CHECK (public.is_project_creator(auth.uid(), project_id));

-- notify approvers when a role change is requested
CREATE OR REPLACE FUNCTION public.notify_role_change_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_name text;
BEGIN
  SELECT title INTO v_title FROM public.projects WHERE id = NEW.project_id;
  SELECT COALESCE(NULLIF(full_name, ''), username, 'A creative') INTO v_name
  FROM public.profiles WHERE id = NEW.member_id;

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  SELECT DISTINCT approver_id,
    'project_role_request',
    'Role change needs approval',
    v_name || ' should become "' || NEW.requested_role || '" in ' || COALESCE(v_title, 'a project'),
    jsonb_build_object(
      'project_id', NEW.project_id,
      'role_change_id', NEW.id,
      'push_kind', 'role_requests',
      'url', '/projects/' || NEW.project_id
    )
  FROM (
    SELECT p.created_by AS approver_id FROM public.projects p WHERE p.id = NEW.project_id
    UNION
    SELECT pm.user_id FROM public.project_members pm
    WHERE pm.project_id = NEW.project_id AND pm.can_approve_roles = true
  ) approvers
  WHERE approver_id IS NOT NULL AND approver_id <> NEW.requested_by;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_role_change_request
AFTER INSERT ON public.project_role_changes
FOR EACH ROW EXECUTE FUNCTION public.notify_role_change_request();

-- apply approved role changes + notify the member
CREATE OR REPLACE FUNCTION public.handle_role_change_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  NEW.reviewed_at := now();
  SELECT title INTO v_title FROM public.projects WHERE id = NEW.project_id;

  IF NEW.status = 'approved' THEN
    UPDATE public.project_members
    SET role = NEW.requested_role
    WHERE project_id = NEW.project_id AND user_id = NEW.member_id;

    INSERT INTO public.project_activity_logs (project_id, user_id, action_type, description, metadata)
    VALUES (
      NEW.project_id,
      COALESCE(NEW.reviewed_by, NEW.requested_by),
      'role_changed',
      'Role updated to "' || NEW.requested_role || '"',
      jsonb_build_object('member_id', NEW.member_id, 'role', NEW.requested_role)
    );
  END IF;

  IF NEW.status IN ('approved', 'declined') THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, data)
    VALUES (
      NEW.member_id,
      'project_role_request',
      CASE WHEN NEW.status = 'approved' THEN 'Role change approved' ELSE 'Role change declined' END,
      'Your role "' || NEW.requested_role || '" in ' || COALESCE(v_title, 'a project') || ' was ' || NEW.status || '.',
      jsonb_build_object(
        'project_id', NEW.project_id,
        'role_change_id', NEW.id,
        'push_kind', 'role_requests',
        'url', '/projects/' || NEW.project_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_role_change_decision
BEFORE UPDATE ON public.project_role_changes
FOR EACH ROW EXECUTE FUNCTION public.handle_role_change_decision();

ALTER TABLE public.project_role_changes REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.project_role_changes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============ 2. Push preferences + dispatch ============
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notify_push_invites boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push_invite_responses boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push_room_activity boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push_role_requests boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_inapp_room_activity boolean NOT NULL DEFAULT true;

-- room activity fan-out to other members
CREATE OR REPLACE FUNCTION public.notify_room_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.action_type NOT IN ('file_uploaded', 'milestone', 'role_changed', 'member_joined', 'task_created') THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_title FROM public.projects WHERE id = NEW.project_id;

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  SELECT DISTINCT recipient, 'project_activity',
    COALESCE(v_title, 'Project') || ' update',
    NEW.description,
    jsonb_build_object(
      'project_id', NEW.project_id,
      'activity_id', NEW.id,
      'push_kind', 'room_activity',
      'url', '/projects/' || NEW.project_id
    )
  FROM (
    SELECT p.created_by AS recipient FROM public.projects p WHERE p.id = NEW.project_id
    UNION
    SELECT pm.user_id FROM public.project_members pm WHERE pm.project_id = NEW.project_id
  ) people
  WHERE recipient IS NOT NULL
    AND recipient <> NEW.user_id
    AND EXISTS (
      SELECT 1 FROM public.user_settings s
      WHERE s.user_id = recipient AND s.notify_inapp_room_activity = true
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_room_activity
AFTER INSERT ON public.project_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.notify_room_activity();

-- push dispatch honouring per-event settings
CREATE OR REPLACE FUNCTION public.dispatch_push_for_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_allowed boolean;
BEGIN
  v_kind := COALESCE(NEW.data->>'push_kind', NEW.type);

  SELECT CASE v_kind
    WHEN 'invites' THEN s.notify_push_invites
    WHEN 'invite_responses' THEN s.notify_push_invite_responses
    WHEN 'room_activity' THEN s.notify_push_room_activity
    WHEN 'role_requests' THEN s.notify_push_role_requests
    ELSE false
  END INTO v_allowed
  FROM public.user_settings s
  WHERE s.user_id = NEW.user_id;

  IF COALESCE(v_allowed, false) = false THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://lihctrhzsyjqnlzwwkzo.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'url', COALESCE(NEW.data->>'url', '/notifications'),
        'data', NEW.data
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dispatch_push_for_notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dispatch_push_for_notification
AFTER INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_for_notification();

-- tag existing invite notifications so push routing works
CREATE OR REPLACE FUNCTION public.notify_project_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_name text;
BEGIN
  SELECT title INTO v_title FROM public.projects WHERE id = NEW.project_id;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.inviter_id;

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    NEW.invitee_id,
    'project',
    'Project invitation',
    COALESCE(v_name, 'A creative') || ' invited you to join ' || COALESCE(v_title, 'a project'),
    jsonb_build_object('project_id', NEW.project_id, 'invite_id', NEW.id, 'push_kind', 'invites', 'url', '/projects/' || NEW.project_id)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_project_invite_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_name text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  NEW.responded_at := now();

  SELECT title INTO v_title FROM public.projects WHERE id = NEW.project_id;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.invitee_id;

  IF NEW.status = 'accepted' THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.project_id, NEW.invitee_id, COALESCE(NEW.role, 'member'))
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (
    NEW.inviter_id,
    'project',
    CASE WHEN NEW.status = 'accepted' THEN 'Invite accepted' ELSE 'Invite declined' END,
    COALESCE(v_name, 'A creative') || ' ' || NEW.status || ' your invite to ' || COALESCE(v_title, 'a project'),
    jsonb_build_object('project_id', NEW.project_id, 'invite_id', NEW.id, 'push_kind', 'invite_responses', 'url', '/projects/' || NEW.project_id)
  );

  RETURN NEW;
END;
$$;

-- ============ 3. Moderation for project uploads ============
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Project members can view files" ON public.project_files;
CREATE POLICY "Project members can view files"
ON public.project_files FOR SELECT
USING (
  COALESCE(is_hidden, false) = false
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_files.project_id
      AND (
        p.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.check_and_hide_flagged_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flag_count INTEGER;
  threshold INTEGER := 3;
BEGIN
  SELECT COUNT(*) INTO flag_count
  FROM public.content_flags
  WHERE content_type = NEW.content_type
    AND content_id = NEW.content_id
    AND status = 'pending';

  IF flag_count >= threshold THEN
    CASE NEW.content_type
      WHEN 'message' THEN
        UPDATE public.messages SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'portfolio' THEN
        UPDATE public.portfolio_items SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'profile' THEN
        UPDATE public.profiles SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'service' THEN
        UPDATE public.services SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'project' THEN
        UPDATE public.projects SET is_hidden = true WHERE id::text = NEW.content_id;
      WHEN 'project_file' THEN
        UPDATE public.project_files SET is_hidden = true WHERE id::text = NEW.content_id;
      ELSE
        NULL;
    END CASE;

    UPDATE public.content_flags
    SET admin_notes = COALESCE(admin_notes, '') || ' [Auto-hidden due to multiple reports]'
    WHERE content_type = NEW.content_type
      AND content_id = NEW.content_id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.unhide_content_on_flag_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'dismissed' AND OLD.status = 'pending' THEN
    CASE NEW.content_type
      WHEN 'message' THEN
        UPDATE public.messages SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'portfolio' THEN
        UPDATE public.portfolio_items SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'profile' THEN
        UPDATE public.profiles SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'service' THEN
        UPDATE public.services SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'project' THEN
        UPDATE public.projects SET is_hidden = false WHERE id::text = NEW.content_id;
      WHEN 'project_file' THEN
        UPDATE public.project_files SET is_hidden = false WHERE id::text = NEW.content_id;
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;