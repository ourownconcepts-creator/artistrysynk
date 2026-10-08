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

export async function listCreativeTalentHuntResults(roundId: string) {
  const { data, error } = await supabase
    .from("competition_applications")
    .select("id,handle,display_name,progress_state,competition_categories(name)")
    .eq("competition_id", (
      await supabase.from("competition_rounds").select("competition_id").eq("id", roundId).single()
    ).data?.competition_id ?? "")
    .eq("current_round_id", roundId)
    .order("display_name");

  if (error) throw error;
  const applications = (data ?? []) as any[];
  if (!applications.length) return [] as CreativeTalentHuntResult[];

  const ids = applications.map((a) => a.id);
  const { data: votes, error: voteError } = await supabase
    .from("competition_votes")
    .select("application_id")
    .eq("round_id", roundId)
    .in("application_id", ids);
  if (voteError) throw voteError;

  const voteCounts = new Map<string, number>();
  for (const vote of votes ?? []) voteCounts.set(vote.application_id, (voteCounts.get(vote.application_id) ?? 0) + 1);

  return applications.map((a) => ({
    application_id: a.id,
    handle: a.handle,
    display_name: a.display_name,
    category_name: a.competition_categories?.name ?? "",
    progress_state: a.progress_state,
    judge_score: 0,
    public_votes: voteCounts.get(a.id) ?? 0,
    combined_score: voteCounts.get(a.id) ?? 0,
  })) as CreativeTalentHuntResult[];
}

export async function decideCreativeTalentHuntRound(
  applicationId: string,
  outcome: "ADVANCED" | "ELIMINATED" | "HELD",
) {
  const { data, error } = await supabase.rpc("decide_creative_talent_hunt_round", {
    p_application_id: applicationId,
    p_outcome: outcome,
  });
  if (error) throw error;
  return data;
}
