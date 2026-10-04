/**
 * Marketing campaign worker (called by pg_cron every 5 minutes).
 *
 * - Builds a persistent, de-duplicated recipient queue per campaign (newsletter_recipients).
 * - Sends sequentially, only up to the configured rolling-window marketing capacity.
 * - HTTP 429 / daily_limit_reached: stops immediately, honours Retry-After, pauses every
 *   campaign until then. No retry loop for rate limits.
 * - Transient 5xx / network errors: per-recipient exponential backoff with jitter, max 3 attempts.
 * - A recipient is only ever marked "sent" after QueenSMTP accepts it; never resent afterwards.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const FROM_EMAIL = "newsletter@artistrysynk.app";
const FROM_NAME = "ArtistrySynk";
const SITE = "https://artistrysynk.app";
const LOCK_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const MAX_CONSECUTIVE_TRANSIENT = 3;
const DEFAULT_RETRY_AFTER_S = 3600;
// Safety fallback only if the admin setting is missing: the lowest warm-up step.
const FALLBACK_DAILY_LIMIT = 30;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (event: string, data: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ event, ...data }));

// ---------- recipient validation ----------
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/;
const TEST_DOMAINS = /(^|\.)(example\.(com|org|net)|test|invalid|localhost|mail\.tm|mailinator\.com)$/;
const TEST_LOCAL = /^(signup\.check|test[._+-]|df_test|df_\d)/;
const TYPO_DOMAINS = new Set([
  "yahoo.vom", "yahoo.con", "yahoo.cm", "yaho.com", "gmail.con", "gmail.cm", "gmial.com", "gamil.com",
  "gmai.com", "gnail.com", "hotmail.con", "hotmial.com", "outlook.con", "icloud.con",
]);
const BAD_TLDS = new Set(["vom", "con", "cmo", "comm", "coom", "xom"]);

function classify(email: string): { status: "pending" | "invalid" | "skipped"; code?: string } {
  if (!EMAIL_RE.test(email)) return { status: "invalid", code: "bad_syntax" };
  const [local, domain] = email.split("@");
  if (TYPO_DOMAINS.has(domain) || BAD_TLDS.has(domain.split(".").pop()!))
    return { status: "invalid", code: "suspicious_domain" }; // flagged for admin review, never auto-corrected
  if (TEST_DOMAINS.test(domain) || TEST_LOCAL.test(local)) return { status: "skipped", code: "test_address" };
  return { status: "pending" };
}

// ---------- provider ----------
type SendResult =
  | { kind: "ok"; id?: string; body: unknown }
  | { kind: "rate_limited"; retryAfterS: number; code: string; body: unknown }
  | { kind: "transient"; message: string }
  | { kind: "permanent"; code: string; message: string; status: number };

function parseRetryAfter(h: string | null): number {
  if (!h) return DEFAULT_RETRY_AFTER_S;
  const n = Number(h);
  if (Number.isFinite(n) && n >= 0) return Math.ceil(n);
  const d = Date.parse(h);
  return Number.isFinite(d) ? Math.max(60, Math.ceil((d - Date.now()) / 1000)) : DEFAULT_RETRY_AFTER_S;
}

async function sendOnce(key: string, to: string, subject: string, html: string, unsubUrl: string): Promise<SendResult> {
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
  let res: Response;
  try {
    res = await fetch("https://queensmtp.com/v1/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL, fromName: FROM_NAME, from_name: FROM_NAME, to: [to], subject, html, text,
        isBulk: true,
        headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    });
  } catch (e) {
    return { kind: "transient", message: e instanceof Error ? e.message : "network error" };
  }
  const body = (await res.json().catch(() => null)) as Record<string, any> | null;
  const code = String(body?.code ?? body?.error_code ?? "");
  const msg = String(body?.error ?? body?.message ?? `HTTP ${res.status}`);
  if (res.ok && body?.success !== false) return { kind: "ok", id: body?.id ?? body?.message_id, body };
  if (res.status === 429 || code === "daily_limit_reached" || /daily sending limit/i.test(msg))
    return { kind: "rate_limited", retryAfterS: parseRetryAfter(res.headers.get("Retry-After")), code: code || "rate_limited", body };
  if (res.status >= 500) return { kind: "transient", message: msg };
  return { kind: "permanent", code: code || `http_${res.status}`, message: msg, status: res.status };
}

// ---------- helpers ----------
function withUnsubscribe(html: string, url: string): string {
  let out = html.replace(/\{\{\s*unsubscribe_url\s*\}\}/g, url);
  // Point any existing "Unsubscribe" anchor at the real link.
  out = out.replace(/<a([^>]*?)href="[^"]*"([^>]*)>(\s*Unsubscribe\s*)<\/a>/gi, `<a$1href="${url}"$2>$3</a>`);
  if (!out.includes(url)) {
    const footer = `<div style="text-align:center;font-size:12px;color:#6b7280;padding:16px">You're receiving this because you subscribed to ArtistrySynk updates. <a href="${url}" style="color:#c026d3">Unsubscribe</a></div>`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${footer}</body>`) : out + footer;
  }
  return out;
}

async function getSetting(sb: any, key: string) {
  const { data } = await sb.from("admin_settings").select("setting_value").eq("setting_key", key).maybeSingle();
  return (data?.setting_value ?? null) as Record<string, any> | null;
}
async function setSetting(sb: any, key: string, value: unknown) {
  await sb.from("admin_settings").upsert({ setting_key: key, setting_value: value, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
}

async function unsubscribeUrl(sb: any, email: string): Promise<string> {
  const { data } = await sb.from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
  let token = data?.token as string | undefined;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { error } = await sb.from("email_unsubscribe_tokens").insert({ email, token });
    if (error) {
      const again = await sb.from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
      token = again.data?.token ?? token;
    }
  }
  return `${SITE}/unsubscribe?token=${token}`;
}

/** Build the eligible, de-duplicated queue once per campaign. */
async function prepareRecipients(sb: any, c: any) {
  const lower = (e: string) => e.trim().toLowerCase();
  const [subsQ, profQ, consQ, suppQ, bounceQ] = await Promise.all([
    sb.from("newsletter_subscribers").select("email, is_active"),
    sb.from("profiles").select("id, email").not("email", "is", null),
    sb.from("user_consents").select("user_id, granted, created_at").eq("consent_type", "marketing").order("created_at", { ascending: true }),
    sb.from("suppressed_emails").select("email, reason"),
    sb.from("newsletter_recipients").select("email").eq("status", "bounced"),
  ]);
  const subs = new Map<string, boolean>();
  for (const s of subsQ.data ?? []) subs.set(lower(s.email), !!s.is_active);
  const userByEmail = new Map<string, string>();
  for (const p of profQ.data ?? []) userByEmail.set(lower(p.email), p.id);
  const consent = new Map<string, boolean>(); // latest wins
  for (const r of consQ.data ?? []) consent.set(r.user_id, !!r.granted);
  const suppressed = new Map<string, string>();
  for (const s of suppQ.data ?? []) suppressed.set(lower(s.email), s.reason ?? "suppressed");
  for (const b of bounceQ.data ?? []) suppressed.set(lower(b.email), "bounce");

  const candidates = new Set<string>();
  if (c.audience === "subscribers" || c.audience === "both") for (const [e, a] of subs) if (a) candidates.add(e);
  if (c.audience === "users" || c.audience === "both") for (const e of userByEmail.keys()) candidates.add(e);

  const legacySent = new Set(((c.sent_recipients ?? []) as string[]).map(lower));
  const rows = [...candidates].map((email) => {
    const user_id = userByEmail.get(email) ?? null;
    const base = { campaign_id: c.id, email, user_id };
    if (legacySent.has(email)) return { ...base, status: "sent", accepted_at: c.updated_at, error_code: "legacy_sent" };
    const v = classify(email);
    if (v.status !== "pending") return { ...base, status: v.status, error_code: v.code };
    const supp = suppressed.get(email);
    if (supp) return { ...base, status: /bounce/i.test(supp) ? "bounced" : "unsubscribed", error_code: `suppressed_${supp}` };
    if (subs.get(email) === false) return { ...base, status: "unsubscribed", error_code: "newsletter_unsubscribed" };
    const userConsent = user_id ? consent.get(user_id) : undefined;
    if (userConsent === false) return { ...base, status: "skipped", error_code: "no_marketing_consent" };
    if (!subs.get(email) && userConsent !== true) return { ...base, status: "skipped", error_code: "no_marketing_consent" };
    return { ...base, status: "pending" };
  });

  for (const r of rows) if (r.status !== "pending" && r.status !== "sent") log("recipient_skipped", { campaign: c.id, status: r.status, reason: r.error_code });
  for (let i = 0; i < rows.length; i += 500) {
    await sb.from("newsletter_recipients").upsert(rows.slice(i, i + 500), { onConflict: "campaign_id,email", ignoreDuplicates: true });
  }
  await sb.from("scheduled_newsletters").update({ recipients_prepared: true, total_eligible: rows.filter((r) => r.status === "pending" || r.status === "sent").length }).eq("id", c.id);
}

