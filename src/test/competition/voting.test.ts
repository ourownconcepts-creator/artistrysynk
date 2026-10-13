import { describe, expect, it } from "vitest";
import { blendedScore, normalizedVoteScore, rankResults, validateWeights } from "@/features/competitions/judging";

describe("Creative Talent Hunt vote blending", () => {
  it("with default weights (judge 1, votes 0) the result equals the judge score", () => {
    expect(blendedScore(72.5, 40, 100, 1, 0)).toBe(72.5);
  });
  it("normalizes votes against the top contestant", () => {
    expect(normalizedVoteScore(50, 200)).toBe(25);
    expect(normalizedVoteScore(0, 0)).toBe(0);
  });
  it("applies a 70/30 judge/vote split", () => {
    // 80*0.7 + 50*0.3 = 71
    expect(blendedScore(80, 50, 100, 0.7, 0.3)).toBe(71);
  });
  it("rejects negative or all-zero weights", () => {
    expect(() => validateWeights(0, 0)).toThrow(/invalid scoring configuration/);
    expect(() => validateWeights(-1, 2)).toThrow(/invalid scoring configuration/);
    expect(() => validateWeights(Number.NaN, 1)).toThrow();
  });
  it("ties share a rank after blending", () => {
    const rows = [{ score: blendedScore(80, 10, 10, 1, 1) }, { score: blendedScore(90, 0, 10, 1, 1) }, { score: 50 }];
    expect(rankResults(rows).map((r) => r.rank)).toEqual([1, 1, 3]);
  });
});
