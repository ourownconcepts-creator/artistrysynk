import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Blog from "@/pages/Blog";

export const Route = createFileRoute("/blog/")({
  component: () => (
    <PageTransition>
      <Blog />
    </PageTransition>
  ),
});