import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Marketplace from "@/pages/Marketplace";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/marketplace")({
  head: () =>
    buildPageHead({
      path: "/marketplace",
      title: "Creative services marketplace | ArtistrySynk",
      description: "Browse and order creative services from verified professionals.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Marketplace />
      </PageTransition>
    </ProtectedRoute>
  ),
});