import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import FeaturesPage from "@/pages/Features";

export const Route = createFileRoute("/features")({
  component: () => (
    <PageTransition>
      <FeaturesPage />
    </PageTransition>
  ),
});