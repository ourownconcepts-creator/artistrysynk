/**
 * Post-build prerender for indexable public routes.
 *
 * For every public route it writes dist/<route>/index.html — a copy of the SPA
 * shell with route-specific <title>, description, canonical, Open Graph/Twitter
 * tags, JSON-LD, and a crawlable <noscript> content block. Crawlers and social
 * bots therefore receive correct per-page metadata and real content without
 * executing JavaScript; the SPA hydrates over it for humans.
 *
 * Full streaming SSR is not available on this stack — see README/NATIVE notes.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import {
  CITY_LANDINGS,
  DISCIPLINE_LANDINGS,
  cityDescription,
  cityTitle,
} from "../src/lib/seoLandings";

const BASE_URL = "https://artistrysynk.app";
const DIST = resolve("dist");
const SUPABASE_URL = "https://lihctrhzsyjqnlzwwkzo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpaGN0cmh6c3lqcW5send3a3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTI3NjEsImV4cCI6MjA4MzMyODc2MX0.bT6sfivhZx_U-d1R7QThHEFwUXPtEU557DCWCufX81I";

/** Hard cap so publish output can never approach the 50k file limit. */
const MAX_PRERENDER_PAGES = Number(process.env.MAX_PRERENDER_PAGES ?? 1500);

interface Page {
  path: string;
  title: string;
  description: string;
  image?: string;
  ogType?: string;
  jsonLd?: unknown[];
  /** Crawlable HTML shown to non-JS clients. */
  content: string;
}

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      console.warn(`prerender: ${fn} skipped (${res.status})`);
      return [];
    }
    return (await res.json()) as T[];
  } catch (err) {
    console.warn(`prerender: ${fn} skipped (${(err as Error).message})`);
    return [];
  }
}

const staticPages: Page[] = [
  {
    path: "/",
    title: "ArtistrySynk – Create, Connect, Collaborate",
    description:
      "Connect with musicians, producers, dancers and actors worldwide. Match, collaborate, and bring your creative vision to life on ArtistrySynk.",
    content:
      "<h1>ArtistrySynk – Create, Connect, Collaborate</h1><p>Match with musicians, producers, designers, photographers, dancers, actors and developers worldwide, then collaborate on real projects.</p>",
  },
  {
    path: "/features",
    title: "Features — Matching, Portfolios, Projects & Marketplace",
    description:
      "Explore ArtistrySynk features: AI-assisted creative matching, portfolios, collaboration rooms, a services marketplace and job board.",
    content: "<h1>ArtistrySynk features</h1><p>Creative matching, portfolios, collaboration rooms, marketplace and jobs.</p>",
  },
  {
    path: "/how-it-works",
    title: "How ArtistrySynk Works — From Match to Collaboration",
    description:
      "See how ArtistrySynk works: build a profile, discover creatives, match, message and run collaborations end to end.",
    content: "<h1>How ArtistrySynk works</h1><p>Create a profile, discover creatives, match, message and collaborate.</p>",
  },
  {
    path: "/pricing",
    title: "Pricing — Free, Pro and Studio Plans",
    description: "Compare ArtistrySynk plans: Free, Pro and Studio. Upgrade for unlimited discovery, jobs and team tools.",
    content: "<h1>ArtistrySynk pricing</h1><p>Free, Pro and Studio plans for creatives and teams.</p>",
  },
  {
    path: "/about",
    title: "About ArtistrySynk — The Creative Collaboration Network",
    description: "ArtistrySynk connects creative professionals worldwide so great collaborations actually happen.",
    content: "<h1>About ArtistrySynk</h1><p>A global network built so creative collaborations actually happen.</p>",
  },
  {
    path: "/success-stories",
    title: "Success Stories — Collaborations Made on ArtistrySynk",
    description: "Real collaborations that started on ArtistrySynk — records, campaigns, films and products.",
    content: "<h1>Success stories</h1><p>Collaborations that started on ArtistrySynk.</p>",
  },
  {
    path: "/careers",
    title: "Careers at ArtistrySynk",
    description: "Open roles at ArtistrySynk. Help build the network where creative collaboration happens.",
    content: "<h1>Careers at ArtistrySynk</h1><p>Open roles across engineering, design and community.</p>",
  },
  {
    path: "/contact",
    title: "Contact & Support",
    description: "Contact the ArtistrySynk team for support, privacy requests, partnerships and press.",
    content: "<h1>Contact ArtistrySynk</h1><p>Support, privacy requests, partnerships and press.</p>",
  },
  {
    path: "/blog",
    title: "Blog — Guides for Creative Collaboration",
    description: "Guides and playbooks on finding collaborators, producing work and growing a creative career.",
    content: "<h1>ArtistrySynk blog</h1><p>Guides on finding collaborators and growing a creative career.</p>",
  },
  {
    path: "/blog/how-to-find-a-music-producer",
    title: "How to Find a Music Producer (Step-by-Step Guide)",
    description:
      "A practical guide to finding the right music producer for your record — where to look, what to ask and how to agree terms.",
    ogType: "article",
    content:
      "<h1>How to find a music producer</h1><p>Where to look, what to listen for, what to ask and how to agree terms before a session.</p>",
  },
  { path: "/privacy", title: "Privacy Policy", description: "How ArtistrySynk collects, uses and protects your data.", content: "<h1>Privacy Policy</h1>" },
  { path: "/terms", title: "Terms of Service", description: "The terms that govern your use of ArtistrySynk.", content: "<h1>Terms of Service</h1>" },
  { path: "/cookies", title: "Cookie Policy", description: "How ArtistrySynk uses cookies and similar technologies.", content: "<h1>Cookie Policy</h1>" },
  { path: "/licenses", title: "Open-Source Licenses & Attributions", description: "Third-party open-source licenses and attributions used in ArtistrySynk.", content: "<h1>Open-source licenses</h1>" },
  { path: "/data-deletion", title: "Data Deletion Requests", description: "How to request deletion of your ArtistrySynk account and personal data.", content: "<h1>Data deletion</h1>" },
];

