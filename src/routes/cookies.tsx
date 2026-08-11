import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getLegalDocument } from "@/lib/legal.functions";
import { buildPageHead, breadcrumbJsonLd } from "@/lib/seoHead";

/** Canonical, indexable URL for the Cookie Policy. Content is served from the versioned legal document store. */
export const Route = createFileRoute("/cookies")({
  loader: async () => {
    const doc = await getLegalDocument({ data: { slug: "cookies" } });
    if (!doc) throw notFound();
    return doc;
  },
  head: ({ loaderData }) =>
    buildPageHead({
      path: "/cookies",
      title: "Cookie Policy | ArtistrySynk",
      description: loaderData?.summary ?? "How ArtistrySynk uses cookies and similar technologies, and how to manage your preferences.",
      ogType: "article",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Cookie Policy", path: "/cookies" },
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
