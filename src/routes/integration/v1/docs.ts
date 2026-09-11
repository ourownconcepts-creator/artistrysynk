import { createFileRoute } from "@tanstack/react-router";
import { apiSuccess, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/docs")({
  server: { handlers: { GET: async ({ request }) => apiSuccess(requestId(request), {
    title: "ArtistrySynk Integration API v1",
    contract: "INTEGRATION.md",
    authorization: {
      delegated: "OAuth 2.0 authorization code through managed ArtistrySynk authorization",
      confidential: "HTTP Basic with the assigned client ID and one-time-issued client secret",
    },
    endpoints: [
      { method: "GET", path: "/integration/v1/", purpose: "service metadata" },
      { method: "GET", path: "/integration/v1/health", purpose: "availability" },
      { method: "POST", path: "/integration/v1/identity/create", scope: "identity:create" },
      { method: "GET", path: "/integration/v1/identity/lookup", scope: "identity:read" },
      { method: "POST", path: "/integration/v1/identity/link/start", scope: "identity:link" },
      { method: "POST", path: "/integration/v1/identity/link/complete", scope: "identity:link" },
      { method: "GET", path: "/integration/v1/profile/{identity_id}", scope: "profile:read" },
      { method: "POST", path: "/integration/v1/revoke", scope: "identity:link" },
    ],
    errors: { envelope: { error: { code: "invalid_request", message: "Safe message", request_id: "uuid" } } },
  }) } },
});