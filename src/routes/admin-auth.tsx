import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminAuth from "@/pages/AdminAuth";

export const Route = createFileRoute("/admin-auth")({
  component: () => (
    <PageTransition>
      <AdminAuth />
    </PageTransition>
  ),
});