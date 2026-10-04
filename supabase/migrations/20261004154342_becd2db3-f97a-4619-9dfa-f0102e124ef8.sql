INSERT INTO public.newsletter_subscribers (email, is_active) VALUES
  ('unsub_test@artistrysynk-test.invalid', true), ('unsubxtest@artistrysynk-test.invalid', true)
ON CONFLICT (email) DO NOTHING;
INSERT INTO public.email_unsubscribe_tokens (email, token)
VALUES ('unsub_test@artistrysynk-test.invalid', 'qatesttoken0123456789abcdefABCDEF0123456789')
ON CONFLICT (email) DO NOTHING;