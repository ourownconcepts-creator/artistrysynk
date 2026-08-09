import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { PageTransition } from "@/components/layout/PageTransition";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getLegalDocument } from "@/lib/legal.functions";

const searchSchema = z.object({ v: z.coerce.number().int().positive().optional() });

export const Route = createFileRoute("/legal/$slug")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ v: search.v }),
  loader: async ({ params, deps }) => {
    const doc = await getLegalDocument({
      data: { slug: params.slug, ...(deps.v ? { version: deps.v } : {}) },
    });
    if (!doc) throw notFound();
    return doc;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} | ArtistrySynk` },
          {
            name: "description",
            content:
              loaderData.summary ??
              `${loaderData.title} for ArtistrySynk — version ${loaderData.version}.`,
          },
          { property: "og:title", content: `${loaderData.title} | ArtistrySynk` },
          {
            property: "og:description",
            content: loaderData.summary ?? `ArtistrySynk ${loaderData.title}.`,
          },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Policy | ArtistrySynk" }],
  }),
  errorComponent: () => (
    <main className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">We couldn't load this policy. Please refresh.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container mx-auto px-4 py-16 text-center space-y-2">
      <h1 className="text-2xl font-bold">Policy not found</h1>
      <p className="text-muted-foreground">
        This policy doesn't exist, or that version was never published.
      </p>
    </main>
  ),
  component: () => (
    <PageTransition>
      <LegalDocumentView doc={Route.useLoaderData()} />
    </PageTransition>
  ),
});
