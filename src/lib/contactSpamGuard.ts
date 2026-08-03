import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string().trim().max(30, "Phone number is too long").optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Subject is too short").max(150, "Subject must be under 150 characters"),
  message: z.string().trim().min(20, "Please add a bit more detail (at least 20 characters)").max(2000, "Message must be under 2000 characters"),
});

export type ContactInput = z.infer<typeof contactSchema>;

const SPAM_PATTERNS = [
  /\b(seo services|guest post|backlinks?|crypto investment|forex signals|viagra|casino|loan offer)\b/i,
  /\b(bitcoin|usdt|binary options)\b.*\b(profit|invest|double)\b/i,
  /<\s*(a|script|iframe)\b/i,
];

/** Heuristic spam check: excessive links, known spam phrases, shouting, repeated characters. */
export function detectSpam(input: ContactInput): string | null {
  const text = `${input.subject}\n${input.message}`;
  const links = text.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links > 2) return "Your message contains too many links. Please remove them and try again.";
  if (SPAM_PATTERNS.some((re) => re.test(text))) return "Your message was flagged as spam. Please rephrase and try again.";
  const letters = text.replace(/[^a-z]/gi, "");
  if (letters.length > 25 && letters === letters.toUpperCase()) return "Please avoid writing entirely in capital letters.";
  if (/(.)\1{9,}/.test(text)) return "Your message contains repeated characters. Please rewrite it.";
  if (input.name === input.message.trim()) return "Please describe your inquiry in the message field.";
  return null;
}

/** Client-side throttle: 60s between sends, max 3 per hour, stored locally. */
const KEY = "contact_submits";
const MIN_GAP_MS = 60_000;
const HOUR_MS = 3_600_000;
const MAX_PER_HOUR = 3;

function readStamps(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((n) => typeof n === "number" && Date.now() - n < HOUR_MS) : [];
  } catch {
    return [];
  }
}

export function checkRateLimit(): string | null {
  const stamps = readStamps();
  const last = stamps[stamps.length - 1];
  if (last && Date.now() - last < MIN_GAP_MS) {
    const wait = Math.ceil((MIN_GAP_MS - (Date.now() - last)) / 1000);
    return `Please wait ${wait}s before sending another message.`;
  }
  if (stamps.length >= MAX_PER_HOUR) {
    return "You've reached the limit of 3 messages per hour. Please email support@artistrysynk.app if it's urgent.";
  }
  return null;
}

export function recordSubmission() {
  const stamps = readStamps();
  stamps.push(Date.now());
  localStorage.setItem(KEY, JSON.stringify(stamps));
}

/** Human-readable ticket reference derived from the submission id. */
export function buildReferenceId(id: string, category: string) {
  const prefix = category === "privacy" ? "PRV" : "SUP";
  return `AS-${prefix}-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export const MIN_FILL_MS = 3000;