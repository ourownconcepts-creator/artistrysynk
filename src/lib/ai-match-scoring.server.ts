export interface UserProfile {
  id: string;
  full_name: string;
  location: string | null;
  bio: string | null;
  roles: string[];
  genres: string[];
  skills: string[];
}

export interface ScoredProfile extends UserProfile {
  synergyScore: number;
  matchReason: string;
}

export async function scoreMatches(
  currentUser: UserProfile,
  candidates: UserProfile[],
): Promise<{ scoredProfiles: ScoredProfile[] }> {
  const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];

  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  if (!candidates || candidates.length === 0) {
    return { scoredProfiles: [] };
  }

  const prompt = `You are a creative collaboration matching expert for a platform connecting musicians, producers, actors, directors, and other entertainment professionals.

Analyze the compatibility between the current user and each candidate. Score each candidate from 0-100 based on:

1. **Role Complementarity (40%)**: Do their roles complement each other? (e.g., artist needs producer, director needs actor)
2. **Genre Compatibility (30%)**: Do they share musical/artistic genres or have compatible styles?
3. **Location Proximity (15%)**: Are they in the same city/region? (for potential in-person collaboration)
4. **Skill Synergy (15%)**: Do their custom skills complement each other?

CURRENT USER:
- Name: ${currentUser.full_name}
- Location: ${currentUser.location || "Not specified"}
- Roles: ${currentUser.roles.join(", ") || "None"}
- Genres: ${currentUser.genres.join(", ") || "None"}
- Skills: ${currentUser.skills.join(", ") || "None"}
- Bio: ${currentUser.bio || "No bio"}

CANDIDATES:
${candidates.map((c, i) => `
${i + 1}. ID: ${c.id}
   Name: ${c.full_name}
   Location: ${c.location || "Not specified"}
   Roles: ${c.roles.join(", ") || "None"}
   Genres: ${c.genres.join(", ") || "None"}
   Skills: ${c.skills.join(", ") || "None"}
   Bio: ${c.bio || "No bio"}
`).join("\n")}

Respond ONLY with the function call containing the scores array.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a creative matching algorithm. Analyze profile compatibility and return structured scores." },
        { role: "user", content: prompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_match_scores",
            description: "Return the compatibility scores for each candidate",
            parameters: {
              type: "object",
              properties: {
                scores: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", description: "Candidate user ID" },
                      score: { type: "number", description: "Compatibility score 0-100" },
                      reason: { type: "string", description: "Brief reason for the score (max 50 words)" }
                    },
                    required: ["id", "score", "reason"]
                  }
                }
              },
              required: ["scores"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "return_match_scores" } }
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits depleted. Please add credits.");
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  let scores: Array<{ id: string; score: number; reason: string }> = [];

  if (toolCall?.function?.arguments) {
    try {
      const args = JSON.parse(toolCall.function.arguments);
      scores = args.scores || [];
    } catch {
      console.error("Failed to parse AI response");
    }
  }

  const scoredProfiles = candidates.map(candidate => {
    const scoreData = scores.find((s) => s.id === candidate.id);
    return {
      ...candidate,
      synergyScore: scoreData?.score ?? 50,
      matchReason: scoreData?.reason ?? "Based on profile compatibility",
    };
  }).sort((a, b) => b.synergyScore - a.synergyScore);

  return { scoredProfiles };
}
