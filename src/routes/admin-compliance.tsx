import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminCompliance from "@/pages/AdminCompliance";

export const Route = createFileRoute("/admin-compliance")({
  component: () => (
    <AdminProtectedRoute allowedRoles={["admin", "master_admin", "super_admin"]}>
      <PageTransition>
        <AdminCompliance />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});
