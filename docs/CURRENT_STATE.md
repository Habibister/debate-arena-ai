# CURRENT_STATE

Factual snapshot. **Rewrite this file after each milestone** — do not append history.

_Last updated: 2026-08-07 (M14 Phase 2c — HOSA suffix bank 9→30, human-reviewed and approved, local only)_

## M14 Phase 2c — the HOSA suffix bank is 30 deep, human-reviewed, local only

Audit **G2**, third slice. **Suffixes 9 → 30** (`sf-10`…`sf-30`, +21); bank total **96 → 117**.
Word roots and prefixes stay at 30; anatomy, physiology and pathophysiology stay at 9.

- **Content-only change** — no schema, migration, seed, route, session-protocol, validator, XP,
  mastery, review or client change, the same as 2a and 2b.
- **Every addition was classified as a TRUE suffix first.** Four candidates from the plan were
  **deliberately rejected** rather than forced in: `-poiesis` (meaning collides with `-genesis`),
  `-rrhagia` (too close to `-rrhea`), `-stenosis` (composes `-osis`, which this slice teaches) and
  **`-edema`** — a standalone term rather than a clean suffix, the same error class that put
  `olig/o` in the prefix bank in 2b. `-malacia` (softening) was added in their place, pairing with
  `-sclerosis` (hardening).
- **A focused 20-question session in EVERY expanded area now serves 20 distinct items** with no
  padding, and each is still refused review on breadth alone. Padding survival moved to **anatomy**.
- **The additive allowlist gained one explicit entry** (`sf-*` → suffixes), still anchored to the
  immutable `398860f`; the `31f-C2` rejected fixture moved `sf-10` → **`an-10`**, and the byte-identical
  branch is now driven by `MEDTERM_AREAS` rather than a hardcoded list so future slices need one edit.

**Human content review is COMPLETE (2026-08-07).** The 21 suffix items were AI-authored and the
repository owner then personally read all of `sf-10`…`sf-30` and approved their suffix
classification, terminology meanings, answer uniqueness, distractors, wording, explanations and
examples — specifically approving the refined `sf-18` (claustrophobia, replacing *photophobia*, which
denotes light sensitivity rather than fear), `sf-27` (abnormal condition, generic increase sense
removed) and `sf-29` (scoped to `-cytosis`), plus the previously reviewed non-blocking conventions.
**The approval rests on that human reading alone; the earlier AI pre-screen was the authoring model
checking its own output and formed no part of it.** Per `CLAUDE.md` the AI-authoring provenance stays
labelled in the source permanently. **The push gate is lifted.**

An error in the pre-screen COMMENTARY — associating "rupture" with `-rrhagia` when `-rrhexis` is
rupture — was confined to chat and verified absent from tracked content; `sf-17` was correct and was
not changed.

**One terminology-convention concern recorded for human review, deliberately NOT acted on:** the
existing `sf-04` teaches `-ology`, though strictly the ending is `-logy` with the `o` supplied by the
preceding combining form. `sf-26` (`-logist`) shares that property. `sf-04` was not rewritten — it is
pre-existing content outside this slice's scope — but the convention should be settled deliberately
rather than spread further by default.

**Weighting after 2c:** word-roots / prefixes / suffixes ~25.6% each, the three unexpanded areas
~7.7% each. Better than after 2b (two areas at 31.3%); the skew shrinks with each slice and reaches
parity at 2e. Correctness unaffected — breadth counts distinct areas, not proportions.

**Local commit only — not pushed, not deployed. No database operation.**

## M14 Phase 2b — the HOSA prefix bank is 30 deep, human-reviewed, local only

Audit finding **G2** continues, one area per slice. Phase 2b takes the **second** area to depth:

- **`lib/hosa-medterm.ts`: prefixes 9 → 30** (`pr-10`…`pr-30`, +21). Bank total **75 → 96**. Word
  roots stay at 30; suffixes, anatomy, physiology and pathophysiology stay at 9 and follow in later
  slices.
- **Content-only change.** No schema, migration, seed, route, session-protocol, validator, XP,
  mastery, review or client change — the same architecture that absorbed Phase 2a.
- **Every new prefix is already implied by this bank**: its meaning appears among existing
  distractors or inside an existing explanation (`hypo-`, `inter-`, `post-`, `pre-`, `re-`, `ad-`,
  `ab-`, `mono-`, `bi-`, `tri-`, `hemi-`, `trans-`, `epi-`, `extra-`, `retro-`, `macro-`, `micro-`,
  `neo-`, `mal-`, `anti-`, `olig-`). Verified: 4 choices each, `correctAnswer` in its own choices, no
  duplicate choices, no duplicate answers across all 30 prefixes, no duplicate stems, no answer
  leakage.
- **A focused 20-question prefix session now serves 20 distinct items with no padding**, clears the
  10-distinct count floor, and is still refused review on **breadth alone** (1 area < 3).
- **The additive-integrity assertion was extended, not loosened.** `31f*` now carries an explicit
  per-area allowlist — `wr-*` → word-roots (2a), `pr-*` → prefixes (2b) — still anchored to the
  immutable `398860f`. Every original item in an expanded area stays byte-identical and ordered; the
  four unexpanded areas stay byte-identical in content and count; `wr-01`…`wr-09` and `pr-01`…`pr-09`
  are individually pinned. The control that proved `pr-10` was rejected **inverted**, so it was
  replaced with `sf-10` plus four more unapproved fixtures, keeping the allowlist non-vacuous.
- **The padding-survival example moved from prefixes to suffixes**, since prefixes no longer pads at
  count 20 — that example must always name an area still holding 9.

