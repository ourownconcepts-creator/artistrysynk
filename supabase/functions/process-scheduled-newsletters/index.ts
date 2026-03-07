import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find pending newsletters that are due
    const now = new Date().toISOString();
    const { data: dueNewsletters, error: fetchError } = await supabase
      .from("scheduled_newsletters")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now);

    if (fetchError) {
      console.error("Error fetching scheduled newsletters:", fetchError);
      throw fetchError;
    }

    if (!dueNewsletters || dueNewsletters.length === 0) {
      console.log("No newsletters due for sending");
      return new Response(JSON.stringify({ message: "No newsletters due" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${dueNewsletters.length} newsletter(s) to send`);

    const results = [];

    for (const newsletter of dueNewsletters) {
      try {
        const emails: string[] = [];

        // Fetch newsletter subscribers
        if (newsletter.audience === "subscribers" || newsletter.audience === "both") {
          const { data: subscribers } = await supabase
            .from("newsletter_subscribers")
            .select("email")
            .eq("is_active", true);

          if (subscribers) {
            emails.push(...subscribers.map((s: { email: string }) => s.email));
          }
        }

        // Fetch app users
        if (newsletter.audience === "users" || newsletter.audience === "both") {
          const { data: users } = await supabase
            .from("profiles")
            .select("email")
            .not("email", "is", null);

          if (users) {
            emails.push(...users.filter((u: { email: string | null }) => u.email).map((u: { email: string }) => u.email));
          }
        }

        // Remove duplicates
        const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase()))];

        if (uniqueEmails.length === 0) {
          await supabase
            .from("scheduled_newsletters")
            .update({ 
              status: "failed", 
              error_message: "No recipients found",
              updated_at: new Date().toISOString()
            })
            .eq("id", newsletter.id);
          
          results.push({ id: newsletter.id, success: false, error: "No recipients" });
          continue;
        }

        console.log(`Sending newsletter "${newsletter.subject}" to ${uniqueEmails.length} recipients`);

        // Send emails
        let successCount = 0;
        let failCount = 0;

        for (const email of uniqueEmails) {
          try {
            await resend.emails.send({
              from: "ArtistrySynk <newsletter@artistrysynk.com>",
              to: [email],
              subject: newsletter.subject,
              html: newsletter.content,
            });
            successCount++;
          } catch (emailError) {
            console.error(`Failed to send to ${email}:`, emailError);
            failCount++;
          }
        }

        // Update newsletter status
        await supabase
          .from("scheduled_newsletters")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            recipients_count: successCount,
            error_message: failCount > 0 ? `${failCount} emails failed to send` : null,
            updated_at: new Date().toISOString()
          })
          .eq("id", newsletter.id);

        results.push({ 
          id: newsletter.id, 
          success: true, 
          sent: successCount, 
          failed: failCount 
        });

      } catch (newsletterError: any) {
        console.error(`Error processing newsletter ${newsletter.id}:`, newsletterError);
        
        await supabase
          .from("scheduled_newsletters")
          .update({ 
            status: "failed", 
            error_message: newsletterError.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", newsletter.id);

        results.push({ id: newsletter.id, success: false, error: newsletterError.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in process-scheduled-newsletters:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
