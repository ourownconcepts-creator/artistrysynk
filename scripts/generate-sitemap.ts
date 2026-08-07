/**
 * Generates split XML sitemaps into public/ before dev and build.
 * Public content is read through the Data API (anon key) so only rows that
 * public RLS policies expose can ever reach the sitemap.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

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

const blogEntries: Entry[] = [
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/blog/how-to-find-a-music-producer", changefreq: "monthly", priority: "0.7" },
];

async function query<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
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
  const profiles = await query<{ id: string; username: string | null; updated_at: string | null }>(
    "profiles?select=id,username,updated_at&is_hidden=is.false&order=updated_at.desc&limit=45000",
  );
  const projects = await query<{ id: string; updated_at: string | null }>(
    "projects?select=id,updated_at&is_public=is.true&is_hidden=is.false&order=updated_at.desc&limit=45000",
  );
  const jobs = await query<{ id: string; updated_at: string | null }>(
    "job_postings?select=id,updated_at&order=created_at.desc&limit=45000",
  );

  const userEntries: Entry[] = profiles.map((p) => ({
    path: `/profile/${p.username ?? p.id}`,
    lastmod: day(p.updated_at),
    changefreq: "weekly",
    priority: "0.6",
  }));
  const projectEntries: Entry[] = projects.map((p) => ({
    path: `/projects/${p.id}`,
    lastmod: day(p.updated_at),
    changefreq: "weekly",
    priority: "0.6",
  }));
  const jobEntries: Entry[] = jobs.map((j) => ({
    path: `/jobs/${j.id}`,
    lastmod: day(j.updated_at),
    changefreq: "daily",
    priority: "0.6",
  }));
  const eventEntries: Entry[] = [];

  const files: string[] = [];
  const emit = (file: string, entries: Entry[], always = false) => {
    if (!always && entries.length === 0) return;
    write(file, urlset(entries), entries.length);
    files.push(file);
  };

  emit("sitemap-static.xml", staticEntries, true);
  emit("sitemap-blog.xml", blogEntries, true);
  emit("sitemap-users.xml", userEntries);
  emit("sitemap-projects.xml", projectEntries);
  emit("sitemap-jobs.xml", jobEntries);
  emit("sitemap-events.xml", eventEntries);

  write("sitemap.xml", sitemapIndex(files), files.length);
}

main();
