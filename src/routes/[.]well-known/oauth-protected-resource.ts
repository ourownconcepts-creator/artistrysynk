import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: { handlers: { GET: async ({ request }) => {
    const { issuerUrl } = await import("@/lib/integration/integration.server");
    return Response.json({
      resource: new URL("/integration/v1/", request.url).toString(),
      authorization_servers: [await issuerUrl()],
      scopes_supported: ["identity:create", "identity:read", "identity:link", "profile:read"],
      bearer_methods_supported: ["header"],
    }, { headers: { "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } } },
});