function landingPages(): Page[] {
  const disciplines = DISCIPLINE_LANDINGS.map<Page>((d) => ({
    path: `/${d.slug}`,
    title: d.title,
    description: d.description,
    content: `<h1>${esc(d.heading)}</h1><p>${esc(d.intro)}</p>`,
  }));

  const cities = CITY_LANDINGS.map<Page>((c) => ({
    path: `/locations/${c.slug}`,
    title: cityTitle(c),
    description: cityDescription(c),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Place",
        name: c.city,
        address: { "@type": "PostalAddress", addressLocality: c.city, addressCountry: c.country },
      },
    ],
    content: `<h1>Creatives in ${esc(c.city)}</h1><p>Musicians, producers, designers, photographers, dancers, actors and developers based in ${esc(
      c.city,
    )}, ${esc(c.country)}.</p>`,
  }));

  const index: Page = {
    path: "/locations",
    title: "Creative Talent by City — Locations",
    description:
      "Browse creative professionals by city on ArtistrySynk. Find musicians, producers, designers, photographers and developers near you.",
    content: `<h1>Creative talent by city</h1><ul>${CITY_LANDINGS.map(
      (c) => `<li><a href="/locations/${c.slug}">Creatives in ${esc(c.city)}</a></li>`,
    ).join("")}</ul>`,
  };

  return [...disciplines, index, ...cities];
}

interface PublicProfileRow {
  id: string;
  full_name: string;
  username: string | null;
  bio: string | null;
  location: string | null;
  city: string | null;
  avatar_url: string | null;
  roles: string[] | null;
}

async function profilePages(budget: number): Promise<Page[]> {
  if (budget <= 0) return [];
  const rows = await rpc<PublicProfileRow>("list_public_profiles", {
    _role: null,
    _city: null,
    _limit: Math.min(budget, 200),
    _offset: 0,
  });

  return rows.map<Page>((p) => {
    const slug = p.username ?? p.id;
    const roles = (p.roles ?? []).join(", ");
    const description =
      p.bio?.slice(0, 155) ||
      `${p.full_name}${roles ? ` — ${roles}` : ""}${p.location ? ` based in ${p.location}` : ""}. See portfolio highlights and collaborate on ArtistrySynk.`;
    return {
      path: `/profile/${slug}`,
      title: `${p.full_name} (@${p.username ?? slug})`,
      description,
      image: p.avatar_url ?? undefined,
      ogType: "profile",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: p.full_name,
            alternateName: p.username ?? undefined,
            description: p.bio ?? undefined,
            image: p.avatar_url ?? undefined,
            jobTitle: roles || undefined,
            url: `${BASE_URL}/profile/${slug}`,
          },
        },
      ],
      content: `<h1>${esc(p.full_name)}</h1><p>@${esc(p.username ?? slug)}${roles ? ` — ${esc(roles)}` : ""}</p>${
        p.bio ? `<p>${esc(p.bio)}</p>` : ""
      }`,
    };
  });
}

function renderPage(shell: string, page: Page): string {
  const canonical = `${BASE_URL}${page.path === "/" ? "/" : page.path}`;
  const title = page.title.includes("ArtistrySynk") ? page.title : `${page.title} | ArtistrySynk`;
  const image = page.image ?? `${BASE_URL}/og-image.jpg`;

  let html = shell;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="title"[^>]*>/,
    `<meta name="title" content="${esc(title)}" />`,
  );
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${esc(page.description)}" />`,
  );
  html = html.replace(/<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  html = html.replace(/<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${page.ogType ?? "website"}" />`);
  html = html.replace(/<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = html.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${esc(page.description)}" />`,
  );
  html = html.replace(/<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${image}" />`);
  html = html.replace(/<meta\s+name="twitter:url"[^>]*>/, `<meta name="twitter:url" content="${canonical}" />`);
  html = html.replace(/<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  html = html.replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
  );
  html = html.replace(/<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${image}" />`);

  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    ...(page.jsonLd ?? []).map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`),
  ].join("\n    ");
  html = html.replace("</head>", `  ${head}\n  </head>`);

  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n    <noscript><main>${page.content}<p><a href="/">ArtistrySynk home</a></p></main></noscript>`,
  );

  return html;
}

async function main() {
  const shellPath = resolve(DIST, "index.html");
  if (!existsSync(shellPath)) {
    console.warn("prerender: dist/index.html not found — skipping");
    return;
  }
  const shell = readFileSync(shellPath, "utf8");

  const pages: Page[] = [...staticPages, ...landingPages()];
  pages.push(...(await profilePages(MAX_PRERENDER_PAGES - pages.length)));

  const capped = pages.slice(0, MAX_PRERENDER_PAGES);
  if (capped.length < pages.length) {
    console.warn(`prerender: capped at ${MAX_PRERENDER_PAGES} pages (${pages.length} candidates)`);
  }

  for (const page of capped) {
    const outPath =
      page.path === "/" ? resolve(DIST, "index.html") : resolve(DIST, `.${page.path}/index.html`);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, renderPage(shell, page));
  }

  console.log(`prerender: wrote ${capped.length} HTML pages`);
}

main();