**Human content review is COMPLETE (2026-08-07).** The 21 prefix items were AI-authored and the
repository owner then personally read all of `pr-10`…`pr-30` and approved their prefix meanings,
answer uniqueness, distractors, wording, explanations and suitability for CompeteReady — specifically
approving the revised `pr-20` (`hemi-`, using `hemithorax`) and the replacement `pr-30` (`pseudo-`,
superseding an `olig-` item that mislabelled a combining form as a prefix). **The approval rests on
that human reading alone; the earlier AI pre-screen was the authoring model checking its own output
and formed no part of it.** Per `CLAUDE.md` the AI-authoring provenance stays labelled in the source
permanently — approval changed the review status, not the provenance. **The push gate is lifted.**

**Unfiltered-draw weighting, reported not fixed:** with two of six areas at depth, an unfiltered
session now draws ~31% word-roots, ~31% prefixes and ~9% from each unexpanded area. This does not
affect correctness — evidence breadth counts distinct areas, not proportions — and it self-corrects
as the remaining four reach 30. Per-area balancing would be a runtime change and stays out of a
content-only slice.

**Local commit only — not pushed, not deployed. No database operation.**

## M14 Phase 2a — the HOSA word-root bank is 30 deep, in local code only

Audit finding **G2** (P0): every drill area held 9 questions, so a 20-question request served 20
slots over 9 distinct items and mastery measured recall of those nine. G2 prescribes **≥30 per
area**, one area per session. Phase 2a takes the **first** area to depth:

- **`lib/hosa-medterm.ts`: word roots 9 → 30** (`wr-10`…`wr-30`, +21). Bank total **54 → 75**. The
  other five areas are deliberately untouched at 9 and follow in later Phase 2 slices.
- **Content-only change.** No schema, migration, seed, route, session-protocol, validator, XP,
  mastery, review or client change was needed — `buildMedTermSession` slices whatever the pool
  holds, the session route dedups to distinct item rows and pads the order dynamically, and grading
  reads the issued snapshot rather than the live bank.
- **Every new root already appeared in this bank** as a distractor or inside an existing
  explanation (`my`, `cerebr`, `cost`, `cyst`, `hyster`, `hist`, `hydr`, `ot`, `ophthalm`, `dent`,
  `pneum`, `arthr`, `rhin`, `angi`, `phleb`, `enter`, `col`, `crani`, `myel`, `lip`, `aden`), so
  nothing widens the event's scope. Verified: 4 choices each, `correctAnswer` present in its own
  choices, no duplicate choices, no duplicate answers, no duplicate roots, no answer leakage.
- **The observable effect G2 asked for:** a focused 20-question word-roots session now serves **20
  distinct** questions with **no padding**. It clears the 10-distinct count floor and is *still*
  refused review — now on breadth alone (1 area < 3). The padding path itself survives for areas not
  yet expanded, asserted against prefixes.
- **Two byte pins were narrowed, neither removed.** `hosa-medterm-evidence:smoke` now proves the
  bank is **additive-only** against the immutable parent `398860f`: all 54 pre-existing items
  byte-identical and in original order, the five non-word-root blocks byte-identical, `wr-01`…
  `wr-09` individually pinned, and the only permitted delta is `wr-NN > 09` in the word-roots area.
  `review-ladder:smoke` dropped a **HEAD-relative** hash on the bank (it would have gone green the
  moment this commit landed) in favour of behavioural inertness assertions: no XP symbol, no mastery
  symbol, no prisma/fetch/session/review reach, the pure persistence request still returning null on
  insufficient evidence, both evidence floors unchanged, and the neighbouring Debate/DECA banks not
  importing it — each with non-vacuous controls.

**Human content review is COMPLETE (2026-08-06).** The 21 items were AI-authored and the repository
owner then personally read all of `wr-10`…`wr-30` and approved them for medical accuracy, clarity,
distractor quality, originality, explanation correctness and CompeteReady terminology conventions.
The owner specifically confirmed the three dual/standard-meaning items — `pneum` (lung or air),
`myel` (spinal cord or bone marrow) and `cyst` (bladder or sac) — as correct terminology, and
confirmed the `cerebr/o`, `enter/o` and `col/o` refinements. **The approval rests on that human
reading alone; the earlier AI pre-screen was not independent verification and formed no part of it.**
Per `CLAUDE.md` the authoring method stays labelled in the source regardless of approval.

**Carried stylistic follow-up, deliberately not a blocker:** the bank mixes bare roots (`hist`,
`arthr`, `cost`) with combining forms (`cerebr/o`, `enter/o`, `col/o`). Standardising on combining
forms across all 30 items is desirable but was explicitly excluded from Phase 2a.

**Local commit only — not pushed, not deployed. No database operation.**

## M14 status — Phases A and 1a–1d are DEPLOYED; Phase 1e G19 is local

The five-commit M14 stack (`a054706` audit, `66e7dd6` 1a, `8a7a74f` 1b, `a29e506` 1c, `a37959c` 1d)
was pushed as a normal fast-forward and **deployed to Production** — GitHub deployment `5785864553`,
`Production`, `success`, tied to exact commit `a37959c1500c405d0302e769996d9f850020707e`, verified
read-only with public route checks (all 200/307-to-signin, zero 5xx; the live `/signup` page no
longer offers Public Speaking). **Authenticated Production behavior remains untested** — no learner
action, no judging, no XP/rank/wins/streak/completion, and no database operation was performed in
any verification pass.

