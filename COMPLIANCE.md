# ArtistrySynk — Compliance Gap Report

Scope: GDPR/UK GDPR, NDPA (Nigeria), CCPA/CPRA, DMCA/copyright, and app-store
privacy requirements. This report records what is implemented in the product, how it
is enforced technically, and what remains outside the product.

---

## 1. Legal documents and consent (Phase 1 — complete)

| Requirement | Status | How it is enforced |
| --- | --- | --- |
| Published Privacy Policy, Terms, Cookie Policy, Data Deletion | Done | `legal_documents` + versioned `legal_document_versions`; public pages at `/privacy`, `/terms`, `/cookies`, `/data-deletion` |
| Version history and effective dates | Done | Published versions are immutable (`protect_published_legal_versions` trigger) |
| Re-consent when a policy changes | Done | `get_pending_legal_acceptances` RPC + `LegalAcceptanceGate` blocks the app until accepted |
| Consent evidence (who, when, which version) | Done | `user_consents` rows written per accepted version |
| Cookie consent for the web build | Done | Cookie banner, web-only, choices persisted |

## 2. Privacy Center and data rights (Phase 2 — complete)

| Requirement | Status | How it is enforced |
| --- | --- | --- |
| Discovery / search opt-out | Done | `is_discoverable` + `list_opted_out_ids`, applied in Discover, global search and gallery |
| Location precision control | Done | `location_precision` setting respected by the public profile RPCs |
| Personalisation / AI opt-out | Done | Privacy Center toggles in Settings |
| Access, portability, correction, erasure, objection requests | Done | `privacy_requests` with `AS-PRV-` references, 30-day due dates, email notification |
| Self-service data export | Done | "Download my data" produces a JSON export of profile and portfolio |
| Account deletion with safeguards | Done | Email confirmation, 7-day grace period, "undo deletion", then hard purge |
| Active session revocation | Done | Settings → Active sessions, `signOut({ scope: 'others' })` |

## 3. Trust, safety and copyright (Phase 3 — complete)

| Requirement | Status | How it is enforced |
| --- | --- | --- |
| Public takedown intake | Done | `/copyright/report`, `AS-CPY-` references, status lookup |
| Moderator review queue and decisions | Done | `/admin-copyright`, hides infringing portfolio items and project files |
| Flagging, auto-hide and appeals | Done | Auto-hide at 3 flags, `content_appeals`, admin appeal review |
| Blocking and muting | Done | `blocked_users`, `muted_users`, enforced through `can_see_user` |
| Audit trail of moderation actions | Done | `moderation_actions`, `admin_audit_logs` (append-only) |

## 4. Accountability registers (Phase 4 — complete)

| Requirement | Status | How it is enforced |
| --- | --- | --- |
| Record of Processing Activities (Art. 30) | Done | 7 activities in `compliance_records`, `/admin-compliance` |
| Data Protection Impact Assessments | Done | 2 high-risk assessments with risk tables, linked to their activity |
| Approval gate on incomplete records | Done | `validate_compliance_record` trigger + `approvalBlockers` in the UI |
| Processor register and transfer mechanisms | Done | `data_processors` with DPA status and transfer basis |
| Data inventory and periodic review | Done | `data_inventory`, review dates with overdue alerts |

## 5. Retention enforcement (Phase 5 — complete)

Retention is no longer documentation only; the published register drives real deletions.

| Rule | Automated | Enforcement |
| --- | --- | --- |
| Server run logs — 90 days | Yes | `function_run_logs` purge |
| Unsubscribe tokens — 90 days | Yes | `email_unsubscribe_tokens` purge |
| Email send logs — 12 months | Yes | `email_send_log` purge (suppressions retained) |
| Technical metadata — 12 months | Yes | `contact_submission_audit` purge |
| Moderation records / appeals — 24 months | Yes | `content_flags`, `content_appeals` purge |
| Admin audit trail — 24 months | Yes | `admin_audit_logs` purge |
| Copyright notices — 3 years | Yes | `copyright_claims` purge |
| Account data after deletion request | Yes | Grace period expiry finalises the purge of the auth account and profile |
| Financial records — 7 years | No (by design) | Statutory retention; deletion is a manual, reviewed action |

Mechanism: `run_retention_purges()` (SECURITY DEFINER, pinned `search_path`) executes each
automated rule, records a `retention_runs` row per rule, and updates the register's
`last_run_at` / `last_deleted_count`. It is triggered daily at 03:15 UTC by a scheduled job
calling `POST /api/public/hooks/retention-sweep` (rejects any caller without the project key),
and on demand from **Admin → Compliance → Retention**, which shows every rule and the last 100 sweeps.

## 6. Testing (Phase 6 — complete)

`src/test/compliance/compliance.test.ts` covers the register approval gate (ROPA mandatory
fields, DPIA risk tables, overall risk level, linked activity), review-date overdue logic, and
the uniqueness/format of `AS-PRV-` and `AS-CPY-` references. These run with the existing smoke
and SEO suites via `bunx vitest run`.

---

## Remaining gaps (not fixable in code)

1. **Controller identity and contact details** — the legal documents need the registered
   company name, address and, where required, a representative in the EU/UK.
2. **Data Protection Officer / privacy contact** — appoint a named owner; the registers
   currently carry a generic role name.
3. **Signed DPAs with processors** — the register tracks DPA status, but the executed
   agreements with each provider must exist outside the app.
4. **NDPA registration** — Nigerian data-controller registration and annual audit filing.
5. **Breach response drill** — the incident tables exist; the 72-hour notification runbook
   should be rehearsed and the outcome recorded.
6. **Financial retention** — the 7-year rule is deliberately manual and needs a periodic
   reviewed deletion, not automation.
7. **Independent review** — a lawyer should review the published policies before store
   submission in regulated markets.