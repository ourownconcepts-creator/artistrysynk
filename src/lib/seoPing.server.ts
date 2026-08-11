/**
 * Notifies search engines that new/updated pages exist. Uses IndexNow
 * (Bing, Yandex, Seznam — instant) plus a sitemap ping, and records the
 * outcome in function_run_logs so admins can see the last submission.
 */
import { INDEXNOW_KEY } from "@/lib/indexnow";

const HOST = "artistrysynk.app";
const BASE = `https://${HOST}`;

export interface IndexingSubmission {
  submittedAt: string;
  urls: string[];
  results: { endpoint: string; status: number | null; ok: boolean; detail?: string }[];
}

function absolute(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

async function post(endpoint: string, body: unknown) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    return { endpoint, status: res.status, ok: res.ok };
  } catch (err) {
    return { endpoint, status: null, ok: false, detail: (err as Error).message };
  }
}

async function get(endpoint: string) {
  try {
    const res = await fetch(endpoint);
    return { endpoint, status: res.status, ok: res.ok };
  } catch (err) {
    return { endpoint, status: null, ok: false, detail: (err as Error).message };
  }
}

/**
 * @param paths absolute URLs or site-relative paths that were just published.
 */
export async function submitUrlsForIndexing(paths: string[]): Promise<IndexingSubmission> {
  const urls = Array.from(new Set(paths.map(absolute))).slice(0, 1000);
  const results: IndexingSubmission["results"] = [];

  if (urls.length > 0) {
    results.push(
      await post("https://api.indexnow.org/indexnow", {
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    );
  }

  // Sitemap ping so crawlers re-read the (now live) sitemap index.
  results.push(await get(`https://www.bing.com/ping?sitemap=${encodeURIComponent(`${BASE}/sitemap.xml`)}`));

  const submission: IndexingSubmission = {
    submittedAt: new Date().toISOString(),
    urls,
    results,
  };

  try {
    const { recordFunctionRun } = await import("@/lib/functionRunLog.server");
    await recordFunctionRun({
      functionName: "seo-indexing-submit",
      status: results.some((r) => r.ok) ? "success" : "error",
      durationMs: 0,
      context: {
        urlCount: urls.length,
        indexnow: results[0]?.status ?? null,
        sitemapPing: results[results.length - 1]?.status ?? null,
      },
    });
  } catch {
    // logging is best-effort only
  }

  return submission;
}