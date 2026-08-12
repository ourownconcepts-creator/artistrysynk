import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import {
  OG_ASSET_VERSION,
  OG_MIN_HEIGHT,
  OG_MIN_WIDTH,
  OG_VARIANTS,
  type OgRatio,
} from "@/lib/ogImage";

const RATIOS: OgRatio[] = ["wide", "twitter", "square", "portrait"];

/**
 * Share-image resolver: serves the admin-uploaded page override, then the
 * requested upstream image (validated), then the admin brand fallback, then the
 * bundled branded banner for the requested aspect ratio. Resolution happens per
 * request so replacing the brand image propagates immediately.
 * Public by design (crawlers call it).
 */
export const Route = createFileRoute("/api/public/og-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const ratio = (RATIOS.find((r) => r === url.searchParams.get("ratio")) ??
          "wide") as OgRatio;
        const variant = OG_VARIANTS[ratio];
        const pagePath = (url.searchParams.get("path") ?? "").slice(0, 300) || null;
        const src = url.searchParams.get("src");

        const bundled = (version: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `${new URL(variant.path, url.origin).toString()}?v=${version}`,
              // Short shared cache so an admin upload propagates within minutes.
              "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
            },
          });

        const stream = (bytes: Uint8Array, contentType: string, version: string, long: boolean) =>
          new Response(bytes as unknown as BodyInit, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              // Never let a proxied byte stream be sniffed or executed as
              // active content served from our own origin.
              "X-Content-Type-Options": "nosniff",
              "Content-Security-Policy": "default-src 'none'; sandbox",
              "Content-Disposition": 'inline; filename="share-image"',
              ETag: `"${version}-${ratio}-${bytes.byteLength}"`,
              "Cache-Control": long
                ? "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"
                : "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
            },
          });

        const brand = await import("@/lib/ogBrand.server");

        // 1. Per-page override wins over everything.
        if (pagePath) {
          const override = await brand.getOgOverride(pagePath);
          const ref = brand.pickVariant(override, ratio);
          if (ref && override) {
            const asset = await brand.loadOgAsset(ref, override.version);
            if (asset) return stream(asset.bytes, asset.contentType, asset.version, false);
          }
        }

        // 2. The page's own image, when it is a real, large-enough image.
        if (src && /^https:\/\//i.test(src) && src.length <= 1000) {
          const { probeRemoteImage } = await import("@/lib/ogImageProbe.server");
          const probe = await probeRemoteImage(src);
          if (
            probe.ok &&
            probe.bytes &&
            probe.width !== null &&
            probe.height !== null &&
            probe.width >= OG_MIN_WIDTH &&
            probe.height >= OG_MIN_HEIGHT
          ) {
            return stream(probe.bytes, probe.contentType ?? "image/jpeg", OG_ASSET_VERSION, true);
          }
        }

        // 3. Admin-uploaded brand fallback.
        const settings = await brand.getOgSettings();
        const fallbackRef = brand.pickVariant(settings, ratio);
        if (fallbackRef && settings) {
          const asset = await brand.loadOgAsset(fallbackRef, settings.version);
          if (asset) return stream(asset.bytes, asset.contentType, asset.version, false);
        }

        // 4. Bundled branded banner.
        return bundled(settings?.version ?? OG_ASSET_VERSION);
      },
    },
  },
});
