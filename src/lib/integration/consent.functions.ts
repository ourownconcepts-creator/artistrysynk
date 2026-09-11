import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Records consent-screen outcomes in the integration audit trail.
 * Never receives or stores authorization codes, tokens or client secrets —
 * only the opaque authorization request id and the decision.
 */
export const recordAuthorizationDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        authorizationId: z.string().min(8).max(200),
        decision: z.enum(["started", "approved", "denied", "failed"]),
        clientName: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    try {
      const { createHash } = await import("node:crypto");
      const { supabaseAdmin } =
        await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("integration_audit_events").insert({
        event_type: `authorization.${data.decision}`,
        outcome: data.decision === "failed" ? "failure" : "success",
        subject_user_id: context.userId,
        request_id: crypto.randomUUID(),
        metadata: {
          authorization_ref: createHash("sha256")
            .update(data.authorizationId)
            .digest("hex")
            .slice(0, 32),
          ...(data.clientName ? { client_name: data.clientName } : {}),
        },
      });
    } catch {
      // Audit failures must never block or leak details to the consent screen.
    }
    return { recorded: true };
  });
