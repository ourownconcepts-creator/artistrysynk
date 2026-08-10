CREATE OR REPLACE FUNCTION public.start_studio_conversation(_studio_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _existing uuid;
  _new uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.studios s
    WHERE s.id = _studio_id
      AND s.is_active = true
      AND COALESCE(s.visibility, 'public') = 'public'
  ) THEN
    RAISE EXCEPTION 'studio is not available for messaging';
  END IF;

  IF public.is_studio_member(_uid, _studio_id) THEN
    RAISE EXCEPTION 'you are already on this studio team';
  END IF;

  SELECT id INTO _existing
  FROM public.conversations
  WHERE studio_id = _studio_id AND customer_id = _uid
  LIMIT 1;

  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  INSERT INTO public.conversations (studio_id, customer_id)
  VALUES (_studio_id, _uid)
  RETURNING id INTO _new;

  RETURN _new;
END;
$function$;

REVOKE ALL ON FUNCTION public.start_studio_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_studio_conversation(uuid) TO authenticated;