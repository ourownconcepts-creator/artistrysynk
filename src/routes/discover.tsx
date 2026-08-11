import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Discover from "@/pages/Discover";
import { buildPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/discover")({
  head: () =>
    buildPageHead({
      path: "/discover",
      title: "Discover creatives | ArtistrySynk",
      description: "Swipe through creative profiles matched to your roles, skills and location.",
      noIndex: true,
    }),
  component: () => (
    <ProtectedRoute>
      <Discover />
    </ProtectedRoute>
  ),
});
