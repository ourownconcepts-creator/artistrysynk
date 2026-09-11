import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  hasRequiredScopes,
  INTEGRATION_SCOPES,
  isExactRedirectMatch,
  sanitizeAuditMetadata,
  type IntegrationScope,
} from "./contracts";

const AUTH_BASE_PATH = "/auth/v1";
const RATE_WINDOW_SECONDS = 60;

export class IntegrationFailure extends Error {
  constructor(
    public readonly status: number,
    public readonly code:
      | "invalid_request"
      | "invalid_client"
      | "invalid_token"
      | "insufficient_scope"
      | "invalid_redirect_uri"
      | "not_found"
      | "conflict"
      | "rate_limited"
      | "temporarily_unavailable",
    message: string,
  ) {
    super(message);
  }
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key)
    throw new IntegrationFailure(
      503,
      "temporarily_unavailable",
      "Integration service is unavailable",
    );
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function adminClient() {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type ClientContext = {
  id: string;
  applicationId: string;
  publicId: string;
  scopes: string[];
  environment: string;
  oauthClientId: string | null;
};

export function parseBasicClient(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return null;
    return {
      clientId: decoded.slice(0, separator),
      clientSecret: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export async function requireClient(
  request: Request,
  required: IntegrationScope[],
): Promise<ClientContext> {
  const credentials = parseBasicClient(request);
  if (!credentials)
    throw new IntegrationFailure(
      401,
      "invalid_client",
      "Valid client authentication is required",
    );
  const admin = await adminClient();
  const { data, error } = await admin
    .from("integration_clients")
    .select(
      "id, application_id, client_id, client_secret_hash, environment, allowed_scopes, oauth_client_id, status, secret_expires_at",
    )
    .eq("client_id", credentials.clientId)
    .maybeSingle();
  const suppliedHash = sha256(credentials.clientSecret);
  if (
    error ||
    !data?.client_secret_hash ||
    data.status !== "active" ||
    !safeEqual(suppliedHash, data.client_secret_hash)
  ) {
    throw new IntegrationFailure(
      401,
      "invalid_client",
      "Valid client authentication is required",
    );
  }
  if (
    data.secret_expires_at &&
    new Date(data.secret_expires_at) <= new Date()
  ) {
    throw new IntegrationFailure(
      401,
      "invalid_client",
      "Client credential has expired",
    );
  }
  const scopes = data.allowed_scopes ?? [];
  if (!hasRequiredScopes(scopes, required)) {
    throw new IntegrationFailure(
      403,
      "insufficient_scope",
      `Required scope: ${required.join(" ")}`,
    );
  }
  await admin
    .from("integration_clients")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return {
    id: data.id,
    applicationId: data.application_id,
    publicId: data.client_id,
    scopes,
    environment: data.environment,
    oauthClientId: data.oauth_client_id,
  };
}

export async function requireOAuthUser(
  request: Request,
  required: IntegrationScope[],
) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token)
    throw new IntegrationFailure(
      401,
      "invalid_token",
      "A valid OAuth bearer token is required",
    );
  const client = publicClient();
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub)
    throw new IntegrationFailure(
      401,
      "invalid_token",
      "A valid OAuth bearer token is required",
    );
  const rawScopes = data.claims.scope ?? data.claims.scopes ?? "";
  const tokenScopes = Array.isArray(rawScopes)
    ? rawScopes.map(String)
    : String(rawScopes).split(/\s+/).filter(Boolean);
  // The authorization server issues OIDC scopes (openid/profile/email); the
  // integration scopes are enforced from the client grant and the identity
  // link. When a token does carry integration scopes, honour them as a further
  // restriction rather than ignoring them.
  const integrationScopes = tokenScopes.filter((scope) =>
    (INTEGRATION_SCOPES as readonly string[]).includes(scope),
  );
  if (
    integrationScopes.length > 0 &&
    !hasRequiredScopes(integrationScopes, required)
  ) {
    throw new IntegrationFailure(
      403,
      "insufficient_scope",
      `Required scope: ${required.join(" ")}`,
    );
  }
  return { userId: String(data.claims.sub), scopes: tokenScopes, claims: data.claims };
}

/**
 * Least-privilege gate for bearer-token endpoints: the authorized user must
 * hold an active link with an integration client whose grant covers `required`.
 */
