import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Cookies from "@/pages/Cookies";

export const Route = createFileRoute("/cookies")({
  component: () => (
    <PageTransition>
      <Cookies />
    </PageTransition>
  ),
});