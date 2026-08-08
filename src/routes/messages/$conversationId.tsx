import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/layout/PageTransition";
import Messages from "@/pages/Messages";

export const Route = createFileRoute("/messages/$conversationId")({
  component: () => (
    <ProtectedRoute>
      <Navbar />
      <PageTransition>
        <Messages />
      </PageTransition>
    </ProtectedRoute>
  ),
});