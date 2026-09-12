# ArtistrySynk Integration API v1

## Authority and boundary

ArtistrySynk remains the canonical owner of creative identity. An external product owns its own application and competition data. External browsers never access the ArtistrySynk database; partner servers call the versioned HTTPS API at `https://artistrysynk.app/integration/v1/`.

```text
Partner browser → partner server → ArtistrySynk Integration API → identity service → ArtistrySynk data
```

### Active clients

Zik's Got Talent has an **active production** client using the generic integration-client model (no ZGT-specific logic exists in ArtistrySynk identity code).

| Item                     | Value                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Integration client ID    | `zgt-prod-aa3c2403c67a4cb6` (HTTP Basic, server-side only)                                                          |
| OAuth client ID          | `79f6a1ca-bbcf-48f9-9d36-61fdcb65a85a`                                                                              |
| Registered redirect URIs | `https://ziksgottalent.com/oauth/artistrysynk/return`, `https://www.ziksgottalent.com/oauth/artistrysynk/return`    |
| Integration scopes       | `identity:create`, `identity:read`, `identity:link`, `profile:read`                                                 |
| OAuth token scopes       | `openid profile email` (the authorization server issues OIDC scopes; integration scopes are enforced by this layer) |
| Environment              | production                                                                                                          |

Staging/preview callbacks are registered only when the partner supplies exact URLs; wildcards are never accepted.

## Discovery

| Document                    | URL                                                               |
| --------------------------- | ----------------------------------------------------------------- |
| Protected resource metadata | `https://artistrysynk.app/.well-known/oauth-protected-resource`   |
| Authorization server mirror | `https://artistrysynk.app/.well-known/oauth-authorization-server` |

Both documents are generated at request time from the live issuer's OpenID configuration — no static values. They expose the issuer, authorization endpoint, token endpoint, JWKS, registration endpoint, supported scopes, grant types, client authentication methods, and PKCE methods (`S256`, `plain`).

## Client registration and credentials

A future partner provides its application name, development/staging/production environment, operational contact, exact HTTPS redirect URIs, and requested scopes to an ArtistrySynk integration administrator. Redirect URIs are registered separately per environment and compared as exact strings. Development may use loopback HTTP; production must use HTTPS. Fragments are forbidden.

After security and privacy approval, an administrator activates an environment-specific client and generates a cryptographically random client secret. The secret is displayed once to the partner's authorized operator and stored by the partner only in server-side secret storage. ArtistrySynk stores only its SHA-256 hash. Lost secrets are rotated, not recovered. Revocation immediately disables confidential API authentication.

Never place a client secret in browser code, mobile code, source control, query strings, analytics, or logs.

## Authentication flows

### User-delegated linking and profile access

Use the managed OAuth 2.0 / OpenID Connect authorization-code flow:

1. The partner server calls `POST /integration/v1/identity/link/start` with confidential client authentication, an unguessable `state` (16–500 chars), exact registered `redirect_uri`, external subject, requested scopes, and a PKCE `code_challenge` (base64url, 43–128 chars; `code_challenge_method` is `S256` by default, `plain` also accepted) derived from a verifier kept on the partner server. PKCE is mandatory: the authorization server rejects authorization requests without a challenge, so a start request without `code_challenge` is refused with `invalid_request`.

   Validation failures return `400 invalid_request` with a `details` array naming the offending fields, e.g.

   ```json
   { "error": { "code": "invalid_request", "message": "The identity link request is invalid",
     "request_id": "…", "details": [{ "field": "code_challenge", "issue": "Required" }] } }
   ```

2. ArtistrySynk returns `authorization_url`. The partner redirects the user's browser there. The URL requests OIDC scopes (`openid profile email`); the integration scopes travel with the intent and are enforced by ArtistrySynk at link and profile time.
3. ArtistrySynk handles sign-in or registration and shows its own consent screen. Passwords never pass through the partner.
4. The authorization server redirects to the exact registered URI with a short-lived code and the original state.
5. The partner server validates state and exchanges the code at the managed token endpoint with `code_verifier` and Basic client authentication. Tokens stay server-side and codes are single-use.

6. `POST /integration/v1/identity/link/complete` associates the authorized ArtistrySynk subject with the partner's external subject.

OAuth discovery is published by the managed issuer. Resource metadata is available at `/.well-known/oauth-protected-resource`.

### Identity creation

`POST /integration/v1/identity/create` does not accept a password and does not silently create a usable account. It creates a ten-minute, single-use ArtistrySynk claim URL. The user signs in or registers directly with ArtistrySynk, reviews the action, and claims the association. If the supplied email already belongs to an ArtistrySynk account, the endpoint returns `409 conflict` and the partner must use linking.

#### Claim completion callback

The partner may append its own `state` to `claim_url` (`&state=<opaque value>`). After the user claims:

