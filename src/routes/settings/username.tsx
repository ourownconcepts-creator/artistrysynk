import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { UsernamePicker } from "@/components/settings/UsernamePicker";
import { UsernameHistoryCard } from "@/components/settings/UsernameHistoryCard";

export const Route = createFileRoute("/settings/username")({
  head: () => ({
    meta: [
      { title: "Choose your username | ArtistrySynk" },
      {
        name: "description",
        content:
          "Pick or edit your ArtistrySynk username with live availability checks and a preview of your public profile link.",
      },
      { property: "og:title", content: "Choose your username | ArtistrySynk" },
      {
        property: "og:description",
        content: "Set the handle collaborators use to find you on ArtistrySynk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
          <h1 className="mb-4 text-2xl font-bold">Username</h1>
          <UsernamePicker />
          <UsernameHistoryCard />
        </div>
      </PageTransition>
    </ProtectedRoute>
  ),
});