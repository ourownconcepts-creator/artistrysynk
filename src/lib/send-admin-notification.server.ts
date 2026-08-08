import { sendEmail, LOGO_URL } from "@/lib/email/resend.server";

export interface SendAdminNotificationInput {
  recipientEmail: string;
  adminName: string;
  action: string;
  targetUser: string;
  details?: string;
}

/**
 * Reusable implementation so other server code (e.g. other server functions)
 * can call this directly without going through the HTTP server-fn boundary.
 */
export async function sendAdminNotification({
  recipientEmail,
  adminName,
  action,
  targetUser,
  details,
}: SendAdminNotificationInput) {
  if (!process.env["RESEND_API_KEY"]) {
    console.error("RESEND_API_KEY is not configured");
    throw new Error("Email service not configured");
  }

  console.log(`Sending admin notification to ${recipientEmail} for action: ${action}`);

  const html = `
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
      `;

  try {
    const emailResponse = await sendEmail({
      from: "Admin Notifications <notifications@artistrysynk.app>",
      to: recipientEmail,
      subject: `Admin Action Alert: ${action}`,
      html,
    });

    console.log("Admin notification email sent:", emailResponse);
    return emailResponse;
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
    throw new Error(error.message);
  }
}
