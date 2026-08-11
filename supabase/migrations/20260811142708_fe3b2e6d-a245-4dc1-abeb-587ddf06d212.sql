-- 1. Intro-based conversations -------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS intro_id uuid REFERENCES public.trusted_relationships(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_intro_id_key ON public.conversations(intro_id) WHERE intro_id IS NOT NULL;

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
    LEFT JOIN public.trusted_relationships t ON t.id = c.intro_id
    WHERE c.id = _conversation_id
      AND _user_id IS NOT NULL
      AND (
        m.user_id_1 = _user_id
        OR m.user_id_2 = _user_id
        OR c.customer_id = _user_id
        OR (t.status = 'accepted' AND (t.user_id = _user_id OR t.related_user_id = _user_id))
        OR (c.studio_id IS NOT NULL
            AND public.has_studio_capability(_user_id, c.studio_id, 'manage_inbox'))
      )
  )
$function$;

-- Fix the two functions that wrote to non-existent user_notifications columns.
CREATE OR REPLACE FUNCTION public.create_trusted_introduction(_subject uuid, _recipient uuid, _message text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _subject IS NULL OR _recipient IS NULL OR _subject = _recipient THEN
    RAISE EXCEPTION 'Pick two different people';
  END IF;
  IF _uid IN (_subject, _recipient) THEN
    RAISE EXCEPTION 'Introductions are made on behalf of two other people';
  END IF;
  IF NOT public.is_trusted_by(_subject, _uid) THEN
    RAISE EXCEPTION 'Only someone in their trusted circle can introduce them';
  END IF;
  IF NOT public.audience_allows(
       coalesce((SELECT who_can_introduce FROM public.user_settings WHERE user_id = _subject), 'trusted'),
       _subject, _uid) THEN
    RAISE EXCEPTION 'They do not allow introductions from you';
  END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_users b
             WHERE (b.blocker_id = _subject AND b.blocked_id = _recipient)
                OR (b.blocker_id = _recipient AND b.blocked_id = _subject)) THEN
    RAISE EXCEPTION 'Introduction not available';
  END IF;

  INSERT INTO public.trusted_relationships(user_id, related_user_id, kind, status, source, introduced_by, message)
  VALUES (_subject, _recipient, 'introduction', 'pending', 'trusted_introduction', _uid, _message)
  ON CONFLICT (user_id, related_user_id) DO UPDATE
    SET status = CASE WHEN public.trusted_relationships.status = 'accepted' THEN 'accepted' ELSE 'pending' END,
        introduced_by = _uid,
        source = 'trusted_introduction',
        message = coalesce(_message, public.trusted_relationships.message),
        updated_at = now()
  RETURNING id INTO _id;

  INSERT INTO public.user_notifications(user_id, type, title, message, data)
  VALUES (_subject, 'trusted_introduction', 'You have an introduction to review',
          'Someone in your trusted circle wants to introduce you to another member.',
          jsonb_build_object('link', '/settings', 'intro_id', _id, 'introduced_by', _uid));

  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_trust_request(_id uuid, _status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _row public.trusted_relationships%ROWTYPE; _conv uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _status NOT IN ('accepted','declined','revoked') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT * INTO _row FROM public.trusted_relationships WHERE id = _id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _row.user_id <> _uid THEN RAISE EXCEPTION 'Only the recipient can decide this request'; END IF;

  UPDATE public.trusted_relationships
    SET status = _status, responded_at = now(), updated_at = now()
    WHERE id = _id;

  IF _status = 'accepted' THEN
    -- One private thread per accepted introduction, visible only to the two people.
    SELECT id INTO _conv FROM public.conversations WHERE intro_id = _id;
    IF _conv IS NULL THEN
      INSERT INTO public.conversations(intro_id) VALUES (_id) RETURNING id INTO _conv;
    END IF;

    INSERT INTO public.user_notifications(user_id, type, title, message, data)
    VALUES (_row.related_user_id, 'trusted_accepted', 'Introduction accepted',
            'You are now connected — your private chat is open.',
            jsonb_build_object('link', '/messages?conversation=' || _conv, 'conversation_id', _conv)),
           (_row.user_id, 'trusted_accepted', 'Introduction accepted',
            'Your private chat with this member is open.',
            jsonb_build_object('link', '/messages?conversation=' || _conv, 'conversation_id', _conv));
  END IF;
  RETURN true;
END;
$function$;

-- 2. Verification checklist ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  doc_type text NOT NULL,
  label text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  accepted_mime text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp','application/pdf'],
  max_size_mb integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (level, doc_type)
);

GRANT SELECT ON public.verification_requirements TO authenticated;
GRANT ALL ON public.verification_requirements TO service_role;
ALTER TABLE public.verification_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read the checklist"
  ON public.verification_requirements FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_verification_requirements_updated_at
  BEFORE UPDATE ON public.verification_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.verification_requirements (level, doc_type, label, description, is_required, sort_order) VALUES
  ('standard', 'profile_photo', 'Clear profile photo', 'A recent photo of you where your face is clearly visible.', true, 1),
  ('standard', 'social_proof', 'Link to your work or socials', 'A screenshot or PDF showing a profile you control (portfolio, socials, streaming page).', false, 2),
  ('identity_verified', 'government_id', 'Government-issued ID', 'Passport, national ID or driver''s licence. All four corners visible, no glare.', true, 1),
  ('identity_verified', 'selfie', 'Selfie holding your ID', 'Hold the same ID next to your face so we can match them.', true, 2),
  ('identity_verified', 'proof_of_address', 'Proof of address', 'A utility bill or bank statement from the last 3 months.', false, 3),
  ('entity_verified', 'business_registration', 'Business registration', 'Certificate of incorporation or business name registration.', true, 1),
  ('entity_verified', 'authorisation_letter', 'Authorisation letter', 'A signed letter confirming you may act for the company.', true, 2),
  ('entity_verified', 'government_id', 'Government-issued ID', 'ID of the person signing on behalf of the company.', true, 3)
