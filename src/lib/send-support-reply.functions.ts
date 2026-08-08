import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendSupportReplySchema = z.object({
  submissionId: z.string().trim().min(1),
  reply: z.string().trim().min(2).max(5000),
  status: z.enum(["pending", "reviewed", "resolved", "spam"]).default("resolved"),
});

export const sendSupportReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sendSupportReplySchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { sendSupportReply: impl } = await import("@/lib/send-support-reply.server");
    return impl(context.supabase, context.userId, data);
  });
