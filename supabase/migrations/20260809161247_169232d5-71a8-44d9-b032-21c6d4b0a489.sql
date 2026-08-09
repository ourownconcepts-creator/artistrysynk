CREATE OR REPLACE FUNCTION public.validate_compliance_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _ref text;
  _missing text[] := ARRAY[]::text[];
  _key text;
  _risks jsonb;
  _risk jsonb;
  _linked_type text;
BEGIN
  IF NEW.reference_id IS NULL THEN
    _ref := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
    NEW.reference_id := 'AS-' || upper(NEW.record_type) || '-' || _ref;
  END IF;

  IF NEW.linked_record_id IS NOT NULL THEN
    IF NEW.linked_record_id = NEW.id THEN
      RAISE EXCEPTION 'A compliance record cannot be linked to itself';
    END IF;
    SELECT record_type INTO _linked_type FROM public.compliance_records WHERE id = NEW.linked_record_id;
    IF _linked_type IS DISTINCT FROM 'ropa' THEN
      RAISE EXCEPTION 'Assessments can only be linked to a processing activity (ropa) record';
    END IF;
  END IF;

  IF NEW.status = 'approved' THEN
    IF coalesce(trim(NEW.owner), '') = '' THEN
      _missing := array_append(_missing, 'owner');
    END IF;
    IF NEW.review_due IS NULL THEN
      _missing := array_append(_missing, 'review_due');
    END IF;

    IF NEW.record_type = 'ropa' THEN
      FOREACH _key IN ARRAY ARRAY['purpose', 'lawful_basis', 'data_subjects', 'data_categories',
                                  'recipients', 'retention', 'transfers', 'security_measures'] LOOP
        IF coalesce(trim(NEW.content ->> _key), '') = '' THEN
          _missing := array_append(_missing, _key);
        END IF;
      END LOOP;
    ELSIF NEW.record_type = 'dpia' THEN
      FOREACH _key IN ARRAY ARRAY['description', 'necessity', 'residual_risk', 'outcome'] LOOP
        IF coalesce(trim(NEW.content ->> _key), '') = '' THEN
          _missing := array_append(_missing, _key);
        END IF;
      END LOOP;

      _risks := NEW.content -> 'risks';
      IF _risks IS NULL OR jsonb_typeof(_risks) <> 'array' OR jsonb_array_length(_risks) = 0 THEN
        _missing := array_append(_missing, 'risks');
      ELSE
        FOR _risk IN SELECT jsonb_array_elements(_risks) LOOP
          IF coalesce(trim(_risk ->> 'risk'), '') = ''
             OR coalesce(trim(_risk ->> 'mitigation'), '') = ''
             OR coalesce(trim(_risk ->> 'likelihood'), '') = ''
             OR coalesce(trim(_risk ->> 'severity'), '') = '' THEN
            _missing := array_append(_missing, 'risk_details');
            EXIT;
          END IF;
        END LOOP;
      END IF;

      IF NEW.risk_level IS NULL THEN
        _missing := array_append(_missing, 'risk_level');
      END IF;
      IF NEW.linked_record_id IS NULL THEN
        _missing := array_append(_missing, 'linked processing activity');
      END IF;
    END IF;

    IF array_length(_missing, 1) > 0 THEN
      RAISE EXCEPTION 'Cannot approve % record: missing %', NEW.record_type, array_to_string(_missing, ', ');
    END IF;

    IF NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;
    IF NEW.last_reviewed_at IS NULL THEN
      NEW.last_reviewed_at := now();
    END IF;
  ELSE
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_compliance_record() FROM anon, authenticated;