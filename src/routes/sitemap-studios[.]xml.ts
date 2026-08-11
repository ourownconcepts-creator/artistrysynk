import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap-studios.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { studioEntries, urlsetXml, xmlResponse } = await import("@/lib/sitemap.server");
        return xmlResponse(urlsetXml(await studioEntries()));
      },
    },
  },
});
