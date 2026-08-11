/**
 * Canonical upload configuration for ArtistrySynk.
 *
 * Single source of truth for client-side file validation. The authoritative
 * security boundary remains server-side: storage RLS policies on
 * storage.objects (ownership + membership + path conventions) and database
 * constraints (e.g. project_files_file_size_limit). These limits exist for UX
 * so users get an immediate, friendly message instead of a failed request.
 *
 * Limits were derived from existing production behaviour:
 *  - chat attachments were capped at 15MB client-side
 *  - copyright evidence was capped at 10MB client-side
 *  - project files and profile images had no client cap
 */

export const MB = 1024 * 1024;

export type UploadCategory = "image" | "audio" | "video" | "document";

export interface UploadRule {
  /** Maximum size in bytes (client-side UX guard). */
  maxBytes: number;
  /** Accepted MIME types; a trailing "/*" wildcard matches a whole family. */
  mimeTypes: string[];
  /** Value for an <input type="file"> accept attribute. */
  accept: string;
  /** Human-readable limit, e.g. "15MB". */
  label: string;
}

const rule = (maxBytes: number, mimeTypes: string[], accept: string): UploadRule => ({
  maxBytes,
  mimeTypes,
  accept,
  label: `${Math.round(maxBytes / MB)}MB`,
});

/** Per-category canonical rules. */
export const UPLOAD_RULES: Record<UploadCategory, UploadRule> = {
  image: rule(10 * MB, ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic"], "image/*"),
  audio: rule(15 * MB, ["audio/*"], "audio/*"),
  video: rule(100 * MB, ["video/mp4", "video/webm", "video/quicktime"], "video/mp4,video/webm,video/quicktime"),
  document: rule(
    25 * MB,
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ],
    ".pdf,.doc,.docx,.txt",
  ),
};

/** Storage buckets and the path convention each one enforces through RLS. */
export const UPLOAD_BUCKETS = {
  /**
   * Public profile + portfolio media.
   * Personal path: {userId}/...
   * Studio path:   studios/{studioId}/{logo|cover|equipment|work}/... (studio membership RLS)
   */
  portfolios: "portfolios",
  /**
   * Private studio media (unreleased work, internal brand assets).
   * Path: {studioId}/... — studio membership reads, capability-level writes.
   */
  studioPrivateMedia: "studio-private-media",
  /** Private chat images. Path: {userId}/{conversationId}/{uuid}.{ext} */
  chatImages: "chat-images",
  /** Private voice notes and audio clips. Path: {userId}/{conversationId}/{uuid}.{ext} */
  voiceNotes: "voice-notes",
  /** Private project room files. Path: {projectId}/... */
  projectFiles: "project-files",
  /** Private copyright evidence. Path: intake/... */
  copyrightEvidence: "copyright-evidence",
  /** Private identity verification documents. Path: {userId}/... */
  verificationDocuments: "verification-documents",
} as const;

/** Per-surface caps, so each feature reads one shared number. */
export const UPLOAD_LIMITS = {
  profileImage: UPLOAD_RULES.image.maxBytes,
  portfolioImage: UPLOAD_RULES.image.maxBytes,
  portfolioAudio: UPLOAD_RULES.audio.maxBytes,
  portfolioVideo: UPLOAD_RULES.video.maxBytes,
  chatImage: UPLOAD_RULES.image.maxBytes,
  chatAudio: UPLOAD_RULES.audio.maxBytes,
  voiceNote: UPLOAD_RULES.audio.maxBytes,
  copyrightEvidence: UPLOAD_RULES.document.maxBytes,
  /** Mirrors the project_files_file_size_limit database constraint. */
  projectFile: 200 * MB,
} as const;

const matchesMime = (type: string, patterns: string[]) =>
  patterns.some((p) => (p.endsWith("/*") ? type.startsWith(p.slice(0, -1)) : p === type));

/** Best-effort category detection from a MIME type. */
export function categoryOf(type: string): UploadCategory | null {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (matchesMime(type, UPLOAD_RULES.document.mimeTypes)) return "document";
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Validates a picked file against the canonical rules.
 * Pass `maxBytes` to apply a stricter per-surface cap.
 */
export function validateUpload(
  file: File,
  allowed: UploadCategory[],
  maxBytes?: number,
): { ok: true; category: UploadCategory } | { ok: false; error: string } {
  const category = categoryOf(file.type || "");
  if (!category || !allowed.includes(category)) {
    return { ok: false, error: `${file.name || "That file"} isn't a supported ${allowed.join(" or ")} file` };
  }
  const cap = maxBytes ?? UPLOAD_RULES[category].maxBytes;
  if (file.size > cap) {
    return { ok: false, error: `${file.name || "That file"} is larger than ${formatBytes(cap)}` };
  }
  return { ok: true, category };
}

/** Safe storage object name segment (no path traversal, no collisions upstream). */
export function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/** Extension helper used when building storage paths. */
export function extensionFor(file: { name: string; type: string }, fallback: string): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  if (fromName && /^[a-zA-Z0-9]{1,6}$/.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split("/")[1];
  return fromType && /^[a-zA-Z0-9]{1,6}$/.test(fromType) ? fromType.toLowerCase() : fallback;
}
