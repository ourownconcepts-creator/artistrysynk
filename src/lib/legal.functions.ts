import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LegalDocumentSummary = {
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  acceptanceRequired: boolean;
  version: number | null;
  effectiveDate: string | null;
};

export type LegalDocumentDetail = {
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  version: number;
  effectiveDate: string;
  content: string;
  isLatest: boolean;
  versions: { version: number; effectiveDate: string }[];
};

/** Public — the policy index for the footer, settings and the legal centre. */
export const listLegalDocuments = createServerFn({ method: "GET" }).handler(
  async (): Promise<LegalDocumentSummary[]> => {
    const { publicClient } = await import("./legal.server");
    const supabase = publicClient();

    const { data } = await supabase
      .from("legal_documents")
      .select(
        "slug, title, category, summary, is_acceptance_required, sort_order, legal_document_versions(version, effective_date, status)",
      )
      .order("sort_order", { ascending: true });

    return (data ?? []).map((doc) => {
      const published = (doc.legal_document_versions ?? [])
        .filter((v) => v.status === "published")
        .sort((a, b) => b.version - a.version);
      return {
        slug: doc.slug,
        title: doc.title,
        category: doc.category,
        summary: doc.summary,
        acceptanceRequired: doc.is_acceptance_required,
        version: published[0]?.version ?? null,
        effectiveDate: published[0]?.effective_date ?? null,
      };
    });
  },
);

/** Public — one policy, latest published version or a specific historical version. */
export const getLegalDocument = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({ slug: z.string().min(2).max(64), version: z.number().int().positive().optional() }),
  )
  .handler(async ({ data }): Promise<LegalDocumentDetail | null> => {
    const { publicClient } = await import("./legal.server");
    const supabase = publicClient();

    const { data: doc } = await supabase
      .from("legal_documents")
      .select("id, slug, title, category, summary")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!doc) return null;

    const { data: versions } = await supabase
      .from("legal_document_versions")
      .select("version, effective_date, content")
      .eq("document_id", doc.id)
      .eq("status", "published")
      .order("version", { ascending: false });

    const published = versions ?? [];
    if (published.length === 0) return null;

    const chosen = data.version
      ? published.find((v) => v.version === data.version)
      : published[0];
    if (!chosen) return null;

    return {
      slug: doc.slug,
      title: doc.title,
      category: doc.category,
      summary: doc.summary,
      version: chosen.version,
      effectiveDate: chosen.effective_date,
      content: chosen.content,
      isLatest: chosen.version === published[0]!.version,
      versions: published.map((v) => ({ version: v.version, effectiveDate: v.effective_date })),
    };
  });

const consentSchema = z.object({
  entries: z
    .array(
      z.object({
        consentType: z.enum([
          "legal_acceptance",
          "marketing",
          "age_confirmation",
          "personalisation",
          "ai_features",
        ]),
        documentSlug: z.string().min(2).max(64).optional(),
        granted: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(12),
  context: z.string().min(2).max(60).default("signup"),
  appVersion: z.string().max(40).optional(),
});

/** Records consent decisions against the exact document versions in force. */
export const recordConsents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(consentSchema)
  .handler(async ({ data, context }) => {
    const { publicClient, hashIp } = await import("./legal.server");
    const { getRequestIP, getRequestHeader } = await import("@tanstack/react-start/server");

    const ipHash = await hashIp(getRequestIP({ xForwardedFor: true }) ?? null);
    const userAgent = (getRequestHeader("user-agent") ?? "").slice(0, 400) || null;

    const slugs = data.entries.map((e) => e.documentSlug).filter(Boolean) as string[];

    const versionBySlug = new Map<string, { id: string; version: number }>();
    if (slugs.length > 0) {
      const supabase = publicClient();
      const { data: rows } = await supabase
        .from("legal_documents")
        .select("slug, legal_document_versions(id, version, status)")
        .in("slug", slugs);

      for (const row of rows ?? []) {
        const latest = (row.legal_document_versions ?? [])
          .filter((v) => v.status === "published")
          .sort((a, b) => b.version - a.version)[0];
        if (latest) versionBySlug.set(row.slug, { id: latest.id, version: latest.version });
      }
    }

    const payload = data.entries.map((entry) => {
      const version = entry.documentSlug ? versionBySlug.get(entry.documentSlug) : undefined;
      return {
        user_id: context.userId,
        consent_type: entry.consentType,
        document_slug: entry.documentSlug ?? null,
        document_version_id: version?.id ?? null,
        document_version: version?.version ?? null,
        granted: entry.granted,
        context: data.context,
        app_version: data.appVersion ?? null,
        ip_hash: ipHash,
        user_agent: userAgent,
      };
    });

    const { error } = await context.supabase.from("user_consents").insert(payload);
    if (error) throw new Error("Could not record your choices. Please try again.");

    return { recorded: payload.length };
  });

/** Mandatory policies the signed-in user has not accepted at their current version. */
export const getPendingLegalAcceptances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_pending_legal_acceptances", {
      _user_id: context.userId,
    });
    if (error) return [];
    return (data ?? []).map((row) => ({
      slug: row.slug,
      title: row.title,
      version: row.version,
      effectiveDate: row.effective_date,
    }));
  });

/** The signed-in user's own consent history, for the Privacy Centre. */
export const getMyConsents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_consents")
      .select("consent_type, document_slug, document_version, granted, context, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });
