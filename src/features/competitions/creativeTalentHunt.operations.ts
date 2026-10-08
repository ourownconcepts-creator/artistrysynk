import { supabase } from "@/integrations/supabase/client";

export type JudgeAssignment = {
  id: string;
  judge_id: string;
  application_id: string;
  round_id: string;
  status: string;
  assigned_at: string;
};

export type ScoringCriterion = {
  id: string;
  competition_id: string;
  round_id: string;
  name: string;
  description: string;
  max_score: number;
  weight: number;
  sort_order: number;
};

export type JudgeQueueEntry = {
  assignment_id: string;
  application_id: string;
  round_id: string;
  display_name: string;
  handle: string;
  category_name: string;
  bio: string;
  audition_url: string;
  round_name: string;
  assignment_status: string;
  criteria_count?: number;
  scored_criteria?: number;
};

export async function listCreativeTalentHuntJudgeAssignments(_judgeUserId: string) {
  // Judge IDs are database records, not auth user IDs. Use the secured queue RPC
  // rather than exposing assignment rows directly to a caller.
  const { data, error } = await supabase.rpc("creative_talent_hunt_judge_queue", {
    p_judge_id: null,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    id: row.assignment_id,
    judge_id: "",
    application_id: row.application_id,
    round_id: row.round_id,
    status: row.status ?? "",
    assigned_at: row.assigned_at ?? "",
  })) as JudgeAssignment[];
}

export async function listCreativeTalentHuntJudgeQueue(judgeUserId: string) {
  const { data, error } = await supabase.rpc("creative_talent_hunt_judge_queue", { p_judge_id: null });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    assignment_id: row.assignment_id,
    application_id: row.application_id,
    round_id: row.round_id,
    display_name: row.display_name ?? "",
    handle: row.handle ?? "",
    category_name: row.category_name ?? "",
    bio: row.bio ?? "",
    audition_url: row.audition_url ?? "",
    round_name: row.round_name ?? "",
    assignment_status: row.status ?? "",
    criteria_count: Number(row.criteria_count ?? 0),
    scored_criteria: Number(row.scored_criteria ?? 0),
  })) as JudgeQueueEntry[];
}

export async function finalizeCreativeTalentHuntScores(assignmentId: string) {
  const { data, error } = await supabase.rpc("finalize_creative_talent_hunt_scores", {
    p_assignment_id: assignmentId,
  });
  if (error) throw error;
  return data;
}

export async function listCreativeTalentHuntCriteria(roundId: string) {
  const { data, error } = await supabase
    .from("competition_scoring_criteria")
    .select("id,competition_id,round_id,name,description,max_score,weight,sort_order")
    .eq("round_id", roundId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScoringCriterion[];
}

export async function saveCreativeTalentHuntScores(
  assignmentId: string,
  scores: Array<{ criterionId: string; score: number; comment?: string }>,
) {
  if (!scores.length) throw new Error("At least one score is required.");

  const { data, error } = await supabase.rpc("save_creative_talent_hunt_scores", {
    p_assignment_id: assignmentId,
    p_scores: scores.map((entry) => ({
      criterion_id: entry.criterionId,
      score: entry.score,
      comment: entry.comment ?? "",
    })),
  });

  if (error) throw error;
  return data;
}
