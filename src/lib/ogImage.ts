/**
 * Automatic og:image fallback + branded variants.
 *
 * Every share image is emitted through `/api/public/og-image?…`, a server route
 * that resolves, in order:
 *   1. an admin-uploaded override for this exact page path,
 *   2. the page's own candidate image (reachable, real image, big enough),
 *   3. the admin-uploaded brand fallback,
 *   4. the bundled branded banner for the requested aspect ratio.
 *
 * Because resolution happens per request, replacing the brand image in the
 * admin propagates immediately — the tags themselves never change.
 */
export const OG_BASE_URL = "https://artistrysynk.app";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_PROXY_PATH = "/api/public/og-image";

/**
 * Bumped whenever the bundled banners change so browsers/CDNs that cached an
 * older render fetch the new one. Admin uploads bump their own DB version.
 */
export const OG_ASSET_VERSION = "2026081102";

export type OgRatio = "wide" | "twitter" | "square" | "portrait";

/** Bundled branded banners, one per aspect ratio platforms ask for. */
export const OG_VARIANTS: Record<OgRatio, { path: string; width: number; height: number }> = {
  wide: { path: "/og-fallback.jpg", width: 1200, height: 630 },
  twitter: { path: "/og-fallback-twitter.jpg", width: 1200, height: 600 },
  square: { path: "/og-fallback-square.jpg", width: 1200, height: 1200 },
  portrait: { path: "/og-fallback-portrait.jpg", width: 1080, height: 1350 },
};

/** 2x render of the default banner, for high-DPI/retina share surfaces. */
export const OG_FALLBACK_2X_PATH = "/og-fallback-2x.jpg";

export const OG_FALLBACK_PATH = OG_VARIANTS.wide.path;
export const OG_FALLBACK_URL = `${OG_BASE_URL}${OG_FALLBACK_PATH}`;

/** Minimum accepted upstream size — matches the validator's rules. */
export const OG_MIN_WIDTH = 1200;
export const OG_MIN_HEIGHT = 630;

export const isProxiedOgImage = (url: string | null | undefined) =>
  Boolean(url && (url.includes(OG_PROXY_PATH) || url.includes("/og-fallback")));

export interface OgImageOptions {
  /** Page path, so an admin can override the share image for this page only. */
  path?: string;
  /** Aspect ratio to serve when falling back to the branded banner. */
  ratio?: OgRatio;
}

/**
 * Resolve any candidate image (user cover, studio logo, …) into a share URL
 * that is guaranteed to render, resolved server-side at request time.
 */
export function ogImageUrl(src?: string | null, options: OgImageOptions = {}): string {
  const { path, ratio = "wide" } = options;
  const params = new URLSearchParams();
  const trimmed = src?.trim() ?? "";
  if (trimmed && /^https:\/\//i.test(trimmed) && !trimmed.includes(OG_PROXY_PATH)) {
    params.set("src", trimmed);
  }
  if (path) params.set("path", path);
  if (ratio !== "wide") params.set("ratio", ratio);
  params.set("v", OG_ASSET_VERSION);
  return `${OG_BASE_URL}${OG_PROXY_PATH}?${params.toString()}`;
}

/** Full og/twitter image meta block for a candidate image. */
export function ogImageMeta(
  src: string | null | undefined,
  alt: string,
  options: OgImageOptions = {},
): Record<string, string>[] {
  const url = ogImageUrl(src, options);
  const twitter = ogImageUrl(src, { ...options, ratio: "twitter" });
  return [
    { property: "og:image", content: url },
    { property: "og:image:secure_url", content: url },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: String(OG_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_IMAGE_HEIGHT) },
    { property: "og:image:alt", content: alt },
    { name: "twitter:image", content: twitter },
    { name: "twitter:image:alt", content: alt },
  ];
}
