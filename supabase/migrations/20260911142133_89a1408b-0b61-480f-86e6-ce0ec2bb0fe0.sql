UPDATE public.integration_redirect_uris
SET is_active = false
WHERE client_id = '8e157c23-a7e5-40f9-b9cc-5883062c34fa'
  AND redirect_uri = 'https://ziksgottalent.com/auth/artistrysynk/callback';

INSERT INTO public.integration_redirect_uris (client_id, environment, redirect_uri, is_active)
VALUES
  ('8e157c23-a7e5-40f9-b9cc-5883062c34fa', 'production', 'https://ziksgottalent.com/oauth/artistrysynk/return', true),
  ('8e157c23-a7e5-40f9-b9cc-5883062c34fa', 'production', 'https://www.ziksgottalent.com/oauth/artistrysynk/return', true)
ON CONFLICT (client_id, redirect_uri) DO UPDATE SET is_active = true, environment = 'production';

UPDATE public.integration_clients
SET oauth_client_id = '5cd12680-2ff8-4b0f-9666-5ce4cf313bc1'
WHERE id = '8e157c23-a7e5-40f9-b9cc-5883062c34fa';