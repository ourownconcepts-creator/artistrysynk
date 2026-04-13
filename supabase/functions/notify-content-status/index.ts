import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const brandedHeader = `
  <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
    <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
  </div>
`;

interface NotifyContentStatusRequest {
  userId: string;
  contentType: string;
  action: 'auto_hidden' | 'restored' | 'appeal_rejected';
  adminResponse?: string;
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
    const { userId, contentType, action, adminResponse }: NotifyContentStatusRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from('user_settings')
      .select('email_notifications')
      .eq('user_id', userId)
      .single();

    if (settings && !settings.email_notifications) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Email notifications disabled' }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'No email found' }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let subject = '';
    let bodyContent = '';

    switch (action) {
      case 'auto_hidden':
        subject = `Your ${contentType} has been temporarily hidden`;
        bodyContent = `
          <h1>Content Temporarily Hidden</h1>
          <p>Hello ${profile.full_name},</p>
          <p>Your ${contentType} has been temporarily hidden due to multiple user reports.</p>
          <h2>What you can do:</h2>
          <ul>
            <li>Review your content to ensure it complies with our community guidelines</li>
            <li>Submit an appeal if you believe this was done in error</li>
          </ul>
          <p>To submit an appeal, visit your profile page and click on "Appeal Hiding".</p>
        `;
        break;
      case 'restored':
        subject = `Your ${contentType} has been restored`;
        bodyContent = `
          <h1>Content Restored</h1>
          <p>Hello ${profile.full_name},</p>
          <p>Great news! Your ${contentType} has been reviewed and restored.</p>
          ${adminResponse ? `<p><strong>Admin Note:</strong> ${adminResponse}</p>` : ''}
          <p>Thank you for your patience.</p>
        `;
        break;
      case 'appeal_rejected':
        subject = `Update on your ${contentType} appeal`;
        bodyContent = `
          <h1>Appeal Decision</h1>
          <p>Hello ${profile.full_name},</p>
          <p>After careful review, your ${contentType} will remain hidden as it does not comply with our community guidelines.</p>
          ${adminResponse ? `<p><strong>Admin Note:</strong> ${adminResponse}</p>` : ''}
          <p>If you believe this decision was made in error, please contact our support team.</p>
        `;
        break;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${brandedHeader}
        <div style="padding: 30px;">
          ${bodyContent}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
          <p style="color: #6B7280; font-size: 12px;">Best regards,<br>The ArtistrySynk Team</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "ArtistrySynk <notifications@artistrysynk.com>",
      to: [profile.email],
      subject,
      html: htmlContent,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-content-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
