import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Search } from "lucide-react";

export interface LiveMetadata {
  title: string;
  description: string;
  url: string;
  siteName: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

const GOOGLE_TITLE_LIMIT = 60;
const GOOGLE_DESC_LIMIT = 160;

function readMeta(selector: string): string {
  if (typeof document === "undefined") return "";
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  return el?.content?.trim() ?? "";
}

export function readLiveMetadata(): LiveMetadata {
  const title = typeof document === "undefined" ? "" : document.title.trim();
  const description = readMeta('meta[name="description"]');
  return {
    title,
    description,
    url: readMeta('meta[property="og:url"]') || (typeof window !== "undefined" ? window.location.origin + "/" : ""),
    siteName: readMeta('meta[property="og:site_name"]'),
    ogTitle: readMeta('meta[property="og:title"]') || title,
    ogDescription: readMeta('meta[property="og:description"]') || description,
    ogImage: readMeta('meta[property="og:image"]'),
    twitterCard: readMeta('meta[name="twitter:card"]') || "summary",
    twitterTitle: readMeta('meta[name="twitter:title"]') || title,
    twitterDescription: readMeta('meta[name="twitter:description"]') || description,
    twitterImage: readMeta('meta[name="twitter:image"]') || readMeta('meta[property="og:image"]'),
  };
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) return value;
  return value.slice(0, limit - 1).trimEnd() + "…";
}

function LengthBadge({ value, limit, label }: { value: string; limit: number; label: string }) {
  const over = value.length > limit;
  return (
    <Badge variant={over ? "destructive" : "secondary"} className="font-mono text-[11px]">
      {label} {value.length}/{limit}
      {over ? " · truncated" : ""}
    </Badge>
  );
}

function prettyUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    return { host: parsed.host, crumbs: path ? path.split("/").filter(Boolean) : [] };
  } catch {
    return { host: url, crumbs: [] as string[] };
  }
}

/**
 * Renders the page's actual head tags the way Google and social platforms show them.
 * Reads live metadata from the document after hydration, so it always mirrors what ships.
 */
export function MetadataPreview() {
  const [meta, setMeta] = useState<LiveMetadata | null>(null);

  useEffect(() => {
    // Wait a frame so route-level head tags are applied before reading.
    const id = window.requestAnimationFrame(() => setMeta(readLiveMetadata()));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!meta) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Reading live page metadata…
        </CardContent>
      </Card>
    );
  }

  const { host, crumbs } = prettyUrl(meta.url);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" /> Google search result
          </CardTitle>
          <CardDescription>How your title and description appear in search listings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold">
                {(meta.siteName || host).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{meta.siteName || host}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {host}
                  {crumbs.map((c) => ` › ${c}`).join("")}
                </p>
              </div>
            </div>
            <p className="mt-2 text-lg leading-snug text-[hsl(217_89%_46%)] dark:text-[hsl(217_89%_72%)]">
              {truncate(meta.title, GOOGLE_TITLE_LIMIT)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {truncate(meta.description, GOOGLE_DESC_LIMIT)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LengthBadge value={meta.title} limit={GOOGLE_TITLE_LIMIT} label="Title" />
            <LengthBadge value={meta.description} limit={GOOGLE_DESC_LIMIT} label="Description" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" /> Facebook / LinkedIn share
            </CardTitle>
            <CardDescription>Open Graph card preview.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              {meta.ogImage ? (
                <img
                  src={meta.ogImage}
                  alt="Open Graph share image preview"
                  className="aspect-[1200/630] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-[1200/630] w-full bg-muted" />
              )}
              <div className="space-y-1 bg-muted/40 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{host}</p>
                <p className="line-clamp-1 font-semibold text-foreground">{meta.ogTitle}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{meta.ogDescription}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">X (Twitter) card</CardTitle>
            <CardDescription>Card type: {meta.twitterCard}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-border">
              {meta.twitterImage ? (
                <img
                  src={meta.twitterImage}
                  alt="X card share image preview"
                  className="aspect-[1200/630] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-[1200/630] w-full bg-muted" />
              )}
              <div className="space-y-1 p-3">
                <p className="line-clamp-1 font-semibold text-foreground">{meta.twitterTitle}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{meta.twitterDescription}</p>
                <p className="text-[11px] text-muted-foreground">{host}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw values in the page head</CardTitle>
          <CardDescription>Exactly what crawlers read from this page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(
            [
              ["title", meta.title],
              ["description", meta.description],
              ["og:url", meta.url],
              ["og:title", meta.ogTitle],
              ["og:description", meta.ogDescription],
              ["og:image", meta.ogImage],
              ["twitter:card", meta.twitterCard],
              ["twitter:title", meta.twitterTitle],
              ["twitter:description", meta.twitterDescription],
              ["twitter:image", meta.twitterImage],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="grid gap-1 border-b border-border/60 pb-2 last:border-0 sm:grid-cols-[10rem_1fr]">
              <span className="font-mono text-xs text-muted-foreground">{key}</span>
              <span className="break-words text-foreground">{value || "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default MetadataPreview;