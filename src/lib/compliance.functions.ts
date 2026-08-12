import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  ComplianceRecordType,
  ComplianceStatus,
  DpiaRisk,
  RiskLevel,
} from "@/lib/compliance-schema";

/** Register content is plain text fields plus, for DPIAs, a list of risks. */
export type ComplianceContent = Record<string, string | DpiaRisk[]>;

export type ComplianceRecord = {
  id: string;
  referenceId: string | null;
  recordType: ComplianceRecordType;
  title: string;
  activity: string | null;
  owner: string | null;
  status: ComplianceStatus;
  reviewDue: string | null;
  riskLevel: RiskLevel | null;
  reviewNotes: string | null;
  linkedRecordId: string | null;
  content: ComplianceContent;
  approvedAt: string | null;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ComplianceRegisters = {
  records: ComplianceRecord[];
  processors: {
    id: string;
    provider: string;
    service: string;
    dataAccessed: string;
    purpose: string;
    processingLocation: string | null;
    contractStatus: string;
    transferMechanism: string | null;
    isActive: boolean;
  }[];
  inventoryCount: number;
  retentionCount: number;
};

const recordSchema = z.object({
  id: z.string().uuid().optional(),
  recordType: z.enum(["ropa", "dpia", "policy", "audit"]),
  title: z.string().trim().min(3).max(200),
  activity: z.string().trim().max(200).optional(),
  owner: z.string().trim().max(160).optional(),
  status: z.enum(["draft", "in_review", "approved", "retired"]),
  reviewDue: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  riskLevel: z.enum(["low", "medium", "high"]).nullable().optional(),
  reviewNotes: z.string().trim().max(2000).optional(),
  linkedRecordId: z.string().uuid().nullable().optional(),
  content: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.array(
          z.object({
            risk: z.string(),
            likelihood: z.string(),
            severity: z.string(),
            mitigation: z.string(),
          }),
        ),
      ]),
    )
    .default({}),
});

const mapRecord = (r: Record<string, any>): ComplianceRecord => ({
  id: r.id,
  referenceId: r.reference_id ?? null,
  recordType: r.record_type,
  title: r.title,
  activity: r.activity ?? null,
  owner: r.owner ?? null,
  status: r.status,
  reviewDue: r.review_due ?? null,
  riskLevel: r.risk_level ?? null,
  reviewNotes: r.review_notes ?? null,
  linkedRecordId: r.linked_record_id ?? null,
  content: (r.content ?? {}) as ComplianceContent,
  approvedAt: r.approved_at ?? null,
  lastReviewedAt: r.last_reviewed_at ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** ROPA + DPIA registers plus the processor register they reference. */
export const listComplianceRegisters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ComplianceRegisters> => {
    const { assertComplianceAdmin } = await import("./compliance.server");
    await assertComplianceAdmin(context.supabase, context.userId);

    const [records, processors, inventory, retention] = await Promise.all([
      context.supabase
        .from("compliance_records")
        .select("*")
        .order("record_type", { ascending: true })
        .order("title", { ascending: true }),
      context.supabase
        .from("data_processors")
        .select("*")
        .order("provider", { ascending: true }),
      context.supabase.from("data_inventory").select("id", { count: "exact", head: true }),
      context.supabase.from("retention_policies").select("id", { count: "exact", head: true }),
    ]);

    if (records.error) throw new Error("Could not load the compliance registers.");

    return {
      records: (records.data ?? []).map(mapRecord),
      processors: (processors.data ?? []).map((p: Record<string, any>) => ({
        id: p.id,
        provider: p.provider,
        service: p.service,
        dataAccessed: p.data_accessed,
        purpose: p.purpose,
        processingLocation: p.processing_location ?? null,
        contractStatus: p.contract_status,
        transferMechanism: p.transfer_mechanism ?? null,
        isActive: p.is_active,
      })),
      inventoryCount: inventory.count ?? 0,
      retentionCount: retention.count ?? 0,
    };
  });

/**
 * Creates or updates a register entry. Approval requirements are enforced by
 * the database trigger, so a malformed approval fails here too — the UI's
 * checks are only a faster first pass.
 */
export const saveComplianceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(recordSchema)
  .handler(async ({ data, context }): Promise<ComplianceRecord> => {
    const { assertComplianceAdmin, auditCompliance } = await import("./compliance.server");
    const role = await assertComplianceAdmin(context.supabase, context.userId);

    const payload = {
      record_type: data.recordType,
      title: data.title,
      activity: data.activity ?? null,
      owner: data.owner ?? null,
      status: data.status,
      review_due: data.reviewDue ?? null,
      risk_level: data.riskLevel ?? null,
      review_notes: data.reviewNotes ?? null,
      linked_record_id: data.linkedRecordId ?? null,
      content: data.content as unknown as never,
      ...(data.status === "approved" ? { approved_by: context.userId } : {}),
      ...(data.id ? {} : { created_by: context.userId }),
    };

    const query = data.id
      ? context.supabase.from("compliance_records").update(payload).eq("id", data.id)
      : context.supabase.from("compliance_records").insert(payload);

    const { data: row, error } = await query.select("*").single();
    if (error || !row) {
      // Surface the trigger's "missing x, y" message so the admin can fix it.
      throw new Error(error?.message ?? "Could not save the record.");
    }

    await auditCompliance({
      supabase: context.supabase,
      actorId: context.userId,
      actorRole: role,
      action: data.id ? `compliance.${data.recordType}.updated` : `compliance.${data.recordType}.created`,
      targetId: row.id,
      targetLabel: row.reference_id ?? row.title,
      metadata: { status: data.status },
    });

    return mapRecord(row);
  });

/** Records a completed periodic review and rolls the next review date forward. */
export const reviewComplianceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      id: z.string().uuid(),
      nextReviewDue: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().trim().max(2000).optional(),
    }),
  )
  .handler(async ({ data, context }): Promise<ComplianceRecord> => {
    const { assertComplianceAdmin, auditCompliance } = await import("./compliance.server");
    const role = await assertComplianceAdmin(context.supabase, context.userId);

    const { data: row, error } = await context.supabase
      .from("compliance_records")
      .update({
        last_reviewed_at: new Date().toISOString(),
        review_due: data.nextReviewDue,
        review_notes: data.notes ?? null,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not record the review.");

    await auditCompliance({
      supabase: context.supabase,
      actorId: context.userId,
      actorRole: role,
      action: `compliance.${row.record_type}.reviewed`,
      targetId: row.id,
      targetLabel: row.reference_id ?? row.title,
      metadata: { next_review_due: data.nextReviewDue },
    });

    return mapRecord(row);
  });

export const deleteComplianceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { assertComplianceAdmin, auditCompliance } = await import("./compliance.server");
    const role = await assertComplianceAdmin(context.supabase, context.userId);

    const { data: row } = await context.supabase
      .from("compliance_records")
      .select("id, reference_id, title, record_type, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Record not found");
    if (row.status === "approved") {
      throw new Error("Retire the record instead of deleting an approved register entry.");
    }

    const { error } = await context.supabase.from("compliance_records").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete the record.");

    await auditCompliance({
      supabase: context.supabase,
      actorId: context.userId,
      actorRole: role,
      action: `compliance.${row.record_type}.deleted`,
      targetId: row.id,
      targetLabel: row.reference_id ?? row.title,
      metadata: {},
    });

    return { ok: true };
  });