**M14 Phase 1e (G19) is complete locally and unpushed.** The Study Arcade's two fake-progress
claims are gone:

- The header no longer says decks, games and drills all "feed your real mastery record" — the
  recording claim is scoped to the drills (which do record), and decks/games are labeled honestly:
  "decks and games aren't recorded."
- The record tile no longer says "every arcade rep updates your real mastery progress" — its
  (always-honest) count is now attributed to "real drill sessions", with the same unrecorded label.
- `games:smoke` gained a `G19-*` regression block: bans on both former claims plus a generic
  decks/games-feed-mastery pattern over comment-stripped, whitespace-normalized source; presence
  checks for the truthful copy; and a **both-directions reality pairing** — every file under
  `components/study/` is verified to make no `fetch`/`prisma` call, so if decks or games ever start
  recording, the suite forces the copy and the check to move together. Five non-vacuous controls.

**Phase 1e (G20) — DECA skill activation — was explicitly authorized and executed 2026-08-06,**
and the result was unexpected and is recorded honestly: `npm run deca:skills:activate -- --apply`
reported **0 created, 3 already present, 0 conflicts**. All three `Skill` rows
(`deca-performance-indicators`, `deca-business-reasoning`, `deca-customer-relations`) already
existed with **exactly** the approved fields — the script's fail-closed classifier reports
"already present" only on an all-field match. **The authorized run therefore performed reads and
zero writes.** When and by what the rows were created cannot be established from this repository
and is not attributed; the audit's G20 finding was about `prisma/seed.ts` (which still seeds only
`deca-marketing`) and remains accurate about the code. What matters for learners is verified: all
four `DECA_DRILL_SKILL_SLUGS` resolve (read-only check), a second `--apply` is idempotent, and
`deca-mastery:smoke` passes — **every DECA drill area now records mastery and schedules review.**

## M14 Phase 1d — Debate ballots name only real participants (deployed)

Audit finding G21: every Debate ballot displayed **four ranked speaker cards** — "Government 1/2",
"Opposition 1/2" — synthesised by splitting each side's aggregate metrics, for a round that has
exactly two participants. Phase 1d removes the fabrication:

- **One card per real participant.** The card roster derives from the authoritative round evidence
  the judge flow already holds — the persisted `studentSide`/`opponentSide` and the transcript —
  so a two-person round shows **exactly two cards**, ranked 1–2, in round order
  (Government/Affirmative first). No placeholder names, no fixed four-card array, no duplication,
  no card for a role that never appeared, and speech count cannot mint participants.
- **Identity is server-controlled.** Card labels are the shared side labels; a new `role` field
  ("student"/"opponent") carries the learner-vs-opponent distinction without exposing account data.
  Transcript content claiming other identities never reaches a card.
- **The model has no participant channel — proven behaviourally.** The Debate ballot is built by
  the deterministic transcript analyzer; the AI contributes prose only, through
  `mergeJudgeEnhancement`'s explicit whitelist. The suite runs the real merge against a hostile
  enhancement that injects four fabricated cards and a flipped winner: the authoritative cards
  survive byte-for-byte and the winner stands. An enhancement with no usable prose merges to null,
  which the judge flow treats as the labelled local-fallback prose path — scores stay
  transcript-derived either way, so no fabricated success can occur and the debate remains
  retryable with all XP/rank/wins/streak/completion writes untouched by any failure.
- **The public result type migrated deliberately**: `rank: 1 | 2`, `role` added — not an empty
  four-slot array. The ballot renderer shows the two real cards with "(you)" / "(your opponent)"
  as text (never colour alone); team-level rubric scoring, winner, reasoning, feedback, provenance,
  XP, rank, wins/streak and replay behaviour are unchanged.
- Pinned by the `P1d-*` block in `judge:smoke` — behavioural tests against the real judge and the
  real merge, plus comment-stripped source scans with non-vacuous controls (a padded roster, a
  duplicated participant and a re-introduced name literal are each proven caught).

DECA and HOSA judging behaviour untouched. **Deployed in `a37959c`. No database operation.**

## M14 Phase 1c — DECA judging fails closed (deployed)

Audit finding G18: when every AI provider failed, the DECA judge returned a **canned ballot** —
hardcoded category scores and generic strengths that never touched the learner's transcript — and
then stamped it with the official registry spec, in every environment including Production. Phase 1c
removes that path entirely:

- **`judgeDecaRoleplay` passes no fallback.** On provider failure, malformed output, an incomplete
  rubric or a validation miss, `jsonCompletion` now **throws** the repository's retryable
  unavailable error, and both consuming routes map it through `apiError` to the existing **503
  "AI is temporarily unavailable. Please try again in a moment."** contract. No ballot, no scores,
  no attribution, nothing persisted.
- **A stricter DECA-only validator** (`isTrustworthyDecaJudge`) sits on top of the shared shape
  check: the overall and every category score must be finite numbers, so NaN/Infinity output fails
  closed too. No other organization's validation behaviour changed.
- **Official registry/spec attribution is structurally limited to validated successful results** —
  the stamp sits after the judge call, and every failure now throws before it. A fallback ballot can
  no longer exist, let alone be stamped.
- **A failed DECA judging awards nothing and completes nothing.** In the debate judge route every
  write — XP, rank, wins, streak, the `JUDGED` status — sits after the judge call, so the throw
  skips them all; the debate row stays `ACTIVE` and retryable with its transcript intact. The
  dedicated `/api/ai/judge-deca` route persists nothing at all. Both clients already surface the
  503 as a retryable error message.
