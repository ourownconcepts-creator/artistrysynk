import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminSeoPreview from "@/pages/AdminSeoPreview";

export const Route = createFileRoute("/admin-seo-preview")({
  head: () => ({
    meta: [
      { title: "Search & social preview – ArtistrySynk admin" },
      {
        name: "description",
        content:
          "Connect with creatives worldwide — musicians, designers, photographers, filmmakers, dancers and writers. Match, collaborate and bring your vision to life.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminProtectedRoute allowedRoles={["super_admin", "admin"]}>
      <PageTransition>
        <AdminSeoPreview />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});