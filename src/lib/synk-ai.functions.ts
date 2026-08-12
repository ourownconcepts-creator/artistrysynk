import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const synkAiInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(24),
  context: z.string().max(1200).optional(),
});

export const askSynkAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(synkAiInput)
  .handler(async ({ data }) => {
    const { askSynkAi } = await import("@/lib/synk-ai.server");
    return askSynkAi(data.messages, data.context);
  });