import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Explore from "@/pages/Explore";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/explore/")({
  head: () =>
    buildPageHead({
      path: "/explore",
      title: "Explore creatives | ArtistrySynk",
      description: "Curated discovery sections across the ArtistrySynk network.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Explore />
      </PageTransition>
    </ProtectedRoute>
  ),
});