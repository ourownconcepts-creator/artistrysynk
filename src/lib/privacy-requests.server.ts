import { LOGO_URL, sendEmail, hasEmailProvider } from "./email/queensmtp.server";

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
  if (!hasEmailProvider()) return;
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

const STATUS_COPY: Record<string, { subject: string; heading: string; body: string }> = {
  received: {
    subject: "we have your privacy request",
    heading: "Request received",
    body: "Your request is logged and queued for review.",
  },
  verifying: {
    subject: "we are verifying your privacy request",
    heading: "Verifying your identity",
    body: "We need to confirm the request came from you before we act on it. If anything else is needed we will email you here.",
  },
  in_progress: {
    subject: "your privacy request is in progress",
    heading: "Work has started",
    body: "Our team is now working on your request. No action is needed from you.",
  },
  completed: {
    subject: "your privacy request is complete",
    heading: "Request completed",
    body: "We have finished handling your request. If you believe anything is outstanding, reply to this email.",
  },
  rejected: {
    subject: "an update on your privacy request",
    heading: "Request closed",
    body: "We were unable to action this request. The reason is below — you can reply if you would like us to look again.",
  },
  withdrawn: {
    subject: "your privacy request was withdrawn",
    heading: "Request withdrawn",
    body: "This request has been withdrawn and no further action will be taken.",
  },
};

/** Emails the requester whenever staff move a DSAR to a new status. */
export async function sendPrivacyStatusEmail(opts: {
  to: string;
  referenceId: string;
  requestType: string;
  status: string;
  notes?: string | null;
}) {
  if (!hasEmailProvider() || !opts.to) return;
  const copy = STATUS_COPY[opts.status];
  if (!copy) return;
  const label = REQUEST_TYPE_LABELS[opts.requestType] ?? opts.requestType;

  await sendEmail({
    to: opts.to,
    subject: `${opts.referenceId}: ${copy.subject}`,
    html: shell(`
      <h2 style="margin:0 0 12px">${copy.heading}</h2>
      <p><strong>Reference:</strong> ${opts.referenceId}</p>
      <p><strong>Request:</strong> ${label}</p>
      <p>${copy.body}</p>
      ${opts.notes ? `<p style="background:#f7f7f7;border-radius:8px;padding:12px"><strong>Notes from our team:</strong><br/>${opts.notes.replace(/</g, "&lt;")}</p>` : ""}
      <p style="color:#666;font-size:13px">Questions? Reply to this email or write to ${PRIVACY_INBOX}.</p>
    `),
    replyTo: PRIVACY_INBOX,
  }).catch(() => undefined);
}

/** Confirms a self-service data download was generated. */
export async function sendDataExportEmail(opts: { to: string; itemCount: number }) {
  if (!hasEmailProvider() || !opts.to) return;
  await sendEmail({
    to: opts.to,
    subject: "Your ArtistrySynk data download is ready",
    html: shell(`
      <h2 style="margin:0 0 12px">Data download ready</h2>
      <p>You requested a copy of your ArtistrySynk data and it has been generated and downloaded in your browser.</p>
      <p>It includes your profile, settings, portfolio, projects, messages metadata and links to your uploaded media (${opts.itemCount} media links).</p>
      <p>If this was not you, change your password and contact us immediately at ${PRIVACY_INBOX}.</p>
    `),
    replyTo: PRIVACY_INBOX,
  }).catch(() => undefined);
}

/** Confirms a privacy preference change so silent account changes are visible. */
export async function sendPrivacyPreferenceEmail(opts: { to: string; changes: string[] }) {
  if (!hasEmailProvider() || !opts.to || opts.changes.length === 0) return;
  await sendEmail({
    to: opts.to,
    subject: "Your ArtistrySynk privacy settings were updated",
    html: shell(`
      <h2 style="margin:0 0 12px">Privacy settings updated</h2>
      <p>These privacy preferences on your account were just changed and are already in effect:</p>
      <ul>${opts.changes.map((c) => `<li>${c.replace(/</g, "&lt;")}</li>`).join("")}</ul>
      <p>If you did not make this change, secure your account and contact ${PRIVACY_INBOX}.</p>
    `),
    replyTo: PRIVACY_INBOX,
  }).catch(() => undefined);
}