async function refreshCounters(sb: any, id: string) {
  const { data } = await sb.from("newsletter_recipients").select("status").eq("campaign_id", id).limit(100000);
  const n: Record<string, number> = {};
  for (const r of data ?? []) n[r.status] = (n[r.status] ?? 0) + 1;
  const queued = (n.pending ?? 0) + (n.rate_limited ?? 0) + (n.processing ?? 0);
  await sb.from("scheduled_newsletters").update({
    total_queued: queued, total_sent: n.sent ?? 0, total_failed: n.failed ?? 0, total_bounced: n.bounced ?? 0,
    total_skipped: n.skipped ?? 0, total_unsubscribed: n.unsubscribed ?? 0, total_invalid: n.invalid ?? 0,
    recipients_count: n.sent ?? 0,
  }).eq("id", id);
  return queued;
}

// ---------- main ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });

  const key = Deno.env.get("QUEENSMTP_API_KEY");
  if (!key) return json({ error: "Email service not configured" }, 500);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();

  // 1. Domain-wide pause from a previous 429.
  const state = (await getSetting(sb, "marketing_send_state")) ?? {};
  if (state.paused_until && new Date(state.paused_until) > now) {
    log("skipped_paused", { paused_until: state.paused_until });
    return json({ paused_until: state.paused_until });
  }

  // 2. Rolling-window capacity from the configurable limit.
  const limits = (await getSetting(sb, "marketing_email_limits")) ?? {};
  const dailyLimit = Number(limits.daily_limit) > 0 ? Number(limits.daily_limit) : FALLBACK_DAILY_LIMIT;
  const windowH = Number(limits.window_hours) > 0 ? Number(limits.window_hours) : 24;
  const since = new Date(now.getTime() - windowH * 3600_000).toISOString();
  const { count: usedCount } = await sb.from("newsletter_recipients").select("id", { count: "exact", head: true }).gte("accepted_at", since).neq("error_code", "legacy_sent");
  let capacity = dailyLimit - (usedCount ?? 0);

  // 3. Due campaigns.
  const { data: due } = await sb.from("scheduled_newsletters")
    .select("id, subject, content, audience, status, sent_recipients, recipients_prepared, updated_at, current_batch")
    .or(`and(status.eq.pending,scheduled_at.lte.${now.toISOString()}),and(status.eq.paused,paused_reason.eq.rate_limit,next_attempt_at.lte.${now.toISOString()}),and(status.eq.processing,locked_until.lt.${now.toISOString()}),and(status.eq.processing,locked_until.is.null)`)
    .order("scheduled_at", { ascending: true });
  if (!due?.length) return json({ message: "No campaigns due" });

  if (capacity <= 0) {
    const { data: oldest } = await sb.from("newsletter_recipients").select("accepted_at").gte("accepted_at", since).neq("error_code", "legacy_sent").order("accepted_at").limit(1).maybeSingle();
    const next = new Date((oldest?.accepted_at ? new Date(oldest.accepted_at).getTime() : now.getTime()) + windowH * 3600_000 + 60_000).toISOString();
    await sb.from("scheduled_newsletters").update({ status: "paused", paused_reason: "rate_limit", next_attempt_at: next, last_error: "Warm-up limit reached. Campaign paused. Sending will resume automatically." }).in("id", due.map((d: any) => d.id));
    log("capacity_exhausted", { dailyLimit, used: usedCount, resume_at: next });
    return json({ capacity: 0, resume_at: next });
  }

  const summary: any[] = [];
  let stopAll = false;

  for (const c of due) {
    if (stopAll || capacity <= 0) break;
    // Atomic claim: only one worker run can hold a campaign.
    const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
    const { data: claimed } = await sb.from("scheduled_newsletters")
      .update({ status: "processing", locked_until: lockUntil, paused_reason: null, last_error: null })
      .eq("id", c.id).in("status", ["pending", "paused", "processing"])
      .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
      .select("id");
    if (!claimed?.length) continue;
    const resumed = c.status !== "pending";
    log(resumed ? "campaign_resumed" : "campaign_started", { campaign: c.id, subject: c.subject });

    if (!c.recipients_prepared) await prepareRecipients(sb, c);

    // Recipients left "processing" by a crashed run have unknown outcome: never resend.
    await sb.from("newsletter_recipients").update({ status: "failed", error_code: "unknown_outcome", error_message: "Worker stopped mid-send; not resent to avoid duplicates" })
      .eq("campaign_id", c.id).eq("status", "processing");

    const batchNo = (c.current_batch ?? 0) + 1;
    const { data: batch } = await sb.from("newsletter_recipients").select("id, email, attempts")
      .eq("campaign_id", c.id).in("status", ["pending", "rate_limited"])
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`)
      .order("created_at").order("id").limit(capacity);
    log("batch_started", { campaign: c.id, batch: batchNo, size: batch?.length ?? 0, capacity, dailyLimit });
    await sb.from("scheduled_newsletters").update({ current_batch: batchNo, provider_limit: dailyLimit }).eq("id", c.id);

    let sent = 0, consecutiveTransient = 0;
    for (const r of batch ?? []) {
      const { data: got } = await sb.from("newsletter_recipients")
        .update({ status: "processing", last_attempt_at: new Date().toISOString(), attempts: r.attempts + 1 })
        .eq("id", r.id).in("status", ["pending", "rate_limited"]).select("id");
      if (!got?.length) continue;

      const unsub = await unsubscribeUrl(sb, r.email);
      const result = await sendOnce(key, r.email, c.subject, withUnsubscribe(c.content, unsub), unsub);

      if (result.kind === "ok") {
        await sb.from("newsletter_recipients").update({ status: "sent", accepted_at: new Date().toISOString(), provider_message_id: result.id ?? null, error_code: null, error_message: null }).eq("id", r.id);
        sent++; capacity--; consecutiveTransient = 0;
        log("email_accepted", { campaign: c.id, recipient: r.id });
        continue;
      }
      if (result.kind === "rate_limited") {
        const resumeAt = new Date(Date.now() + result.retryAfterS * 1000).toISOString();
        // Not an attempt against this person: restore attempts count.
        await sb.from("newsletter_recipients").update({ status: "rate_limited", attempts: r.attempts, next_attempt_at: null, error_code: result.code }).eq("id", r.id);
        await sb.from("scheduled_newsletters").update({ status: "paused", paused_reason: "rate_limit", next_attempt_at: resumeAt, locked_until: null, last_provider_response: { status: 429, code: result.code, retry_after_s: result.retryAfterS, body: result.body }, last_error: "Warm-up limit reached. Campaign paused. Sending will resume automatically." }).eq("id", c.id);
        await sb.from("scheduled_newsletters").update({ next_attempt_at: resumeAt, paused_reason: "rate_limit", status: "paused" }).eq("status", "paused").eq("paused_reason", "rate_limit").lt("next_attempt_at", resumeAt);
        await setSetting(sb, "marketing_send_state", { paused_until: resumeAt, reason: result.code, last_429_at: new Date().toISOString(), retry_after_s: result.retryAfterS });
        log("provider_429", { campaign: c.id, code: result.code, retry_after_s: result.retryAfterS });
        log("campaign_paused", { campaign: c.id, resume_at: resumeAt });
        stopAll = true;
        break;
      }
      if (result.kind === "transient") {
        const attempts = r.attempts + 1;
        consecutiveTransient++;
        if (attempts >= MAX_ATTEMPTS) {
          await sb.from("newsletter_recipients").update({ status: "failed", error_code: "transient_exhausted", error_message: result.message.slice(0, 500) }).eq("id", r.id);
          log("email_failed", { campaign: c.id, recipient: r.id, reason: "transient_exhausted" });
        } else {
          const delay = 60_000 * 4 ** (attempts - 1) * (0.75 + Math.random() * 0.5); // ~1m, ~4m (+/- jitter)
          await sb.from("newsletter_recipients").update({ status: "pending", next_attempt_at: new Date(Date.now() + delay).toISOString(), error_code: "transient", error_message: result.message.slice(0, 500) }).eq("id", r.id);
          log("email_retry_scheduled", { campaign: c.id, recipient: r.id, attempts, delay_ms: Math.round(delay) });
        }
        if (consecutiveTransient >= MAX_CONSECUTIVE_TRANSIENT) { log("provider_unhealthy_stop", { campaign: c.id }); stopAll = true; break; }
        continue;
      }
      // permanent
      consecutiveTransient = 0;
      const isBounce = /bounce|suppress|blocked/i.test(result.message);
      const isInvalid = (result.status === 400 || result.status === 422) && /invalid|recipient|address|email/i.test(result.message);
      await sb.from("newsletter_recipients").update({ status: isBounce ? "bounced" : isInvalid ? "invalid" : "failed", error_code: result.code, error_message: result.message.slice(0, 500) }).eq("id", r.id);
      log("email_failed", { campaign: c.id, recipient: r.id, code: result.code, http: result.status });
    }

    const remaining = await refreshCounters(sb, c.id);
    const { data: cur } = await sb.from("scheduled_newsletters").select("status").eq("id", c.id).single();
    if (cur?.status === "processing") {
      if (remaining === 0) {
        await sb.from("scheduled_newsletters").update({ status: "sent", sent_at: new Date().toISOString(), completed_at: new Date().toISOString(), locked_until: null, next_attempt_at: null, paused_reason: null }).eq("id", c.id);
        log("campaign_completed", { campaign: c.id });
      } else {
        // Waiting on retry backoff or capacity: release and come back on a later run.
        const { data: nextR } = await sb.from("newsletter_recipients").select("next_attempt_at").eq("campaign_id", c.id).in("status", ["pending", "rate_limited"]).order("next_attempt_at", { ascending: true, nullsFirst: true }).limit(1).maybeSingle();
        await sb.from("scheduled_newsletters").update({ status: "pending", locked_until: null, next_attempt_at: nextR?.next_attempt_at ?? null }).eq("id", c.id);
      }
    }
    summary.push({ id: c.id, sent, remaining });
  }

  return json({ processed: summary, capacity_left: capacity });
});
