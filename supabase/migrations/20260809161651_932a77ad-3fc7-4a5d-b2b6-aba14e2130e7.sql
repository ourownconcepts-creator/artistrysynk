ALTER TABLE public.retention_policies
  ADD COLUMN IF NOT EXISTS target_table text,
  ADD COLUMN IF NOT EXISTS target_column text,
  ADD COLUMN IF NOT EXISTS target_condition text,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_deleted_count integer;

CREATE TABLE IF NOT EXISTS public.retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid REFERENCES public.retention_policies(id) ON DELETE SET NULL,
  category text NOT NULL,
  target text NOT NULL,
  cutoff timestamptz,
  deleted_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  triggered_by text NOT NULL DEFAULT 'schedule',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retention_runs TO authenticated;
GRANT ALL ON public.retention_runs TO service_role;

ALTER TABLE public.retention_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Compliance admins can view retention runs" ON public.retention_runs;
CREATE POLICY "Compliance admins can view retention runs"
ON public.retention_runs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'master_admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'compliance_admin')
);

CREATE INDEX IF NOT EXISTS retention_runs_created_at_idx ON public.retention_runs (created_at DESC);

CREATE OR REPLACE FUNCTION public.run_retention_purges(_triggered_by text DEFAULT 'schedule')
RETURNS TABLE(category text, target text, deleted_count integer, status text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _policy record;
  _cutoff timestamptz;
  _deleted integer;
  _sql text;
  _status text;
  _error text;
BEGIN
  FOR _policy IN
    SELECT * FROM public.retention_policies
    WHERE is_automated
      AND target_table IS NOT NULL
      AND target_column IS NOT NULL
      AND retention_days IS NOT NULL
    ORDER BY category
  LOOP
    _cutoff := now() - make_interval(days => _policy.retention_days);
    _deleted := 0;
    _status := 'success';
    _error := NULL;

    BEGIN
      _sql := format(
        'DELETE FROM public.%I WHERE %I < $1%s',
        _policy.target_table,
        _policy.target_column,
        CASE WHEN coalesce(_policy.target_condition, '') = '' THEN '' ELSE ' AND (' || _policy.target_condition || ')' END
      );
      EXECUTE _sql USING _cutoff;
      GET DIAGNOSTICS _deleted = ROW_COUNT;

      UPDATE public.retention_policies
      SET last_run_at = now(), last_deleted_count = _deleted, updated_at = now()
      WHERE id = _policy.id;
    EXCEPTION WHEN OTHERS THEN
      _status := 'error';
      _error := SQLERRM;
    END;

    INSERT INTO public.retention_runs (policy_id, category, target, cutoff, deleted_count, status, error_message, triggered_by)
    VALUES (_policy.id, _policy.category, _policy.target_table, _cutoff, _deleted, _status, _error, _triggered_by);

    RETURN QUERY SELECT _policy.category, _policy.target_table, _deleted, _status, _error;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.run_retention_purges(text) FROM anon, authenticated;