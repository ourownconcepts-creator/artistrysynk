import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Emails the signed-in user a receipt of a privacy preference change. */
export const notifyPrivacyPreferenceChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ changes: z.array(z.string().trim().min(1).max(200)).min(1).max(10) }))
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!email) return { sent: false };
    const { sendPrivacyPreferenceEmail } = await import("./privacy-requests.server");
    await sendPrivacyPreferenceEmail({ to: email, changes: data.changes });
    return { sent: true };
  });
