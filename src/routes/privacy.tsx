import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getLegalDocument } from "@/lib/legal.functions";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

/** Canonical, indexable URL for the Privacy Policy. Content is served from the versioned legal document store. */
export const Route = createFileRoute("/privacy")({
  loader: async () => {
    const doc = await getLegalDocument({ data: { slug: "privacy" } });
    if (!doc) throw notFound();
    return doc;
  },
  head: ({ loaderData }) =>
    buildPageHead({
      path: "/privacy",
      title: "Privacy Policy | ArtistrySynk",
      description: loaderData?.summary ?? "The ArtistrySynk Privacy Policy — what data we collect, how we use it and your rights.",
      ogType: "article",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
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
