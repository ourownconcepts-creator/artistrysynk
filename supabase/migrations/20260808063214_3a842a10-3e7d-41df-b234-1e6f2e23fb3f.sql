-- 1) Role approval SLA -------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS role_approval_sla_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS role_approval_fallback text NOT NULL DEFAULT 'none';

ALTER TABLE public.project_role_changes
  ADD COLUMN IF NOT EXISTS sla_hours integer,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS sla_fallback text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS auto_resolved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_role_change_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p_hours integer;
  p_fallback text;
BEGIN
  IF NEW.sla_fallback NOT IN ('none','auto_approve','auto_decline') THEN
    RAISE EXCEPTION 'Invalid SLA fallback: %', NEW.sla_fallback;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT role_approval_sla_hours, role_approval_fallback
      INTO p_hours, p_fallback
    FROM public.projects WHERE id = NEW.project_id;

    IF NEW.sla_hours IS NULL THEN
      NEW.sla_hours := GREATEST(1, LEAST(720, COALESCE(p_hours, 48)));
    END IF;
    IF NEW.sla_fallback = 'none' AND COALESCE(p_fallback, 'none') <> 'none' THEN
      NEW.sla_fallback := p_fallback;
    END IF;
    IF NEW.sla_deadline IS NULL THEN
      NEW.sla_deadline := now() + make_interval(hours => NEW.sla_hours);
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_role_change_sla ON public.project_role_changes;
CREATE TRIGGER trg_validate_role_change_sla
BEFORE INSERT OR UPDATE ON public.project_role_changes
FOR EACH ROW EXECUTE FUNCTION public.validate_role_change_sla();

CREATE OR REPLACE FUNCTION public.resolve_overdue_role_changes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  affected integer := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.project_role_changes
    WHERE status = 'pending'
      AND sla_fallback IN ('auto_approve','auto_decline')
      AND sla_deadline IS NOT NULL
      AND sla_deadline < now()
  LOOP
    UPDATE public.project_role_changes
    SET status = CASE WHEN r.sla_fallback = 'auto_approve' THEN 'approved' ELSE 'declined' END,
        reviewed_at = now(),
        auto_resolved = true
    WHERE id = r.id;

    INSERT INTO public.user_notifications (user_id, type, title, message, data)
    SELECT DISTINCT uid,
      'project',
      CASE WHEN r.sla_fallback = 'auto_approve' THEN 'Role auto-approved' ELSE 'Role request expired' END,
      CASE WHEN r.sla_fallback = 'auto_approve'
        THEN 'No approver responded in time, so the role "' || r.requested_role || '" was approved automatically.'
        ELSE 'No approver responded in time, so the role request for "' || r.requested_role || '" was declined.' END,
      jsonb_build_object('project_id', r.project_id, 'role_change_id', r.id,
                         'url', '/projects/' || r.project_id, 'auto_resolved', true)
    FROM (SELECT r.member_id AS uid UNION SELECT r.requested_by) s(uid);

    affected := affected + 1;
  END LOOP;

  RETURN affected;
END;
$$;

SELECT cron.unschedule('resolve-overdue-role-changes')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'resolve-overdue-role-changes');

SELECT cron.schedule(
  'resolve-overdue-role-changes',
  '*/15 * * * *',
  $cron$ SELECT public.resolve_overdue_role_changes(); $cron$
);

-- 2) Moderation audit trail ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid REFERENCES public.content_flags(id) ON DELETE SET NULL,
  moderator_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id text NOT NULL,
  action text NOT NULL,
  previous_status text,
  new_status text,
  notes text,
  is_bulk boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view moderation actions"
ON public.moderation_actions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'master_admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins can log moderation actions"
ON public.moderation_actions FOR INSERT TO authenticated
WITH CHECK (
  moderator_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'master_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at
  ON public.moderation_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_content
  ON public.moderation_actions (content_type, content_id);

-- 3) Appeals: supporting information -----------------------------------------
ALTER TABLE public.content_appeals
  ADD COLUMN IF NOT EXISTS supporting_info text,
  ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}';

-- 4) Mute controls ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.muted_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id uuid NOT NULL,
  muted_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (muter_id, muted_id),
  CONSTRAINT muted_users_no_self CHECK (muter_id <> muted_id)
);

GRANT SELECT, INSERT, DELETE ON public.muted_users TO authenticated;
GRANT ALL ON public.muted_users TO service_role;

ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mutes"
ON public.muted_users FOR SELECT TO authenticated
USING (muter_id = auth.uid());

CREATE POLICY "Users can mute others"
ON public.muted_users FOR INSERT TO authenticated
WITH CHECK (muter_id = auth.uid());

CREATE POLICY "Users can unmute"
ON public.muted_users FOR DELETE TO authenticated
USING (muter_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_muted_users_muter ON public.muted_users (muter_id);