export async function requireLinkedClientScope(
  userId: string,
  required: IntegrationScope[],
  clientPublicId?: string,
) {
  const admin = await adminClient();
  let query = admin
    .from("integration_identity_links")
    .select(
      "id, client_id, external_subject, granted_scopes, integration_clients!inner(id, application_id, client_id, environment, allowed_scopes, oauth_client_id, status)",
    )
    .eq("user_id", userId)
    .eq("status", "active");
  if (clientPublicId)
    query = query.eq("integration_clients.client_id", clientPublicId);
  const { data, error } = await query;
  if (error)
    throw new IntegrationFailure(
      503,
      "temporarily_unavailable",
      "Unable to verify the integration connection",
    );
  const match = (data ?? []).find((row) => {
    const client = row.integration_clients as unknown as {
      status: string;
      allowed_scopes: string[];
    };
    return (
      client.status === "active" &&
      hasRequiredScopes(client.allowed_scopes ?? [], required) &&
      hasRequiredScopes(row.granted_scopes ?? [], required)
    );
  });
  if (!match)
    throw new IntegrationFailure(
      403,
      "insufficient_scope",
      `Required scope: ${required.join(" ")}`,
    );
  const client = match.integration_clients as unknown as {
    id: string;
    application_id: string;
    client_id: string;
    environment: string;
    allowed_scopes: string[];
    oauth_client_id: string | null;
  };
  return {
    linkId: match.id,
    externalSubject: match.external_subject,
    client: {
      id: client.id,
      applicationId: client.application_id,
      publicId: client.client_id,
      scopes: client.allowed_scopes ?? [],
      environment: client.environment,
      oauthClientId: client.oauth_client_id,
    } satisfies ClientContext,
  };
}

async function identityExistsForEmail(
  admin: Awaited<ReturnType<typeof adminClient>>,
  email: string,
) {
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error)
      throw new IntegrationFailure(
        503,
        "temporarily_unavailable",
        "Unable to validate identity availability",
      );
    if (data.users.some((user) => user.email?.toLowerCase() === target))
      return true;
    if (data.users.length < perPage) return false;
  }
}

export async function assertRedirect(clientId: string, redirectUri: string) {
  const admin = await adminClient();
  const { data, error } = await admin
    .from("integration_redirect_uris")
    .select("redirect_uri")
    .eq("client_id", clientId)
    .eq("is_active", true);
  const registered = (data ?? []).map((row) => row.redirect_uri);
  if (error || !isExactRedirectMatch(redirectUri, registered)) {
    throw new IntegrationFailure(
      400,
      "invalid_redirect_uri",
      "Redirect URI is not registered for this client",
    );
  }
}

export async function enforceRateLimit(
  clientId: string,
  endpoint: string,
  limit: number,
) {
  const admin = await adminClient();
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (RATE_WINDOW_SECONDS * 1000)) *
      RATE_WINDOW_SECONDS *
      1000,
  ).toISOString();
  const { data } = await admin
    .from("integration_rate_limits")
    .select("id, request_count")
    .eq("client_id", clientId)
    .eq("endpoint", endpoint)
    .eq("window_started_at", windowStart)
    .maybeSingle();
  const count = (data?.request_count ?? 0) + 1;
  if (data)
    await admin
      .from("integration_rate_limits")
      .update({ request_count: count, updated_at: now.toISOString() })
      .eq("id", data.id);
  else
    await admin.from("integration_rate_limits").insert({
      client_id: clientId,
      endpoint,
      window_started_at: windowStart,
      request_count: 1,
    });
  if (count > limit)
    throw new IntegrationFailure(
      429,
      "rate_limited",
      "Too many requests; retry shortly",
    );
}

export async function audit(input: {
  request: Request;
  requestId: string;
  eventType: string;
  outcome: "success" | "failure";
  client?: ClientContext;
  userId?: string;
  externalSubject?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = await adminClient();
    const forwarded =
      input.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    await admin.from("integration_audit_events").insert({
      client_id: input.client?.id ?? null,
      application_id: input.client?.applicationId ?? null,
      event_type: input.eventType,
      outcome: input.outcome,
      subject_user_id: input.userId ?? null,
      external_subject_hash: input.externalSubject
        ? sha256(input.externalSubject)
        : null,
      request_id: input.requestId,
      ip_hash: sha256(forwarded),
      metadata: sanitizeAuditMetadata(input.metadata ?? {}) as Json,
    });
  } catch {
    // Audit failure must not leak infrastructure details to callers.
  }
}

