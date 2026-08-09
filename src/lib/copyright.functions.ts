import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const claimSchema = z.object({
  rightsHolderName: z.string().trim().min(2).max(160),
  contactEmail: z.string().trim().email().max(200),
  contactPhone: z.string().trim().max(40).optional(),
  contentType: z.enum(["portfolio_item", "project_file", "profile", "message", "other"]),
  contentUrl: z.string().trim().min(4).max(500),
  contentId: z.string().uuid().optional(),
  workDescription: z.string().trim().min(20).max(2000),
  infringementExplanation: z.string().trim().min(20).max(2000),
  evidenceUrls: z.array(z.string().trim().url().max(500)).max(5).optional(),
  declarationAccepted: z.literal(true),
});

export type CopyrightClaimSummary = {
  id: string;
  referenceId: string;
  status: string;
  createdAt: string;
};

/**
 * Public copyright/takedown notice intake. Anyone can file — rights holders
 * are usually not members — so the handler enforces its own IP rate limit.
 */
export const submitCopyrightClaim = createServerFn({ method: "POST" })
  .inputValidator(claimSchema)
  .handler(async ({ data }): Promise<CopyrightClaimSummary> => {
    const { getRequestIP } = await import("@tanstack/react-start/server");
    const { buildClaimReference, getAdmin, hashIp, sendClaimEmails } = await import(
      "./copyright.server"
    );

    const admin = await getAdmin();
    const ipHash = await hashIp(getRequestIP({ xForwardedFor: true }) ?? null);

    // Max 3 notices per hour from the same origin keeps the queue usable.
    if (ipHash) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("copyright_claims")
        .select("id", { count: "exact", head: true })
        .eq("submitter_ip_hash", ipHash)
        .gte("created_at", since);
      if ((count ?? 0) >= 3) {
        throw new Error("Too many notices from this connection. Please try again in an hour.");
      }
    }

    const referenceId = buildClaimReference();
    const { data: row, error } = await admin
      .from("copyright_claims")
      .insert({
        reference_id: referenceId,
        rights_holder_name: data.rightsHolderName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone ?? null,
        content_type: data.contentType,
        content_url: data.contentUrl,
        content_id: data.contentId ?? null,
        work_description: data.workDescription,
        infringement_explanation: data.infringementExplanation,
        evidence_urls: data.evidenceUrls ?? [],
        declaration_accepted: true,
        submitter_ip_hash: ipHash,
      })
      .select("id, reference_id, status, created_at")
      .single();

    if (error || !row) throw new Error("Could not file your notice. Please try again.");

    await sendClaimEmails({
      referenceId,
      contactEmail: data.contactEmail,
      rightsHolderName: data.rightsHolderName,
      contentUrl: data.contentUrl,
      contentType: data.contentType,
      workDescription: data.workDescription,
      infringementExplanation: data.infringementExplanation,
    });

    return {
      id: row.id,
      referenceId: row.reference_id,
      status: row.status,
      createdAt: row.created_at,
    };
  });

/** Reference-only status lookup so claimants can track a notice without an account. */
export const lookupCopyrightClaim = createServerFn({ method: "POST" })
  .inputValidator(z.object({ referenceId: z.string().trim().min(6).max(20) }))
  .handler(async ({ data }) => {
    const { getAdmin } = await import("./copyright.server");
    const admin = await getAdmin();
    const { data: row } = await admin
      .from("copyright_claims")
      .select("reference_id, status, outcome, created_at, reviewed_at")
      .eq("reference_id", data.referenceId.toUpperCase())
      .maybeSingle();

    if (!row) return null;
    // Deliberately no claimant details: the reference alone is not proof of identity.
    return {
      referenceId: row.reference_id,
      status: row.status,
      outcome: row.outcome,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
    };
  });

const MOD_ROLES = ["admin", "master_admin", "super_admin", "trust_safety_admin", "moderator"] as const;

async function assertModerator(context: { supabase: any; userId: string }) {
  for (const role of MOD_ROLES) {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: role,
    });
    if (data) return role;
  }
  throw new Error("Forbidden");
}

