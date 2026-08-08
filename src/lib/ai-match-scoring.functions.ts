import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const userProfileSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  roles: z.array(z.string()),
  genres: z.array(z.string()),
  skills: z.array(z.string()),
});

const aiMatchScoringInput = z.object({
  currentUser: userProfileSchema,
  candidates: z.array(userProfileSchema),
});

export const scoreMatches = createServerFn({ method: "POST" })
  .inputValidator(aiMatchScoringInput)
  .handler(async ({ data }) => {
    const { scoreMatches } = await import("@/lib/ai-match-scoring.server");
    return scoreMatches(data.currentUser, data.candidates);
  });
