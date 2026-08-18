/**
 * Server-only Resend helper shared by migrated email server functions.
 * Uses the REST API directly so it works in the Worker runtime.
 */
export const LOGO_URL =
  "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

export const DEFAULT_FROM = "ArtistrySynk <hello@artistrysynk.app>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
};

export function hasResend(): boolean {
  return Boolean(process.env["RESEND_API_KEY"]);
}

export async function sendEmail(input: SendEmailInput): Promise<{ id?: string }> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("Email service not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from ?? DEFAULT_FROM,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });

  const payload = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!res.ok) {
    throw new Error(payload?.message ?? `Resend request failed (${res.status})`);
  }
  return { id: payload?.id };
}
