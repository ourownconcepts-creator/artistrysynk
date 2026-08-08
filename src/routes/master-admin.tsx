import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import MasterAdminDashboard from "@/pages/MasterAdminDashboard";

export const Route = createFileRoute("/master-admin")({
  component: () => (
    <AdminProtectedRoute allowedRoles={['master_admin', 'super_admin']}>
      <PageTransition>
        <MasterAdminDashboard />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});