import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import HowItWorksPage from "@/pages/HowItWorksPage";

export const Route = createFileRoute("/how-it-works")({
  component: () => (
    <PageTransition>
      <HowItWorksPage />
    </PageTransition>
  ),
});