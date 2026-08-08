import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Messages from "@/pages/Messages";

export const Route = createFileRoute("/messages/$conversationId")({
  component: () => (
    <ProtectedRoute>
      <Messages />
    </ProtectedRoute>
  ),
});
