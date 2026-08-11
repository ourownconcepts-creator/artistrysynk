import { supabase } from "@/integrations/supabase/client";
import type { Capability, VerificationLevel } from "@/lib/capabilities";

export const VERIFICATION_BUCKET = "verification-documents";

export type VerificationRequirement = {
  id: string;
  level: string;
  doc_type: string;
  label: string;
  description: string | null;
  is_required: boolean;
  accepted_mime: string[];
  max_size_mb: number;
  sort_order: number;
};

export type VerificationDocument = {
  id: string;
  doc_type: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  review_note: string | null;
  storage_path: string;
  verification_id: string | null;
  created_at: string;
};

export type TimelineRow = {
  verification_id: string;
  capability: string | null;
  status: string;
  requested_at: string;
  verified_at: string | null;
  event_status: string | null;
  note: string | null;
  event_at: string | null;
};

/** Human copy for each status, including what happens next. */
export const STATUS_COPY: Record<string, { label: string; next: string }> = {
  pending: {
    label: "In review",
    next: "Our team reviews submissions within 2 business days. We'll notify you here and by email.",
  },
  in_review: {
    label: "Being checked",
    next: "A reviewer is looking at your documents now. No action needed from you.",
  },
  needs_more_info: {
    label: "More information needed",
    next: "Replace the document mentioned in the note below, then resubmit.",
  },
  verified: {
    label: "Verified",
    next: "Everything checks out — the features you requested are unlocked.",
  },
  failed: {
    label: "Not approved",
    next: "Read the reviewer's note, upload a clearer document and submit again.",
  },
};

export const fetchRequirements = async (level: string) => {
  const { data } = await supabase
    .from("verification_requirements")
    .select("*")
    .eq("level", level)
    .order("sort_order", { ascending: true });
  return (data ?? []) as VerificationRequirement[];
};

export const fetchMyDocuments = async (userId: string) => {
  const { data } = await supabase
    .from("verification_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as VerificationDocument[];
};

/**
 * Client-side validation that mirrors the requirement row. The real boundary is
 * the storage RLS policy plus submit_verification_request(), which refuses a
 * submission when a required document is missing.
 */
export const validateDocument = (
  file: File,
  requirement: VerificationRequirement,
): string | null => {
  const allowed = requirement.accepted_mime ?? [];
  const typeOk =
    allowed.length === 0 ||
    allowed.some((m) => (m.endsWith("/*") ? file.type.startsWith(m.slice(0, -1)) : m === file.type));
  if (!typeOk) {
    const names = allowed.map((m) => m.split("/")[1]?.toUpperCase() ?? m).join(", ");
    return `${requirement.label} must be one of: ${names}.`;
  }
  if (file.size > requirement.max_size_mb * 1024 * 1024) {
    return `${requirement.label} is too large — keep it under ${requirement.max_size_mb}MB.`;
  }
  if (file.size < 5 * 1024) {
    return `${requirement.label} looks empty or corrupted. Try uploading it again.`;
  }
  return null;
};

/** Uploads to the private bucket under {userId}/{docType}/... and records the row. */
export const uploadDocument = async (
  userId: string,
  requirement: VerificationRequirement,
  file: File,
) => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${requirement.doc_type}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) return uploadError.message;

  // Replace any previous attempt for this requirement so reviewers see one file.
  const { data: previous } = await supabase
    .from("verification_documents")
    .select("id, storage_path")
    .eq("user_id", userId)
    .eq("doc_type", requirement.doc_type);
  for (const row of previous ?? []) {
    await supabase.storage.from(VERIFICATION_BUCKET).remove([row.storage_path]);
    await supabase.from("verification_documents").delete().eq("id", row.id);
  }

  const { error } = await supabase.from("verification_documents").insert({
    user_id: userId,
    doc_type: requirement.doc_type,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    status: "submitted",
  });
  return error?.message ?? null;
};

export const removeDocument = async (doc: VerificationDocument) => {
  await supabase.storage.from(VERIFICATION_BUCKET).remove([doc.storage_path]);
  const { error } = await supabase.from("verification_documents").delete().eq("id", doc.id);
  return error?.message ?? null;
};

export type SubmitResult = { ok: boolean; missing?: string[]; level?: string; error?: string };

/** Server-guarded submission; returns the missing checklist items when blocked. */
export const submitVerification = async (
  capability: Capability,
  notes?: string,
): Promise<SubmitResult> => {
  const { data, error } = await supabase.rpc("submit_verification_request", {
    _capability: capability,
    _notes: notes ?? undefined,
  });
  if (error) return { ok: false, error: error.message };
  const result = (data ?? {}) as { ok?: boolean; missing?: string[]; level?: string };
  return { ok: !!result.ok, missing: result.missing ?? [], level: result.level };
};

export const fetchTimeline = async (): Promise<TimelineRow[]> => {
  const { data } = await supabase.rpc("my_verification_timeline");
  return (data ?? []) as TimelineRow[];
};

/** Signed URL so a member can re-check what they uploaded. */
export const previewDocument = async (doc: VerificationDocument) => {
  const { data } = await supabase.storage
    .from(VERIFICATION_BUCKET)
    .createSignedUrl(doc.storage_path, 60);
  return data?.signedUrl ?? null;
};

export const levelForCapability = (
  required: string | undefined,
): VerificationLevel => (required as VerificationLevel) ?? "identity_verified";