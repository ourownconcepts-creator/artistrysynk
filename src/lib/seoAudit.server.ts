/**
 * Server-only helper: fetches public pages and audits their OpenGraph /
 * Twitter share tags. No secrets, no user data — plain HTML head parsing.
 */
export const SHARE_AUDIT_PATHS = [
  "/",
  "/features",
  "/how-it-works",
  "/pricing",
  "/about",
  "/studios",
  "/blog",
  "/locations",
  "/contact",
] as const;

export interface ShareAuditIssue {
  level: "error" | "warning";
  message: string;
}

export interface ShareAuditResult {
  /** True when the page is served the automatic branded fallback banner. */
  ogImageFallback: boolean;
  path: string;
  status: number | null;
  title: string | null;
  description: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogImageWidth: number | null;
  ogImageHeight: number | null;
  ogImageStatus: number | null;
  ogImageContentType: string | null;
  twitterCard: string | null;
  twitterImage: string | null;
  canonical: string | null;
  issues: ShareAuditIssue[];
}

const META_RE = /<meta\b[^>]*>/gi;

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const m = re.exec(tag);
  if (!m) return null;
  return (m[2] ?? m[3] ?? "").trim();
}

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseHead(html: string) {
  const metas = new Map<string, string>();
  for (const tag of html.match(META_RE) ?? []) {
    const key = (attr(tag, "property") ?? attr(tag, "name"))?.toLowerCase();
    const content = attr(tag, "content");
    if (!key || content === null) continue;
    if (!metas.has(key)) metas.set(key, decode(content));
  }
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const canonicalMatch = /<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i.exec(html);
  return {
    metas,
    title: titleMatch ? decode(titleMatch[1]!.trim()) : null,
    canonical: canonicalMatch ? attr(canonicalMatch[0], "href") : null,
  };
}

function toInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

async function probeImage(url: string) {
  try {
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    return { status: res.status, contentType: res.headers.get("content-type"), finalUrl: res.url };
  } catch {
    return { status: null as number | null, contentType: null as string | null, finalUrl: null as string | null };
  }
}

export async function auditSharePreview(baseUrl: string, path: string): Promise<ShareAuditResult> {
  const result: ShareAuditResult = {
    path,
    ogImageFallback: false,
    status: null,
    title: null,
    description: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogImageWidth: null,
    ogImageHeight: null,
    ogImageStatus: null,
    ogImageContentType: null,
    twitterCard: null,
    twitterImage: null,
    canonical: null,
    issues: [],
  };

  let html = "";
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { "User-Agent": "ArtistrySynkShareAudit/1.0 (+https://artistrysynk.app)" },
    });
    result.status = res.status;
    html = await res.text();
  } catch (err) {
    result.issues.push({ level: "error", message: `Page could not be fetched: ${(err as Error).message}` });
    return result;
  }

  if (result.status && result.status >= 400) {
    result.issues.push({ level: "error", message: `Page returned HTTP ${result.status}` });
    return result;
  }

  const { metas, title, canonical } = parseHead(html);
  result.title = title;
  result.canonical = canonical;
  result.description = metas.get("description") ?? null;
  result.ogTitle = metas.get("og:title") ?? null;
  result.ogDescription = metas.get("og:description") ?? null;
  result.ogImage = metas.get("og:image") ?? metas.get("og:image:url") ?? null;
  result.ogImageWidth = toInt(metas.get("og:image:width"));
  result.ogImageHeight = toInt(metas.get("og:image:height"));
  result.twitterCard = metas.get("twitter:card") ?? null;
  result.twitterImage = metas.get("twitter:image") ?? null;

  if (!result.title) result.issues.push({ level: "error", message: "Missing <title>" });
  else if (result.title.length > 60)
    result.issues.push({ level: "warning", message: `Title is ${result.title.length} chars (aim for under 60)` });

  if (!result.description) result.issues.push({ level: "error", message: "Missing meta description" });
  else if (result.description.length > 160)
    result.issues.push({
      level: "warning",
      message: `Description is ${result.description.length} chars (aim for under 160)`,
    });

  if (!result.ogTitle) result.issues.push({ level: "warning", message: "Missing og:title" });
  if (!result.ogDescription) result.issues.push({ level: "warning", message: "Missing og:description" });
  if (!result.twitterCard) result.issues.push({ level: "warning", message: "Missing twitter:card" });
  else if (result.twitterCard !== "summary_large_image")
    result.issues.push({
      level: "warning",
      message: `twitter:card is "${result.twitterCard}" (summary_large_image renders best)`,
    });

  const { isProxiedOgImage, OG_FALLBACK_PATH } = await import("./ogImage");

  if (!result.ogImage) {
    result.issues.push({ level: "error", message: "Missing og:image" });
  } else {
    if (!/^https:\/\//i.test(result.ogImage))
      result.issues.push({ level: "error", message: "og:image must be an absolute https URL" });
    result.ogImageFallback = isProxiedOgImage(result.ogImage);
    const probe = await probeImage(result.ogImage);
    result.ogImageStatus = probe.status;
    if (result.ogImageFallback && probe.finalUrl?.includes(OG_FALLBACK_PATH))
      result.issues.push({
        level: "warning",
        message: "Original image was missing or too small — the branded 1200x630 fallback is served automatically",
      });
    result.ogImageContentType = probe.contentType;
    if (probe.status === null || probe.status >= 400)
      result.issues.push({
        level: "error",
        message: `og:image is not reachable${probe.status ? ` (HTTP ${probe.status})` : ""}`,
      });
    else if (probe.contentType && !probe.contentType.startsWith("image/"))
      result.issues.push({ level: "error", message: `og:image serves ${probe.contentType}, not an image` });

    const w = result.ogImageWidth;
    const h = result.ogImageHeight;
    if (w === null || h === null) {
      result.issues.push({
        level: "warning",
        message: "Missing og:image:width / og:image:height (some platforms crop unpredictably)",
      });
    } else {
      if (w < 1200 || h < 630)
        result.issues.push({
          level: "error",
          message: `og:image is ${w}x${h}; use at least 1200x630`,
        });
      const ratio = w / h;
      if (ratio < 1.7 || ratio > 1.95)
        result.issues.push({
          level: "warning",
          message: `og:image aspect ratio is ${ratio.toFixed(2)}:1; 1.91:1 (e.g. 1200x630) avoids cropping`,
        });
    }

    if (!result.twitterImage)
      result.issues.push({ level: "warning", message: "Missing twitter:image" });
  }

  if (!result.canonical) result.issues.push({ level: "warning", message: "Missing canonical link" });

  return result;
}