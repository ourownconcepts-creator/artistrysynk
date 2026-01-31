import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  username: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const { email, fullName, username }: WelcomeEmailRequest = await req.json();

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email and fullName are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending welcome email to ${email}`);

    // Note: Using onboarding@resend.dev only works for sending to your Resend account email.
    // For production, you need to verify your own domain in Resend and use that instead.
    // Example: "ArtistrySynk <noreply@yourdomain.com>"
    const emailResponse = await resend.emails.send({
      from: "ArtistrySynk <onboarding@resend.dev>",
      to: [email],
      subject: `Welcome to ArtistrySynk, ${fullName}! 🎨`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ArtistrySynk</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0b;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0b; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 36px; font-weight: bold;">
                        ✨ ArtistrySynk
                      </h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                        Create • Connect • Collaborate
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="background-color: #18181b; padding: 40px; border-radius: 0 0 16px 16px;">
                      <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">
                        Welcome, ${fullName}! 🎉
                      </h2>
                      
                      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        You've just joined Africa's premier creative community. Whether you're a musician, producer, designer, videographer, or any creative professional – you're in the right place.
                      </p>

                      <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="color: #c026d3; margin: 0 0 16px 0; font-size: 18px;">
                          🚀 Get Started
                        </h3>
                        <ul style="color: #a1a1aa; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          <li><strong style="color: #ffffff;">Complete your profile</strong> – Add your skills, portfolio, and bio</li>
                          <li><strong style="color: #ffffff;">Discover creatives</strong> – Swipe through talented professionals</li>
                          <li><strong style="color: #ffffff;">Match & collaborate</strong> – Connect with like-minded creators</li>
                          <li><strong style="color: #ffffff;">Start projects</strong> – Build something amazing together</li>
                        </ul>
                      </div>

                      <div style="background: linear-gradient(135deg, rgba(192, 38, 211, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%); border: 1px solid rgba(192, 38, 211, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="color: #f97316; margin: 0 0 12px 0; font-size: 18px;">
                          💡 Pro Tip
                        </h3>
                        <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0;">
                          Upload your best work to your portfolio to increase your chances of getting matched with the perfect collaborators!
                        </p>
                      </div>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="https://artistrysynk.lovable.app/setup-profile" style="display: inline-block; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                              Complete Your Profile
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 32px 0 0 0; text-align: center;">
                        Your username: <strong style="color: #c026d3;">@${username || 'creative'}</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px; text-align: center;">
                      <p style="color: #52525b; font-size: 12px; margin: 0 0 8px 0;">
                        © ${new Date().getFullYear()} ArtistrySynk – Africa's Creative Network
                      </p>
                      <p style="color: #52525b; font-size: 12px; margin: 0;">
                        <a href="https://artistrysynk.lovable.app" style="color: #c026d3; text-decoration: none;">Visit Website</a> •
                        <a href="https://artistrysynk.lovable.app/discover" style="color: #c026d3; text-decoration: none;">Discover Creatives</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
