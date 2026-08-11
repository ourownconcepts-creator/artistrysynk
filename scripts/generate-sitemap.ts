/**
 * Generates split XML sitemaps into public/ before dev and build.
 * Public content is read through the Data API (anon key) so only rows that
 * public RLS policies expose can ever reach the sitemap.
 */
import { readdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { CITY_LANDINGS, DISCIPLINE_LANDINGS } from "../src/lib/seoLandings";

const BASE_URL = "https://artistrysynk.app";
const SUPABASE_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpaGN0cmh6c3lqcW5send3a3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTI3NjEsImV4cCI6MjA4MzMyODc2MX0.bT6sfivhZx_U-d1R7QThHEFwUXPtEU557DCWCufX81I";

type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: Freq;
  priority?: string;
}

const staticEntries: Entry[] = [
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

/** Blog posts are file routes — discover them so new posts land in the sitemap automatically. */
function discoverBlogEntries(): Entry[] {
  const entries: Entry[] = [{ path: "/blog", changefreq: "weekly", priority: "0.7" }];
  try {
    for (const file of readdirSync(resolve("src/routes/blog"))) {
      if (!file.endsWith(".tsx")) continue;
      const slug = file.replace(/\.tsx$/, "");
      if (slug === "index" || slug.startsWith("$") || slug.startsWith("_")) continue;
      entries.push({ path: `/blog/${slug}`, changefreq: "monthly", priority: "0.7" });
    }
  } catch (err) {
    console.warn(`sitemap: blog discovery skipped (${(err as Error).message})`);
  }
  return entries;
}

const blogEntries: Entry[] = discoverBlogEntries();

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const path = `rpc/${fn}`;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      console.warn(`sitemap: skipped ${path} (${res.status})`);
      return [];
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.warn(`sitemap: skipped ${path} (${(err as Error).message})`);
    return [];
  }
}

const day = (value?: string | null) => (value ? value.slice(0, 10) : undefined);

function urlset(entries: Entry[]) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
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

function sitemapIndex(files: string[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map((f) => `  <sitemap>\n    <loc>${BASE_URL}/${f}</loc>\n  </sitemap>`),
    "</sitemapindex>",
  ].join("\n");
}

function write(file: string, xml: string, count: number) {
  writeFileSync(resolve("public", file), xml);
  console.log(`${file} written (${count} entries)`);
}

async function main() {
  const profiles = await rpc<{ id: string; username: string | null }>("list_public_profiles", {
    _role: null,
    _city: null,
    _limit: 200,
    _offset: 0,
  });

  const userEntries: Entry[] = profiles.map((p) => ({
    path: `/profile/${p.username ?? p.id}`,
    changefreq: "weekly",
    priority: "0.6",
  }));

  const studios = await rpc<{ handle: string; created_at: string | null }>("list_public_studios", {
    _city: null,
    _org_type: null,
    _search: null,
    _limit: 200,
    _offset: 0,
  });
  const studioEntries: Entry[] = studios
    .filter((s) => !!s.handle)
    .map((s) => ({
      path: `/studios/${s.handle}`,
      lastmod: day(s.created_at),
      changefreq: "weekly" as Freq,
      priority: "0.7",
    }));
  // Projects, jobs and events have no public (non-authenticated) detail routes yet,
  // so they are intentionally omitted rather than listed as crawl dead-ends.
  const projectEntries: Entry[] = [];
  const jobEntries: Entry[] = [];
  const eventEntries: Entry[] = [];

  const landingEntries: Entry[] = [
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

  const files: string[] = [];
  const emit = (file: string, entries: Entry[], always = false) => {
    if (!always && entries.length === 0) return;
    write(file, urlset(entries), entries.length);
    files.push(file);
  };

  emit("sitemap-static.xml", staticEntries, true);
  emit("sitemap-blog.xml", blogEntries, true);
  emit("sitemap-landing.xml", landingEntries, true);
  emit("sitemap-users.xml", userEntries);
  emit("sitemap-studios.xml", studioEntries);
  emit("sitemap-projects.xml", projectEntries);
  emit("sitemap-jobs.xml", jobEntries);
  emit("sitemap-events.xml", eventEntries);

  write("sitemap.xml", sitemapIndex(files), files.length);
}

main();
