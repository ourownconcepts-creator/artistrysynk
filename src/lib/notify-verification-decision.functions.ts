import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  subjectId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  requestType: z.string().min(1).max(120),
  reason: z.string().max(500).optional(),
});

/**
 * Emails a member when their verification status changes. The in-app
 * notification is written by a database trigger; this adds the email channel
 * and is callable only by admins.
 */
export const notifyVerificationDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(schema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: user } = await supabaseAdmin.auth.admin.getUserById(data.subjectId);
    const email = user?.user?.email;
    if (!email) return { sent: false as const, reason: "no-email" };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, display_name, username")
      .eq("id", data.subjectId)
      .maybeSingle();

    const { notifyVerificationStatus } = await import("@/lib/notify-verification-status.server");
    const { withRunLog } = await import("@/lib/functionRunLog.server");
    await withRunLog("notify-verification-decision", { status: data.status }, () =>
      notifyVerificationStatus({
        email,
        fullName:
          profile?.display_name || profile?.full_name || profile?.username || "there",
        status: data.status,
        requestType: data.requestType,
        ...(data.reason ? { reason: data.reason } : {}),
      }),
    );
    return { sent: true as const };
  });