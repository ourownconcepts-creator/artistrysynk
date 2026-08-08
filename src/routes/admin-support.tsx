import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminSupport from "@/pages/AdminSupport";

export const Route = createFileRoute("/admin-support")({
  component: () => (
    <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
      <PageTransition>
        <AdminSupport />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});