export type AdminCopyrightClaim = {
  id: string;
  referenceId: string;
  status: string;
  outcome: string | null;
  rightsHolderName: string;
  contactEmail: string;
  contactPhone: string | null;
  contentType: string;
  contentUrl: string;
  contentId: string | null;
  workDescription: string;
  infringementExplanation: string;
  evidenceUrls: string[];
  adminNotes: string | null;
  respondentUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export const listCopyrightClaims = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<AdminCopyrightClaim[]> => {
    await assertModerator(context);
    const { getAdmin } = await import("./copyright.server");
    const admin = await getAdmin();

    let query = admin
      .from("copyright_claims")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);

    const { data: rows } = await query;
    return (rows ?? []).map((r) => ({
      id: r.id,
      referenceId: r.reference_id,
      status: r.status,
      outcome: r.outcome,
      rightsHolderName: r.rights_holder_name,
      contactEmail: r.contact_email,
      contactPhone: r.contact_phone,
      contentType: r.content_type,
      contentUrl: r.content_url,
      contentId: r.content_id,
      workDescription: r.work_description,
      infringementExplanation: r.infringement_explanation,
      evidenceUrls: r.evidence_urls ?? [],
      adminNotes: r.admin_notes,
      respondentUserId: r.respondent_user_id,
      reviewedAt: r.reviewed_at,
      createdAt: r.created_at,
    }));
  });

const decisionSchema = z.object({
  claimId: z.string().uuid(),
  status: z.enum(["received", "reviewing", "actioned", "rejected", "counter_noticed", "withdrawn"]),
  outcome: z.string().trim().max(400).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  hideContent: z.boolean().optional(),
  notifyClaimant: z.boolean().optional(),
});

/** Records a moderator decision, optionally hides the content, and audits the action. */
export const decideCopyrightClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(decisionSchema)
  .handler(async ({ data, context }) => {
    const actorRole = await assertModerator(context);
    const { getAdmin, hashIp, sendClaimOutcomeEmail } = await import("./copyright.server");
    const { getRequestIP } = await import("@tanstack/react-start/server");
    const admin = await getAdmin();

    const { data: claim } = await admin
      .from("copyright_claims")
      .select("id, reference_id, status, contact_email, content_type, content_id")
      .eq("id", data.claimId)
      .maybeSingle();
    if (!claim) throw new Error("Claim not found");

    const terminal = data.status === "actioned" || data.status === "rejected";
    const { error } = await admin
      .from("copyright_claims")
      .update({
        status: data.status,
        outcome: data.outcome ?? null,
        admin_notes: data.adminNotes ?? null,
        reviewed_by: context.userId,
        reviewed_at: terminal ? new Date().toISOString() : null,
      })
      .eq("id", data.claimId);
    if (error) throw new Error("Could not save the decision.");

    // Taking down the reported media is the whole point of an actioned notice.
    if (data.hideContent && claim.content_id) {
      if (claim.content_type === "portfolio_item") {
        await admin.from("portfolio_items").update({ is_hidden: true }).eq("id", claim.content_id);
      } else if (claim.content_type === "project_file") {
        await admin.from("project_files").update({ is_hidden: true }).eq("id", claim.content_id);
      }
    }

    if (data.notifyClaimant && terminal) {
      await sendClaimOutcomeEmail({
        to: claim.contact_email,
        referenceId: claim.reference_id,
        status: data.status,
        outcome: data.outcome ?? null,
        note: data.adminNotes ?? null,
      });
    }

    await admin.from("admin_audit_logs").insert({
      actor_id: context.userId,
      actor_role: actorRole,
      action: `copyright.${data.status}`,
      target_type: "copyright_claim",
      target_id: data.claimId,
      target_label: claim.reference_id,
      reason: data.outcome ?? null,
      ip_hash: await hashIp(getRequestIP({ xForwardedFor: true }) ?? null),
      metadata: {
        previous_status: claim.status,
        hid_content: Boolean(data.hideContent && claim.content_id),
        notified_claimant: Boolean(data.notifyClaimant && terminal),
      },
    });

    return { ok: true };
  });
