import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const EMAIL_API_KEY = Deno.env.get("QUEENSMTP_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOGO_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 min: skip email if recipient is active
const THROTTLE_MS = 60 * 60 * 1000; // 1 hour per (recipient, sender)

// In-memory throttle (best-effort; function may cold-start)
const lastSent = new Map<string, number>();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!EMAIL_API_KEY) throw new Error("Email service not configured");
    const { conversation_id, sender_id, content } = await req.json();
    if (!conversation_id || !sender_id) {
      return new Response(JSON.stringify({ error: "missing params" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find recipient via conversation -> match
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, match_id, matches!inner(user_id_1, user_id_2)")
      .eq("id", conversation_id)
      .single();
    if (!conv) throw new Error("conversation not found");
    const m: any = conv.matches;
    const recipient_id = m.user_id_1 === sender_id ? m.user_id_2 : m.user_id_1;

    // Throttle
    const key = `${recipient_id}:${sender_id}`;
    const now = Date.now();
    const prev = lastSent.get(key) ?? 0;
    if (now - prev < THROTTLE_MS) {
      return new Response(JSON.stringify({ skipped: "throttled" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Recipient profile + preferences
    const [{ data: recipient }, { data: settings }, { data: sender }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, last_seen_at").eq("id", recipient_id).single(),
      supabase.from("user_settings").select("email_notifications, message_notifications").eq("user_id", recipient_id).maybeSingle(),
      supabase.from("profiles").select("full_name, username, avatar_url").eq("id", sender_id).single(),
    ]);

    if (!recipient?.email) throw new Error("no recipient email");
    if (settings && (settings.email_notifications === false || settings.message_notifications === false)) {
      return new Response(JSON.stringify({ skipped: "user opted out" }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Skip if recipient is currently online
    if (recipient.last_seen_at) {
      const seen = new Date(recipient.last_seen_at).getTime();
      if (now - seen < ONLINE_WINDOW_MS) {
        return new Response(JSON.stringify({ skipped: "recipient online" }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const senderName = sender?.full_name || sender?.username || "Someone";
    const preview = (content || "").toString().slice(0, 140);
    const messagesUrl = "https://artistrysynk.app/messages";

    const resend = new QueenSMTP(EMAIL_API_KEY);
    await resend.emails.send({
      from: "ArtistrySynk <notifications@artistrysynk.app>",
      to: [recipient.email],
      subject: `New message from ${senderName}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:0;background:#f4f4f5;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;padding:30px 0 20px 0;background:linear-gradient(135deg,#c026d3 0%,#7c3aed 50%,#f97316 100%);border-radius:16px 16px 0 0;">
            <img src="${LOGO_URL}" alt="ArtistrySynk" style="height:80px;width:auto;" />
          </div>
          <div style="background:white;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color:#1f2937;margin:0 0 16px 0;font-size:22px;">You've got a new message 💬</h2>
            <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
              <strong>${senderName}</strong> just sent you a message on ArtistrySynk.
            </p>
            ${preview ? `<div style="background:#f9fafb;border-left:4px solid #c026d3;padding:15px 20px;margin:0 0 24px 0;border-radius:0 8px 8px 0;color:#374151;font-style:italic;">"${preview.replace(/</g, "&lt;")}"</div>` : ""}
            <div style="text-align:center;margin:28px 0;">
              <a href="${messagesUrl}" style="display:inline-block;background:linear-gradient(135deg,#c026d3 0%,#7c3aed 100%);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;">Reply now</a>
            </div>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;">You can disable message emails in Settings → Notifications.</p>
          </div>
          <div style="text-align:center;padding:20px;"><p style="color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ArtistrySynk. All rights reserved.</p></div>
        </div></body></html>`,
    });

    lastSent.set(key, now);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("notify-new-message-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});