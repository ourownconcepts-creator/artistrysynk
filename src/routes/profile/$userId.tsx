import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import PublicProfile from "@/pages/PublicProfile";

export const Route = createFileRoute("/profile/$userId")({
  component: () => (
    <PageTransition>
      <PublicProfile />
    </PageTransition>
  ),
});