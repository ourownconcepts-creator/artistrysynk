/**
 * Marketing sender core — runtime-agnostic (Deno in production, Bun in tests).
 *
 * All state transitions happen in SQL functions (mkt_*) so they are atomic:
 *  - one worker at a time (lease), recipients claimed with FOR UPDATE SKIP LOCKED,
 *  - capacity = configured rolling-24h limit minus accepted, in-flight and unknown sends,
 *  - 429/daily_limit_reached pauses everything until Retry-After; never retried in-loop,
 *  - a recipient becomes "sent" only after QueenSMTP confirms acceptance,
 *  - lost responses (timeouts / connection drops after the request left) become "unknown"
 *    and are never automatically resent.
 */

export type SendResult =
  | { kind: "ok"; id?: string; body?: unknown }
  | { kind: "rate_limited"; retryAfterS: number; code: string; body?: unknown }
  | { kind: "temporary"; code: string; message: string }
  | { kind: "unknown"; code: string; message: string }
  | { kind: "permanent"; outcome: "failed" | "invalid" | "bounced"; code: string; message: string };

export interface SendInput {
  to: string;
  subject: string;
  html: string;
  unsubscribeUrl: string;
  idempotencyKey: string;
}

export interface Deps {
  rpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T>;
  prepare(campaign: CampaignRow): Promise<void>;
  unsubscribeUrl(email: string): Promise<string>;
  send(input: SendInput): Promise<SendResult>;
  log(event: string, data?: Record<string, unknown>): void;
  now?: () => number;
}

export interface CampaignRow {
  id: string;
  subject: string;
  content: string;
  audience: string;
  recipients_prepared: boolean;
  sent_recipients: unknown;
  updated_at: string;
  previous_status: string;
}

const MAX_CONSECUTIVE_TEMPORARY = 3;
const RUN_BUDGET_MS = 100_000;
const LEASE_SECONDS = 300;
const DEFAULT_RETRY_AFTER_S = 3600;

const first = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

