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

## Scoring parity implementation and launch checks

The source implementation in `drizzle/migrations/0000_phase3_competition_operations.sql`
normalizes valid public votes against the highest valid vote count in the round and
combines that normalized public component with judge scores using configured weights.

The destination migration
`supabase/migrations/20261009190000_creative_talent_hunt_weighted_scoring_parity.sql`
now applies the same normalized, weight-driven approach in both admin and public
result RPCs. It reads `judge_weight` and `public_vote_weight` from
`competition_competitions.config` and normalizes by their sum, preserving the
destination's existing weight convention. The existing foundation migration seeds
`judge_weight: 1` and `public_vote_weight: 0`, which means judge-only results until
an administrator intentionally configures a public-voting contribution. The public
results RPC also respects `leaderboard_published`; unpublished results are not
returned to public callers.

The judging migration seeds five open-entry criteria: Creativity, Skill / Execution,
Originality, Presentation / Impact, and Overall Potential. Confirm these criteria and
weights are appropriate for the launch round before enabling judging. If either
scoring weight is absent or invalid, combined scores are NULL rather than fabricated.
The source repository does not establish the intended live judge/public ratio, so no
new ratio has been invented.

The migration is committed to the repository branch, not applied to a live database.
Before launch, verify the chosen weights and criteria, then test zero votes, voided
votes, missing judge scores, invalid/missing weights, and the unpublished leaderboard
gate.
