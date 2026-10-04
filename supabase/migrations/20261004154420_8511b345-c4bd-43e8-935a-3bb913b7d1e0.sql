DELETE FROM public.newsletter_subscribers WHERE email IN ('unsub_test@artistrysynk-test.invalid','unsubxtest@artistrysynk-test.invalid');
DELETE FROM public.suppressed_emails WHERE email = 'unsub_test@artistrysynk-test.invalid';
DELETE FROM public.email_unsubscribe_tokens WHERE email = 'unsub_test@artistrysynk-test.invalid';