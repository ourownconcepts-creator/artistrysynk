import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** QueenSMTP warm-up steps; the database also enforces one step up at a time. */
export const WARMUP_STEPS = [30, 60, 150, 300, 600, 1500, 3000, 9000, 30000] as const;

export const setMarketingLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ dailyLimit: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    if (!(WARMUP_STEPS as readonly number[]).includes(data.dailyLimit)) throw new Error("Not a QueenSMTP warm-up step");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .update({ setting_value: { daily_limit: data.dailyLimit, window_hours: 24 }, updated_by: context.userId })
      .eq("setting_key", "marketing_email_limits");
    if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));
    console.log(JSON.stringify({ event: "marketing_limit_changed", daily_limit: data.dailyLimit }));
    return { ok: true };
  });

/** Settle recipients whose send result is unknown, after checking the QueenSMTP message log. */
export const resolveUnknownRecipients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ campaignId: z.string().uuid(), action: z.enum(["mark_sent", "requeue"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const patch =
      data.action === "mark_sent"
        ? { status: "sent", accepted_at: new Date().toISOString(), error_code: "confirmed_by_admin" }
        : { status: "pending", next_attempt_at: null, error_code: "requeued_by_admin" };
    const { data: rows, error } = await db
      .from("newsletter_recipients")
      .update(patch)
      .eq("campaign_id", data.campaignId)
      .eq("status", "unknown")
      .select("id");
    if (error) throw new Error("Could not update recipients");
    if (data.action === "requeue" && rows?.length) {
      await db.from("scheduled_newsletters").update({ status: "pending", completed_at: null, next_attempt_at: null })
        .eq("id", data.campaignId).eq("status", "sent");
    }
    console.log(JSON.stringify({ event: "unknown_resolved", campaign: data.campaignId, action: data.action, count: rows?.length ?? 0 }));
    return { count: rows?.length ?? 0 };
  });

/** Explicit admin restart of a manually-paused campaign (e.g. one partly sent before tracking existed). */
export const restartManualCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ campaignId: z.string().uuid(), confirm: z.literal("RESEND") }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("scheduled_newsletters")
      .update({ status: "pending", paused_reason: null, next_attempt_at: null, last_error: null })
      .eq("id", data.campaignId).eq("status", "paused").eq("paused_reason", "manual_review");
    console.log(JSON.stringify({ event: "campaign_manual_restart", campaign: data.campaignId }));
    return { ok: true };
  });
