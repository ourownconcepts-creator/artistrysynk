import { createFileRoute } from "@tanstack/react-router";
import { createIntentSchema } from "@/lib/integration/contracts";
import { apiError, apiSuccess, readJson, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/identity/create")({
  server: { handlers: { POST: async ({ request }) => {
    const id = requestId(request);
    let client;
    try {
      const { audit, createIntent, enforceRateLimit, requireClient } = await import("@/lib/integration/integration.server");
      client = await requireClient(request, ["identity:create"]);
      await enforceRateLimit(client.id, "identity:create", 10);
      const parsed = createIntentSchema.safeParse(await readJson(request));
      if (!parsed.success) return apiError(id, 400, "invalid_request", "The identity creation request is invalid");
      const intent = await createIntent({
        client, type: "identity_create", externalSubject: parsed.data.external_subject,
        email: parsed.data.email, redirectUri: parsed.data.redirect_uri,
        scopes: parsed.data.scopes, idempotencyKey: request.headers.get("idempotency-key") ?? undefined,
      });
      await audit({ request, requestId: id, eventType: "identity.created", outcome: "success", client, externalSubject: parsed.data.external_subject, metadata: { intent_id: intent.id, reused: intent.reused } });
      const claimUrl = intent.code ? new URL(`/integration/v1/claim?code=${encodeURIComponent(intent.code)}`, request.url).toString() : null;
      return apiSuccess(id, { intent_id: intent.id, claim_url: claimUrl, expires_at: intent.expires_at, status: intent.status }, intent.reused ? 200 : 201);
    } catch (error) {
      const { audit, IntegrationFailure } = await import("@/lib/integration/integration.server");
      const failure = error instanceof IntegrationFailure ? error : new IntegrationFailure(503, "temporarily_unavailable", "Unable to process request");
      await audit({ request, requestId: id, eventType: "identity.created", outcome: "failure", client, metadata: { error_code: failure.code } });
      return apiError(id, failure.status, failure.code, failure.message, failure.status === 429 ? { "Retry-After": "60" } : undefined);
    }
  } } },
});