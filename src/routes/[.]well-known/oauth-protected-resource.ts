import { createFileRoute } from "@tanstack/react-router";
import { INTEGRATION_SCOPES } from "@/lib/integration/contracts";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authorizationServerMetadata } =
          await import("@/lib/integration/integration.server");
        const origin = new URL(request.url).origin;
        try {
          const meta = await authorizationServerMetadata();
          return Response.json(
            {
              resource: `${origin}/integration/v1/`,
              resource_name: "ArtistrySynk Integration API v1",
              resource_documentation: `${origin}/integration/v1/docs`,
              authorization_servers: [meta.issuer],
              authorization_endpoint: meta.authorization_endpoint,
              token_endpoint: meta.token_endpoint,
              jwks_uri: meta.jwks_uri,
              registration_endpoint: meta.registration_endpoint,
              scopes_supported: [
                ...meta.scopes_supported,
                ...INTEGRATION_SCOPES,
              ],
              bearer_methods_supported: ["header"],
              code_challenge_methods_supported:
                meta.code_challenge_methods_supported,
              grant_types_supported: meta.grant_types_supported,
              token_endpoint_auth_methods_supported:
                meta.token_endpoint_auth_methods_supported,
              tls_client_certificate_bound_access_tokens: false,
            },
            {
              headers: {
                "Cache-Control": "public, max-age=3600",
                "X-Content-Type-Options": "nosniff",
              },
            },
          );
        } catch {
          return Response.json(
            {
              error: "temporarily_unavailable",
              error_description:
                "Authorization server metadata is unavailable; retry shortly",
            },
            {
              status: 503,
              headers: {
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
              },
            },
          );
        }
      },
    },
  },
});
