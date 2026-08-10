# Studio Ecosystem — V1.1 scope & operating notes

Studios are organizations (studio, agency, label, production company, collective)
that own a roster, gear and work. They reuse the existing creative tables through a
nullable `studio_id` rather than duplicating them.

## Authorization model

- `studio_role_capability(role, capability)` is the authoritative ceiling.
- `studio_members.permissions` (JSONB) may only **revoke** a capability the role
  already has. A trigger strips any key the role cannot hold, so escalation via
  member permissions is impossible.
- `has_studio_capability` evaluates role first, then the per-member revocations,
  then the lifecycle/entitlement gate.
- Management is blocked while a studio is inactive or its owner's Studio plan has
  lapsed. `view_analytics` and `delete_studio` stay reachable so the owner can
  inspect and resolve the studio.
- Owner accounts cannot be deleted while they own a studio: ownership must be
  transferred first (`transfer_studio_ownership`), enforced by FK RESTRICT and by
  the account-deletion server function.

## Privacy

- `get_public_studio` returns coordinates rounded to 2 decimals (~1 km).
- Public gear/team/work reads go through bounded, paginated RPCs.
- Private studio media lives in the private `studio-private-media` bucket; public
  assets stay in the public studio buckets.

## Performance

- Every studio FK is indexed, including `portfolio_items.studio_id`.
- Equipment lists are paginated in 24-item pages (public and management).
- Trigram indexes are **deliberately deferred**: directory search filters on
  indexed `handle`/city columns at current volume. Revisit when the directory
  passes roughly 10k studios or search latency exceeds ~200 ms.

## Audit, retention & ROPA

- `log_studio_audit` triggers write lifecycle and security events (creation,
  ownership transfer, activation, roster changes, invitations, verification) to
  `admin_audit_logs`.
- `retention_policies` covers studio profiles, membership, invitations, gear,
  follows and audit entries. Only resolved invitations purge automatically
  (12 months); everything else is owner-driven or legal-hold retained.
- `data_inventory` carries the matching ROPA entries with classification and
  visibility.

## Deliberate scope decisions

- **`studio_follows`** ships as data + library support only. There is no follower
  feed or follower-count surface in V1.1; the table exists so following is not a
  breaking migration later.
- **Org types** intentionally include agency, label, production company and
  collective. They share one schema and differ only in the public label, which
  avoids parallel tables for near-identical entities.
- **Deferred to V1.5+**: studio bookings, paid session flows, multi-studio
  ownership, studio-level billing, follower feeds, trigram search.
## V1.5-A — Services integration

One marketplace, one service entity. Studio listings are ordinary `public.services`
rows with a nullable `studio_id`; there is no parallel studio service table, order
table or review table.

- `services.studio_id` → `studios(id) ON DELETE SET NULL`, partial index on non-null values.
  Deleting a studio therefore never deletes trading history — the listing simply
  reverts to a personal service owned by `seller_id`.
- `seller_id` remains the responsible human and is validated by
  `validate_studio_service()`: a studio service's seller must be an *active*
  member of that studio.
- New capabilities in `studio_role_capability`:
  - `manage_services` — owner, admin, manager
  - `delete_services` — owner, admin
  Both flow through `has_studio_capability`, so the lifecycle/entitlement gate
  (`studio_management_allowed`) soft-locks service management when a studio is
  deactivated or the owner's Studio plan lapses. Existing listings stay live-owned
  by the studio but become unmanageable until resolved; nothing is deleted.
- RLS: the personal policy is scoped to `studio_id IS NULL`, so studio rows are
  governed exclusively by capability policies. Public SELECT additionally requires
  the studio to be `is_active`, `visibility = 'public'` and not hidden; studio
  members can always read their own studio's listings, including unpublished ones.
- Surfaces: Services tab in `/studios/:handle/manage`, a Services tab on the
  public studio page, and studio attribution (linking to `/studios/:handle`) on
  Marketplace cards. Ordering, reviews, payouts and moderation are untouched.
- Out of scope for this slice: studio-level order dashboards, payouts splitting,
  bookings/availability and studio analytics.
