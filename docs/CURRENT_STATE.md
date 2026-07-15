# CURRENT_STATE

Factual snapshot. **Rewrite this file after each milestone** — do not append history.

_Last updated: 2026-07-11_

- **Branch:** `main`
- **Latest relevant commit:** DECA Full Simulation (this milestone); preceding `baba32c` — DECA concept-drill
  bank wired to mastery + spaced review

## Working features (verified this week)

- AI provider chain Gemini → Groq; every AI route requires sign-in and is per-user rate-limited.
- Competition Specification Registry: schema, APIs, attribution banners, 4 seeded specs.
- Debate: AI opponent + judge (registry-attributed) + argument-flow analyzer in replay.
- DECA: registry-sourced role-play scenarios, in-character objection rounds, split scoring.
- DECA concept drills: 36 original questions across 4 areas (performance indicators, business reasoning,
  customer relations, marketing) in the Study Arcade; graded server-side, writes real MasteryProgress +
  spaced review per skill (only `deca-marketing` is seeded today, so the other 3 skip honestly).
- DECA Full Simulation: one timed end-to-end round in the Study Arcade (official prep clock → pitch →
  objection round → scored ballot) chaining the existing registry role-play AI + rubric — no new AI path.
  Provenance honest: registry attribution only on the Hospitality/HLM path; weighted scoring stays dormant
  (HLM point split placeholder), ballot degrades to seed mode.
- HOSA Medical Terminology: 54 original questions, official 50q/60min mode, confidence + explanations,
  spaced-review wiring.
- Model UN: practice sandbox (committee mechanics + AI-inferred policy brief + 4-dimension rapporteur),
  labeled non-official.
- General Debate drill depth: 36 original concept questions across 4 skills (claim/warrant/impact,
  rebuttal, evidence evaluation, weighing) in the Study Arcade; each writes real MasteryProgress +
  spaced review per skill. All 4 skills seeded and verified live.
- Spaced reassessment, Study Arcade, nav IA, coach teams/assignments.
- Rubric Engine: weighted-scoring engine built + smoke-tested; wired live for HOSA MT (registry-normalized
  points). Dormant for DECA (see blockers).

## Track drill depth (real content feeding MasteryProgress)

- **HOSA MT:** real — 54-question bank + spaced review.
- **General Debate:** real — 36-question concept bank across 4 seeded skills + written-response drill.
- **DECA:** real concept bank — 36 questions across 4 areas + Full Simulation timed round. Mastery
  writes for `deca-marketing` today; the other 3 skills (`deca-performance-indicators`,
  `deca-business-reasoning`, `deca-customer-relations`) skip honestly until seeded (surgical upsert
  pending). Role-play judging still writes no drill mastery; point-split sourcing blocked (see below).
- **Model UN:** empty — placeholder sandbox, no drills.

## Known broken / partial

- **Model UN registry spec is PLACEHOLDER** — sandbox only, no sourced conference.
- **DECA non-Hospitality clusters** degrade to labeled generic practice (no sourced PIs).
- **DECA HLM per-category point split is placeholder** — weighted scoring dormant until sourced.
- **HOSA/MUN still route through the legacy generic debate room; HOSA needs the DECA-style guided
  treatment** (parity work queued next). DECA no longer renders the generic `TrackPracticeSetup`
  launcher — it is fully served by DecaRoleplay + Full Simulation.
- No unit-test runner; safety net is `*:smoke` scripts (16 suites).

## Gemini status

Key + model valid. Free tier caps at ~20 requests/day per model → intermittent 429/503. **Groq fallback
handles this** and is the effective primary. Not a code bug; a quota/redundancy characteristic.

## Vercel status

Production at `debate-arena-ai.vercel.app`; auto-deploys from `main`. Upstash rate-limiting configured in
prod env.

## Environment variables (names only — never store values here)

`GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`,
`OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER`, `AI_COST_MODE`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`,
`EMAIL_FROM`, `APP_URL`, `UPLOADTHING_TOKEN`.

## Recent security work

All AI routes gated (auth + rate-limit, auth-before-limit-before-parse); `apiError` returns real 401s
(not misclassified as 503); `security:smoke` scans all AI routes recursively.

## Tests known to pass

`npm run build`, `typecheck`, `lint`, and all 16 `*:smoke` suites (security, judge, judge-shape,
rubric-scoring, debate-drills, deca-drills, auth, audio-debate, team, assignment, games, tracks,
side-coach, debate-replay, learning-path, avatar).

## Immediate next task

Track Simulations, remaining tracks (sequenced follow-ups to the DECA Full Simulation):
**HOSA Medical Terminology** — client-timed official 50-item/60-min exam round (no DB change); and
**Public Forum** — surface the existing debate chain as a registry-attributed Full Simulation (no
crossfire modeling). Also still open: `docs/NEXT_TASK.md` — Rubric Engine stage 2 (source DECA's current
per-category point split) and the surgical seed of the 3 unseeded DECA drill skills.

## Blockers

DECA weighted scoring is blocked on an authoritative **current** (2025-26+) DECA Individual Series
per-category point split. The only exact split found was from a 2014 form (since changed); not usable.
