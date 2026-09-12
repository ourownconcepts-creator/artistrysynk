UPDATE public.integration_redirect_uris
SET is_active = false
WHERE client_id = (SELECT id FROM public.integration_clients WHERE client_id = 'zgt-localtest-tmp');

UPDATE public.integration_clients
SET status = 'revoked',
    allowed_scopes = ARRAY[]::text[],
    client_secret_hash = encode(gen_random_bytes(32), 'hex'),
    secret_expires_at = now() + interval '1 minute'
WHERE client_id = 'zgt-localtest-tmp';