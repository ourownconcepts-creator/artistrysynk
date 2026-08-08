import { getRoleLabel } from "@/lib/creativeRoles";

/**
 * Shared search/gallery ranking.
 *
 * Filters stay authoritative: ranking never adds or removes results, it only
 * orders the rows that already passed every active filter. Exact role/skill
 * matches outrank partial text matches, and popular creators break ties.
 */
export interface PopularitySignals {
  isVerified?: boolean | null;
  isFeatured?: boolean | null;
  synergy?: number | null;
  works?: number | null;
  reviews?: number | null;
}

export interface RankInput {
  /** Raw search text typed by the user (may be empty). */
  query: string;
  /** Creative role values (enum values, e.g. "music_producer"). */
  roles?: string[];
  /** Free-form skill tags. */
  skills?: string[];
  /** Other searchable text: titles, names, usernames, locations. */
  text?: (string | null | undefined)[];
  /** Roles/skills the user explicitly filtered on — exact hits get boosted. */
  activeRoles?: string[];
  activeSkills?: string[];
  popularity?: PopularitySignals;
}

const norm = (value: string) => value.trim().toLowerCase();

export const popularityScore = (p: PopularitySignals = {}): number =>
  (p.isVerified ? 14 : 0) +
  (p.isFeatured ? 10 : 0) +
  Math.min(20, Math.max(0, (p.synergy ?? 0) / 2)) +
  Math.min(10, Math.max(0, p.works ?? 0)) +
  Math.min(8, Math.max(0, (p.reviews ?? 0) / 2));

export const rankScore = (input: RankInput): number => {
  const q = norm(input.query ?? "");
  const roles = (input.roles ?? []).map(norm);
  const roleLabels = (input.roles ?? []).map((r) => norm(getRoleLabel(r)));
  const skills = (input.skills ?? []).map(norm);
  let score = popularityScore(input.popularity);

  // Exact hits on the filters the user selected rank highest.
  for (const role of input.activeRoles ?? []) {
    if (roles.includes(norm(role))) score += 45;
  }
  for (const skill of input.activeSkills ?? []) {
    if (skills.includes(norm(skill))) score += 40;
  }

  if (!q) return score;

  // Exact role / skill matches on the typed query.
  if (roles.includes(q) || roleLabels.includes(q)) score += 70;
  else if (roleLabels.some((label) => label.startsWith(q))) score += 32;
  else if (roleLabels.some((label) => label.includes(q))) score += 16;

  if (skills.includes(q)) score += 60;
  else if (skills.some((s) => s.startsWith(q))) score += 28;
  else if (skills.some((s) => s.includes(q))) score += 14;

  for (const raw of input.text ?? []) {
    const value = norm(raw ?? "");
    if (!value) continue;
    if (value === q) score += 50;
    else if (value.startsWith(q)) score += 22;
    else if (value.includes(q)) score += 9;
  }

  return score;
};

/** Stable, highest-score-first sort that preserves the incoming order on ties. */
export const rankSort = <T>(items: T[], score: (item: T) => number): T[] =>
  items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
