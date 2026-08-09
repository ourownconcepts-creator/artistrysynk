import { supabase } from "@/integrations/supabase/client";

export type DiscoverySurface = "discovery" | "search" | "recommendations";

/**
 * IDs of users who switched themselves off for a given surface in their
 * privacy settings. Resolved server-side so no one can read another
 * person's settings row.
 */
export const fetchOptedOutIds = async (surface: DiscoverySurface): Promise<string[]> => {
  const { data, error } = await supabase.rpc("list_opted_out_ids", { _surface: surface });
  if (error) return [];
  return (data ?? []).map((row: { user_id: string }) => row.user_id);
};
