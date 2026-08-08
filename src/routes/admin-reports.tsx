import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminReports from "@/pages/AdminReports";

export const Route = createFileRoute("/admin-reports")({
  component: () => (
    <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
      <PageTransition>
        <AdminReports />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});