export async function createIntent(input: {
  client: ClientContext;
  type: "identity_create" | "identity_link";
  externalSubject: string;
  email?: string;
  redirectUri: string;
  scopes: string[];
  idempotencyKey?: string;
}) {
  await assertRedirect(input.client.id, input.redirectUri);
  if (!input.scopes.every((scope) => input.client.scopes.includes(scope))) {
    throw new IntegrationFailure(
      403,
      "insufficient_scope",
      "Requested scopes exceed this client's grant",
    );
  }
  const admin = await adminClient();
  if (input.idempotencyKey) {
    const keyHash = sha256(input.idempotencyKey);
    const { data: existing } = await admin
      .from("integration_intents")
      .select("id, expires_at, status")
      .eq("client_id", input.client.id)
      .eq("idempotency_key_hash", keyHash)
      .maybeSingle();
    if (existing)
      return {
        id: existing.id,
        expires_at: existing.expires_at,
        status: existing.status,
        reused: true,
      };
  }
  if (input.type === "identity_create" && input.email) {
    const exists = await identityExistsForEmail(admin, input.email);
    if (exists)
      throw new IntegrationFailure(
        409,
        "conflict",
        "An ArtistrySynk identity already exists; use identity linking instead",
      );
  }
  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("integration_intents")
    .insert({
      client_id: input.client.id,
      intent_type: input.type,
      external_subject: input.externalSubject,
      email_hash: input.email ? sha256(input.email.trim().toLowerCase()) : null,
      redirect_uri: input.redirectUri,
      requested_scopes: input.scopes,
      code_hash: sha256(code),
      idempotency_key_hash: input.idempotencyKey
        ? sha256(input.idempotencyKey)
        : null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !data)
    throw new IntegrationFailure(
      503,
      "temporarily_unavailable",
      "Unable to create integration intent",
    );
  return {
    id: data.id,
    code,
    expires_at: expiresAt,
    status: "pending",
    reused: false,
  };
}

export type AuthorizationServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri?: string;
  registration_endpoint?: string;
  userinfo_endpoint?: string;
  revocation_endpoint?: string;
  scopes_supported: string[];
  grant_types_supported: string[];
  response_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  code_challenge_methods_supported: string[];
};

let metadataCache: { value: AuthorizationServerMetadata; at: number } | null =
  null;

/** Reads the live OIDC discovery document of the authorization server. */
export async function authorizationServerMetadata(): Promise<AuthorizationServerMetadata> {
  if (metadataCache && Date.now() - metadataCache.at < 5 * 60 * 1000)
    return metadataCache.value;
  const base = process.env["SUPABASE_URL"];
  if (!base)
    throw new IntegrationFailure(
      503,
      "temporarily_unavailable",
      "Integration service is unavailable",
    );
  const discovery = await fetch(
    `${base}${AUTH_BASE_PATH}/.well-known/openid-configuration`,
  );
  if (!discovery.ok)
    throw new IntegrationFailure(
      503,
      "temporarily_unavailable",
      "Authorization service is unavailable",
    );
  const body = (await discovery.json()) as Partial<AuthorizationServerMetadata>;
  if (!body.issuer || !body.authorization_endpoint || !body.token_endpoint)
    throw new IntegrationFailure(
      503,
      "temporarily_unavailable",
      "Authorization service is unavailable",
    );
  const value: AuthorizationServerMetadata = {
    issuer: body.issuer,
    authorization_endpoint: body.authorization_endpoint,
    token_endpoint: body.token_endpoint,
    ...(body.jwks_uri ? { jwks_uri: body.jwks_uri } : {}),
    ...(body.registration_endpoint
      ? { registration_endpoint: body.registration_endpoint }
      : {}),
    ...(body.userinfo_endpoint
      ? { userinfo_endpoint: body.userinfo_endpoint }
      : {}),
    ...(body.revocation_endpoint
      ? { revocation_endpoint: body.revocation_endpoint }
      : {}),
    scopes_supported: body.scopes_supported ?? ["openid", "profile", "email"],
    grant_types_supported: body.grant_types_supported ?? [
      "authorization_code",
      "refresh_token",
    ],
    response_types_supported: body.response_types_supported ?? ["code"],
    token_endpoint_auth_methods_supported:
      body.token_endpoint_auth_methods_supported ?? ["client_secret_basic"],
    code_challenge_methods_supported: body.code_challenge_methods_supported ?? [
      "S256",
    ],
  };
  metadataCache = { value, at: Date.now() };
  return value;
}

export async function issuerUrl() {
  return (await authorizationServerMetadata()).issuer;
}

export async function authorizationEndpoint() {
  return (await authorizationServerMetadata()).authorization_endpoint;
}

export async function getAdminClient(): Promise<SupabaseClient<Database>> {
  return adminClient();
}
