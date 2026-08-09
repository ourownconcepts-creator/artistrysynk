# ArtistrySynk Compliance OS — Gap Report & Implementation Plan

## What already exists (do not rebuild)

| Area | Status today |
|---|---|
| Stack | TanStack Start + React 19, Tailwind v4, Lovable Cloud backend, Capacitor iOS/Android |
| Auth | Email/password + managed Google/Apple OAuth, session tracking, revoke other devices, forced password change |
| Roles | `user_roles` table + `has_role()` security-definer; roles: user, admin, master_admin, super_admin |
| Reporting | `content_flags` (11 reasons), auto-hide at 3 flags, `moderation_actions`, `content_appeals` |
| Block / Mute | `blocked_users`, `muted_users`, filtering in discovery + feed |
| Admin | Dashboards for flags, appeals, suspensions, support, verification, function logs, `activity_logs` |
| Deletion | Email-confirmed request + 7-day grace + undo + purge (`account_deletion_requests`) |
| Data export | `export-my-data` server function (synchronous JSON) |
| Legal pages | Privacy, Terms, Cookies, Data Deletion, Licenses — all hardcoded React pages |
| Support | Contact pipeline with rate limits, hCaptcha, audit log, AS-SUP references |
| Location | City/country + lat/lng, proximity RPC |
| Third parties | Lovable Cloud (DB/auth/storage), Resend, Paystack, Lovable AI (Gemini), web push/VAPID |

## Gaps to close

1. Legal documents are hardcoded — no versioning, no admin publishing, no history.
2. No consent records: no proof a user accepted Terms/Privacy, no separate marketing consent, no re-acceptance on material updates.
3. Missing documents: Community Guidelines, Acceptable Use, Copyright & IP Policy, Moderation & Reporting Policy, Account Deletion Policy, Subscription & Refund Policy, Data Protection Rights Notice.
4. No Privacy Centre: profile visibility exists partially (`profile_visibility`, `is_hidden`) but there is no single user-facing Privacy & Data screen covering visibility, discoverability, location precision, messaging, marketing, personalisation.
5. No privacy request queue (access / correction / deletion / export / restriction / objection) with deadlines.
6. Data export is synchronous and unauthenticated by link — needs async job, expiring secure link, ready-notification.
7. No copyright claim system (rights-holder form, review workflow, repeat-infringer tracking).
8. No security incident register.
9. No processor/vendor register, retention policy engine, data inventory, ROPA or DPIA records.
10. Admin roles too coarse — no compliance/T&S/support/finance separation, and admin data access is not least-privilege.
11. No compliance dashboard or health check.
12. No 18+ age gate at signup.
13. Location: coordinates are stored and can be returned by some paths — must never be public.
14. Footer/settings do not link the full legal set; app-store data mapping is not documented.

## Phases

### Phase 1 — Legal document system + consent
- Tables: `legal_documents`, `legal_document_versions`, `user_consents`.
- Seed all 10 documents as version 1, content written to match what the app actually does.
- Public routes render from DB by slug with version + effective date; historical versions viewable at `?v=`.
- Signup: two separate checkboxes (mandatory Terms/Privacy acknowledgement, unchecked optional marketing) plus 18+ confirmation; records written to `user_consents` with version, timestamp, hashed IP, user agent, context.
- Re-acceptance banner when a document's `requires_reacceptance` version is newer than the user's recorded acceptance.
- Admin → Compliance → Legal Documents: draft, publish new version, view history. Publishing never overwrites.

### Phase 2 — Privacy Centre & Personal Data Centre
- Settings → Privacy & Data: profile visibility (public / members / connections / private), discoverability toggles (discovery, search, recommendations), location precision (off / city / precise), messaging permissions, marketing, personalisation, blocked & muted lists.
- Enforce each setting server-side in discovery, search, explore, nearby and public-profile RPCs — settings that do not change behaviour are not shipped.
- Your Data: data-category inventory view, async export job (`data_export_requests`) with expiring signed link + email when ready, deletion entry point.
- Strip lat/lng from every public/anon read path; city/country only.

### Phase 3 — Trust & Safety + Copyright
- Extend reporting to cover profiles, messages, comments, posts, portfolio and projects with optional evidence uploads.
- Moderation queue with risk classification, action set (none, warning, remove, restrict, suspend, ban, feature restriction, verification required, escalate), decision notes, and full auditability.
- `copyright_claims` + evidence, admin workflow (submitted → review → more info → action / rejected → appealed), repeat-infringer counter.
- Reporter identity hidden from non-T&S admins.

### Phase 4 — Privacy requests, security incidents, registers
- `privacy_requests` with type, verification status, assignee, statutory deadline, overdue alerting.
- `security_incidents` + `security_incident_events` with response workflow; no automatic user/regulator notification.
- `data_processors`, `retention_policies`, `data_inventory`, ROPA and DPIA records, all admin-managed and seeded from the actual stack.

### Phase 5 — Admin RBAC, audit, dashboard, health check
- Extend `app_role` with `compliance_admin`, `trust_safety_admin`, `moderator`, `support_agent`, `finance_admin`, `technical_admin`; permission helpers; RLS updated per table so no admin sees more personal data than their role needs.
- `admin_audit_logs` (append-only, no update/delete) covering suspensions, bans, content deletion, privacy access, exports, deletions, role changes, legal publication, security config.
- Admin → Compliance dashboard with the 12 cards and overdue/critical alerts.
- Compliance health check driven by real functional probes, not table existence.

### Phase 6 — App-store readiness, config, tests, audit report
- Configurable legal contacts (`COMPANY_LEGAL_NAME`, `COMPANY_ADDRESS`, `LEGAL_CONTACT_EMAIL`, `PRIVACY_EMAIL`, `DPO_EMAIL`, `SUPPORT_EMAIL`, `COPYRIGHT_EMAIL`, `EFFECTIVE_DATE`) — placeholders, nothing invented.
- Google Play Data Safety + Apple privacy mapping documents generated from the real data inventory.
- Full legal footer, settings legal centre, web deletion page hardening.
- Automated tests for consent, privacy settings enforcement, reporting/blocking, copyright, RLS/privilege escalation, legal versioning.
- Final compliance audit report split into IMPLEMENTED / REQUIRES LEGAL REVIEW / REQUIRES BUSINESS DECISION / REQUIRES EXTERNAL REGULATORY ACTION.

## Technical notes
- All new tables get GRANTs, RLS enabled, and policies scoped to `auth.uid()` or role checks via security-definer functions; audit tables get no UPDATE/DELETE policy.
- All admin/compliance reads go through `createServerFn` with role verification — never client-side admin queries.
- Existing tables are extended, not replaced: `content_flags`, `moderation_actions`, `content_appeals`, `blocked_users`, `muted_users`, `account_deletion_requests`, `activity_logs`, `user_settings`.
- Compliance UI uses the existing native-ui/Surface design system with progressive disclosure and plain language.

## Open questions requiring your decision
1. Confirm 18+ only for launch.
2. Confirm the legal entity name/address and which email addresses to use (or leave placeholders).
3. Retention periods for messages, moderation records and payment records — I will use documented defaults unless you specify.
4. Whether users may opt out of AI features entirely, or only from optional AI personalisation.

## Scope note
This is a large multi-phase build. I will implement phase by phase, verifying each before moving on, and report anything that needs legal or business input rather than inventing it.