- **Non-DECA behaviour is unchanged:** `fallbackPerformanceJudge` remains for its HOSA consumer
  (unreachable from routes since Phase 1b, deliberately untouched), Model UN keeps its own
  fallback, Debate judging and the Phase 1b HOSA 410 guards are intact — all asserted.
- Pinned by 16 new `P1c-*` assertions and 5 non-vacuous controls in `judge-shape:smoke`, over
  comment-stripped source; its live retry loop now treats a **throw** as the providers-unavailable
  signal, and a fallback-tagged DECA result is asserted impossible.

No learner data was migrated or deleted. **Deployed in the `a37959c` stack. No database
operation.**

## M14 Phase 1b — the withdrawn HOSA clinical judging is closed everywhere (deployed)

M11R6 withdrew generic HOSA clinical role-play and its AI judging; `/api/ai/hosa-scenario` and
`/api/ai/judge-hosa` fail closed with 410. The M14 audit (finding G23) showed the **generic** debate
paths bypassed that withdrawal: `POST /api/debates` accepted `organization: "HOSA"` unguarded, and
the debate judge route dispatched HOSA rows to `judgeHosaPerformance`, persisted the ballot, and
awarded XP, wins and streak. Phase 1b closes both:

- **Creation:** `POST /api/debates` refuses `organization: "HOSA"` with the identical 410 contract —
  after auth and body validation, **before any database read or write**. No Debate row, no messages,
  no attempts, no XP, no mastery, no review, no wins, no streak. HOSA is never silently remapped.
- **Judging:** an existing HOSA row is refused with the same 410 after auth, rate limiting and the
  ownership fetch — **before any judge call, fallback ballot, registry/spec attribution, XP, rank,
  wins, streak or completion write**. `judgeHosaPerformance` is no longer imported or called by any
  route. Existing HOSA rows were kept, not deleted or migrated; they are simply impossible to judge.
- The refusal body and status live in one shared helper (`hosaWithdrawn()` in `lib/api.ts`) whose
  text is pinned to the dedicated endpoints' literal by `hosa-practice-scope:smoke`, so the two
  contracts cannot drift apart. The dedicated endpoints themselves are byte-unchanged.
- Debate and DECA creation and judging, their response shapes, XP amounts, rating, and the carried
  wins/streak behaviour (`practice-session:smoke` 144–144c) are all unchanged, asserted by suite.
- 13 new assertions and 5 non-vacuous controls in `hosa-practice-scope:smoke` cover ordering,
  the absent dispatch, contract equality and non-HOSA preservation — over comment-stripped source,
  since the routes describe in prose exactly what they refuse.

**Deployed in the `a37959c` stack. No database operation occurred in the code change itself.**

## M14 Phase 1a — the first run is track-correct (deployed)

The learner's signup organization now resolves their training track. Before this pass nothing read
the stored organization, and the only writer of the track cookie was the client switcher — which
initialises to General Debate — so a student who signed up for DECA or HOSA landed in General Debate
and never saw their own track by default (audit finding G24).

- **Precedence, first match wins:** a valid explicit `?track=` → the signed-in learner's persisted
  organization → a valid track cookie → the existing fail-closed default. Implemented as a pure
  function (`pickActiveTrack` in `lib/track-server.ts`) with the request plumbing kept separate, so
  every ordering case is tested as behaviour.
- **Only organizations with a live track resolve** (Debate, DECA, HOSA). `PUBLIC_SPEAKING`,
  `MOCK_TRIAL`, retired `MODEL_UN`, malformed and missing values are treated as absent and fall
  through to the cookie — an invalid organization can never override a valid cookie.
- **The resolver still never writes** — no cookie, no row — and the session read is wrapped in a
  per-request cache so pages that already load a session pay no second user lookup. An explicit
  `?track=` short-circuits before any session or cookie read.
- **Public Speaking is no longer selectable at signup** (`components/auth/sign-up-form.tsx`): no
  Public Speaking track exists and no Public Speaking lesson is registered, so the option led
  nowhere. It is not silently remapped; existing records that carry it simply resolve no track.
- `getActiveTrack`/`resolveActiveTrack` became async; the twelve calling pages await them. All
  affected routes remain dynamically rendered, exactly as before.
- Two suites byte-pinned the two index pages this converted; those pins were replaced by a diff
  against the **immutable pre-Phase-1a commit** (`a054706`) in which every changed line must be
  exactly the async/await conversion — any other edit fails. The precedence itself is covered by
  new `P1a-*` assertions in `tracks:smoke`, each with a non-vacuous control.

**Deployed in the `a37959c` stack.** No schema change, no migration, no seed, no dependency, no
env change, **no database operation**. `docs/M14_LEARNING_QUALITY_AUDIT.md` (`a054706`, also
deployed) is the audit this implements the first subphase of.

## M13E2 — server-bound practice sessions: PUSHED AND DEPLOYED

**M13E2 is complete, pushed and deployed.** The eight-commit Phase C stack was pushed as a normal
fast-forward on 2026-08-06 and **Production now runs
`bb397350029975520e0b96c1c741e7f873f59086`**. Phase B (`npm run db:push` against the shared
Production database) is complete, so the practice-session enums, tables, foreign keys, indexes and
unique constraints are **active in the database**.

Deployment was verified read-only from commit-linked GitHub metadata: deployment `5783679689`,
environment `Production`, state `success`, tied to that exact SHA. Public checks confirmed `/` and
`/signin` return 200, eleven protected routes each return one 307 to `/signin?callbackUrl=…` then
200, no route returned 5xx, and the new session/check/submit routes return **401** unauthenticated
(a control confirmed unknown API paths under the same prefixes return 404, so the 401s are the real
handlers). **Authenticated Production practice behavior remains untested** — no learner session has
exercised issue → check → submit in any environment.

