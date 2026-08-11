/**
 * Automatic og:image fallback.
 *
 * Every share image is emitted through `/api/public/og-image?src=…`, a server
 * route that validates the upstream asset (reachable, real image, at least
 * 1200x630) and transparently redirects to the branded fallback banner when it
 * is missing, broken or too small. That way a page always advertises a valid,
 * correctly sized share image instead of only being flagged by the validator.
 */
export const OG_BASE_URL = "https://artistrysynk.app";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_FALLBACK_PATH = "/og-fallback.jpg";
export const OG_FALLBACK_URL = `${OG_BASE_URL}${OG_FALLBACK_PATH}`;
export const OG_PROXY_PATH = "/api/public/og-image";

/** Minimum accepted upstream size — matches the validator's rules. */
export const OG_MIN_WIDTH = 1200;
export const OG_MIN_HEIGHT = 630;

export const isProxiedOgImage = (url: string | null | undefined) =>
  Boolean(url && (url.includes(OG_PROXY_PATH) || url.includes(OG_FALLBACK_PATH)));

/**
 * Resolve any candidate image (user cover, studio logo, …) into a share URL
 * that is guaranteed to render. Absolute https sources are wrapped in the
 * validating proxy; anything else falls straight back to the branded banner.
 */
export function ogImageUrl(src?: string | null): string {
  if (!src) return OG_FALLBACK_URL;
  const trimmed = src.trim();
  if (trimmed === OG_FALLBACK_URL || trimmed === OG_FALLBACK_PATH) return OG_FALLBACK_URL;
  if (trimmed.startsWith(OG_PROXY_PATH)) return `${OG_BASE_URL}${trimmed}`;
  if (trimmed.includes(OG_PROXY_PATH)) return trimmed;
  if (!/^https:\/\//i.test(trimmed)) return OG_FALLBACK_URL;
  return `${OG_BASE_URL}${OG_PROXY_PATH}?src=${encodeURIComponent(trimmed)}`;
}

/** Full og/twitter image meta block for a candidate image. */
export function ogImageMeta(src: string | null | undefined, alt: string): Record<string, string>[] {
  const url = ogImageUrl(src);
  return [
    { property: "og:image", content: url },
    { property: "og:image:secure_url", content: url },
    { property: "og:image:width", content: String(OG_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(OG_IMAGE_HEIGHT) },
    { property: "og:image:alt", content: alt },
    { name: "twitter:image", content: url },
    { name: "twitter:image:alt", content: alt },
  ];
}
