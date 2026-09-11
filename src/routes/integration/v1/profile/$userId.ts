import { createFileRoute } from "@tanstack/react-router";
import { approvedProfileProjection } from "@/lib/integration/contracts";
import { apiError, apiSuccess, requestId } from "@/lib/integration/http";

export const Route = createFileRoute("/integration/v1/profile/$userId")({
  server: { handlers: { GET: async ({ request, params }) => {
    const id = requestId(request);
    try {
      const { audit, getAdminClient, IntegrationFailure, requireOAuthUser } = await import("@/lib/integration/integration.server");
      const user = await requireOAuthUser(request, ["profile:read"]);
      if (user.userId !== params.userId) throw new IntegrationFailure(403, "insufficient_scope", "This token cannot access another identity");
      const admin = await getAdminClient();
      const { data: visible } = await admin.rpc("can_see_user", { _target: params.userId, _viewer: user.userId });
      if (!visible) throw new IntegrationFailure(404, "not_found", "Profile is unavailable");
      const { data, error } = await admin.from("profiles").select("id, username, display_name, full_name, bio, avatar_url, cover_image_url, location, country, city, is_verified, professional_verified").eq("id", params.userId).maybeSingle();
      if (error || !data) throw new IntegrationFailure(404, "not_found", "Profile is unavailable");
      await audit({ request, requestId: id, eventType: "profile.accessed", outcome: "success", userId: user.userId });
      return apiSuccess(id, approvedProfileProjection(data));
    } catch (error) {
      const { audit, IntegrationFailure } = await import("@/lib/integration/integration.server");
      const failure = error instanceof IntegrationFailure ? error : new IntegrationFailure(503, "temporarily_unavailable", "Unable to process request");
      await audit({ request, requestId: id, eventType: "profile.accessed", outcome: "failure", metadata: { error_code: failure.code } });
      return apiError(id, failure.status, failure.code, failure.message);
    }
  } } },
});