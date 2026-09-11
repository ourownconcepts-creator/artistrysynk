CREATE POLICY "Service role manages integration applications"
ON public.integration_applications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages integration clients"
ON public.integration_clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages integration redirects"
ON public.integration_redirect_uris FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages integration links"
ON public.integration_identity_links FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages integration intents"
ON public.integration_intents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages integration rate limits"
ON public.integration_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role writes integration audit events"
ON public.integration_audit_events FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role reads integration audit events"
ON public.integration_audit_events FOR SELECT TO service_role USING (true);