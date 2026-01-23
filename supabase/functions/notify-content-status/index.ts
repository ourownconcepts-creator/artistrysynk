import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { userId, contentType, action, adminResponse }: NotifyContentStatusRequest = await req.json();

    // Get user email from profiles
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check user notification preferences
    const { data: settings } = await supabase
      .from('user_settings')
      .select('email_notifications')
      .eq('user_id', userId)
      .single();

    if (settings && !settings.email_notifications) {
      console.log('User has disabled email notifications:', userId);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: 'Email notifications disabled' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      console.log('No email found for user:', userId);
      return new Response(JSON.stringify({ error: 'No email found' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let subject = '';
    let htmlContent = '';

    switch (action) {
      case 'auto_hidden':
        subject = `Your ${contentType} has been temporarily hidden`;
        htmlContent = `
          <h1>Content Temporarily Hidden</h1>
          <p>Hello ${profile.full_name},</p>
          <p>Your ${contentType} has been temporarily hidden due to multiple user reports. This is an automated action to maintain community standards.</p>
          <h2>What you can do:</h2>
          <ul>
            <li>Review your content to ensure it complies with our community guidelines</li>
            <li>Submit an appeal if you believe this was done in error</li>
          </ul>
          <p>To submit an appeal, please visit your profile page and click on "Appeal Hiding" for the affected content.</p>
          <p>Best regards,<br>The ArtistrySynk Team</p>
        `;
        break;

      case 'restored':
        subject = `Your ${contentType} has been restored`;
        htmlContent = `
          <h1>Content Restored</h1>
          <p>Hello ${profile.full_name},</p>
          <p>Great news! Your ${contentType} has been reviewed by our moderation team and has been restored.</p>
          ${adminResponse ? `<p><strong>Admin Note:</strong> ${adminResponse}</p>` : ''}
          <p>Thank you for your patience.</p>
          <p>Best regards,<br>The ArtistrySynk Team</p>
        `;
        break;

      case 'appeal_rejected':
        subject = `Update on your ${contentType} appeal`;
        htmlContent = `
          <h1>Appeal Decision</h1>
          <p>Hello ${profile.full_name},</p>
          <p>We have reviewed your appeal regarding your ${contentType}. After careful consideration, we have determined that the content does not comply with our community guidelines and will remain hidden.</p>
          ${adminResponse ? `<p><strong>Admin Note:</strong> ${adminResponse}</p>` : ''}
          <p>If you believe this decision was made in error, please contact our support team.</p>
          <p>Best regards,<br>The ArtistrySynk Team</p>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "ArtistrySynk <onboarding@resend.dev>",
      to: [profile.email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-content-status function:", error);
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
