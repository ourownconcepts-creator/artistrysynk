import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { INDEXNOW_KEY } from "@/lib/indexnow";

/** Ownership verification file for IndexNow (Bing, Yandex, Seznam). */
export const Route = createFileRoute("/e7f290e9fedb2d290482f1ccc7201237.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(INDEXNOW_KEY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
