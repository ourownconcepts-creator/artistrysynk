/**
 * Client-safe definition of what a ROPA / DPIA register entry must contain.
 * The same rules are enforced server-side by the validate_compliance_record
 * trigger — this module exists so the admin UI can block an invalid approval
 * before it round-trips.
 */

export type ComplianceRecordType = "ropa" | "dpia" | "policy" | "audit";
export type ComplianceStatus = "draft" | "in_review" | "approved" | "retired";
export type RiskLevel = "low" | "medium" | "high";

export const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  "draft",
  "in_review",
  "approved",
  "retired",
];

export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"];

export type ComplianceField = {
  key: string;
  label: string;
  help: string;
  multiline?: boolean;
};

/** GDPR Art. 30 record of processing activities. */
export const ROPA_FIELDS: ComplianceField[] = [
  { key: "purpose", label: "Purpose of processing", help: "Why we process this data.", multiline: true },
  { key: "lawful_basis", label: "Lawful basis", help: "Consent, contract, legitimate interests, legal obligation." },
  { key: "data_subjects", label: "Categories of data subjects", help: "Members, visitors, applicants, rights holders." },
  { key: "data_categories", label: "Categories of personal data", help: "Identity, contact, content, usage, device.", multiline: true },
  { key: "recipients", label: "Recipients", help: "Internal teams and processors that receive the data.", multiline: true },
  { key: "retention", label: "Retention period", help: "How long the data is kept and what triggers deletion." },
  { key: "transfers", label: "International transfers", help: "Destinations and safeguards, or 'None'." },
  { key: "security_measures", label: "Security measures", help: "Access control, encryption, RLS, logging.", multiline: true },
];

/** GDPR Art. 35 data protection impact assessment. */
export const DPIA_FIELDS: ComplianceField[] = [
  { key: "description", label: "Description of the processing", help: "Scope, context and nature of the operation.", multiline: true },
  { key: "necessity", label: "Necessity and proportionality", help: "Why the processing is needed and why it is proportionate.", multiline: true },
  { key: "residual_risk", label: "Residual risk", help: "Risk that remains after the mitigations below.", multiline: true },
  { key: "outcome", label: "Outcome / decision", help: "Proceed, proceed with conditions, or do not proceed.", multiline: true },
];

export type DpiaRisk = {
  risk: string;
  likelihood: string;
  severity: string;
  mitigation: string;
};

export const RISK_SCALE = ["low", "medium", "high"] as const;

export type ComplianceRecordDraft = {
  recordType: ComplianceRecordType;
  title: string;
  activity: string;
  owner: string;
  status: ComplianceStatus;
  reviewDue: string | null;
  riskLevel: RiskLevel | null;
  reviewNotes: string;
  linkedRecordId: string | null;
  content: Record<string, string | DpiaRisk[]>;
};

export function fieldsFor(type: ComplianceRecordType): ComplianceField[] {
  if (type === "ropa") return ROPA_FIELDS;
  if (type === "dpia") return DPIA_FIELDS;
  return [];
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Returns human-readable reasons a record cannot be approved. Empty array
 * means the record satisfies the register requirements.
 */
export function approvalBlockers(draft: ComplianceRecordDraft): string[] {
  const blockers: string[] = [];
  if (!text(draft.title)) blockers.push("Add a title.");
  if (!text(draft.owner)) blockers.push("Assign an accountable owner.");
  if (!draft.reviewDue) blockers.push("Set the next review date.");

  for (const field of fieldsFor(draft.recordType)) {
    if (!text(draft.content[field.key])) blockers.push(`Complete "${field.label}".`);
  }

  if (draft.recordType === "dpia") {
    const risks = Array.isArray(draft.content["risks"])
      ? (draft.content["risks"] as DpiaRisk[])
      : [];
    if (risks.length === 0) {
      blockers.push("Assess at least one risk.");
    } else if (
      risks.some(
        (r) => !text(r.risk) || !text(r.mitigation) || !text(r.likelihood) || !text(r.severity),
      )
    ) {
      blockers.push("Every risk needs a description, likelihood, severity and mitigation.");
    }
    if (!draft.riskLevel) blockers.push("Set the overall risk level.");
    if (!draft.linkedRecordId) blockers.push("Link the processing activity this assessment covers.");
  }

  return blockers;
}

export function isOverdue(reviewDue: string | null, status: ComplianceStatus): boolean {
  if (!reviewDue || status === "retired") return false;
  return new Date(`${reviewDue}T23:59:59Z`).getTime() < Date.now();
}

export function daysUntil(reviewDue: string | null): number | null {
  if (!reviewDue) return null;
  const diff = new Date(`${reviewDue}T23:59:59Z`).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}
