import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) return json({ error: "Email service not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) =>
      ["admin", "master_admin", "super_admin"].includes(r.role)
    );
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => null);
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId.trim() : "";
    const reply = typeof body?.reply === "string" ? body.reply.trim() : "";
    const status = typeof body?.status === "string" ? body.status.trim() : "resolved";

    if (!submissionId || reply.length < 2 || reply.length > 5000) {
      return json({ error: "submissionId and a reply of 2-5000 characters are required" }, 400);
    }
    if (!["pending", "reviewed", "resolved", "spam"].includes(status)) {
      return json({ error: "Invalid status" }, 400);
    }

    const { data: submission, error: fetchErr } = await admin
      .from("contact_submissions")
      .select("id, name, email, subject")
      .eq("id", submissionId)
      .maybeSingle();

    if (fetchErr) return json({ error: fetchErr.message }, 500);
    if (!submission) return json({ error: "Submission not found" }, 404);

    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const replyHtml = escape(reply).replace(/\n/g, "<br />");

    const resend = new Resend(RESEND_API_KEY);
    const emailResponse = await resend.emails.send({
      from: "ArtistrySynk Support <hello@artistrysynk.app>",
      to: [submission.email],
      reply_to: "hello@artistrysynk.app",
      subject: `Re: ${submission.subject}`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8" /></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin:0; padding:0; background-color:#f4f4f5;">
          <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
            <div style="text-align:center; padding:30px 0 20px 0; background:linear-gradient(135deg,#c026d3 0%,#7c3aed 50%,#f97316 100%); border-radius:16px 16px 0 0;">
              <img src="${LOGO_URL}" alt="ArtistrySynk" style="height:80px; width:auto;" />
            </div>
            <div style="background:#fff; padding:40px; border-radius:0 0 16px 16px;">
              <h2 style="color:#1f2937; margin:0 0 20px 0; font-size:22px;">Hi ${escape(submission.name)},</h2>
              <p style="color:#4b5563; font-size:16px; line-height:1.6;">Thanks for contacting ArtistrySynk about <strong>${escape(submission.subject)}</strong>. Here's our response:</p>
              <div style="background:#f9fafb; border-left:4px solid #c026d3; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#1f2937; font-size:15px; line-height:1.6;">${replyHtml}</div>
              <p style="color:#6b7280; font-size:14px;">If you need anything else, just reply to this email.</p>
              <p style="color:#6b7280; font-size:14px; margin-top:24px;">Best regards,<br /><strong>The ArtistrySynk Team</strong></p>
            </div>
          </div>
        </body></html>
      `,
    });

    const { error: updateErr } = await admin
      .from("contact_submissions")
      .update({
        admin_response: reply,
        responded_at: new Date().toISOString(),
        responded_by: userData.user.id,
        status,
      })
      .eq("id", submissionId);

    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({ success: true, data: emailResponse });
  } catch (error) {
    console.error("send-support-reply error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});