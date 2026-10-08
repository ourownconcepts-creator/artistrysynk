import { supabase } from "@/integrations/supabase/client";

export type CreativeTalentHuntResult = {
  application_id: string;
  handle: string;
  display_name: string;
  category_name: string;
  progress_state: string;
  judge_score: number;
  public_votes: number;
  combined_score: number;
};

export async function listCreativeTalentHuntResults(roundId: string, options?: { public?: boolean }) {
  const rpc = options?.public ? "get_public_creative_talent_hunt_results" : "get_creative_talent_hunt_results";
  const { data, error } = await supabase.rpc(rpc, { p_round_id: roundId });
  if (error) throw error;
  return (data ?? []) as CreativeTalentHuntResult[];
}

export async function decideCreativeTalentHuntRound(
  applicationId: string,
  outcome: "ADVANCED" | "ELIMINATED" | "HELD",
  reason = "",
) {
  const { data, error } = await supabase.rpc("decide_creative_talent_hunt_round", {
    p_application_id: applicationId,
    p_outcome: outcome,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}
