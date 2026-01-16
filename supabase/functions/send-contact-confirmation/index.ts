import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactConfirmationRequest {
  name: string;
  email: string;
  subject: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject }: ContactConfirmationRequest = await req.json();

    console.log(`Sending contact confirmation to: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Artistry.ng <onboarding@resend.dev>",
      to: [email],
      subject: "We received your message - Artistry.ng",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Artistry.ng</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Connect. Create. Collaborate.</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${name}! 👋</h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for reaching out to Artistry.ng! We've received your message regarding:
              </p>
              
              <div style="background: #f9fafb; border-left: 4px solid #8B5CF6; padding: 15px 20px; margin: 0 0 20px 0; border-radius: 0 8px 8px 0;">
                <strong style="color: #1f2937;">${subject}</strong>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Our team is reviewing your message and will get back to you within <strong>24 hours</strong>. If your matter is urgent, please don't hesitate to reach out via:
              </p>
              
              <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; padding-left: 20px; margin: 0 0 30px 0;">
                <li>Email: <a href="mailto:hello@artistry.ng" style="color: #8B5CF6;">hello@artistry.ng</a></li>
                <li>Phone: +234 (0) 800 ARTIST</li>
              </ul>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  Best regards,<br>
                  <strong>The Artistry.ng Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Artistry.ng. All rights reserved.<br>
                Lagos, Nigeria
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
