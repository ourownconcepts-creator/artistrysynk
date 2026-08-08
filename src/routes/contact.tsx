import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Contact from "@/pages/Contact";

export const Route = createFileRoute("/contact")({
  component: () => (
    <PageTransition>
      <Contact />
    </PageTransition>
  ),
});