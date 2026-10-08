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
};

export async function listCreativeTalentHuntJudgeAssignments(judgeUserId: string) {
  const { data, error } = await supabase
    .from("competition_judge_assignments")
    .select("id,judge_id,application_id,round_id,status,assigned_at")
    .eq("judge_id", judgeUserId)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JudgeAssignment[];
}

export async function listCreativeTalentHuntJudgeQueue(judgeUserId: string) {
  const { data: judge, error: judgeError } = await supabase
    .from("competition_judges")
    .select("id")
    .eq("user_id", judgeUserId)
    .eq("is_active", true)
    .maybeSingle();
  if (judgeError) throw judgeError;
  if (!judge) return [] as JudgeQueueEntry[];

  const { data, error } = await supabase
    .from("competition_judge_assignments")
    .select(
      "id,application_id,round_id,status,competition_applications(display_name,handle,bio,audition_url,competition_categories(name)),competition_rounds(name)",
    )
    .eq("judge_id", judge.id)
    .eq("status", "ASSIGNED")
    .order("assigned_at", { ascending: true });
  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    assignment_id: row.id,
    application_id: row.application_id,
    round_id: row.round_id,
    display_name: row.competition_applications?.display_name ?? "",
    handle: row.competition_applications?.handle ?? "",
    category_name: row.competition_applications?.competition_categories?.name ?? "",
    bio: row.competition_applications?.bio ?? "",
    audition_url: row.competition_applications?.audition_url ?? "",
    round_name: row.competition_rounds?.name ?? "",
    assignment_status: row.status,
  })) satisfies JudgeQueueEntry[];
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
