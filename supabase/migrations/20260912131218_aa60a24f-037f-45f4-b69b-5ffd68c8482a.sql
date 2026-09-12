UPDATE public.integration_clients
SET status = 'active',
    client_secret_hash = '797930bfdcd7da97a8562e20017124f4052b4f84e7cba323cf5fb9041def09e6',
    allowed_scopes = ARRAY['identity:create','identity:read','profile:read'],
    secret_expires_at = now() + interval '1 hour'
WHERE client_id = 'zgt-localtest-tmp';

INSERT INTO public.integration_redirect_uris (client_id, redirect_uri, environment)
SELECT id, 'https://ziksgottalent.com/oauth/artistrysynk/return', 'staging'
FROM public.integration_clients WHERE client_id = 'zgt-localtest-tmp'
ON CONFLICT DO NOTHING;