ON CONFLICT (level, doc_type) DO NOTHING;

-- 3. Uploaded documents --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid REFERENCES public.identity_verifications(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text,
  mime_type text,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'submitted',
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_documents_user_idx ON public.verification_documents(user_id);
CREATE INDEX IF NOT EXISTS verification_documents_verification_idx ON public.verification_documents(verification_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_documents TO authenticated;
GRANT ALL ON public.verification_documents TO service_role;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage their own documents"
  ON public.verification_documents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Identity officers can read documents"
  ON public.verification_documents FOR SELECT TO authenticated
  USING (public.is_identity_officer(auth.uid()));

CREATE POLICY "Identity officers can review documents"
  ON public.verification_documents FOR UPDATE TO authenticated
  USING (public.is_identity_officer(auth.uid())) WITH CHECK (public.is_identity_officer(auth.uid()));

CREATE TRIGGER update_verification_documents_updated_at
  BEFORE UPDATE ON public.verification_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Timeline ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.identity_verifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL,
  note text,
  actor_role text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_events_user_idx ON public.verification_events(user_id, created_at DESC);

GRANT SELECT ON public.verification_events TO authenticated;
GRANT ALL ON public.verification_events TO service_role;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own verification timeline"
  ON public.verification_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Identity officers read all verification timelines"
  ON public.verification_events FOR SELECT TO authenticated
  USING (public.is_identity_officer(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_verification_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.verification_events(verification_id, user_id, status, note, actor_role)
    VALUES (NEW.id, NEW.subject_id, NEW.status, 'Request received. Reviews usually complete within 2 business days.', 'system');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.verification_events(verification_id, user_id, status, note, actor_role)
    VALUES (NEW.id, NEW.subject_id, NEW.status, NEW.notes, 'reviewer');

    INSERT INTO public.user_notifications(user_id, type, title, message, data)
    VALUES (NEW.subject_id, 'verification_update',
            CASE NEW.status
              WHEN 'verified' THEN 'You are verified'
              WHEN 'failed' THEN 'Verification needs another look'
              ELSE 'Verification update' END,
            CASE NEW.status
              WHEN 'verified' THEN 'Your verification is approved. Gated features are now unlocked.'
              WHEN 'failed' THEN 'We could not verify your documents. Open your verification status for next steps.'
              ELSE 'Your verification status changed to ' || NEW.status || '.' END,
            jsonb_build_object('link', '/verification', 'verification_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS log_verification_event_ins ON public.identity_verifications;
CREATE TRIGGER log_verification_event_ins
  AFTER INSERT ON public.identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.log_verification_event();

DROP TRIGGER IF EXISTS log_verification_event_upd ON public.identity_verifications;
CREATE TRIGGER log_verification_event_upd
  AFTER UPDATE ON public.identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.log_verification_event();

-- 5. Guarded submission --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_verification_request(_capability text, _notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _level text;
  _missing text[];
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  _level := coalesce(public.requires_verification(_capability), 'standard');

  SELECT coalesce(array_agg(r.label ORDER BY r.sort_order), ARRAY[]::text[])
    INTO _missing
  FROM public.verification_requirements r
  WHERE r.level = _level
    AND r.is_required
    AND NOT EXISTS (
      SELECT 1 FROM public.verification_documents d
      WHERE d.user_id = _uid AND d.doc_type = r.doc_type AND d.status <> 'rejected'
    );

  IF array_length(_missing, 1) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'missing', to_jsonb(_missing), 'level', _level);
  END IF;

  INSERT INTO public.identity_profiles(user_id, verification_status, verification_level)
  VALUES (_uid, 'pending', 'standard')
  ON CONFLICT (user_id) DO UPDATE
    SET verification_status = CASE WHEN public.identity_profiles.verification_status = 'verified'
                                   THEN public.identity_profiles.verification_status ELSE 'pending' END,
        updated_at = now();

  INSERT INTO public.identity_verifications(subject_type, subject_id, requested_by, status, notes, document_type)
  VALUES ('user', _uid, _uid, 'pending', _notes, _capability)
  RETURNING id INTO _id;

  UPDATE public.verification_documents
    SET verification_id = _id, updated_at = now()
    WHERE user_id = _uid AND verification_id IS NULL;

  INSERT INTO public.admin_notifications(type, title, message, metadata)
  VALUES ('verification_request', 'Verification requested',
          'A member submitted documents for ' || _capability,
          jsonb_build_object('user_id', _uid, 'capability', _capability, 'required_level', _level));

  RETURN jsonb_build_object('ok', true, 'verification_id', _id, 'level', _level);
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_verification_request(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_verification_request(text, text) TO authenticated;

-- 6. My timeline ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_verification_timeline()
RETURNS TABLE (
  verification_id uuid,
  capability text,
  status text,
  requested_at timestamptz,
  verified_at timestamptz,
  event_status text,
  note text,
  event_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.id, v.document_type, v.status, v.requested_at, v.verified_at,
         e.status, e.note, e.created_at
  FROM public.identity_verifications v
  LEFT JOIN public.verification_events e ON e.verification_id = v.id
  WHERE v.subject_id = auth.uid()
  ORDER BY v.requested_at DESC, e.created_at ASC
$function$;

REVOKE ALL ON FUNCTION public.my_verification_timeline() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_verification_timeline() TO authenticated;
