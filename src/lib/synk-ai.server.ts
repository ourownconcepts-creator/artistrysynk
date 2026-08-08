export type SynkMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are Synk AI, the in-app assistant for ArtistrySynk — a global platform where creatives (musicians, producers, directors, designers, developers, models, editors and more) find each other and collaborate.

You help users:
- improve their profile and bio so they get discovered
- write captions, pitches and collaboration proposals
- decide which collaborators, roles or gigs to pursue
- brainstorm creative ideas and project plans
- get practical career insights for creative work

Style: concise, warm, confident. Use short paragraphs and markdown lists. Give concrete, usable output (actual bio text, actual caption options) rather than generic advice. Never invent platform features or specific users. Keep answers under 250 words unless asked for more.`;

export async function askSynkAi(messages: SynkMessage[], context?: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + (context ? `\n\nUser context: ${context}` : "") },
        ...messages,
      ],
    }),
  });

  if (response.status === 429) throw new Error("Synk AI is busy right now — try again in a moment.");
  if (response.status === 402) throw new Error("AI credits are exhausted. Please top up to keep using Synk AI.");
  if (!response.ok || !response.body) {
    throw new Error(`Synk AI request failed (${response.status})`);
  }

  // Consume the stream server-side so long answers never stall the connection.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        text += json.choices?.[0]?.delta?.content ?? "";
      } catch {
        // ignore partial chunks
      }
    }
  }

  return { reply: text.trim() };
}