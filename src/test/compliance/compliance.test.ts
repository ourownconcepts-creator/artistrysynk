import { describe, it, expect } from "vitest";
import {
  approvalBlockers,
  daysUntil,
  fieldsFor,
  isOverdue,
  ROPA_FIELDS,
  DPIA_FIELDS,
  type ComplianceRecordDraft,
} from "@/lib/compliance-schema";
import { buildReferenceId as buildPrivacyReference } from "@/lib/privacy-requests.server";
import { buildClaimReference } from "@/lib/copyright.server";

const baseDraft = (
  overrides: Partial<ComplianceRecordDraft> = {},
): ComplianceRecordDraft => ({
  recordType: "ropa",
  title: "Account management",
  activity: "Accounts",
  owner: "Data protection lead",
  status: "approved",
  reviewDue: "2030-01-01",
  riskLevel: null,
  reviewNotes: "",
  linkedRecordId: null,
  content: Object.fromEntries(ROPA_FIELDS.map((f) => [f.key, "documented"])),
  ...overrides,
});

describe("compliance: ROPA register approval gate", () => {
  it("approves a fully documented processing activity", () => {
    expect(approvalBlockers(baseDraft())).toEqual([]);
  });

  it("blocks approval when accountability basics are missing", () => {
    const blockers = approvalBlockers(baseDraft({ owner: "  ", reviewDue: null, title: "" }));
    expect(blockers).toContain("Add a title.");
    expect(blockers).toContain("Assign an accountable owner.");
    expect(blockers).toContain("Set the next review date.");
  });

  it("requires every mandatory ROPA field, including lawful basis", () => {
    for (const field of ROPA_FIELDS) {
      const content = Object.fromEntries(ROPA_FIELDS.map((f) => [f.key, "documented"]));
      content[field.key] = "";
      expect(approvalBlockers(baseDraft({ content }))).toContain(`Complete "${field.label}".`);
    }
  });
});

describe("compliance: DPIA register approval gate", () => {
  const dpiaContent = (risks: unknown) => ({
    ...Object.fromEntries(DPIA_FIELDS.map((f) => [f.key, "documented"])),
    risks,
  });

  const dpia = (overrides: Partial<ComplianceRecordDraft> = {}) =>
    baseDraft({
      recordType: "dpia",
      riskLevel: "high",
      linkedRecordId: "ropa-1",
      content: dpiaContent([
        { risk: "Re-identification", mitigation: "Coarse location", likelihood: "low", severity: "high" },
      ]) as ComplianceRecordDraft["content"],
      ...overrides,
    });

  it("approves an assessment with a complete risk table", () => {
    expect(approvalBlockers(dpia())).toEqual([]);
  });

  it("blocks an assessment with no risks assessed", () => {
    expect(
      approvalBlockers(dpia({ content: dpiaContent([]) as ComplianceRecordDraft["content"] })),
    ).toContain("Assess at least one risk.");
  });

  it("blocks a risk row missing a mitigation or rating", () => {
    const blockers = approvalBlockers(
      dpia({
        content: dpiaContent([
          { risk: "Profiling", mitigation: "", likelihood: "medium", severity: "high" },
        ]) as ComplianceRecordDraft["content"],
      }),
    );
    expect(blockers).toContain(
      "Every risk needs a description, likelihood, severity and mitigation.",
    );
  });

  it("requires an overall risk level and a linked processing activity", () => {
    const blockers = approvalBlockers(dpia({ riskLevel: null, linkedRecordId: null }));
    expect(blockers).toContain("Set the overall risk level.");
    expect(blockers).toContain("Link the processing activity this assessment covers.");
  });

  it("only ROPA and DPIA records carry mandatory register fields", () => {
    expect(fieldsFor("ropa")).toBe(ROPA_FIELDS);
    expect(fieldsFor("dpia")).toBe(DPIA_FIELDS);
    expect(fieldsFor("policy")).toEqual([]);
  });
});

describe("compliance: review scheduling", () => {
  it("flags a past review date as overdue unless the record is retired", () => {
    expect(isOverdue("2000-01-01", "approved")).toBe(true);
    expect(isOverdue("2000-01-01", "retired")).toBe(false);
    expect(isOverdue(null, "approved")).toBe(false);
  });

  it("counts days remaining until the next review", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil("2000-01-01")).toBeLessThan(0);
    expect(daysUntil("2100-01-01")).toBeGreaterThan(0);
  });
});

describe("compliance: request references", () => {
  it("issues traceable, unique privacy request references", () => {
    const a = buildPrivacyReference();
    expect(a).toMatch(/^AS-PRV-[A-Z0-9]+$/);
    expect(a).not.toBe(buildPrivacyReference());
  });

  it("issues traceable, unique copyright claim references", () => {
    const a = buildClaimReference();
    expect(a).toMatch(/^AS-CPY-[A-Z0-9]+$/);
    expect(a).not.toBe(buildClaimReference());
  });
});