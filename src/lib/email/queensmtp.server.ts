/**
 * Server-only QueenSMTP helper shared by every email server function.
 * Uses the REST API (https://queensmtp.com/v1/send) so it works in the Worker runtime.
 */
export const LOGO_URL =
  "https://lihctrhzsyjqnlzwwkzo.supabase.co/storage/v1/object/public/email-assets/logo.png";

export const DEFAULT_FROM = "ArtistrySynk <notifications@artistrysynk.app>";

const API_BASE = "https://queensmtp.com/v1";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  text?: string;
  tags?: string[];
};

export function hasEmailProvider(): boolean {
  return Boolean(process.env["QUEENSMTP_API_KEY"]);
}

/** Strip HTML to a plain-text alternative, which materially improves deliverability. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendEmail(input: SendEmailInput): Promise<{ id?: string }> {
  const key = process.env["QUEENSMTP_API_KEY"];
  if (!key) throw new Error("Email service not configured");

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((r) => r.trim())
    .filter(Boolean);
  if (recipients.length === 0) throw new Error("No email recipient provided");

  // QueenSMTP requires a bare address in `from`; the display name goes in its own field.
  const rawFrom = input.from ?? DEFAULT_FROM;
  const match = rawFrom.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const fromEmail = (match ? match[2] : rawFrom).trim();
  const fromName = match ? match[1].replace(/^"|"$/g, "").trim() : "";

  const payload: Record<string, unknown> = {
    from: fromEmail,
    fromName,
    from_name: fromName,
    to: recipients,
    subject: input.subject,
    html: input.html,
    text: input.text ?? htmlToText(input.html),
    ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    ...(input.tags?.length ? { tags: input.tags } : {}),
  };

  // Transient failures (429 / 5xx / network) get a short bounded retry.
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1)));

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "network error";
      continue;
    }

    const body = (await res.json().catch(() => null)) as
      | { id?: string; message_id?: string; success?: boolean; error?: string; message?: string }
      | null;

    if (res.ok && body?.success !== false) {
      return { id: body?.id ?? body?.message_id };
    }

    lastError = body?.error ?? body?.message ?? `QueenSMTP request failed (${res.status})`;

    // 4xx other than rate limiting will not succeed on retry.
    if (res.status !== 429 && res.status < 500) break;
  }

  console.error("QueenSMTP send failed:", lastError);
  throw new Error(lastError || "Email send failed");
}