**The application is no longer mid-cutover.** Debate drills, DECA drills, HOSA Medical Terminology,
guided lesson practice and Debate Writing all use the **same** server-issued session protocol end to
end, in Production.

### What the protocol guarantees, in local code

- **The server issues the work.** Session start picks the questions or the writing scenario
  server-side, shuffles each question's choices, mints an opaque `crypto.randomUUID()` id per served
  choice, stores the answer key, and freezes everything into a versioned, kind-discriminated
  `scenarioJson` snapshot.
- **Unanswered answer keys are not required by the converted clients.** An unanswered item ships its
  prompt and its shuffled choices and nothing else — no correct answer, no correct option id, no
  explanation. The clients render feedback only from what the server returns after it has recorded
  an answer, and from already-answered items on resume.
- **Grading uses the persisted session snapshot**, never a live bank lookup, so a question edited
  after issuance cannot change a grade already earned.
- **The first accepted answer to a distinct item is final.** A later different pick returns the
  stored first answer rather than replacing it.
- **Repeated padded visual slots share one distinct-item answer state.** A focused twenty-question
  session stores nine distinct item rows plus a persisted twenty-slot order of repeated item ids;
  the repeats add no extra evidence, mastery, review or XP.
- **Final drill submissions send only `{ sessionId }`.** Writing submission sends only
  `{ sessionId, response }`.
- **A completed retry replays the stored result before any effect runs** — before the grader, before
  review and mastery, and before XP.
- **HOSA remains review-only** and no drill route awards XP.
- **Writing, test-grade and judge XP/rank writes use the concurrency-safe transactional helper**
  (`awardXpInTransaction`): an atomic increment whose rank derives from the value the increment
  returned. The previous read-add-write could be erased by a concurrent writer, because a plain
  SELECT never blocks under MVCC.

### What each phase contains

| Phase | Commit | Contents |
|---|---|---|
| C1 | `59dd52b` | `lib/practice-session.ts` (new), transaction-native review/mastery cores appended to `lib/spaced-review.ts`, `awardXpInTransaction` in `lib/xp.ts`, additive schemas in `lib/validators.ts`, `scripts/practice-session-smoke.ts` (new) |
| C2a | `dd11e69` | The nine Debate / DECA / HOSA MedTerm drill routes — session, check and submit — bound to server-issued sessions |
| C2b | `4f0c856` | `app/api/skills/debate-writing/session/route.ts` (new) plus the writing submit cutover, and the XP/rank cutover for `tests/[testId]/grade` and `debates/[debateId]/judge` |
| C3a-i | `80dbf75` | Debate drills client |
| C3a-ii | `be97024` | DECA drills client and HOSA MedTerm client, plus an explicit `checkEndpoint` prop on the shared concept-drills component |
| C3b-i | `9103693` | Guided lesson practice client — the last legacy caller of the old drill contract |
| C3b-ii | `f392ede` | Debate Writing client |

Preserved exactly across all of it: Debate and DECA evidence floors of 5, HOSA's 10-unique-across-3-
areas, the threshold of 70 (exact-ratio for HOSA), the honest 6-of-9 result of 67, no XP on any drill
track, and the public M13E1G helpers with their seven review variants, their returned `write-failed`,
their missing-table degradation and assertion 28c.

### What is deliberately unchanged

- **`enforceRateLimit` is absent from both Debate Writing routes.** That surface has never had rate
  limiting, redesign is deferred, and three suites assert the absence. Do not "fix" it.
- **The drill check routes are deliberately not rate-limited.** The light tier is 20/min and a
  twenty-question drill needs 22 calls.
- **`wins` and `streak` in the judge route are untouched.** They still read-modify-write from a
  pre-read; that staleness is carried work, and `practice-session:smoke` controls 144–144c pin the
  existing behaviour so it cannot drift while it waits.
- **`app/(app)/skills/[slug]/practice/page.tsx` still passes `initialScenario`** to the writing
  client. The prop is accepted for compatibility and is **never read** — it is not destructured in
  the component — and the scenario a learner is graded against is the one the server issues. Its
  caller was outside the approved Phase C boundary, so removing it is separate follow-up work.

### What has NOT happened

- **No Phase C schema change and no Phase C database operation.** No `db push`, no migration, no
  seed, no reset, no activation, no learner-data read or write.
- **No Redis and no new secret** were introduced or are required.
- **Authenticated Production behavior of the session protocol is not claimed.** Nothing behind
  sign-in has been exercised in Production for any of this work.
- **The three database-writing suites — `auth:smoke`, `team:smoke`, `assignment:smoke` — were not
  run** and must not be claimed as passing.

Remaining step: authenticated verification of the practice flow when a safe session is available.

## Repository state

- **Branch:** `main`
- **origin/main and remote `refs/heads/main`:** `bb397350029975520e0b96c1c741e7f873f59086` — the
  M13E2 Phase C closeout commit, **pushed 2026-08-06 and deployed to Production**.
- **Local `HEAD`:** the M14 Phase 1e (G19) commit, **one ahead of `origin/main`**, which sits at
  the deployed `a37959c` with the full A+1a–1d stack.
