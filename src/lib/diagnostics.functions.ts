import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const reportSchema = z.object({
  reason: z.string().min(1).max(300),
  route: z.string().max(300).optional(),
  correlationId: z.string().max(80).optional(),
  phase: z.string().max(60).optional(),
  userAgent: z.string().max(300).optional(),
});

/**
 * Public: the browser reports its own aborts / dropped asset loads here.
 * Writes a diagnostics row only — never user data, never an alert.
 */
export const reportClientDisconnect = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reportSchema.parse(input))
  .handler(async ({ data }) => {
    const { recordDiagnosticEvent } = await import("@/lib/diagnostics.server");
    const { sanitizeCorrelationId } = await import("@/lib/correlation");
    await recordDiagnosticEvent({
      kind: "client-disconnect",
      reason: data.reason,
      route: data.route ?? null,
      correlationId: sanitizeCorrelationId(data.correlationId),
      phase: data.phase ?? "client",
      userAgent: data.userAgent ?? null,
    });
    return { recorded: true };
  });

const listSchema = z.object({
  hours: z.number().int().min(1).max(720).default(24),
  limit: z.number().int().min(1).max(300).default(150),
  kind: z.enum(["all", "client-disconnect", "server-5xx", "client-runtime-error"]).default("all"),
});

export const listDiagnosticEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(listSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    const { listDiagnostics } = await import("@/lib/diagnostics-query.server");
    return listDiagnostics(context.supabase, data);
  });
