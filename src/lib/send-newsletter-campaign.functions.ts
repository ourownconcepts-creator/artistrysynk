import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendNewsletterCampaignSchema = z.object({
  subject: z.string().min(1).max(300),
  content: z.string().min(1),
  previewText: z.string().optional(),
  audience: z.enum(["subscribers", "users", "both"]).optional(),
  templateId: z.string().optional(),
  /** Client-generated per form submission; a repeat click/request returns the same campaign. */
  idempotencyKey: z.string().min(8).max(100),
});

/**
 * "Send now" no longer sends inline. It queues a campaign for the background
 * marketing worker, which respects the warm-up limit, 429/Retry-After and
 * per-recipient de-duplication.
 */
export const sendNewsletterCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => sendNewsletterCampaignSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const existing = await context.supabase
      .from("scheduled_newsletters")
      .select("id, status")
      .eq("idempotency_key" as never, data.idempotencyKey)
      .maybeSingle();
    if (existing.data) return { queued: true as const, id: existing.data.id, duplicate: true };

    const { data: row, error } = await context.supabase
      .from("scheduled_newsletters")
      .insert({
        subject: data.subject,
        content: data.content,
        preview_text: data.previewText ?? null,
        audience: data.audience ?? "subscribers",
        template_id: data.templateId ?? "gradient-header",
        scheduled_at: new Date().toISOString(),
        status: "pending",
        created_by: context.userId,
        idempotency_key: data.idempotencyKey,
      } as never)
      .select("id")
      .single();

    if (error) {
      // Unique violation = concurrent duplicate request.
      if ((error as { code?: string }).code === "23505") {
        const again = await context.supabase
          .from("scheduled_newsletters")
          .select("id")
          .eq("idempotency_key" as never, data.idempotencyKey)
          .maybeSingle();
        return { queued: true as const, id: again.data?.id ?? null, duplicate: true };
      }
      throw new Error("Could not queue campaign");
    }
    console.log(JSON.stringify({ event: "campaign_queued", campaign: (row as { id: string }).id }));
    return { queued: true as const, id: (row as { id: string }).id, duplicate: false };
  });
