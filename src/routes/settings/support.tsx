import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { MySupportTicketsCard } from "@/components/support/MySupportTicketsCard";
import { Footer } from "@/components/Footer";

const TITLE = "My support requests | ArtistrySynk";
const DESCRIPTION =
  "Track your ArtistrySynk support requests, check their status and read replies from the support team.";

export const Route = createFileRoute("/settings/support")({
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
            <h1 className="text-3xl font-bold md:text-4xl">My support requests</h1>
            <p className="text-muted-foreground">
              Every message you have sent our team, with status updates and replies.
            </p>
          </header>
          <MySupportTicketsCard />
        </main>
      </PageTransition>
      <Footer />
    </ProtectedRoute>
  ),
});
