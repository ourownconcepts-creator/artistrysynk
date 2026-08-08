import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendSupportReply(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  input: { submissionId: string; reply: string; status: string },
) {
  const { sendEmail, LOGO_URL } = await import("@/lib/email/resend.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { submissionId, reply, status } = input;

  const { data: submission, error: fetchErr } = await supabaseAdmin
    .from("contact_submissions")
    .select("id, name, email, subject, reference_id, category")
    .eq("id", submissionId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!submission) throw new Error("Submission not found");

  const reference: string =
    (submission as { reference_id?: string | null }).reference_id ??
    `AS-${(submission as { category?: string | null }).category === "privacy" ? "PRV" : "SUP"}-${String(submission.id)
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()}`;

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const replyHtml = escape(reply).replace(/\n/g, "<br />");

  const emailResponse = await sendEmail({
    from: "ArtistrySynk Support <hello@artistrysynk.app>",
    to: submission.email,
    replyTo: "hello@artistrysynk.app",
    subject: `Re: [${reference}] ${submission.subject}`,
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
            <p style="color:#6b7280; font-size:13px; margin:0 0 16px 0;">Reference ID: <strong style="color:#1f2937;">${escape(reference)}</strong></p>
            <div style="background:#f9fafb; border-left:4px solid #c026d3; padding:16px 20px; margin:20px 0; border-radius:0 8px 8px 0; color:#1f2937; font-size:15px; line-height:1.6;">${replyHtml}</div>
            <p style="color:#6b7280; font-size:14px;">If you need anything else, just reply to this email and keep reference <strong>${escape(reference)}</strong> in the subject.</p>
            <p style="color:#6b7280; font-size:14px; margin-top:24px;">Best regards,<br /><strong>The ArtistrySynk Team</strong></p>
          </div>
        </div>
      </body></html>
    `,
  });

  const { error: updateErr } = await supabaseAdmin
    .from("contact_submissions")
    .update({
      admin_response: reply,
      responded_at: new Date().toISOString(),
      responded_by: userId,
      status,
    })
    .eq("id", submissionId);

  if (updateErr) throw new Error(updateErr.message);

  if (!(submission as { reference_id?: string | null }).reference_id) {
    await supabaseAdmin.from("contact_submissions").update({ reference_id: reference }).eq("id", submissionId);
  }

  return { success: true as const, referenceId: reference, data: emailResponse };
}