- **Working tree:** clean apart from each pass's own commit.
- Phase 1a changed 17 paths: `lib/track-server.ts` (precedence), 12 page call sites (await the async
  resolver), `components/auth/sign-up-form.tsx` (Public Speaking removed from signup), two suites
  whose byte pins covered converted pages, and these two documents. **No schema change, no
  migration, no seed change, no dependency, no lockfile change, no env or deployment-config change,
  and no database operation.**
- Sections below the milestone table describe the M11 close-out and were last re-verified on
  2026-08-01 against `d7efcb5`.
- The nine approved M11 commits (eight code, one documentation) were **pushed through a normal
  fast-forward**. No force-push, rebase, squash, merge or history rewrite occurred at any point.

### The nine M11 close-out commits (history, all long since pushed)

| Commit | Subject |
|---|---|
| `2ec2bb5` | fix(hosa): clarify training and lesson availability |
| `2bd40ed` | fix(hosa): disable unsupported roleplay mode |
| `2c471e6` | fix(content): scope DECA timing and training groups |
| `f4bba01` | fix(side-coach): validate authored request boundaries |
| `f83c72b` | fix(a11y): correct navigator semantics |
| `f03db4e` | fix(progress): scope exam sections and restore unlock state |
| `b9c904d` | fix(a11y): add focus rings and word-like gate |
| `e44fb6f` | chore(hosa): remove dormant role-pair config |
| `d7efcb5` | docs: close M11 remediation and handoff |

## Milestone status

| Milestone | Status |
|---|---|
| M1–M10 | Complete |
| M11 — independent review + documentation | Complete. Its verdict was NOT READY; every finding it raised has since been remediated. |
| M11R1–M11R12 — remediation passes | Complete. **No confirmed M11 code finding remains open.** |
| M13E1D–M13E1F — drill evidence safety (DECA, Debate, HOSA) | Complete, pushed and deployed. |
| M13E1G — due-gated spaced review | Complete, pushed and deployed (`95fdd4c`). |
| M13E2 Phase A — additive practice-session schema | Complete, pushed and deployed (`221e07f`). |
| M13E2 Phase B — shared-Production `db push` | **Complete.** Enums, tables, foreign keys and indexes are active. |
| M13E2 Phase C1 — server-session core helpers | Complete, pushed and deployed (`59dd52b`). |
| M13E2 Phase C2a — Debate, DECA and HOSA routes | Complete, pushed and deployed (`dd11e69`). |
| M13E2 Phase C2b — Debate Writing routes and XP/rank safety | Complete, pushed and deployed (`4f0c856`). |
| M13E2 Phase C3a — Debate, DECA and HOSA clients | Complete, pushed and deployed (`80dbf75`, `be97024`). |
| M13E2 Phase C3b — lesson practice and Debate Writing clients | Complete, pushed and deployed (`9103693`, `f392ede`). |
| M13E2 — overall | **Complete, pushed, deployed and publicly verified** at `bb39735`. Authenticated practice behavior untested. |
| M14 Phase A — learning quality audit | **Complete locally** (`a054706`, `docs/M14_LEARNING_QUALITY_AUDIT.md`). Unpushed. |
| M14 Phase 1a — track-correct first run | Complete, pushed and deployed (`66e7dd6`). |
| M14 Phase 1b — withdrawn HOSA judging closed | Complete, pushed and deployed (`8a7a74f`). |
| M14 Phase 1c — DECA judging fails closed | Complete, pushed and deployed (`a29e506`). |
| M14 Phase 1d — fabricated Debate speaker cards removed | Complete, pushed and deployed (`a37959c`). |
| M14 Phase 1e — G19 Study Arcade honesty | **Complete locally** (this commit). Recording claims scoped to drills; decks/games labeled unrecorded. Unpushed. |
| M14 Phase 2a — HOSA word-root bank depth | Complete, pushed and deployed. Word roots 9→30. AI-authored, human-reviewed and approved 2026-08-06. |
| M14 Phase 2b — HOSA prefix bank depth | Complete, pushed and deployed. Prefixes 9→30. AI-authored, human-reviewed and approved 2026-08-07. |
| M14 Phase 2c — HOSA suffix bank depth | **Complete locally.** Suffixes 9→30, bank 96→117. AI-authored, **human-reviewed and approved 2026-08-07**. Ready to push. |
| M14 Phase 1e — G20 DECA skill activation | **Authorized, executed, verified (2026-08-06).** 0 created / 3 already present / 0 conflicts — the rows pre-existed with exact approved fields; all four DECA areas resolve and record. |
| M4 — HOSA replacement scenario | **Still blocked.** Needs an approved scenario and the applicable clinical/legal or advisor review. Until then the lesson's interactive practice stays unavailable. |

## Shipped behavior (as implemented locally)

**Debate.** Claim/Warrant/Impact is presented as one officially supported beginner model, not the only
one. Practice routes to `/debate` with an AI opponent and judge. No universal 0–30 speaker-point scale
is claimed anywhere.

**DECA.** The authored role-play lesson requires both learner responses past a shared eight-word gate.
Coach feedback must be rubric-complete **and** evidence-anchored — a two-entry `responseReview` plus one
verdict per authored criterion, each `met`/`partial` excerpt actually appearing in the response it names.
Anything else is discarded and an honest retry is shown. Timing is family-specific: the 10-minute prep
example is labelled Individual Series, Team Decision Making carries its own sourced 30/15, and PBA, PFL
and PSC carry none because our record has none. TDM exam weighting remains unresolved and absent. An
"Exam weighting" section renders only for a family whose own sourced facts establish an exam — today
Individual Series and TDM. DECA role-play practice remains active.

