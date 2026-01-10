import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserProfile {
  id: string;
  full_name: string;
  location: string | null;
  bio: string | null;
  roles: string[];
  genres: string[];
  skills: string[];
}

interface MatchRequest {
  currentUser: UserProfile;
  candidates: UserProfile[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentUser, candidates }: MatchRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ scoredProfiles: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt for AI scoring
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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract scores from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let scores = [];
    
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        scores = args.scores || [];
      } catch {
        console.error("Failed to parse AI response");
      }
    }

    // Sort candidates by score descending
    const scoredProfiles = candidates.map(candidate => {
      const scoreData = scores.find((s: any) => s.id === candidate.id);
      return {
        ...candidate,
        synergyScore: scoreData?.score || 50,
        matchReason: scoreData?.reason || "Based on profile compatibility"
      };
    }).sort((a, b) => b.synergyScore - a.synergyScore);

    return new Response(
      JSON.stringify({ scoredProfiles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI matching error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
