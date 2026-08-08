import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import About from "@/pages/About";

export const Route = createFileRoute("/about")({
  component: () => (
    <PageTransition>
      <About />
    </PageTransition>
  ),
});