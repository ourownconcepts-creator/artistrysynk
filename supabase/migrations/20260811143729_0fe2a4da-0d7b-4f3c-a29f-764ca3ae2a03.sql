-- 1. Fix broken notification insert + support the needs_more_info status
CREATE OR REPLACE FUNCTION public.admin_decide_verification(_id uuid, _status text, _level text DEFAULT 'identity_verified'::text, _notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _subject uuid; _subject_type text;
BEGIN
  IF NOT public.is_identity_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('verified','failed','restricted','expired','needs_more_info') THEN RAISE EXCEPTION 'Invalid status'; END IF;

  SELECT v.subject_id, v.subject_type INTO _subject, _subject_type
  FROM public.identity_verifications v WHERE v.id = _id;
  IF _subject IS NULL THEN RAISE EXCEPTION 'Verification not found'; END IF;

  UPDATE public.identity_verifications
    SET status = _status, notes = coalesce(_notes, notes),
        verified_at = CASE WHEN _status = 'verified' THEN now() ELSE verified_at END
    WHERE id = _id;

  IF _subject_type = 'user' THEN
    INSERT INTO public.identity_profiles(user_id, verification_status, verification_level, verified_at)
    VALUES (_subject, _status, CASE WHEN _status = 'verified' THEN coalesce(_level,'identity_verified') ELSE 'standard' END,
            CASE WHEN _status = 'verified' THEN now() ELSE NULL END)
    ON CONFLICT (user_id) DO UPDATE
      SET verification_status = _status,
          verification_level = CASE WHEN _status = 'verified' THEN coalesce(_level,'identity_verified') ELSE 'standard' END,
          verified_at = CASE WHEN _status = 'verified' THEN now() ELSE NULL END,
          updated_at = now();

    UPDATE public.profiles SET is_verified = (_status = 'verified') WHERE id = _subject;
  END IF;

  INSERT INTO public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'verification_' || _status, 'identity_verification', _id,
          jsonb_build_object('subject_id', _subject, 'level', _level));

  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_decide_verification(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_verification(uuid, text, text, text) TO authenticated;

-- 2. Reviewer flags specific documents with reasons
CREATE OR REPLACE FUNCTION public.admin_request_documents(_id uuid, _rejections jsonb, _summary text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _subject uuid; _item jsonb; _count int := 0;
BEGIN
  IF NOT public.is_identity_officer(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT subject_id INTO _subject FROM public.identity_verifications WHERE id = _id;
  IF _subject IS NULL THEN RAISE EXCEPTION 'Verification not found'; END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(coalesce(_rejections, '[]'::jsonb))
  LOOP
    UPDATE public.verification_documents
      SET status = 'rejected',
          review_note = nullif(_item->>'reason', ''),
          updated_at = now()
      WHERE user_id = _subject
        AND doc_type = _item->>'doc_type';
    _count := _count + 1;
  END LOOP;

  IF _count = 0 THEN RAISE EXCEPTION 'Select at least one document to request again'; END IF;

  UPDATE public.identity_verifications
    SET status = 'needs_more_info', notes = coalesce(_summary, notes)
    WHERE id = _id;

  INSERT INTO public.admin_audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'verification_documents_requested', 'identity_verification', _id,
          jsonb_build_object('subject_id', _subject, 'documents', _rejections));

  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_request_documents(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_request_documents(uuid, jsonb, text) TO authenticated;

-- 3. Member-facing view of what still needs fixing
CREATE OR REPLACE FUNCTION public.my_verification_corrections()
RETURNS TABLE(verification_id uuid, capability text, status text, summary text, doc_type text, label text, reason text, replaced boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.id, v.document_type, v.status, v.notes,
         d.doc_type, coalesce(r.label, d.doc_type), d.review_note,
         (d.status <> 'rejected')
  FROM public.identity_verifications v
  JOIN public.verification_documents d ON d.user_id = v.subject_id
  LEFT JOIN public.verification_requirements r ON r.doc_type = d.doc_type
  WHERE v.subject_id = auth.uid()
    AND v.status IN ('needs_more_info','failed')
    AND (d.status = 'rejected' OR d.review_note IS NOT NULL)
  ORDER BY v.requested_at DESC, coalesce(r.sort_order, 0)
$function$;
REVOKE ALL ON FUNCTION public.my_verification_corrections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_verification_corrections() TO authenticated;

-- 4. One-click resubmission once flagged documents are replaced
CREATE OR REPLACE FUNCTION public.resubmit_verification(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _capability text; _outstanding text[];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT document_type INTO _capability
  FROM public.identity_verifications
  WHERE id = _id AND subject_id = _uid AND status IN ('needs_more_info','failed');
  IF _capability IS NULL THEN RAISE EXCEPTION 'Nothing to resubmit'; END IF;

  SELECT coalesce(array_agg(coalesce(r.label, d.doc_type)), ARRAY[]::text[])
    INTO _outstanding
  FROM public.verification_documents d
  LEFT JOIN public.verification_requirements r ON r.doc_type = d.doc_type
  WHERE d.user_id = _uid AND d.status = 'rejected';

  IF array_length(_outstanding, 1) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'outstanding', to_jsonb(_outstanding));
  END IF;

  UPDATE public.identity_verifications
    SET status = 'pending', requested_at = now(), notes = NULL
    WHERE id = _id;

  UPDATE public.verification_documents
    SET verification_id = _id, review_note = NULL, updated_at = now()
    WHERE user_id = _uid AND status <> 'rejected';

  INSERT INTO public.identity_profiles(user_id, verification_status, verification_level)
  VALUES (_uid, 'pending', 'standard')
  ON CONFLICT (user_id) DO UPDATE
    SET verification_status = CASE WHEN public.identity_profiles.verification_status = 'verified'
                                  THEN public.identity_profiles.verification_status ELSE 'pending' END,
        updated_at = now();

  INSERT INTO public.verification_events(verification_id, user_id, status, note, actor_role)
  VALUES (_id, _uid, 'pending', 'Corrected documents resubmitted for review.', 'member');

  INSERT INTO public.admin_notifications(type, title, message, metadata)
  VALUES ('verification_request', 'Corrected documents resubmitted',
          'A member replaced the requested documents for ' || _capability,
          jsonb_build_object('user_id', _uid, 'capability', _capability));

  RETURN jsonb_build_object('ok', true, 'verification_id', _id);
END;
$function$;
REVOKE ALL ON FUNCTION public.resubmit_verification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_verification(uuid) TO authenticated;

-- 5. Username availability + change
CREATE OR REPLACE FUNCTION public.check_username_available(_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _norm text := public.normalize_username(_username);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(_norm) < 3 THEN
    RETURN jsonb_build_object('available', false, 'normalized', _norm,
      'reason', 'Usernames need at least 3 letters, numbers or underscores.');
  END IF;
  IF length(_norm) > 24 THEN
    RETURN jsonb_build_object('available', false, 'normalized', _norm,
      'reason', 'Usernames can be at most 24 characters.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE username = _norm) THEN
    RETURN jsonb_build_object('available', false, 'normalized', _norm,
      'reason', 'That username is reserved.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = _norm AND id <> auth.uid()) THEN
    RETURN jsonb_build_object('available', false, 'normalized', _norm,
      'reason', 'That username is already taken.');
  END IF;
  RETURN jsonb_build_object('available', true, 'normalized', _norm, 'reason', NULL);
END;
$function$;
REVOKE ALL ON FUNCTION public.check_username_available(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_username_state()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'username', p.username,
    'display_name', p.display_name,
    'full_name', p.full_name,
    'nickname', p.nickname,
    'display_name_mode', p.display_name_mode,
    'changed_at', p.username_changed_at,
    'next_change_at', CASE WHEN p.username_changed_at IS NULL THEN NULL
                           ELSE p.username_changed_at + interval '30 days' END,
    'can_change', (p.username_changed_at IS NULL OR p.username_changed_at < now() - interval '30 days'),
    'history', coalesce((
      SELECT jsonb_agg(jsonb_build_object('old', h.old_username, 'new', h.new_username, 'at', h.changed_at)
                       ORDER BY h.changed_at DESC)
      FROM public.username_history h WHERE h.user_id = p.id
    ), '[]'::jsonb)
  )
  FROM public.profiles p WHERE p.id = auth.uid()
$function$;
REVOKE ALL ON FUNCTION public.my_username_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_username_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_my_username(_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _check jsonb; _norm text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  _check := public.check_username_available(_username);
  IF NOT (_check->>'available')::boolean THEN
    RETURN jsonb_build_object('ok', false, 'reason', _check->>'reason');
  END IF;
  _norm := _check->>'normalized';

  UPDATE public.profiles SET username = _norm, updated_at = now() WHERE id = auth.uid();
  RETURN jsonb_build_object('ok', true, 'username', _norm);
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'reason', SQLERRM);
END;
$function$;
REVOKE ALL ON FUNCTION public.set_my_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_username(text) TO authenticated;

-- 6. Why can I see this introduction thread?
CREATE OR REPLACE FUNCTION public.conversation_intro_context(_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _intro uuid; _row record;
BEGIN
  IF NOT public.is_conversation_participant(_conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT intro_id INTO _intro FROM public.conversations WHERE id = _conversation_id;
  IF _intro IS NULL THEN RETURN jsonb_build_object('intro', false); END IF;

  SELECT t.id, t.status, t.created_at, t.responded_at, t.note,
         t.owner_id, t.trusted_id, t.introduced_by,
         ow.username AS owner_username, ow.display_name AS owner_name,
         tr.username AS trusted_username, tr.display_name AS trusted_name,
         intro.username AS intro_username, intro.display_name AS intro_name
    INTO _row
  FROM public.trusted_relationships t
  LEFT JOIN public.profiles ow ON ow.id = t.owner_id
  LEFT JOIN public.profiles tr ON tr.id = t.trusted_id
  LEFT JOIN public.profiles intro ON intro.id = t.introduced_by
  WHERE t.id = _intro;

  IF _row.id IS NULL THEN RETURN jsonb_build_object('intro', false); END IF;

  RETURN jsonb_build_object(
    'intro', true,
    'status', _row.status,
    'note', _row.note,
    'created_at', _row.created_at,
    'accepted_at', _row.responded_at,
    'initiated_by', jsonb_build_object(
      'username', coalesce(_row.intro_username, _row.owner_username),
      'name', coalesce(_row.intro_name, _row.owner_name)),
    'owner', jsonb_build_object('username', _row.owner_username, 'name', _row.owner_name),
    'trusted', jsonb_build_object('username', _row.trusted_username, 'name', _row.trusted_name),
    'reason', 'This chat opened because a trusted introduction was accepted.'
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.conversation_intro_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_intro_context(uuid) TO authenticated;