import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerificationEmailRequest {
  email: string;
  fullName: string;
  status: "approved" | "rejected";
  requestType: string;
  reason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, status, requestType, reason }: VerificationEmailRequest = await req.json();

    const isApproved = status === "approved";
    const subject = isApproved 
      ? `Your ${requestType} verification has been approved! 🎉`
      : `Update on your ${requestType} verification request`;

    const html = isApproved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6;">Congratulations, ${fullName}! 🎉</h1>
          <p>Your <strong>${requestType}</strong> verification request has been <span style="color: #22C55E; font-weight: bold;">approved</span>!</p>
          <p>You now have a verified badge on your profile, which helps build trust with other creatives on the platform.</p>
          <p>Keep creating amazing work!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
          <p style="color: #6B7280; font-size: 12px;">The Artistry.ng Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8B5CF6;">Hi ${fullName},</h1>
          <p>Unfortunately, your <strong>${requestType}</strong> verification request was <span style="color: #EF4444; font-weight: bold;">not approved</span> at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Don't worry! You can submit a new verification request after addressing any issues.</p>
          <p>If you have questions, feel free to reach out to our support team.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
          <p style="color: #6B7280; font-size: 12px;">The Artistry.ng Team</p>
        </div>
      `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Artistry.ng <notifications@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const data = await emailResponse.json();

    console.log("Verification email sent:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
