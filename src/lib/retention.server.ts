/**
 * Retention enforcement. The published retention register (retention_policies)
 * is the single source of truth: `run_retention_purges` walks the automated
 * rules and deletes what has aged out, writing one retention_runs row per rule.
 *
 * Account deletion is handled here rather than in SQL because removing the
 * auth account needs the admin API.
 */

export type RetentionSweepResult = {
  purges: {
    category: string;
    target: string;
    deletedCount: number;
    status: string;
    errorMessage: string | null;
  }[];
  accountsPurged: number;
  accountErrors: string[];
};

export async function runRetentionSweep(triggeredBy: string): Promise<RetentionSweepResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin.rpc("run_retention_purges", {
    _triggered_by: triggeredBy,
  });
  if (error) throw new Error(error.message);

  const purges = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    category: String(row['category'] ?? ""),
    target: String(row['target'] ?? ""),
    deletedCount: Number(row['deleted_count'] ?? 0),
    status: String(row['status'] ?? "success"),
    errorMessage: (row['error_message'] as string | null) ?? null,
  }));

  const accounts = await purgeExpiredAccounts();

  return { purges, accountsPurged: accounts.purged, accountErrors: accounts.errors };
}

/**
 * Completes deletion requests whose 7-day grace period has passed. Without
 * this the grace period never ends and the data is kept indefinitely.
 */
async function purgeExpiredAccounts(): Promise<{ purged: number; errors: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { purgeUser } = await import("./account-deletion.server");

  const { data: due, error } = await supabaseAdmin
    .from("account_deletion_requests")
    .select("id, user_id")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(50);
  if (error) return { purged: 0, errors: [error.message] };

  let purged = 0;
  const errors: string[] = [];

  for (const request of due ?? []) {
    try {
      await purgeUser(request.user_id);
      await supabaseAdmin
        .from("account_deletion_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", request.id);
      purged += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { purged, errors };
}