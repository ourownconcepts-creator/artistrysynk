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

## Scoring parity finding — must resolve before launch

The source implementation in `drizzle/migrations/0000_phase3_competition_operations.sql`
calculates a combined result using the competition's configured `judge_weight` and
`public_weight`. Valid public votes are normalized against the highest valid vote
count in that round before applying the public-vote weight.

The destination now has a weighted-scoring migration at
`supabase/migrations/20261009190000_creative_talent_hunt_weighted_scoring_parity.sql`.
It reads `judge_weight` and `public_weight` from `competition_competitions.config`,
normalizes valid public votes against the highest valid vote count in the round, and
applies the configured percentages to the judge and public components. Both admin
and public result RPCs use the same formula. If weights are absent or invalid,
`combined_score` is NULL and the public leaderboard shows that scoring setup is
pending instead of fabricating a score or rank.

The source repository does not provide the live configured weight values, so no
ratio has been invented. Before launch, recover the intended values or approve an
explicit scoring policy, set the competition config, and verify edge cases including
zero votes, voided votes, missing judge scores, and missing/invalid weights. Scoring
criteria configuration also needs to be confirmed; do not seed invented criteria or
weights. The migration is committed to the repository branch, not applied to a live
database.
