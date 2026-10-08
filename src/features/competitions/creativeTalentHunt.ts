import type { Competition } from "@/domain/competition";

export const ARTISTRYSYNK_CREATIVE_TALENT_HUNT: Competition = {
  id: "artistrysynk-creative-talent-hunt-2026",
  name: "ArtistrySynk Creative Talent Hunt",
  slug: "creative-talent-hunt",
  domain: "CREATIVE",
  type: "TALENT_HUNT",
  status: "REGISTRATION_OPEN",
  description:
    "A discovery-first competition for emerging creatives across music, performance, visual arts, digital creativity and more.",
};

export const CREATIVE_TALENT_HUNT_CATEGORIES = [
  "Music",
  "Performance",
  "Visual Arts",
  "Film & Photography",
  "Fashion & Style",
  "Digital & Tech",
  "Writing & Storytelling",
  "Content Creation",
  "Other Creative Talent",
] as const;
