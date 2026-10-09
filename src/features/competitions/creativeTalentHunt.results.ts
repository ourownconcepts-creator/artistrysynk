import { supabase } from "@/integrations/supabase/client";

export type CreativeTalentHuntResult = {
  application_id: string; handle: string; display_name: string; category_name: string;
  progress_state: string; judge_score: number; public_votes: number; combined_score: number | null;
};

export async function listCreativeTalentHuntResults(roundId: string, options?: { public?: boolean }) {
  const rpc = options?.public ? "get_public_creative_talent_hunt_results" : "get_creative_talent_hunt_results";
  const { data, error } = await supabase.rpc(rpc, { p_round_id: roundId });
  if (error) throw error;
  return (data ?? []) as CreativeTalentHuntResult[];
}

export async function decideCreativeTalentHuntRound(applicationId: string, outcome: "ADVANCED" | "ELIMINATED" | "HELD", reason = "") {
  const { data, error } = await supabase.rpc("decide_creative_talent_hunt_round", { p_application_id: applicationId, p_outcome: outcome, p_reason: reason });
  if (error) throw error;
  return data;
}

export async function getCreativeTalentHuntRoundProgress(roundId: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_round_progress", { p_round_id: roundId });
  if (error) throw error;
  return data;
}

export async function setCreativeTalentHuntRoundStatus(roundId: string, status: string, options?: { override?: boolean; reason?: string }) {
  const { data, error } = await supabase.rpc("set_creative_talent_hunt_round_status", { p_round_id: roundId, p_status: status, p_override: options?.override ?? false, p_reason: options?.reason ?? "" });
  if (error) throw error;
  return data;
}

export async function correctCreativeTalentHuntScore(scoreId: string, value: number, reason: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_correct_score", { p_score_id: scoreId, p_value: value, p_reason: reason });
  if (error) throw error;
  return data;
}

export type CreativeTalentHuntScoreCorrection = { id: string; score_id: string; actor_user_id: string; metadata: Record<string, unknown>; created_at: string };

export async function listCreativeTalentHuntScoreCorrections() {
  const { data, error } = await supabase.rpc("creative_talent_hunt_list_score_corrections");
  if (error) throw error;
  return (data ?? []) as unknown as CreativeTalentHuntScoreCorrection[];
}

export async function getCreativeTalentHuntJudgeDashboard(judgeId?: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_judge_dashboard", { p_judge_id: judgeId ?? null });
  if (error) throw error;
  return data as { assignments: number; scored: number; pending: number };
}

export type CreativeTalentHuntScoreDetail = {
  score_id: string; assignment_id: string; application_id: string; display_name: string; handle: string;
  judge_name: string; criterion_name: string; score: number; max_score: number; assignment_status: string;
};

export async function listCreativeTalentHuntScoreDetails(roundId: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_score_details", { p_round_id: roundId });
  if (error) throw error;
  return (data ?? []) as unknown as CreativeTalentHuntScoreDetail[];
}
