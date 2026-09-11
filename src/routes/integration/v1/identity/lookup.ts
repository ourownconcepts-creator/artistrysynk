import { createFileRoute } from "@tanstack/react-router";
import { lookupSchema } from "@/lib/integration/contracts";
import { apiError, apiSuccess, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/identity/lookup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = requestId(request);
        let client;
        try {
          const {
            audit,
            enforceRateLimit,
            getAdminClient,
            IntegrationFailure,
            requireClient,
          } = await import("@/lib/integration/integration.server");
          client = await requireClient(request, ["identity:read"]);
          await enforceRateLimit(client.id, "identity:read", 60);
          const parsed = lookupSchema.safeParse({
            external_subject: new URL(request.url).searchParams.get(
              "external_subject",
            ),
          });
          if (!parsed.success)
            return apiError(
              id,
              400,
              "invalid_request",
              "external_subject is required",
            );
          const admin = await getAdminClient();
          const { data, error } = await admin
            .from("integration_identity_links")
            .select("user_id, status, linked_at, granted_scopes")
            .eq("client_id", client.id)
            .eq("external_subject", parsed.data.external_subject)
            .eq("status", "active")
            .maybeSingle();
          if (error)
            throw new IntegrationFailure(
              503,
              "temporarily_unavailable",
              "Unable to read identity link",
            );
          if (!data)
            throw new IntegrationFailure(
              404,
              "not_found",
              "No active identity link was found",
            );
          await audit({
            request,
            requestId: id,
            eventType: "identity.lookup",
            outcome: "success",
            client,
            userId: data.user_id,
            externalSubject: parsed.data.external_subject,
          });
          return apiSuccess(id, {
            identity_id: data.user_id,
            status: data.status,
            linked_at: data.linked_at,
            scopes: data.granted_scopes,
          });
        } catch (error) {
          const { audit, IntegrationFailure } =
            await import("@/lib/integration/integration.server");
          const failure =
            error instanceof IntegrationFailure
              ? error
              : new IntegrationFailure(
                  503,
                  "temporarily_unavailable",
                  "Unable to process request",
                );
          await audit({
            request,
            requestId: id,
            eventType: "identity.lookup",
            outcome: "failure",
            client,
            metadata: { error_code: failure.code },
          });
          return apiError(
            id,
            failure.status,
            failure.code,
            failure.message,
            failure.status === 429 ? { "Retry-After": "60" } : undefined,
          );
        }
      },
    },
  },
});
