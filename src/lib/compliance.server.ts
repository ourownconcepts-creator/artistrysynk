import type { SupabaseClient } from "@supabase/supabase-js";

const COMPLIANCE_ROLES = ["admin", "master_admin", "super_admin", "compliance_admin"] as const;

/**
 * Compliance registers are admin-only. Verified through the caller's own
 * RLS-scoped client so no privileged client is needed for register reads.
 */
export async function assertComplianceAdmin(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Unable to verify permissions");
  const role = (data ?? [])
    .map((r: { role: string }) => r.role)
    .find((r: string) => (COMPLIANCE_ROLES as readonly string[]).includes(r));
  if (!role) throw new Error("Forbidden");
  return role;
}

export async function auditCompliance(args: {
  supabase: SupabaseClient<any, any, any>;
  actorId: string;
  actorRole: string;
  action: string;
  targetId: string;
  targetLabel: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await args.supabase.from("admin_audit_logs").insert({
    actor_id: args.actorId,
    actor_role: args.actorRole,
    action: args.action,
    target_type: "compliance_record",
    target_id: args.targetId,
    target_label: args.targetLabel,
    metadata: args.metadata,
  });
}
