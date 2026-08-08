import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendAdminNotificationSchema = z.object({
  recipientEmail: z.string().email(),
  adminName: z.string().min(1),
  action: z.string().min(1),
  targetUser: z.string().min(1),
  details: z.string().optional(),
});

export const sendAdminNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sendAdminNotificationSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { sendAdminNotification } = await import("@/lib/send-admin-notification.server");
    return sendAdminNotification(data);
  });
