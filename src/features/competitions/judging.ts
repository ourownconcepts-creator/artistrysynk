// Pure judging math. Mirrors public.cth_assignment_score() in the database,
// which stays the authoritative source for stored results.

export type Criterion = { id: string; name: string; description?: string; max_score: number; weight: number };
export type CriterionScore = { criterion_id: string; score: number };
export type AssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "FINALIZED" | "REMOVED";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isValidScore(score: number, max: number): boolean {
  return Number.isFinite(score) && score >= 0 && score <= max;
}

/** Weighted score normalized to 0–100; null when nothing is scored. */
export function weightedScore(criteria: Criterion[], scores: CriterionScore[]): number | null {
  const byId = new Map(criteria.map((c) => [c.id, c]));
  let total = 0;
  let weights = 0;
  for (const s of scores) {
    const c = byId.get(s.criterion_id);
    if (!c) continue;
    if (!isValidScore(s.score, c.max_score)) throw new Error(`Score for ${c.name} must be between 0 and ${c.max_score}`);
    total += (s.score / c.max_score) * c.weight;
    weights += c.weight;
  }
  return weights > 0 ? round2((total / weights) * 100) : null;
}

export function isComplete(criteria: Criterion[], scores: CriterionScore[]): boolean {
  const scored = new Set(scores.map((s) => s.criterion_id));
  return criteria.every((c) => scored.has(c.id));
}

export function canEditAssignment(status: AssignmentStatus): boolean {
  return status === "ASSIGNED" || status === "IN_PROGRESS";
}

export function canFinalize(status: AssignmentStatus, criteria: Criterion[], scores: CriterionScore[]): boolean {
  return canEditAssignment(status) && criteria.length > 0 && isComplete(criteria, scores);
}

/** Average of finalized judge scores; null if none finalized. */
export function contestantScore(judgeScores: Array<number | null>): number | null {
  const valid = judgeScores.filter((s): s is number => typeof s === "number");
  return valid.length ? round2(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
}

/** Standard competition ranking (1,2,2,4); unscored entries get null rank and sort last. */
export function rankResults<T extends { score: number | null }>(rows: T[]): Array<T & { rank: number | null }> {
  const sorted = [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((row, i) => {
    if (row.score === null) return { ...row, rank: null };
    if (row.score !== lastScore) { lastRank = i + 1; lastScore = row.score; }
    return { ...row, rank: lastRank };
  });
}

/** Future public-vote blend. With voteWeight 0 the result equals the judge score. */
export function combinedScore(judge: number, vote: number | null, judgeWeight = 1, voteWeight = 0): number {
  if (vote === null || voteWeight <= 0) return round2(judge);
  return round2((judge * judgeWeight + vote * voteWeight) / (judgeWeight + voteWeight));
}
