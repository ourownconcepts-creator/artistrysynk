/**
 * Marketing campaign worker (pg_cron every 5 minutes). The only marketing sender.
 * State machine lives in SQL (mkt_* functions); loop logic in ./core.ts.
 *
 * QueenSMTP limitation: no documented idempotency key or lookup-by-our-key, so a request
 * whose response is lost cannot be reconciled automatically. Such recipients are marked
 * "unknown" and never resent unless an admin checks the QueenSMTP message log and requeues.
 * An Idempotency-Key header and X-ArtistrySynk-Send-Key mail header are still sent so the
 * provider can dedupe (if supported) and admins can find the message in the log.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import {
  runWorker, decideRecipient, buildMarketingPayload, classifyResponse, classifyNetworkError,
  type CampaignRow, type SendInput, type SendResult,
} from "./core.ts";

const SITE = "https://artistrysynk.app";
const FROM = { email: "newsletter@artistrysynk.app", name: "ArtistrySynk" };
const REQUEST_TIMEOUT_MS = 20_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const log = (event: string, data: Record<string, unknown> = {}) => console.log(JSON.stringify({ event, ...data }));

async function sendQueen(key: string, i: SendInput): Promise<SendResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch("https://queensmtp.com/v1/send", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json",
        "Idempotency-Key": i.idempotencyKey,
      },
      body: JSON.stringify(buildMarketingPayload(i, FROM)),
    });
    const body = await res.json().catch(() => null);
    return classifyResponse(res.status, res.headers, body);
  } catch (e) {
    return classifyNetworkError(e);
  } finally {
    clearTimeout(t);
  }
}

async function prepareRecipients(sb: any, c: CampaignRow) {
  const lower = (e: string) => e.trim().toLowerCase();
  const [subsQ, profQ, consQ, suppQ, bounceQ] = await Promise.all([
    sb.from("newsletter_subscribers").select("email, is_active"),
    sb.from("profiles").select("id, email").not("email", "is", null),
    sb.from("user_consents").select("user_id, granted, created_at").eq("consent_type", "marketing").order("created_at", { ascending: true }),
    sb.from("suppressed_emails").select("email, reason"),
    sb.from("newsletter_recipients").select("email").eq("status", "bounced"),
  ]);
  const subscriberActive = new Map<string, boolean>();
  for (const s of subsQ.data ?? []) subscriberActive.set(lower(s.email), !!s.is_active);
  const userByEmail = new Map<string, string>();
  for (const p of profQ.data ?? []) userByEmail.set(lower(p.email), p.id);
  const latestMarketingConsent = new Map<string, boolean>();
  for (const r of consQ.data ?? []) latestMarketingConsent.set(r.user_id, !!r.granted);
  const suppressed = new Map<string, string>();
  for (const s of suppQ.data ?? []) suppressed.set(lower(s.email), s.reason ?? "suppressed");
  for (const b of bounceQ.data ?? []) suppressed.set(lower(b.email), "bounce");

  const candidates = new Set<string>();
  if (c.audience === "subscribers" || c.audience === "both") for (const [e, a] of subscriberActive) if (a) candidates.add(e);
  if (c.audience === "users" || c.audience === "both") for (const e of userByEmail.keys()) candidates.add(e);

  const legacySent = new Set(((c.sent_recipients ?? []) as string[]).map(lower));
  const ctx = { subscriberActive, userByEmail, latestMarketingConsent, suppressed };
  const rows = [...candidates].map((email) => {
    const base = { campaign_id: c.id, email, user_id: userByEmail.get(email) ?? null };
    if (legacySent.has(email)) return { ...base, status: "sent", accepted_at: c.updated_at, error_code: "legacy_sent" };
    const d = decideRecipient(email, ctx);
    if (d.status !== "pending") log(d.status === "unsubscribed" ? "unsubscribe_skipped" : d.status === "bounced" ? "bounce_skipped" : "recipient_skipped", { campaign: c.id, status: d.status, reason: d.code });
    return { ...base, status: d.status, error_code: d.code ?? null };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from("newsletter_recipients").upsert(rows.slice(i, i + 500), { onConflict: "campaign_id,email", ignoreDuplicates: true });
    if (error) throw new Error(`prepare failed: ${error.message}`);
  }
  await sb.from("scheduled_newsletters").update({
    recipients_prepared: true,
    total_eligible: rows.filter((r) => r.status === "pending" || r.status === "sent").length,
  }).eq("id", c.id);
  log("recipients_prepared", { campaign: c.id, total: rows.length });
}

async function unsubscribeUrl(sb: any, email: string): Promise<string> {
  const { data } = await sb.from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle();
  let token = data?.token as string | undefined;
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { error } = await sb.from("email_unsubscribe_tokens").insert({ email, token });
    if (error) token = (await sb.from("email_unsubscribe_tokens").select("token").eq("email", email).maybeSingle()).data?.token ?? token;
  }
  return `${SITE}/unsubscribe?token=${token}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });
  const key = Deno.env.get("QUEENSMTP_API_KEY");
  if (!key) return json({ error: "Email service not configured" }, 500);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const result = await runWorker({
      rpc: async (fn, args) => {
        const { data, error } = await sb.rpc(fn, args);
        if (error) throw new Error(`${fn}: ${error.message}`);
        return data;
      },
      prepare: (c) => prepareRecipients(sb, c),
      unsubscribeUrl: (e) => unsubscribeUrl(sb, e),
      send: (i) => sendQueen(key, i),
      log,
    }, crypto.randomUUID());
    return json(result);
  } catch (e) {
    log("worker_error", { message: e instanceof Error ? e.message : String(e) });
    return json({ error: "worker_error" }, 500);
  }
});
