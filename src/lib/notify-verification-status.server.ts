export async function notifyVerificationStatus(input: {
  email: string;
  fullName: string;
  status: "approved" | "rejected";
  requestType: string;
  reason?: string;
}) {
  const { sendEmail, LOGO_URL } = await import("@/lib/email/resend.server");
  const { email, fullName, status, requestType, reason } = input;

  const brandedHeader = `
  <div style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 12px 12px 0 0;">
    <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
  </div>
`;

  const isApproved = status === "approved";
  const subject = isApproved
    ? `Your ${requestType} verification has been approved! 🎉`
    : `Update on your ${requestType} verification request`;

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        ${brandedHeader}
        <div style="padding: 30px;">
          ${isApproved ? `
            <h1 style="color: #8B5CF6;">Congratulations, ${fullName}! 🎉</h1>
            <p>Your <strong>${requestType}</strong> verification request has been <span style="color: #22C55E; font-weight: bold;">approved</span>!</p>
            <p>You now have a verified badge on your profile, which helps build trust with other creatives on the platform.</p>
            <p>Keep creating amazing work!</p>
          ` : `
            <h1 style="color: #8B5CF6;">Hi ${fullName},</h1>
            <p>Unfortunately, your <strong>${requestType}</strong> verification request was <span style="color: #EF4444; font-weight: bold;">not approved</span> at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>Don't worry! You can submit a new verification request after addressing any issues.</p>
            <p>If you have questions, feel free to reach out to our support team.</p>
          `}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
          <p style="color: #6B7280; font-size: 12px;">The ArtistrySynk Team</p>
        </div>
      </div>
    `;

  const data = await sendEmail({
    from: "ArtistrySynk <notifications@artistrysynk.app>",
    to: email,
    subject,
    html,
  });

  return data;
}
