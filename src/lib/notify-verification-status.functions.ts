import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const notifyVerificationStatusSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  requestType: z.string().min(1),
  reason: z.string().optional(),
});

export const notifyVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(notifyVerificationStatusSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { notifyVerificationStatus: impl } = await import("@/lib/notify-verification-status.server");
    const { withRunLog } = await import("@/lib/functionRunLog.server");
    return withRunLog("notify-verification-status", { status: data.status, requestType: data.requestType }, () =>
      impl(data),
    );
  });
