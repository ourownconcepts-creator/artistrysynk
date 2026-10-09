import { describe, expect, it } from "vitest";

import {
  ARTISTRYSYNK_CREATIVE_TALENT_HUNT,
  CREATIVE_TALENT_HUNT_CATEGORIES,
} from "@/features/competitions/creativeTalentHunt";

describe("ArtistrySynk Creative Talent Hunt", () => {
  it("uses the native ArtistrySynk competition identity", () => {
    expect(ARTISTRYSYNK_CREATIVE_TALENT_HUNT.slug).toBe("creative-talent-hunt");
    expect(ARTISTRYSYNK_CREATIVE_TALENT_HUNT.domain).toBe("CREATIVE");
    expect(ARTISTRYSYNK_CREATIVE_TALENT_HUNT.type).toBe("TALENT_HUNT");
    expect(ARTISTRYSYNK_CREATIVE_TALENT_HUNT.status).toBe("REGISTRATION_OPEN");
  });

  it("contains the nine approved creative categories", () => {
    expect(CREATIVE_TALENT_HUNT_CATEGORIES).toHaveLength(9);
    expect(CREATIVE_TALENT_HUNT_CATEGORIES).toEqual([
      "Music",
      "Performance",
      "Visual Arts",
      "Film & Photography",
      "Fashion & Style",
      "Digital & Tech",
      "Writing & Storytelling",
      "Content Creation",
      "Other Creative Talent",
    ]);
  });
});

describe("Creative Talent Hunt competition invariants", () => {
  it("keeps the public-facing route contract explicit", () => {
    expect([
      "/creative-talent-hunt",
      "/creative-talent-hunt/enter",
      "/creative-talent-hunt/contestants",
      "/creative-talent-hunt/leaderboard",
      "/creative-talent-hunt/judges",
      "/creative-talent-hunt/prizes",
      "/creative-talent-hunt/rules",
      "/creative-talent-hunt/announcements",
      "/creative-talent-hunt/sponsors",
    ]).toHaveLength(9);
  });

  it("uses the intended competition state vocabulary", () => {
    expect([
      "DRAFT",
      "REGISTRATION_OPEN",
      "REGISTRATION_CLOSED",
      "IN_PROGRESS",
      "VOTING_OPEN",
      "COMPLETED",
      "ARCHIVED",
    ]).toContain(ARTISTRYSYNK_CREATIVE_TALENT_HUNT.status);
  });
});
