import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

/** QueenSMTP REST sender. */
class QueenSMTP {
  constructor(private key?: string) {}
  emails = {
    send: async (a: { from: string; to: string | string[]; subject: string; html?: string; text?: string; reply_to?: string }) => {
      if (!this.key) throw new Error("Email service not configured");
      const to = (Array.isArray(a.to) ? a.to : [a.to]).map((t) => t.trim()).filter(Boolean);
      const text = a.text ?? (a.html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
      let last = "";
      for (let i = 0; i < 3; i++) {
        if (i) await new Promise((r) => setTimeout(r, 400 * 2 ** (i - 1)));
        try {
          const res = await fetch("https://queensmtp.com/v1/send", {
            method: "POST",
            headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ from: a.from, to, subject: a.subject, html: a.html, text, ...(a.reply_to ? { reply_to: a.reply_to } : {}) }),
          });
          const b = (await res.json().catch(() => null)) as { id?: string; success?: boolean; error?: string } | null;
          if (res.ok && b?.success !== false) return { id: b?.id };
          last = b?.error ?? `QueenSMTP failed (${res.status})`;
          if (res.status !== 429 && res.status < 500) break;
        } catch (e) {
          last = e instanceof Error ? e.message : "network error";
        }
      }
      throw new Error(last || "Email send failed");
    },
  };
}

const resend = new QueenSMTP(Deno.env.get("QUEENSMTP_API_KEY"));

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
              from: "ArtistrySynk <notifications@artistrysynk.app>",
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
