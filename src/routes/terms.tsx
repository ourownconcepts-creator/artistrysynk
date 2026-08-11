import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getLegalDocument } from "@/lib/legal.functions";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

/** Canonical, indexable URL for the Terms of Service. Content is served from the versioned legal document store. */
export const Route = createFileRoute("/terms")({
  loader: async () => {
    const doc = await getLegalDocument({ data: { slug: "terms" } });
    if (!doc) throw notFound();
    return doc;
  },
  head: ({ loaderData }) =>
    buildPageHead({
      path: "/terms",
      title: "Terms of Service | ArtistrySynk",
      description: loaderData?.summary ?? "The ArtistrySynk Terms of Service — the rules and guidelines for using our creative collaboration platform.",
      ogType: "article",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Terms of Service", path: "/terms" },
        ]),
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
