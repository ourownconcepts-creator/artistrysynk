import { createFileRoute } from "@tanstack/react-router";
import { apiSuccess, requestId } from "@/lib/integration/http";
import { INTEGRATION_SCOPES } from "@/lib/integration/contracts";

export const Route = createFileRoute("/integration/v1/")({
  server: {
    handlers: {
      GET: async ({ request }) => apiSuccess(requestId(request), {
        name: "ArtistrySynk Integration API",
        version: "v1",
        status: "available",
        authentication: ["oauth2_authorization_code", "confidential_client"],
        scopes: INTEGRATION_SCOPES,
        documentation: "https://artistrysynk.app/integration/v1/docs",
      }),
    },
  },
});