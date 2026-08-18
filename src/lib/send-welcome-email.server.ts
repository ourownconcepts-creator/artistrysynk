import { sendEmail, LOGO_URL } from "@/lib/email/queensmtp.server";

export interface SendWelcomeEmailInput {
  email: string;
  fullName: string;
  username: string;
}

export async function sendWelcomeEmail({ email, fullName, username }: SendWelcomeEmailInput) {
  if (!process.env["QUEENSMTP_API_KEY"]) {
    throw new Error("Email service not configured");
  }

  if (!email || !fullName) {
    throw new Error("Email and fullName are required");
  }

  const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0b;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0b; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                  <tr>
                    <td style="text-align: center; padding: 30px 0 20px 0; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 50%, #f97316 100%); border-radius: 16px 16px 0 0;">
                      <img src="${LOGO_URL}" alt="ArtistrySynk" style="height: 80px; width: auto;" />
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                        Create • Connect • Collaborate
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #18181b; padding: 40px; border-radius: 0 0 16px 16px;">
                      <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">
                        Welcome, ${fullName}! 🎉
                      </h2>
                      
                      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        You've just joined the global creative community. Whether you're a musician, producer, designer, videographer, or any creative professional – you're in the right place.
                      </p>

                      <div style="background-color: #27272a; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                        <h3 style="color: #c026d3; margin: 0 0 16px 0; font-size: 18px;">🚀 Get Started</h3>
                        <ul style="color: #a1a1aa; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                          <li><strong style="color: #ffffff;">Complete your profile</strong> – Add your skills, portfolio, and bio</li>
                          <li><strong style="color: #ffffff;">Discover creatives</strong> – Swipe through talented professionals</li>
                          <li><strong style="color: #ffffff;">Match & collaborate</strong> – Connect with like-minded creators</li>
                          <li><strong style="color: #ffffff;">Start projects</strong> – Build something amazing together</li>
                        </ul>
                      </div>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="https://artistrysynk.app/setup-profile" style="display: inline-block; background: linear-gradient(135deg, #c026d3 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
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

                  <tr>
                    <td style="padding: 24px; text-align: center;">
                      <p style="color: #52525b; font-size: 12px; margin: 0 0 8px 0;">
                        © ${new Date().getFullYear()} ArtistrySynk – Global Creative Network
                      </p>
                      <p style="color: #52525b; font-size: 12px; margin: 0;">
                        <a href="https://artistrysynk.app" style="color: #c026d3; text-decoration: none;">Visit Website</a> •
                        <a href="https://artistrysynk.app/discover" style="color: #c026d3; text-decoration: none;">Discover Creatives</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

  try {
    const data = await sendEmail({
      from: "ArtistrySynk <hello@artistrysynk.app>",
      to: email,
      subject: `Welcome to ArtistrySynk, ${fullName}! 🎨`,
      html,
    });
    return { success: true as const, data };
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    throw new Error(error.message);
  }
}
