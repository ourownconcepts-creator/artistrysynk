import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new release, old page files are removed. Reload once to pick up the new version.
const CHUNK_RELOAD_KEY = "as-chunk-reload-at";
function isChunkError(msg: string) {
  // The last pattern is what startup throws when an open page is from an older release than the server.
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|reading 'component'/i.test(msg);
}
function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.location.reload();
}
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    reloadOnce();
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = String((e.reason as Error)?.message ?? e.reason ?? "");
    if (isChunkError(msg)) {
      e.preventDefault();
      reloadOnce();
    }
  });
  window.addEventListener("error", (e) => {
    if (isChunkError(String(e.message ?? ""))) reloadOnce();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultOnCatch: (err) => {
      if (typeof window !== "undefined" && isChunkError(String((err as Error)?.message ?? ""))) reloadOnce();
    },
  });

  return router;
};
