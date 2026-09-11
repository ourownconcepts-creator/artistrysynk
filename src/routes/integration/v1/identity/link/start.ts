import { createFileRoute } from "@tanstack/react-router";
import { linkStartSchema } from "@/lib/integration/contracts";
import { apiError, apiSuccess, readJson, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/identity/link/start")({
  server: { handlers: { POST: async ({ request }) => {
    const id = requestId(request);
    let client;
    try {
      const { audit, authorizationEndpoint, createIntent, enforceRateLimit, IntegrationFailure, requireClient } = await import("@/lib/integration/integration.server");
      client = await requireClient(request, ["identity:link"]);
      await enforceRateLimit(client.id, "identity:link:start", 20);
      const parsed = linkStartSchema.safeParse(await readJson(request));
      if (!parsed.success) return apiError(id, 400, "invalid_request", "The identity link request is invalid");
      if (!client.oauthClientId) throw new IntegrationFailure(409, "conflict", "OAuth is not configured for this integration client");
      const intent = await createIntent({ client, type: "identity_link", externalSubject: parsed.data.external_subject, redirectUri: parsed.data.redirect_uri, scopes: parsed.data.scopes, idempotencyKey: request.headers.get("idempotency-key") ?? undefined });
      const authorize = new URL(await authorizationEndpoint());
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("client_id", client.oauthClientId);
      authorize.searchParams.set("redirect_uri", parsed.data.redirect_uri);
      authorize.searchParams.set("scope", parsed.data.scopes.join(" "));
      authorize.searchParams.set("state", parsed.data.state);
      await audit({ request, requestId: id, eventType: "connection.started", outcome: "success", client, externalSubject: parsed.data.external_subject, metadata: { intent_id: intent.id } });
      return apiSuccess(id, { intent_id: intent.id, authorization_url: authorize.toString(), expires_at: intent.expires_at }, intent.reused ? 200 : 201);
    } catch (error) {
      const { audit, IntegrationFailure } = await import("@/lib/integration/integration.server");
      const failure = error instanceof IntegrationFailure ? error : new IntegrationFailure(503, "temporarily_unavailable", "Unable to process request");
      await audit({ request, requestId: id, eventType: "connection.started", outcome: "failure", client, metadata: { error_code: failure.code } });
      return apiError(id, failure.status, failure.code, failure.message, failure.status === 429 ? { "Retry-After": "60" } : undefined);
    }
  } } },
});