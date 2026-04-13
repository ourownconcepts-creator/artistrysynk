import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactConfirmationRequest {
  name: string;
  email: string;
  subject: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const { name, email, subject }: ContactConfirmationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "ArtistrySynk <hello@artistrysynk.com>",
      to: [email],
      subject: "We received your message - ArtistrySynk",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 16px 16px 0 0;">
              <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Connect. Create. Collaborate.</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${name}! 👋</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for reaching out to ArtistrySynk! We've received your message regarding:
              </p>
              
              <div style="background: #f9fafb; border-left: 4px solid #c026d3; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <strong style="color: #1f2937;">${subject}</strong>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                Our team is reviewing your message and will get back to you within <strong>24 hours</strong>.
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px;">
                  Best regards,<br><strong>The ArtistrySynk Team</strong>
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

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
