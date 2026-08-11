import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap-landing.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { landingEntries, urlsetXml, xmlResponse } = await import("@/lib/sitemap.server");
        return xmlResponse(urlsetXml(landingEntries()));
      },
    },
  },
});
