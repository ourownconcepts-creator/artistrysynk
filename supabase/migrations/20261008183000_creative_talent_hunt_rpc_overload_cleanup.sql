-- Avoid ambiguous Postgres resolution between the legacy two-argument
-- round-status RPC and the hardened four-argument version with defaults.
-- Existing clients can still call the hardened function with two arguments.
drop function if exists public.set_creative_talent_hunt_round_status(uuid, text);

-- Keep source-parity RPCs discoverable in PostgREST's schema cache.
notify pgrst, 'reload schema';