**HOSA.** The generic patient/clinical role-play is **withdrawn**. `/training/hosa/practice` is Medical
Terminology-specific; `/training/hosa/room` fails closed to the Event Navigator before any room mounts;
`/compete` offers event navigation rather than a role-play arena; `/api/ai/hosa-scenario` and
`/api/ai/judge-hosa` return a stable HTTP 410 behind their unchanged auth-then-rate-limit gates,
reaching no provider, parsing no body, producing no score and writing nothing. Medical Terminology
practice, its registry provenance and its session/submit recording are unchanged and remain reachable
from its Event HQ. The communication lesson is informational and communication-only; its interactive
scenario is `temporarily-unavailable`; it neither teaches nor scores hands-on procedures; and the
absence of a standalone patient-communication event is stated as a finding about the approved research
record, never as a permanent fact.

**Both browsing surfaces.** The DECA and HOSA Navigators name their groupings as **CompeteReady
training groups** directly above the group lists, and state that the learner's current official event
guideline controls official classification and requirements. Family resolution is registry-derived and
fails closed: one routable member resolves to that named event; zero or several resolve to an
href-free non-interactive state whose recovery link is the HOSA hub — never the page it is rendered on.

**Track isolation and navigation.** Each Navigator resolves only its own parameter through its own
registry; cross-track identifiers resolve to nothing in both directions; `/training/debate/events`
fails closed; the Debate hub's start action still routes to `/debate` (there is no UI element literally
labeled "Start Debate" — the routing, not a label, is what is pinned); stable lesson slugs and Event HQ
links intact.

**Side Coach.** Two maximum-length 4,000-character learner responses are accepted; the field bound
counts the learner allowance and the bounded framing separately and remains hard-capped. Rubric IDs are
canonicalised against the authored lesson's own rubric — anything but the exact set fails closed at the
route with a stable `invalid-rubric-ids`, before any provider call, echoing nothing back. Validation
failure is distinct from provider unavailability.

**Authored progress.** The follow-up is earned by an explicit Continue click, gated by the shared
eight-word rule. Restore honours the persisted decision and validates it against phase and gate;
meaningful text alone never recreates an unlock. The gate counts word-like tokens — a token containing
a Unicode letter or number — so punctuation-only and emoji-only input cannot satisfy it, on the live
button and on restore alike.

**Accessibility.** Navigator result buttons contain no paragraph descendants, carry the project
`focus-ring` utility, and keep a coherent `h1 → h2 → h3` outline in every rendered state. Selected
styling and the keyboard focus ring render together. The converted practice clients keep their
distinct loading, expired, unavailable and retryable-error states, so status is never carried by
colour alone.

## Test results (2026-08-06, against the Phase C stack plus these documentation edits)

- `npm run db:generate` — passes.
- `npx tsc --noEmit` — passes.
- `npm run lint` — **0 errors** (one pre-existing warning: `<img>` in `components/profile/user-avatar.tsx`).
- `npm run build` — compiles successfully. The build was never run alongside a dev server.
- **32 registered `*:smoke` suites. 29 safe/read-only suites were run and all 29 pass.**
- **`auth:smoke`, `team:smoke` and `assignment:smoke` write to the shared Production database. They
  were NOT run in this pass and are NOT claimed to pass.**
- `judge-shape:smoke` makes a live provider call and exits 0 with a console warning when no provider
  responds — it was run on its own and its output read, not through a stdout-discarding loop.
- Focused harnesses from earlier milestones (M8A, M8B, M9 SSR; M10 navigation/accessibility; M11R2
  through M11R12) live in the session scratchpad, not in the repository.

## Browser and mobile validation

Verified by serving each surface's emitted SSR markup with the app's own compiled CSS over a local HTTP
server, because the browser-preview helper cannot launch from `~/Documents`. Checked at 375×812,
390×844 and 1280×900: no horizontal overflow, 44px recovery targets on the HOSA hub, coherent heading
order, and — with **real keyboard Tab** — `:focus-visible` matching plus a non-zero project focus ring on
navigator result buttons, including a selected button and in colorblind mode.

**This is not the live authenticated route.** No middleware, session, data fetching or click-through of
real navigation was exercised. No screen-reader certification and no full keyboard journey was performed.
**The converted practice flow has not been exercised against a live authenticated session** in any
environment — its guarantees are established by code and by deterministic suites, not by a learner run.

## Known gates and unresolved items

1. **Authenticated verification of the session protocol is outstanding** — no learner run, in any
   environment, has exercised issue → check → submit end to end.
2. **M4 HOSA replacement scenario** — blocked pending an approved scenario and clinical/legal or advisor
   review. If none is approved, the interactive practice stays unavailable.
3. **September 1, 2026 HOSA revalidation** — the final 2026-27 guidelines are expected then; every
   officially dependent HOSA detail must be re-checked against that release and later notices. Nothing
   in the code degrades a record automatically when that date passes.
4. **TDM weighting** — DECA's Guide and its published sample conflict; no figure may be stated until
   DECA resolves it.
5. **PSC scope** — the record places Professional Selling both inside and outside the role-play course;
   unresolved by design, and it routes to the DECA hub rather than the role-play lesson.
6. **`docs/curriculum/` provenance** — provenance comments in the registries cite line numbers into the
   approved research record; keep that record and the citations in step.
7. **Advisor/judge validation gates** from the research synthesis remain open; evidence validation
   proves an excerpt is real, not that a verdict is correct.
8. **`initialScenario`** is still accepted by the writing client and still passed by its page, purely
   for compatibility. It is never read. Removing it is separate follow-up work.
