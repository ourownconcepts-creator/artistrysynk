# Creative Talent Hunt Source Port

Source of truth:

- `ourownconcepts-creator/artistrysynktalenthunt`
- `main` branch

Destination:

- `ourownconcepts-creator/artistrysynk`
- `src/features/competitions/`

## Porting rule

The Talent Hunt repository is the source application. Its competition capabilities are being adapted into the ArtistrySynk platform rather than copied as a standalone application.

### Source capabilities being retained

1. Competition configuration and lifecycle
2. Categories and rounds
3. Contestant applications and submission lifecycle
4. Admin/moderator review
5. Judge appointments and round assignments
6. Configurable scoring criteria
7. Judge scoring and comments
8. Round progression
9. Public voting and vote controls
10. Contestant dashboards and journey tracking
11. Public contestant profiles
12. Announcements
13. Sponsors
14. Audit logging
15. ArtistrySynk identity/profile integration

### Destination architecture

- Directory identity remains owned by ArtistrySynk.
- Competition participation remains under `competition_*` tables.
- Creative-specific rules stay in the Creative Talent Hunt adapter.
- Future Sports, Football, Gaming and other competitions must not add domain-specific fields to the shared competition core.

## Deliberately excluded

No Zik's Got Talent project or repository is part of this migration.

## Current phase

Repository port first. Lovable/database synchronization follows after the repository implementation has been reconciled and tested.
