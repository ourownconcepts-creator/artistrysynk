import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRequest {
  recipientEmail: string;
  adminName: string;
  action: string;
  targetUser: string;
  details?: string;
}

const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

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
    const { recipientEmail, adminName, action, targetUser, details }: NotificationRequest = await req.json();

    console.log(`Sending admin notification to ${recipientEmail} for action: ${action}`);

    const emailResponse = await resend.emails.send({
      from: "Admin Notifications <notifications@artistrysynk.com>",
      to: [recipientEmail],
      subject: `Admin Action Alert: ${action}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
            <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
          </div>
          <div style="padding: 30px;">
          <h2 style="color: #333;">Admin Action Notification</h2>
          <p>Hello,</p>
          <p>An admin action was performed that requires your attention:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Admin:</strong> ${adminName}</p>
            <p><strong>Action:</strong> ${action}</p>
            <p><strong>Target User:</strong> ${targetUser}</p>
            ${details ? `<p><strong>Details:</strong> ${details}</p>` : ''}
          </div>
          <p>Please review this action in your admin dashboard.</p>
          <p>Best regards,<br>Admin System</p>
          </div>
        </div>
      `,
    });

    console.log("Admin notification email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
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
