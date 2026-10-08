import { supabase } from "@/integrations/supabase/client";

export type TalentHuntAdminSnapshot = {
  competition: { id: string; status: string; name: string; description: string };
  rounds: Array<{ id: string; name: string; status: string; sequence: number; scoring_enabled: boolean; public_voting_enabled: boolean }>;
  applications: number;
  pending_review: number;
  approved: number;
  public_entries: number;
  votes: number;
};

export async function getTalentHuntAdminSnapshot() {
  const { data, error } = await supabase.rpc("creative_talent_hunt_admin_snapshot");
  if (error) throw error;
  return data as TalentHuntAdminSnapshot;
}

export async function setTalentHuntStatus(status: string) {
  const { data, error } = await supabase.rpc("set_creative_talent_hunt_status", { p_status: status });
  if (error) throw error;
  return data;
}

export async function setTalentHuntRoundStatus(roundId: string, status: string) {
  const { data, error } = await supabase.rpc("set_creative_talent_hunt_round_status", {
    p_round_id: roundId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

export async function getTalentHuntVotingSummary(roundId: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_admin_voting_summary", {
    p_round_id: roundId,
  });
  if (error) throw error;
  return data ?? [];
}


export async function getTalentHuntVoteTotals(roundId: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_vote_totals", { p_round_id: roundId });
  if (error) throw error;
  return data ?? [];
}

export async function getTalentHuntSuspiciousVotes(roundId: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_suspicious_votes", { p_round_id: roundId });
  if (error) throw error;
  return data ?? [];
}

export async function voidTalentHuntVotes(reason: string, target: { applicationId?: string; voterId?: string; voteIds?: string[] }) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_void_votes", {
    p_reason: reason,
    p_application_id: target.applicationId ?? null,
    p_voter_id: target.voterId ?? null,
    p_vote_ids: target.voteIds ?? null,
  });
  if (error) throw error;
  return data;
}

export async function setTalentHuntVotingWindow(opensAt: string | null, closesAt: string | null) {
  const { data, error } = await supabase.rpc("set_creative_talent_hunt_voting_window", {
    p_opens_at: opensAt,
    p_closes_at: closesAt,
  });
  if (error) throw error;
  return data;
}

export async function closeTalentHuntVoting() {
  const { data, error } = await supabase.rpc("close_creative_talent_hunt_voting");
  if (error) throw error;
  return data;
}
