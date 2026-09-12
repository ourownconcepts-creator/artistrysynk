import { createFileRoute } from "@tanstack/react-router";
import { claimExchangeSchema } from "@/lib/integration/contracts";
import {
  apiError,
  apiSuccess,
  readJson,
  requestId,
} from "@/lib/integration/http";

/**
 * Server-to-server exchange of the single-use completion code the browser
 * carried back to the partner's registered callback. Returns the ArtistrySynk
 * identity reference for that external account. No tokens are issued here.
 */
export const Route = createFileRoute("/integration/v1/identity/claim/exchange")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const id = requestId(request);
        let client;
        try {
          const {
            audit,
            getAdminClient,
            IntegrationFailure,
            requireClient,
            enforceRateLimit,
          } = await import("@/lib/integration/integration.server");
          client = await requireClient(request, ["identity:create"]);
          await enforceRateLimit(client.id, "identity:claim-exchange", 30);
          const parsed = claimExchangeSchema.safeParse(await readJson(request));
          if (!parsed.success)
            return apiError(
              id,
              400,
              "invalid_request",
              "A valid completion code is required",
              undefined,
              [{ field: "code", issue: "required, 32-200 characters" }],
            );
          const { createHash } = await import("node:crypto");
          const admin = await getAdminClient();
          const codeHash = createHash("sha256")
            .update(parsed.data.code)
            .digest("hex");
          const { data: record } = await admin
            .from("integration_completion_codes")
            .select(
              "id, client_id, user_id, external_subject, granted_scopes, status, expires_at",
            )
            .eq("code_hash", codeHash)
            .maybeSingle();
          if (
            !record ||
            record.client_id !== client.id ||
            record.status !== "pending" ||
            new Date(record.expires_at) <= new Date()
          ) {
            throw new IntegrationFailure(
              400,
              "invalid_request",
              "This completion code is invalid, expired or already used",
            );
          }
          // Single-use: the conditional update is the replay guard.
          const { data: consumed } = await admin
            .from("integration_completion_codes")
            .update({
              status: "consumed",
              consumed_at: new Date().toISOString(),
            })
            .eq("id", record.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();
          if (!consumed)
            throw new IntegrationFailure(
              400,
              "invalid_request",
              "This completion code is invalid, expired or already used",
            );

          const { data: link } = await admin
            .from("integration_identity_links")
            .select("id, linked_at, granted_scopes, status")
            .eq("client_id", client.id)
            .eq("external_subject", record.external_subject)
            .maybeSingle();
          if (!link || link.status !== "active")
            throw new IntegrationFailure(
              409,
              "conflict",
              "This connection is no longer active",
            );

          await audit({
            request,
            requestId: id,
            eventType: "identity.linked",
            outcome: "success",
            client,
            userId: record.user_id,
            externalSubject: record.external_subject,
            metadata: { completion_code_exchanged: true },
          });
          return apiSuccess(id, {
            identity_id: record.user_id,
            external_subject: record.external_subject,
            link_id: link.id,
            linked_at: link.linked_at,
            scopes: link.granted_scopes ?? record.granted_scopes,
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
            eventType: "identity.linked",
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
