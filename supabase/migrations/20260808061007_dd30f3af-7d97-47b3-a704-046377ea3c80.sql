-- Project invites
CREATE TABLE public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  role text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (project_id, invitee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_invites TO authenticated;
GRANT ALL ON public.project_invites TO service_role;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites visible to participants"
ON public.project_invites FOR SELECT TO authenticated
USING (
  inviter_id = auth.uid()
  OR invitee_id = auth.uid()
  OR public.is_project_member(auth.uid(), project_id)
  OR public.is_project_creator(auth.uid(), project_id)
);

CREATE POLICY "Members can send invites"
ON public.project_invites FOR INSERT TO authenticated
WITH CHECK (
  inviter_id = auth.uid()
  AND invitee_id <> auth.uid()
  AND (
    public.is_project_member(auth.uid(), project_id)
    OR public.is_project_creator(auth.uid(), project_id)
  )
);

CREATE POLICY "Invitee or inviter can update invite"
ON public.project_invites FOR UPDATE TO authenticated
USING (invitee_id = auth.uid() OR inviter_id = auth.uid())
WITH CHECK (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Inviter can cancel invite"
ON public.project_invites FOR DELETE TO authenticated
USING (inviter_id = auth.uid());

CREATE INDEX idx_project_invites_invitee ON public.project_invites(invitee_id, status);
CREATE INDEX idx_project_invites_project ON public.project_invites(project_id, status);

-- Auto-join + notify on invite response
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
    jsonb_build_object('project_id', NEW.project_id, 'invite_id', NEW.id, 'url', '/projects/' || NEW.project_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_invite_response
BEFORE UPDATE ON public.project_invites
FOR EACH ROW EXECUTE FUNCTION public.handle_project_invite_response();

-- Notify invitee on new invite
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
    jsonb_build_object('project_id', NEW.project_id, 'invite_id', NEW.id, 'url', '/projects/' || NEW.project_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_project_invite
AFTER INSERT ON public.project_invites
FOR EACH ROW EXECUTE FUNCTION public.notify_project_invite();

-- Saved filter presets
CREATE TABLE public.saved_filter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL DEFAULT 'collab_feed',
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_filter_presets TO authenticated;
GRANT ALL ON public.saved_filter_presets TO service_role;
ALTER TABLE public.saved_filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own presets"
ON public.saved_filter_presets FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_saved_filter_presets_updated_at
BEFORE UPDATE ON public.saved_filter_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for collaboration rooms
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.project_files REPLICA IDENTITY FULL;
ALTER TABLE public.project_members REPLICA IDENTITY FULL;
ALTER TABLE public.external_file_links REPLICA IDENTITY FULL;
ALTER TABLE public.project_invites REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.external_file_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_invites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;