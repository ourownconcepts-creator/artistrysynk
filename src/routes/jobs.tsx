import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Jobs from "@/pages/Jobs";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/jobs")({
  head: () =>
    buildPageHead({
      path: "/jobs",
      title: "Creative jobs board | ArtistrySynk",
      description: "Browse and post paid creative roles and gigs.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Jobs />
      </PageTransition>
    </ProtectedRoute>
  ),
});