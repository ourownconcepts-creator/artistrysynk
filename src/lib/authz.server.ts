import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_ROLES = ["admin", "master_admin", "super_admin"] as const;

/**
 * Verifies the caller holds an admin-level role using their own
 * (RLS-scoped) client. Throws when they do not.
 */
export async function assertAdmin(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Unable to verify permissions");
  const isAdmin = (data ?? []).some((r: { role: string }) =>
    (ADMIN_ROLES as readonly string[]).includes(r.role),
  );
  if (!isAdmin) throw new Error("Forbidden");
}
