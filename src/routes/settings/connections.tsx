import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { Footer } from "@/components/Footer";
import { IntegrationConnectionsCard } from "@/components/settings/IntegrationConnectionsCard";

const TITLE = "Connected apps | ArtistrySynk";
const DESCRIPTION =
  "See which partner apps are linked to your ArtistrySynk identity, what they can read, pending approvals and past disconnections.";

export const Route = createFileRoute("/settings/connections")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <main className="container mx-auto max-w-3xl space-y-6 px-4 py-12">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold md:text-4xl">Connected apps</h1>
            <p className="text-muted-foreground">
              Manage the partner apps linked to your ArtistrySynk identity.
            </p>
          </header>
          <IntegrationConnectionsCard />
        </main>
      </PageTransition>
      <Footer />
    </ProtectedRoute>
  ),
});
