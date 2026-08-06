import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://artistrysynk.app";
const LOGO_URL =
  "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map notification type -> user_settings preference column
const PREF_COLUMN: Record<string, string> = {
  match: "match_notifications",
  match_online: "match_online_notifications",
  message: "message_notifications",
  like: "match_notifications",
  project_application: "project_notifications",
  application_status: "project_notifications",
  collaboration_request: "project_notifications",
};

const linkFor = (type: string, data: Record<string, any>): string => {
  switch (type) {
    case "match":
    case "match_online":
      return `${APP_URL}/matches`;
    case "message":
      return data?.conversation_id
        ? `${APP_URL}/messages/${data.conversation_id}`
        : `${APP_URL}/matches`;
    case "like":
      return `${APP_URL}/who-liked-you`;
    case "project_application":
    case "application_status":
    case "collaboration_request":
      return data?.project_id
        ? `${APP_URL}/projects/${data.project_id}`
        : `${APP_URL}/projects`;
    default:
      return `${APP_URL}/notifications`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    if (!RESEND_API_KEY) throw new Error("Email service not configured");
    const { notification_id } = await req.json();
    if (!notification_id) return json({ error: "notification_id required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: notification } = await supabase
      .from("user_notifications")
      .select("id, user_id, type, title, message, data")
      .eq("id", notification_id)
      .maybeSingle();
    if (!notification) return json({ error: "notification not found" }, 404);

    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase
        .from("profiles")
        .select("email, full_name, username")
        .eq("id", notification.user_id)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", notification.user_id)
        .maybeSingle(),
    ]);

    if (!profile?.email) return json({ skipped: "no_email" });

    if (settings) {
      if (settings.email_notifications === false) return json({ skipped: "email_disabled" });
      const col = PREF_COLUMN[notification.type];
      if (col && (settings as Record<string, any>)[col] === false) {
        return json({ skipped: "type_disabled" });
      }
    }

    // Skip suppressed addresses
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("email")
      .eq("email", profile.email)
      .maybeSingle();
    if (suppressed) return json({ skipped: "suppressed" });

    const link = linkFor(notification.type, notification.data || {});
    const firstName =
      (profile.full_name || profile.username || "there").split(" ")[0];

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px;">
        <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden;">
          <div style="background:#0b0b12;padding:20px;text-align:center;">
            <img src="${LOGO_URL}" alt="ArtistrySynk" width="140" style="max-width:140px;" />
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 12px;color:#555;">Hi ${firstName},</p>
            <h1 style="margin:0 0 8px;font-size:20px;color:#111;">${notification.title}</h1>
            <p style="margin:0 0 24px;color:#444;line-height:1.6;">${notification.message}</p>
            <a href="${link}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">View on ArtistrySynk</a>
            <p style="margin:24px 0 0;font-size:12px;color:#888;">
              Manage which emails you receive in
              <a href="${APP_URL}/settings" style="color:#7c3aed;">your notification settings</a>.
            </p>
          </div>
        </div>
      </div>`;

    const resend = new Resend(RESEND_API_KEY);
    const sent = await resend.emails.send({
      from: "ArtistrySynk <notifications@artistrysynk.app>",
      to: [profile.email],
      subject: notification.title,
      html,
    });

    await supabase.from("email_send_log").insert({
      message_id: `notification-${notification.id}`,
      template_name: `notification:${notification.type}`,
      recipient_email: profile.email,
      status: sent.error ? "failed" : "sent",
      error_message: sent.error ? String(sent.error.message ?? sent.error) : null,
      metadata: { notification_id: notification.id, type: notification.type, link },
    });

    if (sent.error) return json({ error: sent.error }, 502);
    return json({ success: true });
  } catch (e) {
    console.error("notify-user-notification-email error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
