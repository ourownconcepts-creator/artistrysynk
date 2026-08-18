import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

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

const EMAIL_API_KEY = Deno.env.get("QUEENSMTP_API_KEY");
const LOGO_URL =
  "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";
const APP_URL = "https://artistrysynk.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ActivityRow {
  match_user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  new_portfolio_items: number;
  new_messages: number;
  came_online: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!EMAIL_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const resend = new QueenSMTP(EMAIL_API_KEY);

    // Find users who have digest enabled AND haven't received one in the last 20 hours.
    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
    const { data: recipients, error: recipErr } = await supabase
      .from("user_settings")
      .select("user_id, last_digest_sent_at")
      .eq("email_notifications", true)
      .eq("match_activity_digest", true)
      .or(`last_digest_sent_at.is.null,last_digest_sent_at.lt.${cutoff}`);

    if (recipErr) throw recipErr;

    let sent = 0;
    let skipped = 0;

    for (const r of recipients ?? []) {
      const since = r.last_digest_sent_at
        ? new Date(r.last_digest_sent_at).toISOString()
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: activity } = await supabase.rpc("get_match_activity_since", {
        _user_id: r.user_id,
        _since: since,
      });

      const rows = ((activity as ActivityRow[]) ?? []).filter(
        (a) => a.came_online || a.new_portfolio_items > 0 || a.new_messages > 0,
      );

      if (rows.length === 0) {
        skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(r.user_id);
      const email = authUser?.user?.email;
      if (!email) {
        skipped++;
        continue;
      }

      const { data: me } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", r.user_id)
        .maybeSingle();

      const items = rows
        .slice(0, 10)
        .map((row) => {
          const bits: string[] = [];
          if (row.came_online) bits.push("was recently online");
          if (row.new_portfolio_items > 0)
            bits.push(
              `added ${row.new_portfolio_items} new portfolio item${row.new_portfolio_items === 1 ? "" : "s"}`,
            );
          if (row.new_messages > 0)
            bits.push(`sent you ${row.new_messages} message${row.new_messages === 1 ? "" : "s"}`);
          return `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #1f1f22;">
                <table role="presentation" width="100%">
                  <tr>
                    <td style="width:56px;vertical-align:middle;">
                      <img src="${row.avatar_url || `${APP_URL}/placeholder.svg`}" alt="" width="48" height="48" style="border-radius:50%;object-fit:cover;display:block;" />
                    </td>
                    <td style="vertical-align:middle;color:#e4e4e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      <div style="font-weight:600;font-size:15px;">${escapeHtml(row.full_name || row.username || "A match")}</div>
                      <div style="font-size:13px;color:#a1a1aa;margin-top:2px;">${bits.join(" · ")}</div>
                    </td>
                    <td style="text-align:right;vertical-align:middle;">
                      <a href="${APP_URL}/profile/${row.username || row.match_user_id}" style="background:linear-gradient(135deg,#c026d3,#7c3aed);color:#fff;text-decoration:none;font-size:13px;padding:8px 14px;border-radius:8px;font-family:sans-serif;">View</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;
        })
        .join("");

      const firstName = (me?.full_name || "").split(" ")[0] || "there";

      try {
        await resend.emails.send({
          from: "ArtistrySynk <hello@artistrysynk.app>",
          to: [email],
          subject: `Your matches have been active ✨`,
          html: `
            <!DOCTYPE html>
            <html><body style="margin:0;padding:0;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;padding:32px 16px;">
                <tr><td align="center">
                  <table role="presentation" width="600" style="max-width:600px;width:100%;background:#131316;border-radius:16px;overflow:hidden;">
                    <tr><td style="text-align:center;padding:28px 0;background:linear-gradient(135deg,#c026d3 0%,#7c3aed 50%,#f97316 100%);">
                      <img src="${LOGO_URL}" alt="ArtistrySynk" style="height:60px;" />
                    </td></tr>
                    <tr><td style="padding:32px 28px;">
                      <h1 style="color:#fff;font-size:22px;margin:0 0 8px;">Hey ${escapeHtml(firstName)},</h1>
                      <p style="color:#a1a1aa;font-size:15px;line-height:1.5;margin:0 0 20px;">Here's what your matches have been up to.</p>
                      <table role="presentation" width="100%">${items}</table>
                      <div style="text-align:center;margin-top:28px;">
                        <a href="${APP_URL}/matches" style="background:linear-gradient(135deg,#c026d3,#7c3aed);color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;">Open ArtistrySynk</a>
                      </div>
                    </td></tr>
                    <tr><td style="padding:20px 28px;border-top:1px solid #1f1f22;color:#71717a;font-size:12px;text-align:center;">
                      You’re receiving this because match activity digests are on. <a href="${APP_URL}/settings" style="color:#c026d3;">Manage preferences</a>.
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body></html>`,
        });

        await supabase
          .from("user_settings")
          .update({ last_digest_sent_at: new Date().toISOString() })
          .eq("user_id", r.user_id);

        sent++;
      } catch (err) {
        console.error("digest send failed for", r.user_id, err);
        skipped++;
      }
    }

    return new Response(JSON.stringify({ sent, skipped, total: recipients?.length ?? 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("digest error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}