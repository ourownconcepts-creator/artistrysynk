import { supabase } from "@/integrations/supabase/client";

// Creative Talent Hunt public pages, voting and admin operations.
// Every privileged call is authorised inside the database (cth_is_competition_admin()).

const SLUG = "creative-talent-hunt";

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export type CompetitionInfo = {
  id: string;
  name: string;
  status: string;
  description: string;
  registration_starts_at: string | null;
  registration_ends_at: string | null;
  voting_starts_at: string | null;
  voting_ends_at: string | null;
  config: {
    rules?: string[];
    eligibility?: string[];
    consent_requirements?: string[];
    prizes?: string[];
    judges_public?: boolean;
    judge_weight?: number;
    public_vote_weight?: number;
    leaderboard_published?: boolean;
    age_min?: number;
  };
};

export async function getCompetitionInfo(): Promise<CompetitionInfo> {
  const { data, error } = await supabase
    .from("competition_competitions")
    .select("id, name, status, description, registration_starts_at, registration_ends_at, voting_starts_at, voting_ends_at, config")
    .eq("slug", SLUG)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as CompetitionInfo;
}

export type Category = { id: string; name: string; slug: string; sort_order: number };
export async function listCategories(): Promise<Category[]> {
  const info = await getCompetitionInfo();
  const { data, error } = await supabase
    .from("competition_categories")
    .select("id, name, slug, sort_order")
    .eq("competition_id", info.id)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export type Round = { id: string; name: string; slug: string; status: string; sequence: number; public_voting_enabled: boolean };
export async function listRounds(): Promise<Round[]> {
  const info = await getCompetitionInfo();
  const { data, error } = await supabase
    .from("competition_rounds")
    .select("id, name, slug, status, sequence, public_voting_enabled")
    .eq("competition_id", info.id)
    .order("sequence");
  if (error) throw new Error(error.message);
  return (data ?? []) as Round[];
}

export type PublicContestant = {
  id: string; handle: string; display_name: string; location: string; bio: string; experience: string;
  audition_url: string; category_name: string; category_slug: string; progress_state: string;
  current_round_id: string | null; round_name: string | null; voting_open: boolean;
};
export async function getPublicContestant(handle: string): Promise<PublicContestant | null> {
  const rows = unwrap<PublicContestant[]>(await supabase.rpc("get_public_creative_talent_hunt_contestant", { p_handle: handle }));
  return rows?.[0] ?? null;
}

export async function listPublicJudges() {
  return unwrap<Array<{ display_name: string; bio: string }>>(await supabase.rpc("get_public_creative_talent_hunt_judges")) ?? [];
}

export type VoteResult = { ok: boolean; reason?: string; votes_remaining_today?: number };
export const VOTE_REASON_TEXT: Record<string, string> = {
  NOT_AUTHENTICATED: "Sign in to vote.",
  NOT_FOUND: "This entry is not open for votes.",
  SELF_VOTE: "You can't vote for your own entry.",
  WINDOW_CLOSED: "Voting is closed right now.",
  RATE_LIMITED: "You're voting too fast. Try again in a minute.",
  DAILY_LIMIT_REACHED: "You've used all your votes for today.",
  DUPLICATE: "You've already voted for this entry in this round.",
};
export async function castVote(applicationId: string, roundId: string) {
  return unwrap<VoteResult>(await supabase.rpc("cast_creative_talent_hunt_vote", { p_application_id: applicationId, p_round_id: roundId }));
}

// ---------- Admin ----------
export async function setVotingWindow(startsAt: string | null, endsAt: string | null, reason: string) {
  unwrap(await supabase.rpc("admin_cth_set_voting_window", { p_starts_at: startsAt as string, p_ends_at: endsAt as string, p_reason: reason }));
}
export async function setRoundVoting(roundId: string, enabled: boolean) {
  unwrap(await supabase.rpc("admin_cth_set_round_voting", { p_round_id: roundId, p_enabled: enabled }));
}
export async function setScoringWeights(judgeWeight: number, voteWeight: number) {
  unwrap(await supabase.rpc("admin_cth_set_scoring_weights", { p_judge_weight: judgeWeight, p_public_vote_weight: voteWeight }));
}
export async function updatePublicInfo(info: Partial<Pick<CompetitionInfo["config"], "rules" | "eligibility" | "consent_requirements" | "prizes" | "judges_public">>) {
  unwrap(await supabase.rpc("admin_cth_update_public_info", { p_info: info }));
}
export type VoteTotal = {
  application_id: string; display_name: string; handle: string; category_name: string; round_name: string | null;
  valid_votes: number; voided_votes: number; distinct_voters: number; last_vote_at: string | null;
};
export async function getVoteTotals() {
  return unwrap<VoteTotal[]>(await supabase.rpc("admin_cth_vote_totals")) ?? [];
}
export type SuspiciousVoter = {
  voter_user_id: string; username: string | null; votes_today: number; votes_last_hour: number;
  distinct_contestants: number; account_created_at: string | null;
};
export async function getSuspiciousVoters() {
  return unwrap<SuspiciousVoter[]>(await supabase.rpc("admin_cth_suspicious_votes", { p_limit: 50 })) ?? [];
}
export async function voidVotes(reason: string, target: { applicationId?: string; voterUserId?: string }) {
  return unwrap<{ ok: boolean; voided: number }>(await supabase.rpc("admin_cth_void_votes", {
    p_reason: reason, p_application_id: target.applicationId, p_voter_user_id: target.voterUserId,
  }));
}
export async function decideRound(applicationId: string, outcome: "ADVANCED" | "ELIMINATED" | "HELD") {
  return unwrap<{ ok: boolean }>(await supabase.rpc("decide_creative_talent_hunt_round", { p_application_id: applicationId, p_outcome: outcome }));
}
export type AuditEntry = { id: string; action: string; entity_type: string; entity_id: string | null; actor_username: string | null; metadata: Record<string, unknown>; created_at: string };
export async function getAuditFeed() {
  return unwrap<AuditEntry[]>(await supabase.rpc("admin_cth_audit_feed", { p_limit: 100 })) ?? [];
}
