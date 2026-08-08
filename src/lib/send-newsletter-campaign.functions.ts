import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendNewsletterCampaignSchema = z.object({
  subject: z.string().min(1),
  content: z.string().min(1),
  previewText: z.string().optional(),
  audience: z.enum(["subscribers", "users", "both"]).optional(),
});

export const sendNewsletterCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(sendNewsletterCampaignSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);

    const { sendNewsletterCampaign } = await import("@/lib/send-newsletter-campaign.server");
    return sendNewsletterCampaign(data);
  });
