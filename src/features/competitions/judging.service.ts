import { supabase } from "@/integrations/supabase/client";
import type { AssignmentStatus, Criterion, CriterionScore } from "./judging";

export type JudgeSummary = {
  id: string; user_id: string; display_name: string; bio: string; is_active: boolean;
  username: string | null; assigned: number; finalized: number;
};
export type ContestantSummary = {
  id: string; display_name: string; handle: string; category_name: string;
  assignments: Array<{ id: string; judge_id: string; status: AssignmentStatus }>;
};
export type JudgingOverview = { judges: JudgeSummary[]; contestants: ContestantSummary[]; leaderboard_published: boolean };

export type JudgeAssignment = {
  id: string; status: AssignmentStatus; comment: string; finalized_at: string | null;
  application_id: string; display_name: string; handle: string; location: string; bio: string;
  experience: string; audition_url: string; audition_notes: string; category_name: string;
  scores: CriterionScore[];
};
export type MyJudging = { is_judge: boolean; assignments: JudgeAssignment[]; criteria: Criterion[] };

export type AdminResult = {
  application_id: string; display_name: string; handle: string; category_name: string;
  judge_score: number | null; finalized_count: number; assigned_count: number; rank: number | null;
  breakdown: Array<{ judge: string; status: AssignmentStatus; score: number | null; comment: string }>;
};
export type PublicLeaderboardRow = {
  rank: number; application_id: string; display_name: string; handle: string;
  category_name: string; judge_score: number; combined_score: number;
};

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function isCompetitionAdmin() {
  return unwrap<boolean>(await supabase.rpc("cth_is_competition_admin"));
}
export async function getJudgingOverview() {
  return unwrap<JudgingOverview>(await supabase.rpc("admin_cth_judging_overview"));
}
export async function upsertJudge(username: string, displayName?: string, bio = "") {
  return unwrap<string>(await supabase.rpc("admin_cth_upsert_judge", { p_username: username, p_display_name: displayName, p_bio: bio }));
}
export async function setJudgeActive(judgeId: string, active: boolean) {
  unwrap(await supabase.rpc("admin_cth_set_judge_active", { p_judge_id: judgeId, p_active: active }));
}
export async function assignJudge(judgeId: string, applicationId: string) {
  return unwrap<string>(await supabase.rpc("admin_cth_assign_judge", { p_judge_id: judgeId, p_application_id: applicationId }));
}
export async function unassignJudge(assignmentId: string) {
  unwrap(await supabase.rpc("admin_cth_unassign_judge", { p_assignment_id: assignmentId }));
}
export async function setLeaderboardPublished(published: boolean) {
  unwrap(await supabase.rpc("admin_cth_set_leaderboard_published", { p_published: published }));
}
/** Admin-only detailed ranking, including per-judge breakdown. */
export async function getAdminResults() {
  return unwrap<AdminResult[]>(await supabase.rpc("admin_cth_results")) ?? [];
}

export async function getMyJudging() {
  return unwrap<MyJudging>(await supabase.rpc("judge_cth_my_assignments"));
}
export async function saveScores(assignmentId: string, scores: CriterionScore[], comment: string) {
  return unwrap<{ score: number | null }>(
    await supabase.rpc("judge_cth_save_scores", { p_assignment_id: assignmentId, p_scores: scores, p_comment: comment }),
  );
}
export async function finalizeAssignment(assignmentId: string) {
  return unwrap<{ score: number }>(await supabase.rpc("judge_cth_finalize", { p_assignment_id: assignmentId }));
}

/** Public leaderboard: empty until an admin publishes it. No judge identities. */
export async function getPublicLeaderboard() {
  return unwrap<PublicLeaderboardRow[]>(await supabase.rpc("get_public_creative_talent_hunt_leaderboard")) ?? [];
}
