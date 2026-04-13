import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface JobApplicationNotificationRequest {
  jobTitle: string;
  jobPosterEmail: string;
  jobPosterName: string;
  applicantName: string;
  coverLetter?: string;
  applicationId: string;
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

    const { jobTitle, jobPosterEmail, jobPosterName, applicantName, coverLetter, applicationId }: JobApplicationNotificationRequest = await req.json();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
          <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px;">
          <h1 style="color: white; font-size: 24px;">New Job Application!</h1>
          <p style="color: #e0e0e0; font-size: 16px;">Hi ${jobPosterName},</p>
          <p style="color: #e0e0e0; font-size: 16px;">
            <strong style="color: #c026d3;">${applicantName}</strong> has applied to your job posting:
          </p>
          
          <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c026d3;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px;">${jobTitle}</h2>
          </div>
          
          ${coverLetter ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #a0a0a0; font-size: 14px; text-transform: uppercase;">Cover Letter</h3>
              <p style="color: #e0e0e0; font-size: 14px; line-height: 1.6; background: #2a2a4e; padding: 15px; border-radius: 8px;">
                ${coverLetter}
              </p>
            </div>
          ` : ''}
          
          <a href="https://artistrysynk.lovable.app/jobs" 
             style="display: inline-block; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Application
          </a>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #3a3a5e;" />
          <p style="color: #6B7280; font-size: 12px;">The ArtistrySynk Team</p>
        </div>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ArtistrySynk <notifications@artistrysynk.com>",
        to: [jobPosterEmail],
        subject: `New Application for "${jobTitle}" - ${applicantName}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send notification email", details: emailResult }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-job-application:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
