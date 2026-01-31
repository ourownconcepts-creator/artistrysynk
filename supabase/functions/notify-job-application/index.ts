import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
  // Handle CORS preflight requests
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

    const {
      jobTitle,
      jobPosterEmail,
      jobPosterName,
      applicantName,
      coverLetter,
      applicationId
    }: JobApplicationNotificationRequest = await req.json();

    console.log(`Sending job application notification for: ${jobTitle} to ${jobPosterEmail}`);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Job Application!</h1>
        </div>
        
        <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="color: #e0e0e0; font-size: 16px; margin-bottom: 20px;">
            Hi ${jobPosterName},
          </p>
          
          <p style="color: #e0e0e0; font-size: 16px; margin-bottom: 20px;">
            Great news! <strong style="color: #8B5CF6;">${applicantName}</strong> has applied to your job posting:
          </p>
          
          <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #8B5CF6;">
            <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 18px;">${jobTitle}</h2>
          </div>
          
          ${coverLetter ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #a0a0a0; font-size: 14px; margin-bottom: 10px; text-transform: uppercase;">Cover Letter</h3>
              <p style="color: #e0e0e0; font-size: 14px; line-height: 1.6; background: #2a2a4e; padding: 15px; border-radius: 8px;">
                ${coverLetter}
              </p>
            </div>
          ` : ''}
          
          <a href="https://artistry.com/jobs" 
             style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
            View Application
          </a>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #3a3a5e;" />
          
          <p style="color: #6B7280; font-size: 12px; margin: 0;">
            The Artistry Team<br/>
            <a href="https://artistry.com" style="color: #8B5CF6;">artistry.com</a>
          </p>
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
        from: "Artistry <notifications@resend.dev>",
        to: [jobPosterEmail],
        subject: `New Application for "${jobTitle}" - ${applicantName}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Error sending email:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send notification email", details: emailResult }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Job application notification sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-job-application function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
