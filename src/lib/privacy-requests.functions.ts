import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requestSchema = z.object({
  requestType: z.enum([
    "access",
    "correction",
    "deletion",
    "export",
    "restriction",
    "objection",
    "other",
  ]),
  details: z.string().trim().max(2000).optional(),
});

export type PrivacyRequestRow = {
  id: string;
  referenceId: string;
  requestType: string;
  status: string;
  details: string | null;
  responseDueAt: string;
  createdAt: string;
  completedAt: string | null;
};

/** Submits a data-subject request; the session proves identity. */
export const submitPrivacyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(requestSchema)
  .handler(async ({ data, context }): Promise<PrivacyRequestRow> => {
    const { buildReferenceId, getAdmin, sendPrivacyRequestEmails } = await import(
      "./privacy-requests.server"
    );
    const admin = await getAdmin();

    const { data: authUser } = await admin.auth.admin.getUserById(context.userId);
    const email = authUser?.user?.email;
    if (!email) throw new Error("No email is attached to this account.");

    // One open request per type keeps the queue honest and prevents spamming.
    const { data: existing } = await admin
      .from("privacy_requests")
      .select("id")
      .eq("user_id", context.userId)
      .eq("request_type", data.requestType)
      .in("status", ["received", "verifying", "in_progress"])
      .maybeSingle();

    if (existing) {
      throw new Error("You already have an open request of this type. We'll be in touch shortly.");
    }

    const referenceId = buildReferenceId();
    const { data: row, error } = await admin
      .from("privacy_requests")
      .insert({
        reference_id: referenceId,
        user_id: context.userId,
        contact_email: email,
        request_type: data.requestType,
        details: data.details ?? null,
        verification_status: "session_verified",
      })
      .select("id, reference_id, request_type, status, details, response_due_at, created_at, completed_at")
      .single();

    if (error || !row) throw new Error("Could not record your request. Please try again.");

    await sendPrivacyRequestEmails({
      to: email,
      referenceId,
      requestType: data.requestType,
      details: data.details ?? null,
      dueAt: row.response_due_at,
    });

    return {
      id: row.id,
      referenceId: row.reference_id,
      requestType: row.request_type,
      status: row.status,
      details: row.details,
      responseDueAt: row.response_due_at,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  });

/** The signed-in user's own request history. */
export const listMyPrivacyRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PrivacyRequestRow[]> => {
    const { data } = await context.supabase
      .from("privacy_requests")
      .select("id, reference_id, request_type, status, details, response_due_at, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(20);

    return (data ?? []).map((row) => ({
      id: row.id,
      referenceId: row.reference_id,
      requestType: row.request_type,
      status: row.status,
      details: row.details,
      responseDueAt: row.response_due_at,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  });
