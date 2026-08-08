import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

export const Route = createFileRoute("/super-admin")({
  component: () => (
    <AdminProtectedRoute allowedRoles={['super_admin']}>
      <PageTransition>
        <SuperAdminDashboard />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});