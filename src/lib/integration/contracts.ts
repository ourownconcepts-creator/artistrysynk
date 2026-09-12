import { z } from "zod";

export const INTEGRATION_SCOPES = [
  "identity:create",
  "identity:read",
  "identity:link",
  "profile:read",
] as const;

export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number];

export const integrationScopeSchema = z.enum(INTEGRATION_SCOPES);
export const externalSubjectSchema = z.string().trim().min(1).max(200);
export const redirectUriSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return (
      !url.hash &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)))
    );
  }, "Redirect URI must use HTTPS (except localhost) and cannot include a fragment");

export const createIntentSchema = z.object({
  external_subject: externalSubjectSchema,
  email: z.string().trim().email().max(320).optional(),
  redirect_uri: redirectUriSchema,
  scopes: z.array(integrationScopeSchema).min(1).max(INTEGRATION_SCOPES.length),
});

export const lookupSchema = z.object({
  external_subject: externalSubjectSchema,
});

export const linkStartSchema = z.object({
  external_subject: externalSubjectSchema,
  redirect_uri: redirectUriSchema,
  scopes: z.array(integrationScopeSchema).min(1).max(INTEGRATION_SCOPES.length),
  state: z.string().min(16).max(500),
  // The authorization server enforces PKCE, so the partner server must supply a
  // challenge derived from a verifier it keeps server-side and use the same
  // verifier at token exchange. S256 is strongly preferred.
  code_challenge: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9\-._~]{43,128}$/,
      "code_challenge is required: base64url, 43-128 chars, derived from a server-side verifier",
    ),
  code_challenge_method: z.enum(["S256", "plain"]).default("S256"),
});




/** Exchange of the one-time completion code issued after a claim. */
export const claimExchangeSchema = z.object({
  code: z.string().trim().min(32).max(200),
});

export const linkCompleteSchema = z.object({
  external_subject: externalSubjectSchema,
  client_id: z.string().trim().min(8).max(200),
});

export const revokeSchema = z.object({
  external_subject: externalSubjectSchema,
});

export type ApiErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_token"
  | "insufficient_scope"
  | "invalid_redirect_uri"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "temporarily_unavailable";

export function hasRequiredScopes(
  granted: readonly string[],
  required: readonly IntegrationScope[],
) {
  return required.every((scope) => granted.includes(scope));
}

export function isExactRedirectMatch(
  requested: string,
  registered: readonly string[],
) {
  return registered.includes(requested);
}

export function isIntentUsable(
  status: string,
  expiresAt: string,
  now = new Date(),
) {
  return status === "pending" && new Date(expiresAt).getTime() > now.getTime();
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown>) {
  const forbidden = /secret|token|authorization|code|password/i;
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !forbidden.test(key)),
  );
}

/**
 * Approved projection: name, username, avatar and general location only.
 * Any field not listed here is private and must not cross the boundary.
 */
export const APPROVED_PROFILE_COLUMNS =
  "id, username, display_name, full_name, avatar_url, location" as const;

export function approvedProfileProjection(profile: Record<string, unknown>) {
  return {
    id: profile.id,
    name: profile.display_name ?? profile.full_name ?? null,
    username: profile.username ?? null,
    avatar_url: profile.avatar_url ?? null,
    location: profile.location ?? null,
  };
}
