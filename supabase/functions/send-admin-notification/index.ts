import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  recipientEmail: string;
  adminName: string;
  action: string;
  targetUser: string;
  details?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, adminName, action, targetUser, details }: NotificationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Admin Notifications <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Admin Action Alert: ${action}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
