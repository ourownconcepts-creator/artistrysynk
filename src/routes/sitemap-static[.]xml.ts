import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap-static.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { staticEntries, urlsetXml, xmlResponse } = await import("@/lib/sitemap.server");
        return xmlResponse(urlsetXml(staticEntries));
      },
    },
  },
});
