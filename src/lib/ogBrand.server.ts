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

const SLOT_COLUMNS = {
  wide: "image_url",
  square: "square_url",
  portrait: "portrait_url",
} as const;

export type OgSlot = keyof typeof SLOT_COLUMNS;

const newVersion = () => Date.now().toString(36);

/** Store an uploaded image in the private brand bucket and return its ref. */
export async function storeBrandUpload(
  bytes: Uint8Array,
  contentType: string,
  slug: string,
): Promise<string> {
  const supabase = await admin();
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const key = `og/${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BRAND_BUCKET)
    .upload(key, bytes as unknown as ArrayBufferView, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return `${STORAGE_PREFIX}${key}`;
}

export async function saveFallback(ref: string, slot: OgSlot, userId: string) {
  const supabase = await admin();
  const { error } = await supabase
    .from("og_image_settings")
    .update({
      [SLOT_COLUMNS[slot]]: ref,
      version: newVersion(),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(error.message);
}

export async function saveOverride(path: string, ref: string, slot: OgSlot, userId: string) {
  const supabase = await admin();
  const existing = await getOgOverride(path);
  const payload: Record<string, unknown> = {
    path,
    image_url: existing?.image_url ?? ref,
    square_url: existing?.square_url ?? null,
    portrait_url: existing?.portrait_url ?? null,
    version: newVersion(),
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
  payload[SLOT_COLUMNS[slot]] = ref;
  const { error } = await supabase.from("og_image_overrides").upsert(payload as never, { onConflict: "path" });
  if (error) throw new Error(error.message);
}

export async function removeOverride(path: string) {
  const supabase = await admin();
  const { error } = await supabase.from("og_image_overrides").delete().eq("path", path);
  if (error) throw new Error(error.message);
}

export async function listOverrides() {
  const supabase = await admin();
  const { data } = await supabase
    .from("og_image_overrides")
    .select("path, image_url, square_url, portrait_url, version, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

/** Bump every version stamp so caches and crawlers refetch the banners. */
export async function purgeOgCaches(): Promise<{ paths: string[] }> {
  const supabase = await admin();
  const version = newVersion();
  await supabase.from("og_image_settings").update({ version }).eq("id", true);
  const overrides = await listOverrides();
  for (const row of overrides) {
    await supabase.from("og_image_overrides").update({ version }).eq("path", row.path);
  }
  return { paths: overrides.map((o) => o.path as string) };
}
