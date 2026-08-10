import { LOGO_URL, sendEmail, hasResend } from "./email/resend.server";

const ALLOWED_ORIGIN_SUFFIXES = [".lovable.app", "artistrysynk.app"];
const DEFAULT_ORIGIN = "https://artistrysynk.app";

export const GRACE_PERIOD_DAYS = 7;

export function safeOrigin(origin?: string | null): string {
  if (!origin) return DEFAULT_ORIGIN;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return DEFAULT_ORIGIN;
    const host = url.hostname;
    if (host === "localhost") return url.origin;
    const ok = ALLOWED_ORIGIN_SUFFIXES.some((s) => host === s.replace(/^\./, "") || host.endsWith(s));
    return ok ? url.origin : DEFAULT_ORIGIN;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type OwnedStudioBlock = {
  studio_id: string;
  handle: string;
  name: string;
  is_active: boolean;
  eligible_successors: number;
};

/**
 * A studio is an independent actor, so a personal account that still owns one
 * cannot be purged: `studios.owner_id` is ON DELETE RESTRICT. Callers must
 * resolve ownership first (transfer to an active member, or delete the studio).
 */
export async function ownedStudioBlocks(userId: string): Promise<OwnedStudioBlock[]> {
  const admin = await getAdmin();
  const { data } = await admin.rpc("studio_ownership_block", { _user_id: userId });
  return ((data as OwnedStudioBlock[] | null) ?? []).map((row) => ({
    ...row,
    eligible_successors: Number(row.eligible_successors ?? 0),
  }));
}

export function studioBlockMessage(blocks: OwnedStudioBlock[]): string {
  const names = blocks.map((b) => b.name).join(", ");
  const hasSuccessor = blocks.some((b) => b.eligible_successors > 0);
  return hasSuccessor
    ? `You still own ${names}. Transfer ownership to an active studio member, then request deletion again — deleting your account never deletes a studio.`
    : `You still own ${names}, and it has no other active member to take over. Add and promote a member, or delete the studio from its manage page, then request deletion again.`;
}

/** Permanently removes the user's app rows and auth account. */
export async function purgeUser(userId: string) {
  const supabaseAdmin = await getAdmin();

  // Never let a personal purge cascade into studio-owned data.
  const blocks = await ownedStudioBlocks(userId);
  if (blocks.length) throw new Error(studioBlockMessage(blocks));

  await supabaseAdmin.from("user_settings").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_sessions").delete().eq("user_id", userId);
  await supabaseAdmin.from("profiles").delete().eq("id", userId);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
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

export async function sendDeletionConfirmationEmail(opts: {
  to: string;
  name?: string | null;
  confirmUrl: string;
}) {
  if (!hasResend()) throw new Error("Email service not configured");
  await sendEmail({
    to: opts.to,
    subject: "Confirm your ArtistrySynk account deletion",
    html: shell(`
      <h2 style="margin:0 0 12px">Confirm account deletion</h2>
      <p>Hi ${opts.name || "there"}, we received a request to delete your ArtistrySynk account.</p>
      <p>To continue, confirm below. Nothing is deleted until you confirm, and after confirming you still get
      <strong>${GRACE_PERIOD_DAYS} days</strong> to undo it from Settings.</p>
      <p style="margin:24px 0">
        <a href="${opts.confirmUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Confirm deletion</a>
      </p>
      <p style="color:#666;font-size:13px">If you didn't request this, ignore this email and consider changing your password.</p>
    `),
  });
}

export async function sendDeletionScheduledEmail(opts: {
  to: string;
  scheduledFor: string;
  settingsUrl: string;
}) {
  if (!hasResend()) return;
  await sendEmail({
    to: opts.to,
    subject: `Your ArtistrySynk account will be deleted in ${GRACE_PERIOD_DAYS} days`,
    html: shell(`
      <h2 style="margin:0 0 12px">Deletion scheduled</h2>
      <p>Your account is scheduled for permanent deletion on
      <strong>${new Date(opts.scheduledFor).toUTCString()}</strong>.</p>
      <p>Changed your mind? You can undo this any time before then.</p>
      <p style="margin:24px 0">
        <a href="${opts.settingsUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">Undo deletion</a>
      </p>
    `),
  });
}

export async function sendDeletionCancelledEmail(to: string) {
  if (!hasResend()) return;
  await sendEmail({
    to,
    subject: "Your ArtistrySynk account deletion was cancelled",
    html: shell(`
      <h2 style="margin:0 0 12px">Deletion cancelled</h2>
      <p>Good news &mdash; your account is active again and nothing was deleted.</p>
    `),
  });
}