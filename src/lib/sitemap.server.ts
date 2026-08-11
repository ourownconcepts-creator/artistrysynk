/**
 * Live sitemap builder. Runs on the server for every /sitemap*.xml request so
 * new blog posts, city pages and studios appear immediately in production —
 * no rebuild required. Public data only, read through the Data API with the
 * publishable key so public RLS policies decide what is exposed.
 */
import { CITY_LANDINGS, DISCIPLINE_LANDINGS } from "@/lib/seoLandings";

export const SITEMAP_BASE_URL = "https://artistrysynk.app";

export type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: Freq;
  priority?: string;
}

export const SITEMAP_CHILDREN = [
  "sitemap-static.xml",
  "sitemap-blog.xml",
  "sitemap-landing.xml",
  "sitemap-users.xml",
  "sitemap-studios.xml",
] as const;

export const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/studios", changefreq: "daily", priority: "0.8" },
  { path: "/features", changefreq: "weekly", priority: "0.8" },
  { path: "/how-it-works", changefreq: "weekly", priority: "0.8" },
  { path: "/pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/success-stories", changefreq: "weekly", priority: "0.7" },
  { path: "/careers", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/licenses", changefreq: "yearly", priority: "0.3" },
  { path: "/data-deletion", changefreq: "yearly", priority: "0.3" },
];

/** Blog posts are file routes — glob them so a new post file is listed automatically. */
const blogModules = import.meta.glob("/src/routes/blog/*.tsx");

export function blogEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = [{ path: "/blog", changefreq: "weekly", priority: "0.7" }];
  for (const file of Object.keys(blogModules)) {
    const slug = file.split("/").pop()!.replace(/\.tsx$/, "");
    if (slug === "index" || slug.startsWith("$") || slug.startsWith("_")) continue;
    entries.push({ path: `/blog/${slug}`, changefreq: "monthly", priority: "0.7" });
  }
  return entries;
}

export function landingEntries(): SitemapEntry[] {
  return [
    ...DISCIPLINE_LANDINGS.map((d) => ({
      path: `/${d.slug}`,
      changefreq: "weekly" as Freq,
      priority: "0.8",
    })),
    { path: "/locations", changefreq: "weekly" as Freq, priority: "0.7" },
    ...CITY_LANDINGS.map((c) => ({
      path: `/locations/${c.slug}`,
      changefreq: "weekly" as Freq,
      priority: "0.7",
    })),
  ];
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const url = process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return [];
  try {
    const headers = new Headers({ apikey: key, "Content-Type": "application/json" });
    if (!key.startsWith("sb_")) headers.set("Authorization", `Bearer ${key}`);
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      console.warn(`sitemap: skipped ${fn} (${res.status})`);
      return [];
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.warn(`sitemap: skipped ${fn} (${(err as Error).message})`);
    return [];
  }
}

const day = (value?: string | null) => (value ? value.slice(0, 10) : undefined);

export async function userEntries(): Promise<SitemapEntry[]> {
  const profiles = await rpc<{ id: string; username: string | null }>("list_public_profiles", {
    _role: null,
    _city: null,
    _limit: 500,
    _offset: 0,
  });
  return profiles.map((p) => ({
    path: `/profile/${p.username ?? p.id}`,
    changefreq: "weekly" as Freq,
    priority: "0.6",
  }));
}

export async function studioEntries(): Promise<SitemapEntry[]> {
  const studios = await rpc<{ handle: string; created_at: string | null }>("list_public_studios", {
    _city: null,
    _org_type: null,
    _search: null,
    _limit: 500,
    _offset: 0,
  });
  return studios
    .filter((s) => !!s.handle)
    .map((s) => ({
      path: `/studios/${s.handle}`,
      lastmod: day(s.created_at),
      changefreq: "weekly" as Freq,
      priority: "0.7",
    }));
}

export function urlsetXml(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${SITEMAP_BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

export function sitemapIndexXml(files: readonly string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map((f) => `  <sitemap>\n    <loc>${SITEMAP_BASE_URL}/${f}</loc>\n  </sitemap>`),
    "</sitemapindex>",
  ].join("\n");
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}