-- Trigger-only helper: never called directly by clients
REVOKE ALL ON FUNCTION public.protect_lifetime_subscriptions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_lifetime_subscriptions() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_lifetime_subscriptions() TO service_role;

-- Privileged maintenance routine: service role / cron only
REVOKE ALL ON FUNCTION public.run_retention_purges(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_retention_purges(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_retention_purges(text) TO service_role;

-- Privacy helpers: signed-in users only (public surfaces filter opt-outs internally)
REVOKE ALL ON FUNCTION public.list_opted_out_ids(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_opted_out_ids(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_opted_out_ids(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_discoverable(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_discoverable(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_discoverable(uuid, text) TO authenticated, service_role;

-- Legal acceptance status is per-signed-in-user
REVOKE ALL ON FUNCTION public.get_pending_legal_acceptances(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_legal_acceptances(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_legal_acceptances(uuid) TO authenticated, service_role;