1. ArtistrySynk links the identity and issues a five-minute, single-use **completion code**.
2. The browser is redirected to the `redirect_uri` that was validated when the intent was created — never to a URI supplied at claim time — as `<redirect_uri>?code=<completion_code>&state=<state>`. No identity ID and no token appear in the URL.
3. The partner server validates `state`, then exchanges the code:

   ```http
   POST /integration/v1/identity/claim/exchange
   Authorization: Basic base64(client_id:client_secret)
   Content-Type: application/json

   { "code": "<completion_code>" }
   ```

   ```json
   { "data": { "identity_id": "…", "external_subject": "…", "link_id": "…",
     "linked_at": "…", "scopes": ["identity:create", "profile:read"] }, "request_id": "…" }
   ```

   Requires `identity:create`. The code is bound to the issuing client, single-use, and rejected after expiry or replay (`400 invalid_request`). Rate limit: 30 requests/minute/client.

### Confidential API calls

Use HTTP Basic authentication with `base64(client_id:client_secret)` only from the partner server. Credentials are scoped, environment-specific, expirable, and revocable.

## Scopes

| Scope             | Permission                                                      |
| ----------------- | --------------------------------------------------------------- |
| `identity:create` | Start an ArtistrySynk-owned identity invitation.                |
| `identity:read`   | Read the status and stable ID of an existing client-owned link. |
| `identity:link`   | Start, complete, or revoke an approved identity association.    |
| `profile:read`    | Read the authorized user's approved profile projection.         |

Scopes are least privilege. A request must be within the client's allowlist and the OAuth grant. There are no admin, competition, broad search, or raw database scopes.

## API contract

All successful responses use `{ "data": ..., "request_id": "..." }`. All errors use `{ "error": { "code": "...", "message": "...", "request_id": "..." } }`. Send and retain `X-Request-Id` for support correlation. Responses use `Cache-Control: no-store`.

### Endpoints

- `GET /integration/v1/` — API metadata.
- `GET /integration/v1/health` — availability only.
- `GET /integration/v1/docs` — machine-readable contract summary.
- `POST /integration/v1/identity/create` — scope `identity:create`; confidential client; maximum 10 requests/minute.
- `GET /integration/v1/identity/lookup?external_subject=...` — scope `identity:read`; confidential client; maximum 60/minute.
- `POST /integration/v1/identity/link/start` — scope `identity:link`; confidential client; maximum 20/minute.
- `POST /integration/v1/identity/link/complete` — scope `identity:link`; OAuth bearer.
- `GET /integration/v1/profile/{identity_id}` — scope `profile:read`; OAuth bearer; subject must equal the authorized user.
- `POST /integration/v1/revoke` — scope `identity:link`; confidential client; maximum 30/minute.

Mutating confidential calls should include a unique `Idempotency-Key`. JSON bodies require `Content-Type: application/json`.

## Approved profile fields

`id` (stable ArtistrySynk identity reference), `name` (resolved display name), `username`, `avatar_url`, and general `location` — nothing else.

Access additionally requires an active identity link whose client grant includes `profile:read`; a valid bearer token alone is not sufficient.

The API does not expose email, password data, exact coordinates, legal identity records, sessions, roles, private portfolio records, private social data, or competition data. Existing ArtistrySynk visibility checks still apply.

## Errors

- `400 invalid_request` — malformed body or parameter.
- `400 invalid_redirect_uri` — callback does not exactly match an active registration.
- `401 invalid_client` — absent, revoked, expired, or incorrect confidential credential.
- `401 invalid_token` — absent, expired, invalid, or revoked OAuth token.
- `403 insufficient_scope` — grant does not cover the action.
- `404 not_found` — link/profile unavailable without revealing unrelated records.
- `409 conflict` — duplicate identity or incomplete client configuration.
- `429 rate_limited` — retry after the `Retry-After` interval.
- `503 temporarily_unavailable` — safe transient failure.

## Audit and security

Append-only events cover `connection.started`, `authorization.started`, `authorization.approved`, `authorization.denied`, `authorization.failed` (token/consent failure), `identity.created`, `identity.linked`, `profile.accessed`, `identity.lookup`, and `connection.revoked`. Consent decisions store only a truncated one-way reference to the authorization request, never the authorization code. Events include request ID, client/application, outcome, hashed external subject and IP, safe metadata, and time. Secrets, passwords, authorization codes, claim codes, and access/refresh tokens are filtered from metadata and never logged.

Integration tables are RLS-enabled and server-only. No anonymous or ordinary authenticated database grants exist. Secret hashes, one-time code hashes, exact redirect validation, ten-minute intent expiry, single-use state, client/link revocation, OAuth token expiry, endpoint rate limits, idempotency, and generic authentication failures reduce replay and enumeration risk.

## Environment configuration

The API uses the existing server-only Lovable Cloud variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; the last is managed and unavailable to partners. Managed OAuth is active at `/.lovable/oauth/consent`. There are no new browser variables and no integration secret in `.env`.

Development, staging, and production clients have separate IDs, secrets, callback allowlists, activation, expiry, and revocation. A credential from one environment must not be copied to another.

## Remaining production configuration for ZGT

1. Publish ArtistrySynk so the discovery documents and consent route are live on `artistrysynk.app` (they respond correctly in the current build).
2. Supply exact staging/preview callback URLs if ZGT runs a non-production host.
3. Confirm ZGT stores both secrets (OAuth client secret and integration client secret) in server-side secret storage only.
4. Agree a rotation schedule; the integration client secret expires in 2027.
5. Confirm the four approved profile fields satisfy ZGT's needs; anything further requires privacy review.
