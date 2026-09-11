# ArtistrySynk Integration Foundation V1

## Goal
Create a generic, versioned partner boundary for external products while keeping ArtistrySynk as the only creative-identity authority and keeping all database and privileged credentials behind ArtistrySynk servers.

## Architecture
```text
External browser → partner server → /integration/v1/* → integration service → ArtistrySynk identity/profile data
                         ↘ managed OAuth authorization-code flow ↗
```

Use two narrowly separated trust paths:
- **Delegated user access:** managed OAuth 2.0 / OpenID Connect authorization-code flow for identity linking and user-approved reads.
- **Confidential server access:** hashed, revocable integration-client credentials for approved machine actions such as starting identity creation. No password is accepted or returned; creation produces a secure ArtistrySynk-owned invitation/activation flow.

No ZGT-specific business or competition data will be added.

## Build
1. Add an explicit integration module containing schemas, normalized success/error responses, scope checks, redirect validation, bearer/client authentication, rate limiting, token-safe audit logging, and the approved profile projection.
2. Add database models for generic integration applications, environment-specific clients, redirect URIs, allowed scopes, external identity links, one-time creation/link intents, revocations, rate-limit counters, and append-only audit events.
3. Lock all integration tables to server-only access with RLS and explicit service-role grants. Store only client-secret hashes and one-time-code hashes; never plaintext secrets or access tokens.
4. Add versioned server routes under `/integration/v1/` for:
   - service metadata and health
   - identity creation intent
   - identity lookup
   - identity link/start and link completion
   - permitted profile retrieval
   - connection revocation
   - OAuth protected-resource metadata
5. Activate managed OAuth and add the ArtistrySynk-native consent page. Preserve the consent return path through email sign-in, registration, Google, and Apple flows.
6. Enforce exact redirect-URI allowlisting, HTTPS in production, environment isolation, short expirations, one-time consumption, client/status revocation, idempotency, duplicate-email safeguards, generic errors, and endpoint-specific limits.
7. Seed only an inactive **Zik's Got Talent** application/client placeholder with scopes and redirect configuration intentionally empty. Do not create or expose production credentials.
8. Add tests for validation, scopes, redirect attacks, expiration/replay, duplicate identity handling, privacy projection, authentication failures, rate limits, revocation, and response/error contracts.
9. Add partner documentation covering architecture, API contract, OAuth flow, credential issuance/rotation, redirect registration, environments, scopes, errors, audit events, activation checklist, and example server-side requests.

## Initial Scope Model
- `identity:create` — start an ArtistrySynk-owned invitation for a new identity; never accepts an ArtistrySynk password.
- `identity:read` — retrieve the stable linked identity identifier and minimal status.
- `identity:link` — initiate and complete a user-approved association with an external subject.
- `profile:read` — return only approved fields and only when current ArtistrySynk visibility rules permit them.

No client receives roles such as admin, direct table access, exact coordinates, private contact data, private portfolio data, or unrelated user records.

## Technical Details
- External endpoints are TanStack server routes and authenticate every request themselves.
- OAuth access tokens are verified against the managed issuer and required scopes; confidential credentials are compared by cryptographic hash.
- Client secrets are generated only during an explicit admin provisioning step and displayed once; they are not included in migrations, logs, browser code, or documentation.
- Identity creation uses an invite/claim flow owned by ArtistrySynk rather than creating a usable account with a partner-supplied password.
- API errors use one envelope with stable codes, HTTP status, request ID, and safe detail; responses include correlation IDs.
- Audit metadata excludes secrets, authorization codes, and tokens.

## Verification
- Run focused integration tests and existing auth/profile smoke tests.
- Run type checks and the production build.
- Probe public metadata, unauthenticated rejection, invalid redirect, invalid scope, expired/replayed intent, revoked client, and privacy-filtered profile behavior.
- Confirm current auth redirects and ordinary ArtistrySynk profile flows remain unchanged except for consent-return support.

## Production Decisions Still Required
- Exact ZGT development and production redirect URIs.
- ZGT environment names and operational contacts.
- Whether `identity:create` may send invites immediately or must remain disabled until legal/abuse review.
- Final approved profile field list beyond the proposed minimal public identity fields.
- Per-client rate limits and credential rotation owner.
- Explicit approval to provision and activate production ZGT credentials after validation.
