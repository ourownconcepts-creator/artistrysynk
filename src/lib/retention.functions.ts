import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RetentionPolicyView = {
  id: string;
  category: string;
  description: string;
  retentionRule: string;
  retentionDays: number | null;
  justification: string;
  deletionBehaviour: string;
  isAutomated: boolean;
  targetTable: string | null;
  lastRunAt: string | null;
  lastDeletedCount: number | null;
};

export type RetentionRunView = {
  id: string;
  category: string;
  target: string;
  cutoff: string | null;
  deletedCount: number;
  status: string;
  errorMessage: string | null;
  triggeredBy: string;
  createdAt: string;
};

export type RetentionOverview = {
  policies: RetentionPolicyView[];
  runs: RetentionRunView[];
};

const mapPolicy = (p: Record<string, any>): RetentionPolicyView => ({
  id: p.id,
  category: p.category,
  description: p.description,
  retentionRule: p.retention_rule,
  retentionDays: p.retention_days ?? null,
  justification: p.justification,
  deletionBehaviour: p.deletion_behaviour,
  isAutomated: p.is_automated,
  targetTable: p.target_table ?? null,
  lastRunAt: p.last_run_at ?? null,
  lastDeletedCount: p.last_deleted_count ?? null,
});

const mapRun = (r: Record<string, any>): RetentionRunView => ({
  id: r.id,
  category: r.category,
  target: r.target,
  cutoff: r.cutoff ?? null,
  deletedCount: r.deleted_count ?? 0,
  status: r.status,
  errorMessage: r.error_message ?? null,
  triggeredBy: r.triggered_by,
  createdAt: r.created_at,
});

/** Retention register plus the history of sweeps that enforced it. */
export const getRetentionOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RetentionOverview> => {
    const { assertComplianceAdmin } = await import("./compliance.server");
    await assertComplianceAdmin(context.supabase, context.userId);

    const [policies, runs] = await Promise.all([
      context.supabase.from("retention_policies").select("*").order("category", { ascending: true }),
      context.supabase
        .from("retention_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (policies.error) throw new Error("Could not load the retention register.");

    return {
      policies: (policies.data ?? []).map(mapPolicy),
      runs: (runs.data ?? []).map(mapRun),
    };
  });

/** Lets a compliance admin run the sweep immediately instead of waiting for the schedule. */
export const runRetentionSweepNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({}).default({}))
  .handler(async ({ context }) => {
    const { assertComplianceAdmin, auditCompliance } = await import("./compliance.server");
    const role = await assertComplianceAdmin(context.supabase, context.userId);

    const { runRetentionSweep } = await import("./retention.server");
    const result = await runRetentionSweep(`admin:${context.userId}`);

    const deleted = result.purges.reduce((sum, p) => sum + p.deletedCount, 0);
    await auditCompliance({
      supabase: context.supabase,
      actorId: context.userId,
      actorRole: role,
      action: "compliance.retention.swept",
      targetId: context.userId,
      targetLabel: "retention sweep",
      metadata: { deleted, accounts_purged: result.accountsPurged },
    });

    return { deleted, accountsPurged: result.accountsPurged, purges: result.purges };
  });