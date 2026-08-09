import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getLegalDocument } from "@/lib/legal.functions";

/** Canonical, indexable URL for the Terms of Service. Content is served from the versioned legal document store. */
export const Route = createFileRoute("/terms")({
  loader: async () => {
    const doc = await getLegalDocument({ data: { slug: "terms" } });
    if (!doc) throw notFound();
    return doc;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Terms of Service | ArtistrySynk" },
      {
        name: "description",
        content:
          loaderData?.summary ??
          "The ArtistrySynk Terms of Service — what it covers and when it took effect.",
      },
      { property: "og:title", content: "Terms of Service | ArtistrySynk" },
      {
        property: "og:description",
        content: loaderData?.summary ?? "The ArtistrySynk Terms of Service.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <main className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">We couldn't load this policy. Please refresh.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">This policy hasn't been published yet.</p>
    </main>
  ),
  component: () => (
    <PageTransition>
      <LegalDocumentView doc={Route.useLoaderData()} />
    </PageTransition>
  ),
});
