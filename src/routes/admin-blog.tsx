import { createFileRoute } from "@tanstack/react-router";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { PageTransition } from "@/components/layout/PageTransition";
import AdminBlog from "@/pages/AdminBlog";

export const Route = createFileRoute("/admin-blog")({
  head: () => ({
    meta: [
      { title: "Blog Editor | ArtistrySynk Admin" },
      {
        name: "description",
        content: "Write, edit and publish ArtistrySynk blog articles from the admin console.",
      },
      { property: "og:title", content: "Blog Editor | ArtistrySynk Admin" },
      { property: "og:description", content: "Admin console for writing and publishing blog articles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminProtectedRoute allowedRoles={["admin", "master_admin", "super_admin"]}>
      <PageTransition>
        <AdminBlog />
      </PageTransition>
    </AdminProtectedRoute>
  ),
});
