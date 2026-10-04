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
      const m = a.from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
      const fromEmail = (m ? m[2] : a.from).trim();
      const fromName = (m ? m[1].replace(/^"|"$/g, "").trim() : "") || "ArtistrySynk";
      let last = "";
      for (let i = 0; i < 3; i++) {
        if (i) await new Promise((r) => setTimeout(r, 400 * 2 ** (i - 1)));
        try {
          const res = await fetch("https://queensmtp.com/v1/send", {
            method: "POST",
            headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ from: fromEmail, fromName, from_name: fromName, to, subject: a.subject, html: a.html, text, ...(a.reply_to ? { reply_to: a.reply_to } : {}) }),
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

// Send this many recipients in parallel per chunk.
const CHUNK_SIZE = 5;
// A newsletter stuck in "processing" for longer than this is safe to resume.
const CLAIM_TIMEOUT_MINUTES = 10;
// QueenSMTP warm-up cap errors mean "stop for now, resume on a later run".
const RATE_LIMIT_PATTERN = /daily sending limit/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScheduledNewsletterRow {
  id: string;
  subject: string;
  audience: string;
  status: string;
  sent_recipients?: string[] | null;
}

/** Recipients for the given audience, deduplicated case-insensitively. */
async function loadRecipients(supabase: any, audience: string): Promise<string[]> {
  const emails: string[] = [];

  if (audience === "subscribers" || audience === "both") {
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("is_active", true);
    if (subscribers) emails.push(...subscribers.map((s: { email: string }) => s.email));
  }

  if (audience === "users" || audience === "both") {
    const { data: users } = await supabase
      .from("profiles")
      .select("email")
      .not("email", "is", null);
    if (users) emails.push(...users.filter((u: { email: string | null }) => u.email).map((u: { email: string }) => u.email));
  }

  return [...new Set(emails.map((e) => e.toLowerCase()))];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find due newsletters: pending, or processing runs that never finished.
    const { data: dueNewsletters, error: fetchError } = await supabase
      .from("scheduled_newsletters")
      .select("id, subject, audience, status, sent_recipients")
      .or(
        `and(status.eq.pending,scheduled_at.lte.${new Date().toISOString()}),and(status.eq.processing,updated_at.lt.${new Date(Date.now() - CLAIM_TIMEOUT_MINUTES * 60 * 1000).toISOString()})`
      ) as { data: ScheduledNewsletterRow[] | null; error: any };

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
    const results: Array<Record<string, unknown>> = [];

    for (const newsletter of dueNewsletters) {
      // Claim immediately so overlapping runs can't resend to the same people.
      const { error: claimError } = await supabase
        .from("scheduled_newsletters")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", newsletter.id)
        .neq("status", "sent");

      if (claimError) {
        console.error(`Could not claim newsletter ${newsletter.id}:`, claimError);
        results.push({ id: newsletter.id, success: false, error: claimError.message });
        continue;
      }

      try {
        const allRecipients = await loadRecipients(supabase, newsletter.audience);

        if (allRecipients.length === 0) {
          await supabase
            .from("scheduled_newsletters")
            .update({
              status: "failed",
              error_message: "No recipients found",
              updated_at: new Date().toISOString(),
            })
            .eq("id", newsletter.id);
          results.push({ id: newsletter.id, success: false, error: "No recipients" });
          continue;
        }

        // Skip everyone this newsletter already reached (survives restarts).
        const alreadySent = new Set((newsletter.sent_recipients ?? []) as string[]);
        const remaining = allRecipients.filter((e) => !alreadySent.has(e));
        console.log(
          `Newsletter "${newsletter.subject}": ${alreadySent.size} already delivered, ${remaining.length} remaining`
        );

        if (remaining.length === 0) {
          await supabase
            .from("scheduled_newsletters")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              recipients_count: alreadySent.size,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", newsletter.id);
          results.push({ id: newsletter.id, success: true, sent: alreadySent.size });
          continue;
        }

        let sentList = [...alreadySent];
        let permanentFailures = 0;
        let rateLimited = false;

        for (let i = 0; i < remaining.length; i += CHUNK_SIZE) {
          const chunk = remaining.slice(i, i + CHUNK_SIZE);
          const settled = await Promise.allSettled(
            chunk.map((email) =>
              resend.emails.send({
                from: "ArtistrySynk <notifications@artistrysynk.app>",
                to: [email],
                subject: newsletter.subject,
                html: newsletter.content,
              })
            )
          );

          const newlySent: string[] = [];
          for (let j = 0; j < chunk.length; j++) {
            const outcome = settled[j];
            if (outcome.status === "fulfilled") {
              newlySent.push(chunk[j]);
            } else {
              const message =
                outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
              if (RATE_LIMIT_PATTERN.test(message)) {
                rateLimited = true; // stop this run; resume on a later run
              } else {
                permanentFailures++;
                console.error(`Failed to send to ${chunk[j]}:`, message);
              }
            }
          }

          // Persist progress after every chunk so a restart never resends.
          if (newlySent.length > 0) {
            sentList = [...sentList, ...newlySent];
            await supabase
              .from("scheduled_newsletters")
              .update({
                sent_recipients: sentList,
                updated_at: new Date().toISOString(),
              })
              .eq("id", newsletter.id);
          }

          if (rateLimited) {
            console.log(
              `Sending limit reached for "${newsletter.subject}" — will resume on a later run (${sentList.length} delivered so far)`
            );
            break;
          }
        }

        if (!rateLimited) {
          // Every remaining recipient was attempted; finalize.
          await supabase
            .from("scheduled_newsletters")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              recipients_count: sentList.length,
              error_message:
                permanentFailures > 0 ? `${permanentFailures} recipient(s) could not be delivered` : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", newsletter.id);
        }

        results.push({
          id: newsletter.id,
          success: true,
          sent: sentList.length - alreadySent.length,
          remaining: rateLimited ? remaining.length - (sentList.length - alreadySent.length) : 0,
          rateLimited,
          permanentFailures,
        });
      } catch (newsletterError: any) {
        console.error(`Error processing newsletter ${newsletter.id}:`, newsletterError);
        await supabase
          .from("scheduled_newsletters")
          .update({
            status: "failed",
            error_message: newsletterError.message,
            updated_at: new Date().toISOString(),
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
