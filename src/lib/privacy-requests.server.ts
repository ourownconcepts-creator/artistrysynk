import { LOGO_URL, sendEmail, hasResend } from "./email/resend.server";

export const PRIVACY_INBOX = process.env["PRIVACY_INBOX"] || "privacy@artistrysynk.app";

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: "Access a copy of my data",
  correction: "Correct inaccurate data",
  deletion: "Delete my data",
  export: "Export my data (portability)",
  restriction: "Restrict how my data is used",
  objection: "Object to processing",
  other: "Something else",
};

/** AS-PRV-XXXXX reference the user can quote in follow-ups. */
export function buildReferenceId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `AS-PRV-${out}`;
}

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function shell(inner: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px">
  <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;padding:24px">
    <img src="${LOGO_URL}" alt="ArtistrySynk" height="40" style="height:40px;margin-bottom:16px" />
    ${inner}
    <p style="color:#888;font-size:12px;margin-top:24px">ArtistrySynk &middot; artistrysynk.app</p>
  </div>
</div>`;
}

export async function sendPrivacyRequestEmails(opts: {
  to: string;
  referenceId: string;
  requestType: string;
  details?: string | null;
  dueAt: string;
}) {
  if (!hasResend()) return;
  const label = REQUEST_TYPE_LABELS[opts.requestType] ?? opts.requestType;

  await sendEmail({
    to: opts.to,
    subject: `We received your privacy request (${opts.referenceId})`,
    html: shell(`
      <h2 style="margin:0 0 12px">Privacy request received</h2>
      <p>Your reference is <strong>${opts.referenceId}</strong>.</p>
      <p><strong>Request:</strong> ${label}</p>
      <p>We will respond by <strong>${new Date(opts.dueAt).toUTCString()}</strong>, and sooner where we can.
      If we need to verify your identity first, we will contact you at this address.</p>
      <p style="color:#666;font-size:13px">Questions? Reply to this email or write to ${PRIVACY_INBOX}.</p>
    `),
    replyTo: PRIVACY_INBOX,
  }).catch(() => undefined);

  await sendEmail({
    to: PRIVACY_INBOX,
    subject: `[${opts.referenceId}] New ${label.toLowerCase()} request`,
    html: shell(`
      <h2 style="margin:0 0 12px">New privacy request</h2>
      <p><strong>Reference:</strong> ${opts.referenceId}</p>
      <p><strong>Type:</strong> ${label}</p>
      <p><strong>From:</strong> ${opts.to}</p>
      <p><strong>Due:</strong> ${new Date(opts.dueAt).toUTCString()}</p>
      <p><strong>Details:</strong><br/>${(opts.details || "—").replace(/</g, "&lt;")}</p>
    `),
    replyTo: opts.to,
  }).catch(() => undefined);
}
