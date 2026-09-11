import { createFileRoute } from "@tanstack/react-router";
import { apiSuccess, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/health")({
  server: { handlers: { GET: async ({ request }) => apiSuccess(requestId(request), { status: "ok", version: "v1" }) } },
});