export async function runWorker(d: Deps, owner: string) {
  const now = d.now ?? Date.now;
  const started = now();
  const acquired = await d.rpc<boolean>("mkt_acquire_lease", { _owner: owner, _ttl_seconds: LEASE_SECONDS });
  if (!acquired) {
    d.log("lease_busy", { owner });
    return { status: "lease_busy" as const, attempted: 0 };
  }
  let attempted = 0;
  const outcomes: Record<string, number> = {};
  try {
    const reaped = await d.rpc<number>("mkt_reap_stale", { _older_than_s: 600 });
    if (reaped) d.log("reaped_unknown", { count: reaped });

    const cap = await d.rpc<any>("mkt_capacity", {});
    if (cap.paused_until) {
      d.log("skipped_paused", { paused_until: cap.paused_until });
      return { status: "paused" as const, attempted, paused_until: cap.paused_until };
    }
    if (cap.remaining <= 0) {
      const resume = cap.next_capacity_at ?? new Date(now() + DEFAULT_RETRY_AFTER_S * 1000).toISOString();
      await d.rpc("mkt_pause_for_capacity", { _resume_at: resume });
      d.log("capacity_exhausted", { daily_limit: cap.daily_limit, used: cap.used, resume_at: resume });
      return { status: "capacity_exhausted" as const, attempted, resume_at: resume };
    }

    let stopAll = false;
    for (let guard = 0; guard < 20 && !stopAll; guard++) {
      const c = first(await d.rpc<CampaignRow | CampaignRow[]>("mkt_next_campaign", { _owner: owner }));
      if (!c) break;
      d.log(c.previous_status === "pending" ? "campaign_started" : "campaign_resumed", { campaign: c.id, subject: c.subject });
      if (!c.recipients_prepared) await d.prepare(c);

      let consecutiveTemporary = 0;
      while (true) {
        if (now() - started > RUN_BUDGET_MS) { d.log("run_budget_reached", { campaign: c.id }); stopAll = true; break; }
        const r = first(await d.rpc<any>("mkt_claim_next", { _campaign: c.id, _owner: owner }));
        if (!r) break; // nothing due, or capacity / pause reached
        attempted++;
        d.log("recipient_selected", { campaign: c.id, recipient: r.id, attempt: r.attempts });
        const unsub = await d.unsubscribeUrl(r.email);
        d.log("provider_request_started", { campaign: c.id, recipient: r.id, send_key: r.send_key });
        let res: SendResult;
        try {
          res = await d.send({ to: r.email, subject: c.subject, html: withUnsubscribe(c.content, unsub), unsubscribeUrl: unsub, idempotencyKey: r.send_key });
        } catch (e) {
          res = { kind: "unknown", code: "send_threw", message: e instanceof Error ? e.message : String(e) };
        }
        const args: Record<string, unknown> = { _id: r.id, _owner: owner };
        if (res.kind === "ok") Object.assign(args, { _outcome: "accepted", _provider_id: res.id ?? null });
        else if (res.kind === "rate_limited") Object.assign(args, { _outcome: "rate_limited", _code: res.code, _retry_after_s: res.retryAfterS, _response: res.body ?? null });
        else if (res.kind === "temporary") Object.assign(args, { _outcome: "temporary", _code: res.code, _message: res.message });
        else if (res.kind === "unknown") Object.assign(args, { _outcome: "unknown", _code: res.code, _message: res.message });
        else Object.assign(args, { _outcome: res.outcome, _code: res.code, _message: res.message });
        const state = await d.rpc<string>("mkt_record_result", args);
        outcomes[state] = (outcomes[state] ?? 0) + 1;

        if (res.kind === "ok") { consecutiveTemporary = 0; d.log("provider_accepted", { campaign: c.id, recipient: r.id }); continue; }
        if (res.kind === "rate_limited") {
          d.log("provider_429", { campaign: c.id, code: res.code, retry_after_s: res.retryAfterS });
          d.log("campaign_paused", { campaign: c.id, reason: res.code });
          stopAll = true; break; // stop immediately — no further recipients, no retry
        }
        if (res.kind === "unknown") {
          d.log("provider_unknown_outcome", { campaign: c.id, recipient: r.id, code: res.code });
          stopAll = true; break; // provider/network trouble: stop rather than risk more lost responses
        }
        if (res.kind === "temporary") {
          consecutiveTemporary++;
          d.log(state === "failed" ? "permanent_failure" : "temporary_retry_scheduled", { campaign: c.id, recipient: r.id, code: res.code, state });
          if (consecutiveTemporary >= MAX_CONSECUTIVE_TEMPORARY) { d.log("provider_unhealthy_stop", { campaign: c.id }); stopAll = true; break; }
          continue;
        }
        consecutiveTemporary = 0;
        d.log(res.outcome === "bounced" ? "provider_bounce" : "provider_rejected", { campaign: c.id, recipient: r.id, code: res.code });
      }
      const st = await d.rpc<string>("mkt_finalize_campaign", { _campaign: c.id });
      if (st === "sent") d.log("campaign_completed", { campaign: c.id });
    }
    return { status: "ok" as const, attempted, outcomes };
  } finally {
    await d.rpc("mkt_release_lease", { _owner: owner });
  }
}

// ---------- provider response classification ----------
export function parseRetryAfter(h: string | null | undefined, nowMs = Date.now()): number {
  if (!h) return DEFAULT_RETRY_AFTER_S;
  const n = Number(h);
  if (Number.isFinite(n) && n >= 0) return Math.ceil(n);
  const d = Date.parse(h);
  return Number.isFinite(d) ? Math.max(60, Math.ceil((d - nowMs) / 1000)) : DEFAULT_RETRY_AFTER_S;
}

/** Network errors where the request provably never reached the provider. */
const NOT_SENT_RE = /dns|enotfound|getaddrinfo|econnrefused|connection refused|error trying to connect|failed to lookup|unable to connect/i;

export function classifyNetworkError(e: unknown): SendResult {
  const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  if (/abort|timeout|timed out/i.test(message)) return { kind: "unknown", code: "timeout", message };
  if (NOT_SENT_RE.test(message)) return { kind: "temporary", code: "connect_failed", message };
  return { kind: "unknown", code: "network_lost", message };
}

