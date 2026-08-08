import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import SuccessStories from "@/pages/SuccessStories";

export const Route = createFileRoute("/success-stories")({
  component: () => (
    <PageTransition>
      <SuccessStories />
    </PageTransition>
  ),
});