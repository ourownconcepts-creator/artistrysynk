CREATE OR REPLACE FUNCTION public.my_verification_corrections()
RETURNS TABLE(verification_id uuid, capability text, status text, summary text, doc_type text, label text, reason text, replaced boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.id, v.document_type, v.status, v.notes,
         d.doc_type, coalesce(r.label, d.doc_type), d.review_note,
         (d.doc_type IS NULL OR d.status <> 'rejected')
  FROM public.identity_verifications v
  LEFT JOIN public.verification_documents d
    ON d.user_id = v.subject_id
   AND (d.status = 'rejected' OR d.review_note IS NOT NULL)
  LEFT JOIN public.verification_requirements r ON r.doc_type = d.doc_type
  WHERE v.subject_id = auth.uid()
    AND v.status IN ('needs_more_info','failed')
  ORDER BY v.requested_at DESC, coalesce(r.sort_order, 0)
$function$;
REVOKE ALL ON FUNCTION public.my_verification_corrections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_verification_corrections() TO authenticated;

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
              WHEN 'needs_more_info' THEN 'We need one more document'
              WHEN 'pending' THEN 'Verification in review'
              ELSE 'Verification update' END,
            CASE NEW.status
              WHEN 'verified' THEN 'Your verification is approved. Gated features are now unlocked.'
              WHEN 'failed' THEN 'We could not verify your documents. Open your verification status for next steps.'
              WHEN 'needs_more_info' THEN 'A reviewer asked for a replacement document. Open your verification status to see exactly what to fix, then resubmit in one click.'
              WHEN 'pending' THEN 'Your documents are queued for review — we usually finish within 2 business days.'
              ELSE 'Your verification status changed to ' || NEW.status || '.' END,
            jsonb_build_object('link', '/verification', 'verification_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.log_verification_event() FROM PUBLIC, anon, authenticated;