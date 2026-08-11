import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { OG_FALLBACK_PATH, OG_MIN_HEIGHT, OG_MIN_WIDTH } from "@/lib/ogImage";

/**
 * Share-image resolver: validates the requested upstream image and serves the
 * branded 1200x630 fallback whenever it is missing, unreachable, not an image
 * or smaller than the minimum share size. Public by design (crawlers call it).
 */
export const Route = createFileRoute("/api/public/og-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const fallback = new URL(OG_FALLBACK_PATH, url.origin).toString();
        const redirectToFallback = () =>
          new Response(null, {
            status: 302,
            headers: { Location: fallback, "Cache-Control": "public, max-age=300" },
          });

        const src = url.searchParams.get("src");
        if (!src || !/^https:\/\//i.test(src) || src.length > 1000) return redirectToFallback();

        const { probeRemoteImage } = await import("@/lib/ogImageProbe.server");
        const probe = await probeRemoteImage(src);
        if (!probe.ok || !probe.bytes) return redirectToFallback();
        if (probe.width === null || probe.height === null) return redirectToFallback();
        if (probe.width < OG_MIN_WIDTH || probe.height < OG_MIN_HEIGHT) return redirectToFallback();

        return new Response(probe.bytes as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": probe.contentType ?? "image/jpeg",
            "Cache-Control": "public, max-age=86400, s-maxage=604800",
          },
        });
      },
    },
  },
});
