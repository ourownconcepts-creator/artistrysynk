import { LOGO_URL, DEFAULT_FROM, sendEmail } from "@/lib/email/resend.server";

export interface SendNewsletterCampaignInput {
  subject: string;
  content: string;
  previewText?: string;
  audience?: "subscribers" | "users" | "both";
}

export async function sendNewsletterCampaign({
  subject,
  content,
  previewText,
  audience = "subscribers",
}: SendNewsletterCampaignInput) {
  if (!subject || !content) {
    throw new Error("Subject and content are required");
  }

  const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

  const emails: string[] = [];

  if (audience === "subscribers" || audience === "both") {
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);
    if (subscribers) emails.push(...subscribers.map((s) => s.email));
  }

  if (audience === "users" || audience === "both") {
    const { data: users } = await supabase.from("profiles").select("email").not("email", "is", null);
    if (users) emails.push(...users.filter((u) => u.email).map((u) => u.email as string));
  }

  const uniqueEmails = [...new Set(emails.map((e) => e.toLowerCase()))];

  if (uniqueEmails.length === 0) {
    throw new Error("No recipients found");
  }

  const results: Array<{ email: string; success: boolean; data?: unknown; error?: string }> = [];

  for (const email of uniqueEmails) {
    try {
      const emailResponse = await sendEmail({
        from: "ArtistrySynk <newsletter@artistrysynk.app>",
        to: email,
        subject,
        html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${previewText ? `<meta name="description" content="${previewText}">` : ""}
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
                ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ""}
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 16px 16px 0 0;">
                    <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Connect. Create. Collaborate.</p>
                  </div>
                  
                  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    ${content}
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                      <p style="color: #6b7280; font-size: 14px;">
                        You're receiving this email because you subscribed to our newsletter.<br>
                        <a href="https://artistrysynk.lovable.app" style="color: #c026d3;">Unsubscribe</a>
                      </p>
                    </div>
                  </div>
                  
                  <div style="text-align: center; padding: 20px;">
                    <p style="color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} ArtistrySynk. All rights reserved.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
      });
      results.push({ email, success: true, data: emailResponse });
    } catch (emailError: any) {
      results.push({ email, success: false, error: emailError.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return { success: true as const, totalRecipients: uniqueEmails.length, sent: successCount, failed: failCount, results };
}
