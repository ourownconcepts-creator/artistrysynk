import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";

export interface SubmitContactSupportInput {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  honeypot?: string;
  elapsedMs?: number;
  captchaToken?: string;
}

export interface SubmitContactSupportResult {
  success?: boolean;
  error?: string;
  fields?: Record<string, string[] | undefined>;
  referenceId?: string;
  category?: string;
  submittedAt?: string;
  emailQueued?: boolean;
  captchaRequired?: boolean;
  siteKey?: string;
  retryAfter?: number;
  status: number;
}

const IP_SALT = process.env["CONTACT_IP_SALT"] ?? "artistrysynk-contact";

const SPAM_PATTERNS = [
  /\b(seo services|guest post|backlinks?|crypto investment|forex signals|viagra|casino|loan offer)\b/i,
  /\b(bitcoin|usdt|binary options)\b.*\b(profit|invest|double)\b/i,
  /<\s*(a|script|iframe)\b/i,
];

const MIN_FILL_MS = 3000;
const MIN_GAP_MS = 60_000;
const MAX_PER_HOUR = 3;
const MAX_PER_DAY = 8;
const MAX_PER_EMAIL_DAY = 5;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function heuristics(subject: string, message: string, name: string) {
  const text = `${subject}\n${message}`;
  const links = text.match(/https?:\/\/|www\./gi)?.length ?? 0;
  const letters = text.replace(/[^a-z]/gi, "");
  return {
    links,
    tooManyLinks: links > 2,
    spamPhrase: SPAM_PATTERNS.some((re) => re.test(text)),
    allCaps: letters.length > 25 && letters === letters.toUpperCase(),
    repeatedChars: /(.)\1{9,}/.test(text),
    nameEqualsMessage: name === message.trim(),
  };
}

function referenceId(category: string) {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `AS-${category === "privacy" ? "PRV" : "SUP"}-${rand}`;
}

type AuditRow = {
  outcome: string;
  reject_reason?: string;
  email?: string;
  reference_id?: string;
  submission_id?: string;
  captcha_required?: boolean;
  captcha_passed?: boolean | null;
  validation_results?: Record<string, unknown>;
};

