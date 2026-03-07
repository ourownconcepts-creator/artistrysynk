import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsletterCampaignRequest {
  subject: string;
  content: string;
  previewText?: string;
  audience?: "subscribers" | "users" | "both";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user has admin role (user may have multiple roles, just check if any admin role exists)
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "master_admin", "super_admin"])
      .limit(1);

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Failed to verify admin role" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { subject, content, previewText, audience = "subscribers" }: NewsletterCampaignRequest = await req.json();

    if (!subject || !content) {
      return new Response(JSON.stringify({ error: "Subject and content are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emails: string[] = [];

    // Fetch newsletter subscribers
    if (audience === "subscribers" || audience === "both") {
      const { data: subscribers, error: subscribersError } = await supabase
        .from("newsletter_subscribers")
        .select("email")
        .eq("is_active", true);

      if (subscribersError) {
        console.error("Error fetching subscribers:", subscribersError);
      } else if (subscribers) {
        emails.push(...subscribers.map((s) => s.email));
      }
    }

    // Fetch app users
    if (audience === "users" || audience === "both") {
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("email")
        .not("email", "is", null);

      if (usersError) {
        console.error("Error fetching users:", usersError);
      } else if (users) {
        emails.push(...users.filter((u) => u.email).map((u) => u.email as string));
      }
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];

    if (uniqueEmails.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending newsletter to ${uniqueEmails.length} recipients (audience: ${audience})`);

    // Send emails in batches of 50 (Resend limit)
    const batchSize = 50;
    const results = [];
    
    for (let i = 0; i < uniqueEmails.length; i += batchSize) {
      const batch = uniqueEmails.slice(i, i + batchSize);
      
      // Send to each email individually to avoid BCC limits
      for (const email of batch) {
        try {
          const emailResponse = await resend.emails.send({
            from: "ArtistrySynk <newsletter@artistrysynk.com>",
            to: [email],
            subject: subject,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${previewText ? `<meta name="description" content="${previewText}">` : ""}
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
                ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ""}
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">ArtistrySynk</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Connect. Create. Collaborate.</p>
                  </div>
                  
                  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    ${content}
                    
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        You're receiving this email because you subscribed to our newsletter.<br>
                        <a href="https://artistrysynk.lovable.app" style="color: #8B5CF6;">Unsubscribe</a>
                      </p>
                    </div>
                  </div>
                  
                  <div style="text-align: center; padding: 20px;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} ArtistrySynk. All rights reserved.<br>
                      Lagos, Nigeria
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });
          results.push({ email, success: true, data: emailResponse });
        } catch (emailError: any) {
          console.error(`Failed to send to ${email}:`, emailError);
          results.push({ email, success: false, error: emailError.message });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`Newsletter campaign completed: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        totalRecipients: uniqueEmails.length,
        sent: successCount,
        failed: failCount,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter-campaign function:", error);
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
