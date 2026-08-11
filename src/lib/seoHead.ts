/**
 * Single source of truth for per-route head metadata (title, description,
 * canonical, OpenGraph and Twitter tags). Only artistrysynk.app is ever
 * referenced as the canonical host.
 */
import { OG_FALLBACK_URL, ogImageMeta } from "./ogImage";

export const SITE_URL = "https://artistrysynk.app";
export const SITE_NAME = "ArtistrySynk";
export const DEFAULT_OG_IMAGE = OG_FALLBACK_URL;

type Meta = Record<string, string>;

export interface PageHeadInput {
  /** Route path, e.g. "/pricing" (leading slash, no host). */
  path: string;
  title: string;
  description: string;
  ogType?: "website" | "article" | "profile";
  /** Absolute https image URL. Falls back to the site share image. */
  image?: string;
  keywords?: string;
  noIndex?: boolean;
  /** Extra JSON-LD documents for this page. */
  jsonLd?: unknown[];
}

export interface PageHeadOutput {
  meta: Meta[];
  links: { rel: string; href: string }[];
  scripts?: { type: string; children: string }[];
}

export const absoluteUrl = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** BreadcrumbList JSON-LD from [{ name, path }] crumbs. */
export const breadcrumbJsonLd = (crumbs: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: absoluteUrl(c.path),
  })),
});

export function buildPageHead({
  path,
  title,
  description,
  ogType = "website",
  image,
  keywords,
  noIndex = false,
  jsonLd,
}: PageHeadInput): PageHeadOutput {
  const url = absoluteUrl(path);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  const meta: Meta[] = [
    { title: fullTitle },
    { name: "description", content: description },
    ...(keywords ? [{ name: "keywords", content: keywords }] : []),
    {
      name: "robots",
      content: noIndex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:url", content: url },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    ...ogImageMeta(image, fullTitle, { path }),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: "@artistrysynk" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
  ];

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    ...(jsonLd?.length
      ? {
          scripts: jsonLd.map((doc) => ({
            type: "application/ld+json",
            children: JSON.stringify(doc),
          })),
        }
      : {}),
  };
}