export async function submitContactSupport(
  data: SubmitContactSupportInput,
): Promise<SubmitContactSupportResult> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  const ENV_HCAPTCHA_SECRET_KEY = process.env["HCAPTCHA_SECRET_KEY"] ?? "";
  const ENV_HCAPTCHA_SITE_KEY = process.env["HCAPTCHA_SITE_KEY"] ?? "";

  let HCAPTCHA_SITE_KEY = ENV_HCAPTCHA_SITE_KEY;
  let HCAPTCHA_SECRET_KEY = ENV_HCAPTCHA_SECRET_KEY;
  {
    const { data: keyRows } = await admin
      .from("secure_integration_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["hcaptcha_site_key", "hcaptcha_secret_key"]);
    for (const row of keyRows ?? []) {
      const value = (row.setting_value ?? "").trim();
      if (!value) continue;
      if (row.setting_key === "hcaptcha_site_key") HCAPTCHA_SITE_KEY = value;
      if (row.setting_key === "hcaptcha_secret_key") HCAPTCHA_SECRET_KEY = value;
    }
  }

  const ip = getRequestIP({ xForwardedFor: true }) || "unknown";
  const ipHash = await sha256(`${IP_SALT}:${ip}`);
  const userAgent = (getRequestHeader("user-agent") ?? "").slice(0, 500);

  const log = async (row: AuditRow) => {
    const { error } = await admin.from("contact_submission_audit").insert({
      ip_hash: ipHash,
      user_agent: userAgent,
      ...row,
    });
    if (error) console.error("audit log insert failed:", error.message);
  };

  try {
    const email = data.email.toLowerCase();

    // --- bot traps -----------------------------------------------------------
    if ((data.honeypot ?? "").trim() !== "") {
      await log({ outcome: "blocked", reject_reason: "honeypot", email, validation_results: { honeypot: true } });
      return { error: "Submission blocked.", status: 400 };
    }
    if (typeof data.elapsedMs === "number" && data.elapsedMs < MIN_FILL_MS) {
      await log({ outcome: "blocked", reject_reason: "too_fast", email, validation_results: { elapsedMs: data.elapsedMs } });
      return { error: "That was too fast — please take a moment and try again.", status: 400 };
    }

    // --- content heuristics --------------------------------------------------
    const checks = heuristics(data.subject, data.message, data.name);
    const spamFlags = Object.entries(checks).filter(([k, v]) => k !== "links" && v === true).map(([k]) => k);
    if (spamFlags.length > 0) {
      await log({ outcome: "blocked", reject_reason: `spam:${spamFlags.join(",")}`, email, validation_results: checks });
      return { error: "Your message was flagged as spam. Please rephrase and try again.", status: 400 };
    }

    // --- server-side rate limiting -----------------------------------------
    const nowMs = Date.now();
    const dayAgo = new Date(nowMs - 86_400_000).toISOString();
    const { data: recent } = await admin
      .from("contact_submission_audit")
      .select("created_at, outcome, email, ip_hash")
      .gte("created_at", dayAgo)
      .or(`ip_hash.eq.${ipHash},email.eq.${email}`)
      .order("created_at", { ascending: false })
      .limit(200);

    const rows = recent ?? [];
    const sameIp = rows.filter((r) => r.ip_hash === ipHash);
    const accepted = sameIp.filter((r) => r.outcome === "accepted");
    const lastAccepted = accepted[0] ? new Date(accepted[0].created_at).getTime() : 0;
    const acceptedLastHour = accepted.filter((r) => nowMs - new Date(r.created_at).getTime() < 3_600_000).length;
    const emailAcceptedToday = rows.filter((r) => r.email === email && r.outcome === "accepted").length;
    const failuresLastHour = rows.filter(
      (r) => r.outcome !== "accepted" && nowMs - new Date(r.created_at).getTime() < 3_600_000,
    ).length;

    const limitInfo = { acceptedLastHour, emailAcceptedToday, failuresLastHour, acceptedToday: accepted.length };

    if (lastAccepted && nowMs - lastAccepted < MIN_GAP_MS) {
      const wait = Math.ceil((MIN_GAP_MS - (nowMs - lastAccepted)) / 1000);
      await log({ outcome: "rate_limited", reject_reason: "min_gap", email, validation_results: limitInfo });
      return { error: `Please wait ${wait}s before sending another message.`, retryAfter: wait, status: 429 };
    }
    if (acceptedLastHour >= MAX_PER_HOUR || accepted.length >= MAX_PER_DAY || emailAcceptedToday >= MAX_PER_EMAIL_DAY) {
      await log({ outcome: "rate_limited", reject_reason: "quota_exceeded", email, validation_results: limitInfo });
      return { error: "You've reached the submission limit. Please try again later or email us directly.", status: 429 };
    }

    // --- adaptive CAPTCHA ----------------------------------------------------
    const captchaConfigured = !!(HCAPTCHA_SECRET_KEY && HCAPTCHA_SITE_KEY);
    const suspicious = failuresLastHour >= 2 || acceptedLastHour >= 1 || accepted.length >= 3;
    const captchaRequired = captchaConfigured && suspicious;
    let captchaPassed: boolean | null = null;

    if (captchaRequired) {
      if (!data.captchaToken) {
        await log({ outcome: "captcha_required", reject_reason: "captcha_missing", email, captcha_required: true, validation_results: limitInfo });
        return { captchaRequired: true, siteKey: HCAPTCHA_SITE_KEY, error: "Please complete the verification challenge.", status: 428 };
      }
      const verifyRes = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: HCAPTCHA_SECRET_KEY, response: data.captchaToken }),
      });
      const verifyBody = await verifyRes.json().catch(() => ({ success: false }));
      captchaPassed = verifyRes.ok && verifyBody?.success === true;
      if (!captchaPassed) {
        console.error(`hCaptcha verification failed [${verifyRes.status}]:`, JSON.stringify(verifyBody));
        await log({ outcome: "blocked", reject_reason: "captcha_failed", email, captcha_required: true, captcha_passed: false, validation_results: { ...limitInfo, verify: verifyBody } });
        return { captchaRequired: true, siteKey: HCAPTCHA_SITE_KEY, error: "Verification failed. Please try the challenge again.", status: 400 };
      }
    }

    // --- persist -------------------------------------------------------------
    const haystack = `${data.subject} ${data.message}`.toLowerCase();
    const category = /privacy|gdpr|data (deletion|request|export)|delete my (account|data)|personal data|cookie/.test(haystack)
      ? "privacy"
      : "support";
    const reference = referenceId(category);

    const { data: inserted, error: insertErr } = await admin
      .from("contact_submissions")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        category,
        reference_id: reference,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (insertErr) {
      await log({ outcome: "error", reject_reason: insertErr.message, email, reference_id: reference, validation_results: limitInfo });
      return { error: "Failed to save your message. Please try again.", status: 500 };
    }

    await log({
      outcome: "accepted",
      email,
      submission_id: inserted.id,
      reference_id: reference,
      captcha_required: captchaRequired,
      captcha_passed: captchaPassed,
      validation_results: { ...limitInfo, checks, elapsedMs: data.elapsedMs ?? null, category },
    });

    // --- notify (non-fatal) --------------------------------------------------
    let emailQueued = false;
    try {
      const { sendContactConfirmation } = await import("@/lib/contact-confirmation.server");
      await sendContactConfirmation({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        category,
        referenceId: reference,
      });
      emailQueued = true;
    } catch (e) {
      console.error("send-contact-confirmation invoke error:", e);
    }

    return {
      success: true,
      referenceId: reference,
      category,
      submittedAt: inserted.created_at,
      emailQueued,
      status: 200,
    };
  } catch (error) {
    console.error("submit-contact-support error:", error);
    await log({ outcome: "error", reject_reason: error instanceof Error ? error.message : "unknown" });
    return { error: "Unexpected error. Please try again.", status: 500 };
  }
}
