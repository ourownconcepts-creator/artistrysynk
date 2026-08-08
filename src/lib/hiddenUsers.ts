import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the set of user IDs the current user has blocked or muted.
 * Blocked users are hidden everywhere; muted users are hidden from
 * discovery/feed surfaces but conversations remain accessible.
 */
export const fetchHiddenUserIds = async (
  userId: string,
): Promise<{ blocked: string[]; muted: string[]; all: string[] }> => {
  const [{ data: blocks }, { data: mutes }] = await Promise.all([
    supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId),
    supabase.from("muted_users").select("muted_id").eq("muter_id", userId),
  ]);

  const blocked = (blocks || []).map((b) => b.blocked_id);
  const muted = (mutes || []).map((m) => m.muted_id);
  return { blocked, muted, all: [...new Set([...blocked, ...muted])] };
};
