import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const notifyContentStatusSchema = z.object({
  userId: z.string().uuid(),
  contentType: z.string().min(1),
  action: z.enum(["auto_hidden", "restored", "appeal_rejected"]),
  adminResponse: z.string().optional(),
});

export const notifyContentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(notifyContentStatusSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { notifyContentStatus: impl } = await import("@/lib/notify-content-status.server");
    return impl(data);
  });
