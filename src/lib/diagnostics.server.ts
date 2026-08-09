/**
 * Records transport-level diagnostics (client disconnects/aborts, server 5xx)
 * into function_run_logs so /admin-diagnostics can correlate them by
 * correlation id. These are deliberately kept out of the error alerting path:
 * a disconnect is not an application fault, it is debugging signal.
 */
import { recordFunctionRun } from "@/lib/functionRunLog.server";

export const DISCONNECT_FUNCTION = "client-disconnect";
export const SERVER_ERROR_FUNCTION = "server-5xx";

export type DiagnosticEvent = {
  kind: "client-disconnect" | "server-5xx";
  route?: string | null;
  correlationId?: string | null;
  reason?: string | null;
  phase?: string | null;
  httpStatus?: number | null;
  userAgent?: string | null;
  durationMs?: number;
};

export async function recordDiagnosticEvent(event: DiagnosticEvent): Promise<void> {
  await recordFunctionRun({
    functionName: event.kind === "server-5xx" ? SERVER_ERROR_FUNCTION : DISCONNECT_FUNCTION,
    status: "error",
    durationMs: event.durationMs ?? 0,
    errorMessage: (event.reason ?? event.kind).slice(0, 400),
    context: {
      kind: event.kind,
      route: event.route ? event.route.slice(0, 300) : null,
      correlation_id: event.correlationId ?? null,
      phase: event.phase ?? null,
      http_status: event.httpStatus ?? null,
      user_agent: event.userAgent ? event.userAgent.slice(0, 300) : null,
    },
  });
}
