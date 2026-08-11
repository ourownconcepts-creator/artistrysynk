import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap-users.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { userEntries, urlsetXml, xmlResponse } = await import("@/lib/sitemap.server");
        return xmlResponse(urlsetXml(await userEntries()));
      },
    },
  },
});