export function classifyResponse(status: number, headers: { get(n: string): string | null }, body: any): SendResult {
  const code = String(body?.code ?? body?.error_code ?? "");
  const message = String(body?.error ?? body?.message ?? `HTTP ${status}`);
  if (status >= 200 && status < 300 && body?.success !== false) return { kind: "ok", id: body?.id ?? body?.message_id, body };
  if (status === 429 || code === "daily_limit_reached" || /daily sending limit/i.test(message))
    return { kind: "rate_limited", retryAfterS: parseRetryAfter(headers.get("Retry-After")), code: code || "rate_limited", body };
  if (status >= 500 || body?.retryable === true) return { kind: "temporary", code: code || `http_${status}`, message };
  if (/bounce|suppress/i.test(code + " " + message)) return { kind: "permanent", outcome: "bounced", code: code || `http_${status}`, message };
  if ((status === 400 || status === 422) && /invalid|recipient|address|email/i.test(code + " " + message))
    return { kind: "permanent", outcome: "invalid", code: code || `http_${status}`, message };
  return { kind: "permanent", outcome: "failed", code: code || `http_${status}`, message };
}

// ---------- recipient eligibility ----------
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/;
const TEST_DOMAINS = /(^|\.)(example\.(com|org|net)|test|invalid|localhost|mail\.tm|mailinator\.com)$/;
const TEST_LOCAL = /^(signup\.check|test[._+-]|df_test|df_\d)/;
const TYPO_DOMAINS = new Set([
  "yahoo.vom", "yahoo.con", "yahoo.cm", "yaho.com", "gmail.con", "gmail.cm", "gmial.com", "gamil.com",
  "gmai.com", "gnail.com", "hotmail.con", "hotmial.com", "outlook.con", "icloud.con",
]);
const BAD_TLDS = new Set(["vom", "con", "cmo", "comm", "coom", "xom"]);

export function classifyAddress(email: string): { status: "pending" | "invalid" | "skipped"; code?: string } {
  if (!EMAIL_RE.test(email)) return { status: "invalid", code: "bad_syntax" };
  const [local, domain] = email.split("@");
  if (TYPO_DOMAINS.has(domain) || BAD_TLDS.has(domain.split(".").pop()!))
    return { status: "invalid", code: "suspicious_domain" }; // flagged for admin review, never auto-corrected
  if (TEST_DOMAINS.test(domain) || TEST_LOCAL.test(local)) return { status: "skipped", code: "test_address" };
  return { status: "pending" };
}

export interface EligibilityCtx {
  subscriberActive: Map<string, boolean>; // email -> is_active
  userByEmail: Map<string, string>;
  latestMarketingConsent: Map<string, boolean>; // user_id -> granted
  suppressed: Map<string, string>; // email -> reason
}

/** Decide one recipient's initial queue status. Consent: active subscriber or explicit marketing consent; any explicit refusal wins. */
export function decideRecipient(email: string, ctx: EligibilityCtx): { status: string; code?: string } {
  const v = classifyAddress(email);
  if (v.status !== "pending") return v;
  const supp = ctx.suppressed.get(email);
  if (supp) return { status: /bounce/i.test(supp) ? "bounced" : "unsubscribed", code: `suppressed_${supp}` };
  if (ctx.subscriberActive.get(email) === false) return { status: "unsubscribed", code: "newsletter_unsubscribed" };
  const uid = ctx.userByEmail.get(email);
  const consent = uid ? ctx.latestMarketingConsent.get(uid) : undefined;
  if (consent === false) return { status: "skipped", code: "no_marketing_consent" };
  if (!ctx.subscriberActive.get(email) && consent !== true) return { status: "skipped", code: "no_marketing_consent" };
  return { status: "pending" };
}

export function withUnsubscribe(html: string, url: string): string {
  let out = html.replace(/\{\{\s*unsubscribe_url\s*\}\}/g, url);
  out = out.replace(/<a([^>]*?)href="[^"]*"([^>]*)>(\s*Unsubscribe\s*)<\/a>/gi, `<a$1href="${url}"$2>$3</a>`);
  if (!out.includes(url)) {
    const footer = `<div style="text-align:center;font-size:12px;color:#6b7280;padding:16px">You're receiving this because you subscribed to ArtistrySynk updates. <a href="${url}" style="color:#c026d3">Unsubscribe</a></div>`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${footer}</body>`) : out + footer;
  }
  return out;
}

/** The QueenSMTP request body for a marketing message (always bulk). */
export function buildMarketingPayload(i: SendInput, from: { email: string; name: string }) {
  const text = i.html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
  return {
    from: from.email, fromName: from.name, from_name: from.name, to: [i.to], subject: i.subject, html: i.html, text,
    isBulk: true,
    headers: {
      "List-Unsubscribe": `<${i.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-ArtistrySynk-Send-Key": i.idempotencyKey,
    },
  };
}
