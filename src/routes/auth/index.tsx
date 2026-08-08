import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import Auth from "@/pages/Auth";

export const Route = createFileRoute("/auth/")({
  component: () => (
    <PageTransition>
      <Auth />
    </PageTransition>
  ),
});