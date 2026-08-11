import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { sitemapIndexXml, SITEMAP_CHILDREN, xmlResponse } = await import(
          "@/lib/sitemap.server"
        );
        return xmlResponse(sitemapIndexXml(SITEMAP_CHILDREN));
      },
    },
  },
});
