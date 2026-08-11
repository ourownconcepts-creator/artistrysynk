import { sendEmail, LOGO_URL } from "@/lib/email/resend.server";

export interface NotifyJobApplicationInput {
  jobTitle: string;
  jobPosterEmail: string;
  jobPosterName: string;
  applicantName: string;
  coverLetter?: string;
  applicationId: string;
}

export async function notifyJobApplication({
  jobTitle,
  jobPosterEmail,
  jobPosterName,
  applicantName,
  coverLetter,
}: NotifyJobApplicationInput) {
  if (!process.env["RESEND_API_KEY"]) {
    throw new Error("Email service not configured");
  }

  const html = `
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
          
          <a href="https://artistrysynk.app/jobs" 
             style="display: inline-block; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Application
          </a>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #3a3a5e;" />
          <p style="color: #6B7280; font-size: 12px;">The ArtistrySynk Team</p>
        </div>
      </div>
    `;

  try {
    const emailResult = await sendEmail({
      from: "ArtistrySynk <notifications@artistrysynk.app>",
      to: jobPosterEmail,
      subject: `New Application for "${jobTitle}" - ${applicantName}`,
      html,
    });

    return { success: true as const, messageId: emailResult.id };
  } catch (error: any) {
    console.error("Error in notify-job-application:", error);
    throw new Error(error.message);
  }
}
