import { createFileRoute } from "@tanstack/react-router";
import { linkCompleteSchema } from "@/lib/integration/contracts";
import { apiError, apiSuccess, readJson, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/identity/link/complete")({
  server: { handlers: { POST: async ({ request }) => {
    const id = requestId(request);
    try {
      const { audit, getAdminClient, IntegrationFailure, requireOAuthUser } = await import("@/lib/integration/integration.server");
      const user = await requireOAuthUser(request, ["identity:link"]);
      const parsed = linkCompleteSchema.safeParse(await readJson(request));
      if (!parsed.success) return apiError(id, 400, "invalid_request", "The identity link completion is invalid");
      const admin = await getAdminClient();
      const { data: client } = await admin.from("integration_clients").select("id, application_id, client_id, environment, allowed_scopes, status").eq("client_id", parsed.data.client_id).eq("status", "active").maybeSingle();
      if (!client) throw new IntegrationFailure(400, "invalid_client", "The integration client is not active");
      const granted = user.scopes.filter((scope) => client.allowed_scopes.includes(scope));
      const { data, error } = await admin.from("integration_identity_links").upsert({ client_id: client.id, external_subject: parsed.data.external_subject, user_id: user.userId, granted_scopes: granted, status: "active", revoked_at: null }, { onConflict: "client_id,external_subject" }).select("id, linked_at").single();
      if (error || !data) throw new IntegrationFailure(409, "conflict", "This identity cannot be linked to that external account");
      const context = { id: client.id, applicationId: client.application_id, publicId: client.client_id, scopes: client.allowed_scopes, environment: client.environment, oauthClientId: null };
      await audit({ request, requestId: id, eventType: "identity.linked", outcome: "success", client: context, userId: user.userId, externalSubject: parsed.data.external_subject });
      return apiSuccess(id, { link_id: data.id, identity_id: user.userId, linked_at: data.linked_at, scopes: granted }, 201);
    } catch (error) {
      const { audit, IntegrationFailure } = await import("@/lib/integration/integration.server");
      const failure = error instanceof IntegrationFailure ? error : new IntegrationFailure(503, "temporarily_unavailable", "Unable to process request");
      await audit({ request, requestId: id, eventType: "identity.linked", outcome: "failure", metadata: { error_code: failure.code } });
      return apiError(id, failure.status, failure.code, failure.message);
    }
  } } },
});