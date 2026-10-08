import { describe, expect, it } from "vitest";
import {
  canEditAssignment, canFinalize, combinedScore, contestantScore, isValidScore, rankResults, weightedScore,
  type Criterion,
} from "@/features/competitions/judging";

const criteria: Criterion[] = ["Creativity", "Skill / Execution", "Originality", "Presentation / Impact", "Overall Potential"]
  .map((name, i) => ({ id: `c${i}`, name, max_score: 10, weight: 0.2 }));
const all = (vals: number[]) => vals.map((score, i) => ({ criterion_id: `c${i}`, score }));

describe("weighted score", () => {
  it("perfect 10s normalize to 100", () => expect(weightedScore(criteria, all([10, 10, 10, 10, 10]))).toBe(100));
  it("20% each: 8,6,7,9,5 → 70", () => expect(weightedScore(criteria, all([8, 6, 7, 9, 5]))).toBe(70));
  it("all zeros → 0", () => expect(weightedScore(criteria, all([0, 0, 0, 0, 0]))).toBe(0));
  it("nothing scored → null", () => expect(weightedScore(criteria, [])).toBeNull());
});

describe("score bounds", () => {
  it("accepts 0 and 10", () => { expect(isValidScore(0, 10)).toBe(true); expect(isValidScore(10, 10)).toBe(true); });
  it("rejects 11 and -1", () => { expect(isValidScore(11, 10)).toBe(false); expect(isValidScore(-1, 10)).toBe(false); });
  it("weightedScore throws above max", () => expect(() => weightedScore(criteria, all([11, 1, 1, 1, 1]))).toThrow());
});

describe("finalization", () => {
  it("finalized assignments are read-only", () => expect(canEditAssignment("FINALIZED")).toBe(false));
  it("requires every criterion", () => expect(canFinalize("IN_PROGRESS", criteria, all([5, 5, 5, 5]))).toBe(false));
  it("allows when complete", () => expect(canFinalize("IN_PROGRESS", criteria, all([5, 5, 5, 5, 5]))).toBe(true));
  it("cannot finalize twice", () => expect(canFinalize("FINALIZED", criteria, all([5, 5, 5, 5, 5]))).toBe(false));
});

describe("ranking", () => {
  it("averages finalized judges", () => expect(contestantScore([80, 70, null])).toBe(75));
  it("ties share a rank, next rank skips", () => {
    const r = rankResults([{ id: "a", score: 70 }, { id: "b", score: 90 }, { id: "c", score: 90 }, { id: "d", score: null }]);
    expect(r.map((x) => [x.id, x.rank])).toEqual([["b", 1], ["c", 1], ["a", 3], ["d", null]]);
  });
  it("public vote weight 0 leaves judge score unchanged", () => expect(combinedScore(72.5, 40, 1, 0)).toBe(72.5));
});
