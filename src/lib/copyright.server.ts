import { LOGO_URL, sendEmail, hasResend } from "./email/resend.server";

export const COPYRIGHT_INBOX = process.env["COPYRIGHT_INBOX"] || "copyright@artistrysynk.app";

/** AS-CPY-XXXXX reference quoted in all correspondence about a claim. */
export function buildClaimReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `AS-CPY-${out}`;
}

export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(`copyright:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const esc = (v: string) => v.replace(/[<>]/g, "");

function shell(inner: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:24px">
  <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;padding:24px">
    <img src="${LOGO_URL}" alt="ArtistrySynk" height="40" style="height:40px;margin-bottom:16px" />
    ${inner}
    <p style="color:#888;font-size:12px;margin-top:24px">ArtistrySynk &middot; artistrysynk.app</p>
  </div>
</div>`;
}

export async function sendClaimEmails(claim: {
  referenceId: string;
  contactEmail: string;
  rightsHolderName: string;
  contentUrl: string;
  contentType: string;
  workDescription: string;
  infringementExplanation: string;
}) {
  if (!hasResend()) return;

  await sendEmail({
    to: claim.contactEmail,
    subject: `Copyright notice received (${claim.referenceId})`,
    html: shell(`
      <h2 style="margin:0 0 12px">We received your copyright notice</h2>
      <p>Your reference is <strong>${claim.referenceId}</strong>. Please quote it in any follow-up.</p>
      <p>Our Trust &amp; Safety team reviews notices in the order received. If the notice is complete,
      we act on the reported content and notify the person who uploaded it, who may submit a counter-notice.</p>
      <p style="color:#666;font-size:13px">Reported content: ${esc(claim.contentUrl)}</p>
    `),
    replyTo: COPYRIGHT_INBOX,
  }).catch(() => undefined);

  await sendEmail({
    to: COPYRIGHT_INBOX,
    subject: `[${claim.referenceId}] New copyright notice — ${esc(claim.contentType)}`,
    html: shell(`
      <h2 style="margin:0 0 12px">New copyright notice</h2>
      <p><strong>Reference:</strong> ${claim.referenceId}</p>
      <p><strong>Rights holder:</strong> ${esc(claim.rightsHolderName)}</p>
      <p><strong>Contact:</strong> ${esc(claim.contactEmail)}</p>
      <p><strong>Content:</strong> ${esc(claim.contentType)} — ${esc(claim.contentUrl)}</p>
      <p><strong>Work:</strong><br/>${esc(claim.workDescription)}</p>
      <p><strong>Why it infringes:</strong><br/>${esc(claim.infringementExplanation)}</p>
    `),
    replyTo: claim.contactEmail,
  }).catch(() => undefined);
}

export async function sendClaimOutcomeEmail(opts: {
  to: string;
  referenceId: string;
  status: string;
  outcome: string | null;
  note: string | null;
}) {
  if (!hasResend()) return;
  const headline =
    opts.status === "actioned"
      ? "We have acted on your copyright notice"
      : opts.status === "rejected"
        ? "We could not act on your copyright notice"
        : `Update on your copyright notice`;

  await sendEmail({
    to: opts.to,
    subject: `${headline} (${opts.referenceId})`,
    html: shell(`
      <h2 style="margin:0 0 12px">${headline}</h2>
      <p><strong>Reference:</strong> ${opts.referenceId}</p>
      <p><strong>Status:</strong> ${esc(opts.status)}</p>
      ${opts.outcome ? `<p><strong>Outcome:</strong> ${esc(opts.outcome)}</p>` : ""}
      ${opts.note ? `<p>${esc(opts.note)}</p>` : ""}
      <p style="color:#666;font-size:13px">Reply to this email if you disagree with the decision.</p>
    `),
    replyTo: COPYRIGHT_INBOX,
  }).catch(() => undefined);
}
