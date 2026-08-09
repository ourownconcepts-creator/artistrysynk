import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminPrivacyRequest = {
  id: string;
  referenceId: string;
  requestType: string;
  status: string;
  contactEmail: string;
  details: string | null;
  verificationStatus: string;
  responseDueAt: string;
  resolutionNotes: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type RequestAuditEntry = {
  id: string;
  action: string;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  reason: string | null;
  createdAt: string;
};

export type RequestQueues = {
  privacyRequests: AdminPrivacyRequest[];
  auditTrail: RequestAuditEntry[];
};

const mapRequest = (r: Record<string, any>): AdminPrivacyRequest => ({
  id: r.id,
  referenceId: r.reference_id,
  requestType: r.request_type,
  status: r.status,
  contactEmail: r.contact_email,
  details: r.details ?? null,
  verificationStatus: r.verification_status,
  responseDueAt: r.response_due_at,
  resolutionNotes: r.resolution_notes ?? null,
  completedAt: r.completed_at ?? null,
  createdAt: r.created_at,
});

/** DSAR queue plus the audit trail covering privacy and copyright decisions. */
export const listRequestQueues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RequestQueues> => {
    const { assertComplianceAdmin } = await import("./compliance.server");
    await assertComplianceAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [requests, audit] = await Promise.all([
      supabaseAdmin
        .from("privacy_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("admin_audit_logs")
        .select("*")
        .in("target_type", ["privacy_request", "copyright_claim"])
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (requests.error) throw new Error("Could not load the request queue.");

    return {
      privacyRequests: (requests.data ?? []).map(mapRequest),
      auditTrail: (audit.data ?? []).map((a: Record<string, any>) => ({
        id: a.id,
        action: a.action,
        actorRole: a.actor_role ?? null,
        targetType: a.target_type ?? null,
        targetId: a.target_id ?? null,
        targetLabel: a.target_label ?? null,
        reason: a.reason ?? null,
        createdAt: a.created_at,
      })),
    };
  });

/** Moves a DSAR through its lifecycle and records who did it. */
export const updatePrivacyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      requestId: z.string().uuid(),
      status: z.enum(["received", "verifying", "in_progress", "completed", "rejected", "withdrawn"]),
      resolutionNotes: z.string().trim().max(2000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { assertComplianceAdmin } = await import("./compliance.server");
    const role = await assertComplianceAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("privacy_requests")
      .select("reference_id, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!existing) throw new Error("That request no longer exists.");

    const terminal = data.status === "completed" || data.status === "rejected";
    const { error } = await supabaseAdmin
      .from("privacy_requests")
      .update({
        status: data.status,
        resolution_notes: data.resolutionNotes ?? null,
        completed_at: terminal ? new Date().toISOString() : null,
      })
      .eq("id", data.requestId);
    if (error) throw new Error("Could not update the request.");

    await supabaseAdmin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_role: role,
      action: `privacy_request.${data.status}`,
      target_type: "privacy_request",
      target_id: data.requestId,
      target_label: existing.reference_id,
      reason: data.resolutionNotes ?? null,
      metadata: { previous_status: existing.status },
    });

    return { ok: true };
  });

/** Short-lived signed link so staff can open uploaded copyright evidence. */
export const getEvidenceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ path: z.string().trim().min(1).max(400) }))
  .handler(async ({ data, context }): Promise<string> => {
    const { assertComplianceAdmin } = await import("./compliance.server");
    await assertComplianceAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const path = data.path.replace(/^storage:\/\/copyright-evidence\//, "");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("copyright-evidence")
      .createSignedUrl(path, 300);
    if (error || !signed) throw new Error("Could not open that evidence file.");
    return signed.signedUrl;
  });
