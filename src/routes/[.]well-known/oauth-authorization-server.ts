import { createFileRoute } from "@tanstack/react-router";

/**
 * Mirrors the live metadata of the authorization server that actually issues
 * ArtistrySynk integration tokens, so partner OAuth clients that probe the
 * resource host for RFC 8414 metadata discover the real endpoints instead of a
 * 404. Nothing here is static: every field is read from the issuer at request
 * time.
 */
export const Route = createFileRoute("/.well-known/oauth-authorization-server")(
  {
    server: {
      handlers: {
        GET: async () => {
          const { authorizationServerMetadata } =
            await import("@/lib/integration/integration.server");
          try {
            return Response.json(await authorizationServerMetadata(), {
              headers: {
                "Cache-Control": "public, max-age=3600",
                "X-Content-Type-Options": "nosniff",
              },
            });
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
  },
);
