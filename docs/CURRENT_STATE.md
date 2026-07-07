# CURRENT_STATE

Factual snapshot. **Rewrite this file after each milestone** — do not append history.

_Last updated: 2026-07-07_

- **Branch:** `main`
- **Latest relevant commit:** `af75a82` — registry-driven weighted-scoring engine (Rubric Engine stage 2)

## Working features (verified this week)

- AI provider chain Gemini → Groq; every AI route requires sign-in and is per-user rate-limited.
- Competition Specification Registry: schema, APIs, attribution banners, 4 seeded specs.
- Debate: AI opponent + judge (registry-attributed) + argument-flow analyzer in replay.
- DECA: registry-sourced role-play scenarios, in-character objection rounds, split scoring.
- HOSA Medical Terminology: 54 original questions, official 50q/60min mode, confidence + explanations,
  spaced-review wiring.
- Model UN: practice sandbox (committee mechanics + AI-inferred policy brief + 4-dimension rapporteur),
  labeled non-official.
- Spaced reassessment, Study Arcade, nav IA, coach teams/assignments.
- Rubric Engine: weighted-scoring engine built + smoke-tested; wired live for HOSA MT (registry-normalized
  points). Dormant for DECA (see blockers).

## Known broken / partial

- **Model UN registry spec is PLACEHOLDER** — sandbox only, no sourced conference.
- **DECA non-Hospitality clusters** degrade to labeled generic practice (no sourced PIs).
- **DECA HLM per-category point split is placeholder** — weighted scoring dormant until sourced.
- No unit-test runner; safety net is `*:smoke` scripts.

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

`npm run build`, `typecheck`, `lint`, and all 14 `*:smoke` suites (security, judge, judge-shape,
rubric-scoring, auth, audio-debate, team, assignment, games, tracks, side-coach, debate-replay,
learning-path, avatar).

## Immediate next task

See `docs/NEXT_TASK.md` — Rubric Engine stage 2: source DECA's current per-category point split.

## Blockers

DECA weighted scoring is blocked on an authoritative **current** (2025-26+) DECA Individual Series
per-category point split. The only exact split found was from a 2014 form (since changed); not usable.
