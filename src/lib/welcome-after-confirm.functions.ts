import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Runs once, right after a user's email is confirmed (or after a social sign-in
 * that lands with a live session). Sends the welcome email exactly once by
 * stamping profiles.welcome_email_sent_at.
 */
export const sendWelcomeAfterConfirm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, username, welcome_email_sent_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !profile) return { sent: false as const, reason: "no_profile" };
    if (profile.welcome_email_sent_at) return { sent: false as const, reason: "already_sent" };

    const { data: claims } = await supabase.auth.getUser();
    const email = claims?.user?.email;
    if (!email) return { sent: false as const, reason: "no_email" };

    // Claim the send first so concurrent tabs cannot double-send.
    const { data: claimed } = await supabase
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("welcome_email_sent_at", null)
      .select("user_id")
      .maybeSingle();

    if (!claimed) return { sent: false as const, reason: "already_sent" };

    try {
      const { sendWelcomeEmail } = await import("@/lib/send-welcome-email.server");
      await sendWelcomeEmail({
        email,
        fullName: profile.full_name || profile.username || "Creative",
        username: profile.username ?? "",
      });
      return { sent: true as const };
    } catch (err) {
      // Release the claim so a later attempt can retry.
      await supabase
        .from("profiles")
        .update({ welcome_email_sent_at: null })
        .eq("user_id", userId);
      console.error("Welcome email failed after confirmation", err);
      return { sent: false as const, reason: "send_failed" };
    }
  });
