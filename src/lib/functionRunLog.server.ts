/**
 * Records server-function runs (support + notification jobs) so admins can
 * review run history, statuses and recent errors from the admin dashboard.
 */
export type RunContext = Record<string, string | number | boolean | null>;

export async function recordFunctionRun(entry: {
  functionName: string;
  status: "success" | "error";
  durationMs: number;
  errorMessage?: string | null;
  context?: RunContext;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("function_run_logs").insert({
      function_name: entry.functionName,
      status: entry.status,
      duration_ms: Math.round(entry.durationMs),
      error_message: entry.errorMessage ? String(entry.errorMessage).slice(0, 1000) : null,
      context: (entry.context ?? {}) as never,
    });
  } catch (err) {
    console.error("[functionRunLog] failed to record run", err);
  }
}

/** Runs `fn`, logging success/failure and duration. Re-throws on failure. */
export async function withRunLog<T>(
  functionName: string,
  context: RunContext,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    await recordFunctionRun({ functionName, status: "success", durationMs: Date.now() - start, context });
    return result;
  } catch (err) {
    await recordFunctionRun({
      functionName,
      status: "error",
      durationMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
      context,
    });
    throw err;
  }
}
