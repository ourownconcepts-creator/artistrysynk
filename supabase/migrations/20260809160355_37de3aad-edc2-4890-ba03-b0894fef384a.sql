ALTER TABLE public.compliance_records
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_record_id uuid REFERENCES public.compliance_records(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS review_notes text;

CREATE UNIQUE INDEX IF NOT EXISTS compliance_records_reference_id_key
  ON public.compliance_records (reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS compliance_records_type_status_idx
  ON public.compliance_records (record_type, status);
CREATE INDEX IF NOT EXISTS compliance_records_review_due_idx
  ON public.compliance_records (review_due);

ALTER TABLE public.compliance_records DROP CONSTRAINT IF EXISTS compliance_records_record_type_check;
ALTER TABLE public.compliance_records
  ADD CONSTRAINT compliance_records_record_type_check
  CHECK (record_type IN ('ropa', 'dpia', 'policy', 'audit'));

ALTER TABLE public.compliance_records DROP CONSTRAINT IF EXISTS compliance_records_status_check;
ALTER TABLE public.compliance_records
  ADD CONSTRAINT compliance_records_status_check
  CHECK (status IN ('draft', 'in_review', 'approved', 'retired'));

ALTER TABLE public.compliance_records DROP CONSTRAINT IF EXISTS compliance_records_risk_level_check;
ALTER TABLE public.compliance_records
  ADD CONSTRAINT compliance_records_risk_level_check
  CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high'));

CREATE OR REPLACE FUNCTION public.validate_compliance_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _ref text;
  _missing text[] := '{}';
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
      _missing := _missing || 'owner';
    END IF;
    IF NEW.review_due IS NULL THEN
      _missing := _missing || 'review_due';
    END IF;

    IF NEW.record_type = 'ropa' THEN
      FOREACH _key IN ARRAY ARRAY['purpose', 'lawful_basis', 'data_subjects', 'data_categories',
                                  'recipients', 'retention', 'transfers', 'security_measures'] LOOP
        IF coalesce(trim(NEW.content ->> _key), '') = '' THEN
          _missing := _missing || _key;
        END IF;
      END LOOP;
    ELSIF NEW.record_type = 'dpia' THEN
      FOREACH _key IN ARRAY ARRAY['description', 'necessity', 'residual_risk', 'outcome'] LOOP
        IF coalesce(trim(NEW.content ->> _key), '') = '' THEN
          _missing := _missing || _key;
        END IF;
      END LOOP;

      _risks := NEW.content -> 'risks';
      IF _risks IS NULL OR jsonb_typeof(_risks) <> 'array' OR jsonb_array_length(_risks) = 0 THEN
        _missing := _missing || 'risks';
      ELSE
        FOR _risk IN SELECT jsonb_array_elements(_risks) LOOP
          IF coalesce(trim(_risk ->> 'risk'), '') = ''
             OR coalesce(trim(_risk ->> 'mitigation'), '') = ''
             OR coalesce(trim(_risk ->> 'likelihood'), '') = ''
             OR coalesce(trim(_risk ->> 'severity'), '') = '' THEN
            _missing := _missing || 'risk_details';
            EXIT;
          END IF;
        END LOOP;
      END IF;

      IF NEW.risk_level IS NULL THEN
        _missing := _missing || 'risk_level';
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

DROP TRIGGER IF EXISTS validate_compliance_record_trg ON public.compliance_records;
CREATE TRIGGER validate_compliance_record_trg
  BEFORE INSERT OR UPDATE ON public.compliance_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_record();

REVOKE ALL ON FUNCTION public.validate_compliance_record() FROM anon, authenticated;