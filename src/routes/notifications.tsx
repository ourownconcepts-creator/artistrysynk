import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Notifications from "@/pages/Notifications";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/notifications")({
  head: () =>
    buildPageHead({
      path: "/notifications",
      title: "Notifications | ArtistrySynk",
      description: "Your ArtistrySynk notifications.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Notifications />
      </PageTransition>
    </ProtectedRoute>
  ),
});