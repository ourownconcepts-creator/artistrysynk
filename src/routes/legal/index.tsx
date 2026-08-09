import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import { Surface } from "@/components/native-ui";
import { listLegalDocuments } from "@/lib/legal.functions";
import type { LegalDocumentSummary } from "@/lib/legal.functions";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/legal/")({
  loader: () => listLegalDocuments(),
  head: () => ({
    meta: [
      { title: "Policies & Legal Centre | ArtistrySynk" },
      {
        name: "description",
        content:
          "ArtistrySynk policies: terms of service, privacy, community guidelines, copyright, moderation, account deletion, cookies and your data protection rights.",
      },
      { property: "og:title", content: "Policies & Legal Centre | ArtistrySynk" },
      {
        property: "og:description",
        content: "Every ArtistrySynk policy, with version numbers and effective dates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <main className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">We couldn't load the policies. Please refresh.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Not found.</p>
    </main>
  ),
  component: LegalIndex,
});

function LegalIndex() {
  const docs = Route.useLoaderData() as LegalDocumentSummary[];

  return (
    <PageTransition>
      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
        <header className="mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">Privacy &amp; Data Protection</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Policies &amp; Legal Centre</h1>
          <p className="text-muted-foreground">
            Everything that governs how ArtistrySynk works, in plain language. Every policy is
            versioned and dated, and previous versions stay available.
          </p>
        </header>

        <ul className="space-y-3">
          {docs.map((doc) => (
            <li key={doc.slug}>
              <Link to={`/legal/${doc.slug}`} className="block group">
                <Surface className="p-4 transition-colors group-hover:border-primary/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold group-hover:text-primary transition-colors">
                        {doc.title}
                      </h2>
                      {doc.summary && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.summary}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {doc.version ? `v${doc.version}` : "Draft"}
                    </span>
                  </div>
                </Surface>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </PageTransition>
  );
}
