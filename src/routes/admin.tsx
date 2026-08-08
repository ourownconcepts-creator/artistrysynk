import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminDashboard from "@/pages/AdminDashboard";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AdminProtectedRoute allowedRoles={['admin', 'master_admin', 'super_admin']}>
      <PageTransition>
        <AdminDashboard />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});