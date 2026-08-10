-- ============================================================
-- STUDIO V1.5 — PHASE 2: studio business inbox
-- ============================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS customer_id uuid;

ALTER TABLE public.conversations ALTER COLUMN match_id DROP NOT NULL;

-- Exactly one conversation kind (immutable predicate: safe as CHECK)
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_kind_xor;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_kind_xor
  CHECK ((match_id IS NOT NULL) <> (studio_id IS NOT NULL));

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_studio_customer;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_studio_customer
  CHECK ((studio_id IS NULL AND customer_id IS NULL) OR (studio_id IS NOT NULL AND customer_id IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_studio_customer_unique
  ON public.conversations (studio_id, customer_id) WHERE studio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_studio_updated
  ON public.conversations (studio_id, updated_at DESC) WHERE studio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_customer
  ON public.conversations (customer_id) WHERE customer_id IS NOT NULL;

-- Single source of truth for participation (personal + studio)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.matches m ON m.id = c.match_id
    WHERE c.id = _conversation_id
      AND _user_id IS NOT NULL
      AND (
        m.user_id_1 = _user_id
        OR m.user_id_2 = _user_id
        OR c.customer_id = _user_id
        OR (c.studio_id IS NOT NULL
            AND public.has_studio_capability(_user_id, c.studio_id, 'manage_inbox'))
      )
  )
$function$;

-- Conversations: replace the inline match check with the helper
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(auth.uid(), id));

-- Messages: same rule, now studio-aware
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(auth.uid(), conversation_id));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_participant(auth.uid(), conversation_id)
  );

DROP POLICY IF EXISTS "Users can mark messages as read in their conversations" ON public.messages;
CREATE POLICY "Users can mark messages as read in their conversations"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id <> auth.uid() AND public.is_conversation_participant(auth.uid(), conversation_id))
  WITH CHECK (sender_id <> auth.uid() AND public.is_conversation_participant(auth.uid(), conversation_id));

-- Notification fan-out: branch on conversation kind, reuse user_notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conv RECORD;
  other_user_id UUID;
  studio_name TEXT;
BEGIN
  SELECT match_id, studio_id, customer_id INTO conv
  FROM public.conversations WHERE id = NEW.conversation_id;

  IF conv.studio_id IS NOT NULL THEN
    SELECT s.name INTO studio_name FROM public.studios s WHERE s.id = conv.studio_id;

    IF NEW.sender_id = conv.customer_id THEN
      -- Creator wrote in: alert studio inbox holders
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      SELECT sm.user_id, 'message', 'New studio message',
             'Your studio has a new message',
             jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id, 'studio_id', conv.studio_id)
      FROM public.studio_members sm
      WHERE sm.studio_id = conv.studio_id
        AND sm.status = 'active'
        AND sm.user_id <> NEW.sender_id
        AND public.has_studio_capability(sm.user_id, conv.studio_id, 'manage_inbox');
    ELSE
      -- Studio replied: alert the creator
      INSERT INTO public.user_notifications (user_id, type, title, message, data)
      VALUES (conv.customer_id, 'message', 'New Message',
              COALESCE(studio_name, 'A studio') || ' sent you a message',
              jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id, 'studio_id', conv.studio_id));
    END IF;

    RETURN NEW;
  END IF;

  SELECT CASE WHEN m.user_id_1 = NEW.sender_id THEN m.user_id_2 ELSE m.user_id_1 END
    INTO other_user_id
  FROM public.matches m WHERE m.id = conv.match_id;

  IF other_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, data)
    VALUES (other_user_id, 'message', 'New Message', 'You have a new message',
            jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id));
  END IF;

  RETURN NEW;
END;
$function$;

-- Guard: studio thread integrity, server-derived only
CREATE OR REPLACE FUNCTION public.validate_studio_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _owner uuid;
BEGIN
  IF NEW.studio_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.studio_id IS DISTINCT FROM OLD.studio_id
                            OR NEW.customer_id IS DISTINCT FROM OLD.customer_id) THEN
    RAISE EXCEPTION 'studio conversation participants are immutable';
  END IF;

  SELECT owner_id INTO _owner FROM public.studios WHERE id = NEW.studio_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'studio not found';
  END IF;

  IF public.is_studio_member(NEW.customer_id, NEW.studio_id) THEN
    RAISE EXCEPTION 'studio members cannot be the customer side of a studio conversation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_studio_conversation ON public.conversations;
CREATE TRIGGER trg_validate_studio_conversation
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_studio_conversation();

-- ============================================================
-- PHASE 3: project studio participation (attribution only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  role_label text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, studio_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_studios TO authenticated;
GRANT SELECT ON public.project_studios TO anon;
GRANT ALL ON public.project_studios TO service_role;

ALTER TABLE public.project_studios ENABLE ROW LEVEL SECURITY;

-- Public read only for public projects and publicly visible active studios
CREATE POLICY "Public can view studio credits on public projects"
  ON public.project_studios FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.is_public = true)
    AND EXISTS (SELECT 1 FROM public.studios s WHERE s.id = studio_id AND s.is_active = true)
  );

CREATE POLICY "Project members can view studio credits"
  ON public.project_studios FOR SELECT TO authenticated
  USING (public.is_project_member(auth.uid(), project_id) OR public.is_project_creator(auth.uid(), project_id));

CREATE POLICY "Studio team can view their own credits"
  ON public.project_studios FOR SELECT TO authenticated
  USING (public.is_studio_member(auth.uid(), studio_id));

CREATE POLICY "Project creator can attach a studio they represent"
  ON public.project_studios FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND public.is_project_creator(auth.uid(), project_id)
    AND public.has_studio_capability(auth.uid(), studio_id, 'represent_studio')
  );

CREATE POLICY "Project creator can update studio credits"
  ON public.project_studios FOR UPDATE TO authenticated
  USING (public.is_project_creator(auth.uid(), project_id))
  WITH CHECK (public.is_project_creator(auth.uid(), project_id));

CREATE POLICY "Project creator or studio admin can remove studio credits"
  ON public.project_studios FOR DELETE TO authenticated
  USING (
    public.is_project_creator(auth.uid(), project_id)
    OR public.has_studio_capability(auth.uid(), studio_id, 'represent_studio')
  );

CREATE INDEX IF NOT EXISTS idx_project_studios_studio ON public.project_studios (studio_id);
CREATE INDEX IF NOT EXISTS idx_project_studios_project ON public.project_studios (project_id);

CREATE TRIGGER update_project_studios_updated_at
  BEFORE UPDATE ON public.project_studios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit studio attachment/detachment
CREATE OR REPLACE FUNCTION public.audit_project_studio_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_studio_audit(auth.uid(), 'studio.project_attached', NEW.studio_id,
      jsonb_build_object('project_id', NEW.project_id));
    RETURN NEW;
  END IF;

  PERFORM public.log_studio_audit(auth.uid(), 'studio.project_detached', OLD.studio_id,
    jsonb_build_object('project_id', OLD.project_id));
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_audit_project_studio_changes
  AFTER INSERT OR DELETE ON public.project_studios
  FOR EACH ROW EXECUTE FUNCTION public.audit_project_studio_changes();

-- Internal helpers stay internal
REVOKE ALL ON FUNCTION public.set_order_studio_attribution() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_review_studio_attribution() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_studio_conversation() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_project_studio_changes() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM anon, authenticated;