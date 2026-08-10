ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS granted_by uuid,
  ADD COLUMN IF NOT EXISTS granted_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_lifetime_subscriptions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_lifetime AND (NEW.is_lifetime = false OR NEW.tier <> OLD.tier OR NEW.status <> OLD.status) THEN
    IF auth.uid() IS NOT NULL
       AND NOT (public.has_role(auth.uid(), 'super_admin'::app_role)
                OR public.has_role(auth.uid(), 'master_admin'::app_role)) THEN
      RAISE EXCEPTION 'Only a super admin can change a lifetime subscription';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_lifetime_subscriptions ON public.user_subscriptions;
CREATE TRIGGER protect_lifetime_subscriptions
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.protect_lifetime_subscriptions();

CREATE OR REPLACE FUNCTION public.expire_due_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.user_subscriptions
  SET tier = 'free'::subscription_tier,
      status = 'expired',
      updated_at = now()
  WHERE is_lifetime = false
    AND tier <> 'free'::subscription_tier
    AND current_period_end IS NOT NULL
    AND current_period_end < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('expire-due-subscriptions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('expire-due-subscriptions', '7 * * * *', $$SELECT public.expire_due_subscriptions();$$);