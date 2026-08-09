import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminRetention from "@/pages/AdminRetention";

export const Route = createFileRoute("/admin-retention")({
  component: () => (
    <AdminProtectedRoute allowedRoles={["admin", "master_admin", "super_admin"]}>
      <PageTransition>
        <AdminRetention />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});
