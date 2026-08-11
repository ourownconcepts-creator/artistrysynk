/**
 * Server-only resolution of share (og:image) assets.
 *
 * Order of preference for a given page:
 *   1. an admin-uploaded override for that exact path,
 *   2. the page's own candidate image (must be a real image >= 1200x630),
 *   3. the admin-uploaded brand fallback,
 *   4. the bundled branded banner for the requested aspect ratio.
 *
 * Uploaded assets live in the private `brand-assets` bucket and are streamed
 * through the proxy, so no public bucket is required.
 */
import type { OgRatio } from "./ogImage";

export const BRAND_BUCKET = "brand-assets";
/** Prefix marking a value stored as an object in the private brand bucket. */
export const STORAGE_PREFIX = "sb:";

export interface OgAssetRow {
  image_url: string | null;
  square_url: string | null;
  portrait_url: string | null;
  version: string;
}

export interface ResolvedOgAsset {
  bytes: Uint8Array;
  contentType: string;
  version: string;
}

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export async function getOgSettings(): Promise<OgAssetRow | null> {
  const supabase = await admin();
  const { data } = await supabase
    .from("og_image_settings")
    .select("image_url, square_url, portrait_url, version")
    .eq("id", true)
    .maybeSingle();
  return (data as OgAssetRow | null) ?? null;
}

export async function getOgOverride(path: string): Promise<OgAssetRow | null> {
  const supabase = await admin();
  const { data } = await supabase
    .from("og_image_overrides")
    .select("image_url, square_url, portrait_url, version")
    .eq("path", path)
    .maybeSingle();
  return (data as OgAssetRow | null) ?? null;
}

/** Pick the stored reference that best matches the requested aspect ratio. */
export function pickVariant(row: OgAssetRow | null, ratio: OgRatio): string | null {
  if (!row) return null;
  if (ratio === "square") return row.square_url || row.image_url || null;
  if (ratio === "portrait") return row.portrait_url || row.image_url || null;
  return row.image_url || null;
}

/** Load a stored reference (bucket object or absolute https URL) into bytes. */
export async function loadOgAsset(ref: string, version: string): Promise<ResolvedOgAsset | null> {
  try {
    if (ref.startsWith(STORAGE_PREFIX)) {
      const supabase = await admin();
      const { data, error } = await supabase.storage
        .from(BRAND_BUCKET)
        .download(ref.slice(STORAGE_PREFIX.length));
      if (error || !data) return null;
      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        contentType: data.type || "image/jpeg",
        version,
      };
    }
    if (!/^https:\/\//i.test(ref)) return null;
    const res = await fetch(ref);
    if (!res.ok) return null;
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "image/jpeg",
      version,
    };
  } catch {
    return null;
  }
}
