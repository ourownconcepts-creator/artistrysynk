import { createFileRoute } from "@tanstack/react-router";
import { revokeSchema } from "@/lib/integration/contracts";
import { apiError, apiSuccess, readJson, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/revoke")({
  server: { handlers: { POST: async ({ request }) => {
    const id = requestId(request);
    let client;
    try {
      const { audit, enforceRateLimit, getAdminClient, IntegrationFailure, requireClient } = await import("@/lib/integration/integration.server");
      client = await requireClient(request, ["identity:link"]);
      await enforceRateLimit(client.id, "identity:revoke", 30);
      const parsed = revokeSchema.safeParse(await readJson(request));
      if (!parsed.success) return apiError(id, 400, "invalid_request", "external_subject is required");
      const admin = await getAdminClient();
      const { data, error } = await admin.from("integration_identity_links").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("client_id", client.id).eq("external_subject", parsed.data.external_subject).eq("status", "active").select("user_id").maybeSingle();
      if (error) throw new IntegrationFailure(503, "temporarily_unavailable", "Unable to revoke connection");
      if (!data) throw new IntegrationFailure(404, "not_found", "No active identity link was found");
      await audit({ request, requestId: id, eventType: "connection.revoked", outcome: "success", client, userId: data.user_id, externalSubject: parsed.data.external_subject });
      return apiSuccess(id, { revoked: true });
    } catch (error) {
      const { audit, IntegrationFailure } = await import("@/lib/integration/integration.server");
      const failure = error instanceof IntegrationFailure ? error : new IntegrationFailure(503, "temporarily_unavailable", "Unable to process request");
      await audit({ request, requestId: id, eventType: "connection.revoked", outcome: "failure", client, metadata: { error_code: failure.code } });
      return apiError(id, failure.status, failure.code, failure.message);
    }
  } } },
});