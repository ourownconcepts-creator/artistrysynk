import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_BYTES = 5 * 1024 * 1024;

const uploadSchema = z.object({
  /** Base64 (no data: prefix) image payload. */
  base64: z.string().min(64).max(9_000_000),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  slot: z.enum(["wide", "square", "portrait"]).default("wide"),
  /** Omit for the site-wide fallback; set to override a single page. */
  path: z.string().max(300).optional(),
});

const decode = (base64: string) => {
  const clean = base64.replace(/^data:[^,]+,/, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  if (bytes.byteLength > MAX_BYTES) throw new Error("Image is larger than 5MB");
  return bytes;
};

/** Admin: read the current brand fallback + per-page overrides. */
export const getOgBrandConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    const brand = await import("@/lib/ogBrand.server");
    return { settings: await brand.getOgSettings(), overrides: await brand.listOverrides() };
  });

/** Admin: replace the brand fallback image, or a single page's share image. */
export const uploadOgImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(uploadSchema)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    const brand = await import("@/lib/ogBrand.server");
    const bytes = decode(data.base64);

    const { readImageSize } = await import("@/lib/ogImageProbe.server");
    const size = readImageSize(bytes);
    if (!size) throw new Error("That file is not a readable JPEG, PNG or WebP image");
    if (size.width < 600 || size.height < 315) {
      throw new Error(`Image is too small (${size.width}x${size.height}); use at least 1200x630`);
    }

    const target = data.path?.trim();
    const slug = target ? `page${target.replace(/[^a-z0-9]+/gi, "-")}` : `fallback-${data.slot}`;
    const ref = await brand.storeBrandUpload(bytes, data.contentType, slug.slice(0, 60));

    if (target) {
      const path = target.startsWith("/") ? target : `/${target}`;
      await brand.saveOverride(path, ref, data.slot, context.userId);
      return { ok: true as const, scope: "page" as const, path, width: size.width, height: size.height };
    }

    await brand.saveFallback(ref, data.slot, context.userId);
    return { ok: true as const, scope: "site" as const, width: size.width, height: size.height };
  });

/** Admin: remove a per-page override so the page falls back to the brand image. */
export const deleteOgOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ path: z.string().min(1).max(300) }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    const brand = await import("@/lib/ogBrand.server");
    await brand.removeOverride(data.path);
    return { ok: true as const };
  });

/** Admin: bust every cached share image and re-submit affected pages. */
export const purgeOgImageCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/authz.server");
    await assertAdmin(context.supabase, context.userId);
    const brand = await import("@/lib/ogBrand.server");
    const { paths } = await brand.purgeOgCaches();
    const { submitUrlsForIndexing } = await import("@/lib/seoPing.server");
    const submission = await submitUrlsForIndexing(["/", ...paths]);
    return { ok: true as const, purgedPaths: paths, submittedAt: submission.submittedAt };
  });
