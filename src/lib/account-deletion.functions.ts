import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const originSchema = z.object({ origin: z.string().max(200).optional() });

export type DeletionRequestState = {
  status: "none" | "pending_confirmation" | "scheduled";
  email?: string;
  requestedAt?: string;
  scheduledFor?: string;
  gracePeriodDays: number;
};

/** Step 1 — email confirmation required before anything is deleted. */
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(originSchema)
  .handler(async ({ data, context }): Promise<DeletionRequestState> => {
    const {
      GRACE_PERIOD_DAYS,
      getAdmin,
      safeOrigin,
      sendDeletionConfirmationEmail,
      ownedStudioBlocks,
      studioBlockMessage,
    } = await import("./account-deletion.server");

    const admin = await getAdmin();
    const userId = context.userId;

    // Studio ownership must be resolved before a destructive deletion starts.
    const studioBlocks = await ownedStudioBlocks(userId);
    if (studioBlocks.length) throw new Error(studioBlockMessage(studioBlocks));

    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) throw new Error("No email is attached to this account.");

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    // Replace any previous pending request for this user.
    await admin
      .from("account_deletion_requests")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "pending_confirmation");

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { data: row, error } = await admin
      .from("account_deletion_requests")
      .insert({
        user_id: userId,
        email,
        confirmation_token: token,
        status: "pending_confirmation",
      })
      .select("requested_at")
      .single();

    if (error) throw new Error("A deletion request is already in progress.");

    const origin = safeOrigin(data.origin);
    await sendDeletionConfirmationEmail({
      to: email,
      name: profile?.full_name ?? null,
      confirmUrl: `${origin}/account/confirm-deletion?token=${token}`,
    });

    return {
      status: "pending_confirmation",
      email,
      requestedAt: row?.requested_at ?? new Date().toISOString(),
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  });

/** Step 2 — the emailed link lands here (no session required) and starts the grace period. */
export const confirmAccountDeletion = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(20).max(200) }))
  .handler(async ({ data }) => {
    const { GRACE_PERIOD_DAYS, getAdmin, sendDeletionScheduledEmail, safeOrigin } = await import(
      "./account-deletion.server"
    );
    const admin = await getAdmin();

    const { data: row } = await admin
      .from("account_deletion_requests")
      .select("id, user_id, email, status, scheduled_for")
      .eq("confirmation_token", data.token)
      .maybeSingle();

    if (!row) return { ok: false as const, reason: "invalid" as const };
    if (row.status === "cancelled") return { ok: false as const, reason: "cancelled" as const };
    if (row.status === "completed") return { ok: false as const, reason: "completed" as const };

    if (row.status === "scheduled") {
      return {
        ok: true as const,
        alreadyConfirmed: true,
        scheduledFor: row.scheduled_for!,
        gracePeriodDays: GRACE_PERIOD_DAYS,
      };
    }

    const now = new Date();
    const scheduledFor = new Date(
      now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    await admin
      .from("account_deletion_requests")
      .update({ status: "scheduled", confirmed_at: now.toISOString(), scheduled_for: scheduledFor })
      .eq("id", row.id);

    await sendDeletionScheduledEmail({
      to: row.email,
      scheduledFor,
      settingsUrl: `${safeOrigin(null)}/settings`,
    }).catch(() => undefined);

    return {
      ok: true as const,
      alreadyConfirmed: false,
      scheduledFor,
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  });

/** Current state for the Settings screen. Also finalizes deletions whose grace period elapsed. */
export const getMyDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeletionRequestState> => {
    const { GRACE_PERIOD_DAYS, getAdmin, purgeUser } = await import("./account-deletion.server");
    const admin = await getAdmin();

    const { data: row } = await admin
      .from("account_deletion_requests")
      .select("id, email, status, requested_at, scheduled_for")
      .eq("user_id", context.userId)
      .in("status", ["pending_confirmation", "scheduled"])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { status: "none", gracePeriodDays: GRACE_PERIOD_DAYS };

    if (row.status === "scheduled" && row.scheduled_for && new Date(row.scheduled_for) <= new Date()) {
      try {
        await purgeUser(context.userId);
      } catch {
        // Unresolved studio ownership (or another guard) blocks the purge: keep
        // the request scheduled instead of marking it completed.
        return {
          status: "scheduled",
          email: row.email,
          requestedAt: row.requested_at,
          scheduledFor: row.scheduled_for,
          gracePeriodDays: GRACE_PERIOD_DAYS,
        };
      }
      await admin
        .from("account_deletion_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", row.id);
      return { status: "none", gracePeriodDays: GRACE_PERIOD_DAYS };
    }

    return {
      status: row.status === "scheduled" ? "scheduled" : "pending_confirmation",
      email: row.email,
      requestedAt: row.requested_at,
      ...(row.scheduled_for ? { scheduledFor: row.scheduled_for } : {}),
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  });

/** Undo — available any time during the grace period. */
export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAdmin, sendDeletionCancelledEmail } = await import("./account-deletion.server");
    const admin = await getAdmin();

    const { data: rows } = await admin
      .from("account_deletion_requests")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .in("status", ["pending_confirmation", "scheduled"])
      .select("email");

    const email = rows?.[0]?.email;
    if (email) await sendDeletionCancelledEmail(email).catch(() => undefined);

    return { cancelled: Boolean(rows?.length) };
  });