9. **XP-farming policy for writing** is deferred, not silently changed: one issued session awards XP at
    most once, but requesting a new session and completing it still awards the current amount.

## Remote and deployment status

`origin/main` and the remote `refs/heads/main` are both
`bb397350029975520e0b96c1c741e7f873f59086` — the M13E2 Phase C closeout — and **that is what
Production runs.** The two M14 commits (the Phase A audit and Phase 1a) are local only.

The commit-linked deployment record for that SHA, verified from unauthenticated GitHub metadata:

| Field | Value |
|---|---|
| Provider | Vercel |
| GitHub deployment ID | `5783679689` |
| Commit status ID | `51784302970` |
| Environment | `Production` |
| State | `success` ("Deployment has completed") |
| Deployment-specific URL | `https://debate-arena-dqxo0yhtj-habibisters-projects.vercel.app` |
| Production alias | `https://debate-arena-ai.vercel.app` |

The deployment-specific URL is behind **Vercel Deployment Protection** and redirects to Vercel SSO, so
it exposes no application behaviour without provider authentication. The production alias serves
CompeteReady (`<title>CompeteReady</title>`), and `/` returns **200**.

**Public route checks.** All nine critical routes — `/training/hosa`, `/training/hosa/events`,
`/training/hosa/practice`, `/training/hosa/room`,
`/training/hosa/event/medical-terminology`, `/training/deca/events`, `/lessons`, `/compete`, `/debate`
— returned an intentional application **307** to `/signin?callbackUrl=…`, followed by **200** on the
sign-in page. One redirect each; no loops, no error boundaries.

**API authentication boundary.** Unauthenticated `POST /api/ai/hosa-scenario` and
`POST /api/ai/judge-hosa` both returned **401** with
`{"error":"You must be signed in to do that."}` — authentication remains first.

**What this does and does not establish.** It establishes that the Production deployment for that
commit succeeded, that those routes exist and are auth-gated, and that the two HOSA-only AI endpoints
authenticate before anything else. It does **not** establish any protected page's internal behaviour:
no authenticated session was used, so nothing behind sign-in was exercised in production. A public
alias cannot by itself prove which commit it currently serves; commit-linked deployment metadata is
the evidence.

**Remote incident.** On 2026-07-31 at 16:22:41 local, `origin/main` moved from `a6f0e78` to `700f40e`
— a push from this clone that was not part of any approved step. The source is **unknown and is not
attributed to anyone**. Treat the remote as capable of changing outside this workflow: re-verify it
immediately before any push.

## Environment variables (names only — never store values here)

`GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `OPENROUTER_API_KEY`,
`OPENROUTER_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER`, `AI_COST_MODE`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`, `NEXTAUTH_SECRET`,
`NEXTAUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `UPLOADTHING_TOKEN`.

**M13E2 introduced no new environment variable and no new secret.** No Redis and no signing secret are
used or required by the session design — PostgreSQL is the only store.

## Next operational steps

1. Review the Phase 1e G19 commit, push it, and verify its automatic deployment read-only.
2. Push them through GitHub Desktop as a normal fast-forward. Re-verify `origin/main` immediately
   beforehand.
3. Verify the automatic Vercel Production deployment read-only from commit-linked GitHub metadata.
4. Continue the M14 roadmap in `docs/M14_LEARNING_QUALITY_AUDIT.md` — Phase 1b (the authorized DECA
   skill activation script) is next, then lesson registration.
5. Perform authenticated verification of the practice session flow when a safe session is available —
   issue, check, resume, duplicate-submit and completed-replay — and of the Phase 1a track routing.
6. Remove the unused `initialScenario` prop from `app/(app)/skills/[slug]/practice/page.tsx` and the
   writing client's prop type.

## What is explicitly NOT true

- **Phases A and 1a–1d ARE live** (deployment `5785864553` at `a37959c`); the G19 copy fix is
  **not** — it is a local commit only. **Authenticated Production behavior of any M14 change remains
  untested.** The G20 activation ran with explicit authorization on
  2026-08-06 and found all three rows already present — **all four DECA drill areas now verifiably
  record mastery.**
- **No authenticated production behaviour was verified** — not for the session protocol, and not for
  the earlier surfaces (HOSA hub wording, Medical-Terminology-specific practice, the HOSA room's
  post-auth fail-closed redirect, the post-auth HOSA `410` contract, the Compete HOSA entry, DECA
  training-group wording and family-specific timing, PSC's unresolved state, the lessons index,
  navigator focus rings, heading outlines, authored-progress restore, Side Coach structured feedback).
- **The three database-writing suites were not run**, and no result is claimed for them.
- The practice session design is **not** described as cheat-proof. It removes client answer authority,
  binds submissions to a server-issued set, makes first answers final and replays completed sessions
  without re-running effects. It is not a claim about every possible abuse.
- It is **not** claimed that the public alias cryptographically proves which SHA it serves.
- It is **not** claimed that every protected page is error-free; they could not be opened.
- The source of the earlier remote push is **not** known.
- Generic HOSA patient/clinical role-play is **not** available — it was withdrawn.
- It is **not** true that all HOSA practice is unavailable: Medical Terminology practice is active and
  records attempts, and it remains **review-only** — it awards no XP.
- CompeteReady's event groupings are **not** official DECA or HOSA taxonomy.
- No universal DECA preparation time or exam weighting is claimed.
- Curriculum guidance is **not** permanently current; the 2026-27 HOSA release requires revalidation.
- Nothing has been rebased, squashed or amended; **no Phase C schema change, migration, `db push` or
  seed was run**; no dependency or lockfile changed.
