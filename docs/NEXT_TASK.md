# NEXT_TASK

Exactly one active milestone. When done, rewrite this file with the next one.

## Milestone: Rubric Engine stage 2 — source DECA's current per-category point split

**Status: BLOCKED on sourcing.** The weighted-scoring engine is already built, smoke-tested, and live for
HOSA MT. It stays dormant for DECA until a real, current per-category point split is sourced. Do **not**
fabricate point values to "finish" it — a blocked milestone that stays honest is the correct state.

### Objective

Find an authoritative **current (2025-26 or later)** DECA Individual Series role-play per-category point
split (per-performance-indicator points + 21st Century Skills + any overall component = 100). If found and
verifiable, seed it into the registry (sourced) so `judgeDecaRoleplay` computes a genuine weighted overall.

### Why it matters

The engine (`computeWeightedOverall`, `getWeightedScoringRubric`, `judgeDecaRoleplay` weighted branch)
exists but only activates on fully-sourced multi-category point data. DECA is the closest candidate;
sourcing it turns registry-driven numeric scoring from "built" into "live for a real event."

### Allowed files / subsystem

Registry seed data (`scripts/seed-competition-specs.ts`) and, if needed, the DECA judge wiring in
`lib/ai.ts` / `lib/competition-specs.ts`. New source references in the spec's `officialReferences`.

### Do NOT touch

Other tracks' specs, non-DECA judges, UI beyond what surfaces the DECA breakdown, auth/rate-limit code,
the DB schema.

### Acceptance criteria

- The per-category point split comes from an authoritative source whose **actual date** (not URL) is
  confirmed current. Cite it in `officialReferences` and mark provenance sourced.
- OR, if no valid current source is found: leave DECA placeholder, document the search + why it's still
  blocked here, and stop. That is a valid, complete outcome.
- If sourced: `getWeightedScoringRubric("DECA","ROLEPLAY")` returns the categories; a live DECA judge call
  returns `scoringMode: "registry-weighted"`; changing a category score changes the overall by the
  mathematically correct amount.

### Required tests

`npm run build`, `npm run rubric-scoring:smoke`, `npm run judge-shape:smoke`, `npm run security:smoke`.
If seeded, verify live weighted math after an approved re-seed.

### Risks

Shipping stale/guessed point values as "official" (the primary failure mode — the 2014 form trap). Always
verify source recency.

### Stop conditions

Stop and report if: no authoritative current source is found; the source conflicts with the seeded round
structure; or seeding would require a DB write.

### Approval-required actions

`specs:seed` / any DB write, push, deploy. Show the diff and the source, and wait.
