# HANDOFF

Everything the next engineer needs to continue safely. Rewrite in place; do not append history.

## Latest handoff — M14 Phase 2b: HOSA prefix bank 9→30 (2026-08-07)

### ⚠ Phase 2b: AI-assisted content awaiting human review — DO NOT PUSH YET

`lib/hosa-medterm.ts` gained 21 prefix questions (`pr-10`…`pr-30`), taking prefixes 9→30 and the bank
75→96. **These items were AI-drafted and have NOT been reviewed by a human for medical accuracy.**
A source comment above `pr-10` carries that label per `CLAUDE.md`. **Do not push the
`feat(hosa): expand prefix question bank` commit until someone reviews those 21 items.** Everything
else in the change is content-independent and verified.

**Production runs `82cbee67070bee43f46c93ee9ff757e9bb821bd3`** (deployment `5788424169`, `Production`,
`success`) — Phase 2a plus the handoff cleanups. Phase 2a's word-root content is human-reviewed and
approved; Phase 2b's prefix content is not.

**Audit G2 status: word roots and prefixes are at 30; four areas remain at 9** and are the remaining
Phase 2 work, one area per slice: **suffixes, anatomy, physiology, pathophysiology**.

What Phase 2b changed, and what not to undo:

- **`31f*` gained an explicit per-area allowlist** (`wr-*` → word-roots, `pr-*` → prefixes), still
  anchored to the immutable `398860f`. **Extend it one entry per approved slice — never generalise
  it to "any id", and never re-anchor it or introduce a HEAD-relative pin.** Originals in an
  expanded area stay byte-identical and ordered; unexpanded areas stay byte-identical.
- **The control that proved `pr-10` was rejected inverted** when prefixes were approved, so it was
  replaced with `sf-10` plus four more unapproved fixtures. **Every future slice must move that
  control to a still-unapproved id**, or the allowlist silently stops being protected.
- **The padding-survival example moved from prefixes to suffixes** (`11g`). It must always name an
  area still holding 9 — move it again in the next slice.
- Unfiltered draws now skew ~31% word-roots / ~31% prefixes / ~9% each of the other four. Correctness
  is unaffected (breadth counts distinct areas, not proportions) and it self-corrects as slices land.

### Phase 2a: content is human-reviewed and APPROVED — shipped

`lib/hosa-medterm.ts` gained 21 word-root questions (`wr-10`…`wr-30`), taking that area 9→30 and the
bank 54→75, closing audit G2 for the first area. The items were AI-authored, and on **2026-08-06 the
repository owner personally read all 21 and approved them** for medical accuracy, clarity, distractor
quality, originality, explanations and CompeteReady terminology conventions — explicitly confirming
the dual/standard meanings of `pneum`, `myel` and `cyst`, and the `cerebr/o` / `enter/o` / `col/o`
refinements. **The push gate was lifted on that approval, and the commits shipped.**

Two things to keep straight if this ever comes up again:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md` requires AI-generated
  material to be labelled). Approval changed the review status, not the provenance.

**Carried stylistic follow-up, not a blocker:** the bank mixes bare roots (`hist`, `arthr`, `cost`)
with combining forms (`cerebr/o`, `enter/o`, `col/o`). Standardising on combining forms across all 30
word-root items is wanted eventually and was explicitly excluded from Phase 2a scope.

What Phase 2a changed structurally, and what not to undo:

- **Content-only.** No schema, seed, route, session-protocol, validator, XP, mastery, review or
  client change. `buildMedTermSession` already sliced whatever the pool held; the session route
  already deduped to distinct item rows and padded the order.
- **A focused 20-question word-roots session now serves 20 DISTINCT items** — no padding. It clears
  the 10-distinct count floor and is still refused review on **breadth** (1 area < 3). Both evidence
  floors are unchanged; the skill stays review-only.
- **Two byte pins were narrowed, never removed.** `hosa-medterm-evidence:smoke` (31f*) is now the
  single home of bank content integrity: additive-only against the **immutable** `398860f`, with all
  54 pre-existing items byte-identical and ordered, the five other areas untouched, and only
  `wr-NN > 09` additions permitted. `review-ladder:smoke` dropped its **HEAD-relative** bank hash —
  which would have self-healed on commit — for behavioural inertness assertions (65M*): no XP or
  mastery symbol, no prisma/fetch/session/review reach, floors unchanged, neighbours don't import it.
  **If you expand another area, extend 31f's allowlist deliberately; never reintroduce a
  HEAD-relative hash.**
- The remaining five areas stay at 9 by design — one area per Phase 2 slice.

**Production currently runs `5789e19b2c626b2a9b902c9e2af7018ff523b2b6`** (M14 Phase 2a), GitHub
deployment `5788268138`, `Production`, `success`, verified read-only. Deployment history for the M14
work, for the record:

| Stack | Deployed SHA | GitHub deployment |
|---|---|---|
| M13E2 Phase C | `bb397350029975520e0b96c1c741e7f873f59086` | `5783679689` |
| M14 Phases A + 1a–1d | `a37959c1500c405d0302e769996d9f850020707e` | `5785864553` |
| M14 Phase 1e (G19 + G20 record) | `a217baa6bb5d2eae983662b231c82dc87580deb3` | `5787742198` |
| M14 Phase 2a (word roots 9→30) | `5789e19b2c626b2a9b902c9e2af7018ff523b2b6` | `5788268138` |

Each was verified read-only from commit-linked GitHub metadata plus public route checks (200/307 to
sign-in, zero 5xx; the live `/signup` no longer offers Public Speaking).
**Authenticated Production behavior remains untested**, and no database or Production operation
occurred in any M14 verification pass.

**M14 Phase 1 is COMPLETE and deployed** — G23, G18, G21, G24, G25, G19 and G20 are all closed, and
Phase 2a word roots is deployed on top. **G19 shipped in the `a217baa` stack; there is no pending
G19 push and nothing from Phase 1 or 2a is waiting to go out.** What G19 changed, for reference:

- `app/(app)/study-arcade/page.tsx` — the header's recording claim is scoped to the drills, and the
  record tile attributes its (always-honest) count to real drill sessions; both now state plainly
  that "decks and games aren't recorded". No functionality, layout or legitimate claim changed; the
  zero state was already truthful.
- `scripts/games-smoke.ts` — the `G19-*` block: bans on both former claims and a generic
  decks/games-feed-mastery pattern over comment-stripped, whitespace-normalized source; presence of
  the truthful copy; and a both-directions pairing that verifies every `components/study/` file
  makes no `fetch`/`prisma` call. **If decks or games ever start recording, that pairing fails on
  purpose — update the copy and the check together.** Five non-vacuous controls.

### G20 — DECA skill activation: authorized and executed 2026-08-06 — zero writes needed

OUTCOME: the owner authorized the activation in chat and `npm run deca:skills:activate -- --apply`
ran on 2026-08-06. It reported **0 created, 3 already present, 0 conflicts** — all three rows
already existed with exactly the approved fields (the classifier accepts nothing less), so the
authorized run performed reads and **zero writes**. Post-verification: a second `--apply` was
idempotent (3 already present), a read-only check confirmed all four `DECA_DRILL_SKILL_SLUGS`
resolve as DECA/DECA, and `deca-mastery:smoke` passes. **Every DECA drill area records mastery.**
Who created the rows, and when, cannot be established from this repository and is not attributed —
`prisma/seed.ts` still seeds only `deca-marketing`, so the audit's code-level finding was accurate.
No rollback is applicable; nothing was written. The plan that was authorized, for the record:

- **What changes:** exactly three `Skill` rows are CREATED (never updated):
  `deca-performance-indicators` (order 20), `deca-business-reasoning` (21),
  `deca-customer-relations` (22) — each with its name, description, `organization: "DECA"`,
  `track: "DECA"` as literals in the script.
- **Current state:** no rows with those slugs (drilling those areas returns `skill-missing`).
  **Intended state:** the three rows exist; passing drill sessions record mastery and schedule
  review, exactly as `deca-marketing` already does.
- **Command:** `npm run deca:skills:activate -- --apply` (the flagless default is a dry run that
  provably opens no database connection — the Prisma import sits below the dry-run return).
- **Why required:** the mastery/review loop is the product's core promise; three quarters of DECA
  drilling is inert without these rows (audit G20).
- **Safety properties, verified by reading the script:** touches `Skill` only; create-or-verify,
  never update; a field mismatch on an existing slug reports a CONFLICT (field names only, never
  values) and exits non-zero with nothing written; rows are independent, so re-running is safe and
  idempotent; nothing else is read or written; no credential is ever printed.
- **Rollback:** delete the three rows by slug (they are new, so nothing references them until a
  learner drills; any MasteryProgress/review rows created afterwards reference the skill and would
  need the same authorization discussion before removal).
- **Post-write verification:** re-run `--apply` (all three must report `already present`), then a
  read-only check that `DECA_DRILL_SKILL_SLUGS` all resolve; `deca-mastery:smoke` pins the
  slug/name correspondence statically.
- **Blast radius:** no other rows, tables, learner data, XP, or config. **Do not run it without the
  owner's explicit written authorization in chat — it writes to the database shared with
  Production.**

The five deployed commits, for reference:

1. **M14 Phase A** (`a054706`) — `docs/M14_LEARNING_QUALITY_AUDIT.md`, the read-only learning-quality
   audit. Its gap register (G1–G26) is the M14 roadmap; read it before any M14 work.
2. **M14 Phase 1a** (`66e7dd6`) — the learner's signup organization now resolves their track.
3. **M14 Phase 1b** (`8a7a74f`) — the generic debate paths enforce the M11R6 HOSA withdrawal
   (audit G23, the audit's most serious finding).
4. **M14 Phase 1c** (`a29e506`) — DECA judging fails closed instead of fabricating a ballot
   (audit G18).
5. **M14 Phase 1d** (this commit) — Debate ballots carry one speaker card per REAL participant
   (audit G21).

What Phase 1d changed, and what the next engineer must not undo:

- **`buildSpeakerScores` builds two cards, not four.** One per persisted side, labelled with the
  shared side labels, ranked 1–2, with a server-derived `role` ("student"/"opponent") from
  `studentSide`. Do not reintroduce split-speaker synthesis ("Government 2" never existed) and do
  not pad the array for layout reasons — the renderer's grid handles two cards.
- **The model still has no participant channel.** The Debate ballot is deterministic; the provider
  contributes prose through `mergeJudgeEnhancement`'s whitelist. `P1d-7*` in `judge:smoke` proves a
  hostile enhancement injecting four fabricated cards and a flipped winner changes nothing. If you
  ever widen the enhancement schema, extend that hostile test FIRST.
- **The result type moved deliberately** to `rank: 1 | 2` plus `role` (`lib/ai.ts`,
  `components/debate/debate-arena.tsx`). Old persisted ballots that carry four-card
  `speakerScores` in their stored feedback render as stored — history is not rewritten.
- The `P1d-*` block in `judge:smoke` is behavioural (real judge, real merge) plus comment-stripped
  source scans; the builder's own comment names the old fabricated labels in prose, which is the
  strip-proof control. No HEAD-relative byte pins were added.

What Phase 1c changed, and what the next engineer must not undo:

- **`judgeDecaRoleplay` deliberately passes NO fallback** to `jsonCompletion`, and uses the strict
  `isTrustworthyDecaJudge` validator (finite overall, finite category scores, on top of the shared
  shape check). Every failure mode — provider outage, malformed JSON, incomplete rubric, validation
  miss — **throws** `OpenAIUnavailableError`, which `apiError` maps to the retryable 503. Do not
  reintroduce a fallback here: the old one returned hardcoded scores and was then stamped with the
  official registry spec.
- **Attribution follows validation structurally.** The `rubricSource` stamp sits after the judge
  call; failures throw before it. `judge-shape:smoke` (`P1c-*`, 16 assertions + 5 controls) pins
  the ordering, the absent fallback, the strict validator, and the impossibility of a
  fallback-tagged DECA result — over comment-stripped source. Its live loop treats a throw as
  "providers unavailable" and keeps the documented warn-and-exit-0 skip path.
- **A failed DECA judging leaves the debate retryable**: every route write (XP, rank, wins, streak,
  `JUDGED`) sits after the judge call, and the dedicated `/api/ai/judge-deca` route persists
  nothing. The transcript and the debate row survive untouched.
- **`fallbackPerformanceJudge` still exists** for its HOSA consumer (unreachable from routes since
  Phase 1b) — deliberately unchanged, as is Model UN's own fallback and all Debate judging. Do not
  delete it in a "cleanup" without deciding those consumers' fate explicitly.
- The DECA scenario and objection generators keep their fallbacks — they produce practice prompts,
  not scores, and were outside G18's scope. The room's "Using backup AI response." banner remains
  for those surfaces; it can no longer appear on a DECA ballot.

What Phase 1b changed:

- `POST /api/debates` refuses `organization: "HOSA"` with the established 410 contract after auth
  and validation, **before any database read or write** — no Debate row, no downstream effects.
- The debate judge route refuses existing HOSA rows with the same 410 after auth, rate limiting and
  the ownership fetch — **before any judge call, fallback ballot, registry attribution, XP, rank,
  wins, streak or completion write**. `judgeHosaPerformance` is no longer imported or called by any
  route; the dispatch was removed from `runOrganizationJudge`.
- One shared helper, `hosaWithdrawn()` in `lib/api.ts`, carries the body and status. Its text is
  **deliberately identical** to the dedicated endpoints' literal and `hosa-practice-scope:smoke`
  pins the two together — do not let them drift, and do not weaken either 410.
- Existing HOSA Debate rows were **kept** — not deleted, not migrated. History and coach views keep
  honest labels; the rows are simply impossible to judge.
- Debate and DECA creation/judging, response shapes, XP amounts, rating, and the carried
  wins/streak behaviour (`practice-session:smoke` 144–144c) are unchanged and asserted.
- Known remaining G23 sibling, deliberately out of this phase's scope: `/api/ai/roleplay-turn`
  still accepts `organization: "HOSA"` (a turn generator, not a judge — it can score nothing).
  It is tracked in the audit and belongs to a later phase.

What Phase 1a changed and why it is safe:

- `lib/track-server.ts` — precedence is now `?track=` → **persisted organization** → cookie →
  fail-closed default, implemented as a pure `pickActiveTrack` core (exhaustively tested in
  `tracks:smoke` as `P1a-*`, every assertion with a non-vacuous control) plus a gatherer that reads
  the session through a per-request cache. Only DEBATE/DECA/HOSA resolve; PUBLIC_SPEAKING,
  MOCK_TRIAL, retired MODEL_UN, malformed and missing values are absent and fall through. The
  resolver still writes nothing.
- `getActiveTrack`/`resolveActiveTrack` became **async**; their twelve calling pages await them and
  the five that were sync server components became async. All routes remain dynamic (ƒ) — verified
  against the build output.
- `components/auth/sign-up-form.tsx` — **Public Speaking is no longer selectable at signup** (no
  track, no registered lesson; audit finding G25). Not remapped, simply removed.
- `scripts/education-migration-smoke.ts` and `scripts/skills-compat-smoke.ts` byte-pinned the two
  index pages the conversion touched. The pins were replaced by a diff against the **immutable
  pre-Phase-1a commit `a054706`** in which each added line must be its removed counterpart with
  exactly `async `/`await ` inserted — a hardcoded track, a dropped guard or any smuggled edit
  fails. Never replace an immutable-base pin with a HEAD-relative one.

M14 Phases A + 1a–1d ARE live. What is NOT live: the G19 copy fix (local commit, unpushed) and the
G20 activation (not run). What is NOT tested anywhere: authenticated Production behavior of any M14
change.

### The Phase C commit chain

| # | Commit | What it is for |
|---|---|---|
| 1 | `59dd52b` | Server-session core helpers: `lib/practice-session.ts`, transaction-native review/mastery cores in `lib/spaced-review.ts`, `awardXpInTransaction` in `lib/xp.ts`, additive schemas in `lib/validators.ts`, `scripts/practice-session-smoke.ts` |
| 2 | `dd11e69` | The nine Debate / DECA / HOSA MedTerm drill routes — session, check, submit — bound to server-issued sessions |
| 3 | `4f0c856` | Debate Writing session route and submit cutover, plus the `awardXpInTransaction` cutover for `tests/[testId]/grade` and `debates/[debateId]/judge` |
| 4 | `80dbf75` | Debate drills client |
| 5 | `be97024` | DECA drills client and HOSA MedTerm client; explicit `checkEndpoint` prop on the shared concept-drills component |
| 6 | `9103693` | Guided lesson practice client — the last legacy caller of the old drill contract |
| 7 | `f392ede` | Debate Writing client |
| 8 | `bb39735` | The documentation closeout — the deployed Production commit |

Eight commits, pushed as one clean fast-forward, no merges. Cumulative against `221e07f`:
**34 paths — 6 added, 28 modified, none deleted or renamed.** No schema change, no migration, no seed
change, no dependency, no lockfile change, no env or deployment-config change.

### What the protocol guarantees, in local code

- The **server** picks the questions or the writing scenario, shuffles each question's choices, mints
  an opaque per-session `crypto.randomUUID()` id per served choice, stores the answer key, and freezes
  it all into a versioned kind-discriminated `scenarioJson` snapshot.
- **Converted clients do not need an unanswered answer key.** An unanswered item ships its prompt and
  its shuffled choices and nothing else. `correctAnswer` and `explanation` appear only on items the
  learner has already answered — the resume path — and in the check response the server returns after
  it has recorded the answer.
- **Grading reads the persisted snapshot and the stored `isCorrect`, never the live bank**, so a
  question edited after issuance cannot change a grade already earned.
- **The first accepted answer to a distinct item is final.** A later different pick returns the stored
  first answer with `previouslyAnswered: true` rather than replacing it.
- **Repeated padded visual slots share one distinct-item answer state.** A focused twenty-question
  session stores nine distinct item rows plus a persisted twenty-slot order of repeated item ids, so
  the requested learner-facing count is preserved and the repeats add no evidence, mastery, review
  or XP.
- **Final drill submit carries only `{ sessionId }`.** Writing submit carries only
  `{ sessionId, response }`.
- **A completed session replays its stored result before any effect** — before the grader, before
  review and mastery, and before XP. One issued session awards XP at most once.
- **HOSA is review-only and no drill route awards XP.**
- **Writing, test-grade and judge XP/rank writes go through `awardXpInTransaction`** — an atomic
  increment with rank derived from the returned value. The old read-add-write could be erased by a
  concurrent writer, because a plain SELECT never blocks under MVCC.
- The **user row lock is the first statement** of every session-start and final-submit transaction.

### Things the next engineer must not undo

**`enforceRateLimit` is deliberately absent from both Debate Writing routes.** That surface has never
had rate limiting, redesign is deferred, and three suites assert the absence. Do not "fix" it.

**The three drill check routes are deliberately not rate-limited.** The light tier is 20/min and a
twenty-question drill needs 22 calls. Rate limiting the check route would break normal practice.

**Floors and thresholds are unchanged and pinned.** Debate 5, DECA 5, HOSA 10-across-3, threshold 70
with HOSA comparing the exact ratio, and the honest 6-of-9 result of 67. `PASS_THRESHOLD` is
module-private in `lib/hosa-medterm.ts`, so `app/api/hosa/medterm/submit/route.ts` restates `70` as
`MEDTERM_PASS_THRESHOLD`; `practice-session:smoke` control 112 pins the two together by regex. If you
ever export the library constant, delete the restatement.

**`wins` and `streak` in the judge route are untouched.** They still read-modify-write from a
pre-read; that staleness is carried work — the C2b exception covered XP and rank only.
`practice-session:smoke` controls 144–144c pin the existing behaviour so it cannot drift while it waits.

**The transaction-native cores are additive.** The public M13E1G helpers are untouched and are *not*
rewritten to call them. The public path keeps its seven review variants, its returned `write-failed`,
its missing-table degradation, its create-race classification, and the "a review mutation that
truthfully landed is preserved rather than rolled back" contract that `review-ladder-smoke.ts`
assertion 28c pins. The new cores deliberately have the opposite rollback semantics, because inside a
PostgreSQL transaction a caught statement error poisons everything after it — which is why they use
`INSERT … ON CONFLICT DO NOTHING` plus `SELECT … FOR UPDATE` and never catch-and-continue.

**PA7 was widened deliberately, never deleted.** It still asserts that nothing outside the approved
allowlist references the session tables, with non-vacuous controls proving the allowlist rejects an
unlisted route and component. Widen it one path at a time.

**Assertion repairs replaced byte pins with behaviour, and none was deleted.** Every HEAD-relative
byte pin on a file this milestone rewrote was replaced by targeted behavioural assertions plus
non-vacuous controls — a HEAD-relative pin turns green the moment the commit lands, so it proves
nothing before the commit. Suites also strip comments before scanning for banned symbols, because
several routes describe in prose exactly what they refrain from writing; control 102b exists to prove
that ban is not passing vacuously.

### Known loose end

`app/(app)/skills/[slug]/practice/page.tsx` still passes `initialScenario` to
`components/skills/debate-writing-practice.tsx`. The prop is **accepted for compatibility and never
read** — it is not destructured in the component, and the scenario a learner is graded against is the
one the server issues. Its caller was outside the approved Phase C boundary. Removing it from both
files is safe, separate follow-up work.

### What has NOT happened

- **No Phase C schema change and no Phase C database operation.** No `db push`, migration, seed,
  reset or activation; no learner data was read or written.
- **No Redis and no new secret.** PostgreSQL is the only store.
- **Authenticated Production behavior is not claimed.** No learner run, in any environment, has
  exercised issue → check → submit end to end.
- **`auth:smoke`, `team:smoke` and `assignment:smoke` write to the shared Production database. They
  were not run and must not be claimed as passing.**

## Earlier handoff — post-deployment verification (2026-08-01)

M11's independent review returned **NOT READY** and enumerated findings from BLOCKER down to LOW. Twelve
remediation passes (M11R1–M11R12) closed every one of them. **No confirmed M11 code finding remains
open.** The nine approved M11 commits (eight code, one documentation) were pushed in one normal
fast-forward (`700f40e..d7efcb5`) and deployed. No force, no rebase, no squash, no merge, no history
rewrite.

| # | Commit | Purpose |
|---|---|---|
| 1 | `2ec2bb5` | HOSA hub and lessons index stop promising practice and examples that do not exist; the lesson's absence claim is scoped to the approved research record; knowledge-test routing becomes registry-derived. |
| 2 | `2bd40ed` | Withdraws the unsupported generic HOSA patient/clinical role-play end to end. |
| 3 | `2c471e6` | Scopes DECA timing to the family our record sources it for; both browsing surfaces name their groupings as CompeteReady training groups. |
| 4 | `f4bba01` | Side Coach: two 4,000-character responses are a valid request; rubric IDs are canonicalised; invalid IDs are never reflected. |
| 5 | `f83c72b` | Navigator semantics: no `<p>` inside `<button>`, coherent heading outlines, nav-a11y no-op removed. |
| 6 | `f03db4e` | Exam sections render only from a family's own sourced exam facts; restored follow-up unlock requires the persisted explicit decision. |
| 7 | `b9c904d` | Project `focus-ring` on navigator result buttons; the shared response gate counts word-like tokens. |
| 8 | `e44fb6f` | Removes the dormant `HOSA_ROLE_PAIRS` configuration left behind by commit 2. |
| 9 | `d7efcb5` | Closes M11: rewrites both tracked documents and brings `docs/curriculum/` into git. |

M13E1D–M13E1F (drill evidence safety) and M13E1G (`95fdd4c`, due-gated spaced review) followed, each
pushed and deployed, then M13E2 Phase A (`221e07f`).

## Repository state

- **Branch:** `main`
- **origin/main and remote `refs/heads/main`:** `5789e19b2c626b2a9b902c9e2af7018ff523b2b6` — M14
  Phase 2a, and **this is the SHA Production runs** (deployment `5788268138`).
- **Local `HEAD`:** `b9e9c2abcffd94b2b53edb2a6fa37a255fc3ad2f` — **2 ahead, 0 behind**.
- **All M14 implementation work is deployed.** Phase 1 (G23, G18, G21, G24, G25, G19, G20) and
  Phase 2a (word roots 9→30) are live. The only unpushed commits are the two documentation cleanups
  that corrected stale narration in this file:
  - `eec6ebf` — refresh Phase 2a handoff state
  - `b9e9c2a` — remove stale M14 handoff instructions
- **Working tree:** clean.
- `docs/curriculum/` is tracked (committed in `d7efcb5`) and is the approved research record — treat it
  as such, not as app source.

## How to run everything

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm run build
```

Never build while a dev server holds `.next` — check first with `lsof -ti:3000`.

Enumerate the smoke scripts rather than trusting a hard-coded list:

```bash
node -e 'console.log(Object.keys(require("./package.json").scripts).filter(n=>n.endsWith(":smoke")).join("\n"))'
```

**32 registered `*:smoke` scripts** as of this handoff: `security`, `judge`, `judge-shape`,
`rubric-scoring`, `debate-drills`, `deca-drills`, `auth`, `audio-debate`, `team`, `assignment`,
`games`, `tracks`, `hosa-practice-scope`, `side-coach`, `debate-side-coach`, `deca-rubric`,
`hosa-navigator`, `deca-navigator`, `source-freshness`, `nav-a11y`, `lesson-progress`, `debate-replay`,
`learning-path`, `avatar`, `education-registry`, `education-migration`, `skills-compat`,
`deca-mastery`, `debate-mastery`, `hosa-medterm-evidence`, `review-ladder`, `practice-session`.

**Three of them write to the shared Production database: `auth:smoke`, `team:smoke` and
`assignment:smoke`.** They were excluded from this milestone's validation and are not claimed to pass.
The remaining **29 are safe/read-only, and all 29 pass.** Run only the safe set:

```bash
for s in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(n=>n.endsWith(":smoke")).filter(n=>!["auth:smoke","team:smoke","assignment:smoke"].includes(n)).join(" "))'); do printf "%-28s " "$s"; npm run "$s" >/dev/null 2>&1 && echo PASS || echo FAIL; done
```

**`judge-shape:smoke` makes a live Gemini call** and is unreliable in two ways: it has failed once and
passed on re-run, and `scripts/judge-shape-smoke.ts:78-82` **exits 0 with only a console warning** when
no provider responds after four attempts. A green result can therefore mean the live check was
*skipped*. **The bulk loop above discards stdout, so it will print PASS in exactly that case** — run this
one on its own and read its output before trusting it.

`practice-session:smoke` is the M13E2 suite: deterministic helper- and route-level controls with no
database access. Every negative assertion in it is paired with a control that proves the mutation or
interleaving it rejects is real, so a ban cannot pass vacuously.

The focused M8/M9/M10 and M11R2–M11R12 harnesses live in the session scratchpad, not the repository.
They are not required to reproduce a green build.

## Canonical route map

| Track | Hub | Navigator | Selector | Event HQ | Lesson |
|---|---|---|---|---|---|
| Debate | `/training/debate` | none (404 by design) | — | `/training/debate/event/public-forum` | Debate CWI lesson |
| DECA | `/training/deca` | `/training/deca/events` | `?family=` | `/training/deca/event/hotel-lodging-management` | `/lessons/how-deca-roleplay-works` |
| HOSA | `/training/hosa` | `/training/hosa/events` | `?event=` | `/training/hosa/event/medical-terminology` | `/lessons/how-hosa-scenario-interaction-works` |

The Debate hub's start action routes to `/debate` — there is no UI element literally labeled "Start
Debate"; the routing, not a label, is what the tests pin. `/training/debate/events` fails closed and must
stay that way. Both Navigators are reached only through `/training`, which is in both the desktop sidebar
and the mobile bottom bar.

### Practice session routes (M13E2, local only)

| Track | Session start | Check | Final submit |
|---|---|---|---|
| Debate drills | `/api/debate/drills/session` | `/api/debate/drills/check` | `/api/debate/drills/submit` |
| DECA drills | `/api/deca/drills/session` | `/api/deca/drills/check` | `/api/deca/drills/submit` |
| HOSA MedTerm | `/api/hosa/medterm/session` | `/api/hosa/medterm/check` | `/api/hosa/medterm/submit` |
| Debate Writing | `/api/skills/debate-writing/session` | — | `/api/skills/debate-writing` |

Guided lesson practice (`components/lessons/lesson-practice.tsx`) uses the Debate drill routes. The
shared `components/training/concept-drills.tsx` takes its check endpoint through an explicit
`checkEndpoint` prop — `app/(app)/study-arcade/page.tsx` passes `/api/deca/drills/check`. **Never
derive one endpoint from another by string replacement.**

## Final product truth

**Debate.** Role-play/practice active at `/debate`. CWI is one supported model, not the only one. No
universal 0–30 speaker-point scale is claimed.

**DECA.** Role-play practice active at `/training/deca/practice`; the room at `/training/deca/room`
serves DECA only. Timing is family-specific — Individual Series 10/10 and TDM 30/15 are sourced; PBA,
PFL and PSC have none and none is invented. TDM exam weighting is unresolved and absent. PSC is
unresolved and routes to the DECA hub, not the role-play lesson. The "Exam weighting" section renders
only where a family's own sourced facts establish an exam.

**HOSA.** The generic patient/clinical role-play is withdrawn. Medical Terminology practice is active
and records attempts, and it is **review-only** — it awards no XP. The communication lesson is
informational and communication-only, its interactive scenario is `temporarily-unavailable`, and it
neither teaches nor scores hands-on procedures.

### HOSA fail-closed routes and APIs — preserve these

- `/training/hosa/practice` mounts `HosaEventPrep` only. `HosaRoleplaySetup` is deleted; do not restore it.
- `/training/hosa/room` redirects to `/training/hosa/events` **before** `RoleplayRoom` mounts. The room
  component itself now mounts only for DECA.
- `/compete` offers HOSA event navigation; there is no generic HOSA role-play arena.
- `/api/ai/hosa-scenario` and `/api/ai/judge-hosa` return HTTP **410** with
  `{"unavailable":true,"error":"Generic HOSA role-play practice is unavailable."}` **after** `requireUser()`
  then `enforceRateLimit()`. They must reach no provider, parse no body, produce no score and write nothing.
- `/api/ai/roleplay-turn` is **shared and unchanged** — DECA still needs it. Do not disable it.
- Medical Terminology keeps its session, check and submit routes, its registry spec and provenance
  banner, and its Event HQ practice link.

## Fail-closed contracts to preserve

**Unknown input.** Each Navigator resolves only its own parameter through its own registry, by exact
match after trim + lowercase. Missing, empty, whitespace-only, repeated (array), path-like, unknown and
cross-track identifiers all select nothing. No first-record fallback, no silent redirect; the unknown
state offers list and hub recovery.

**HOSA family resolution.** Registry-derived. Exactly one routable member resolves to that named event;
zero or several return an **href-free** non-interactive state — the recovery link is `/training/hosa`,
never the events page the list is rendered on. Order-independent; production registry never mutated.

**Practice session lifecycle.** A session is bound to its owner, its kind and its expiry. An expired or
unknown session is a distinct learner-visible state, never a silent restart. A completed session
replays its stored result and runs no effect. Converted clients keep loading, expired, unavailable and
retryable-error as separate states, so status is never conveyed by colour alone.

**Device-local lesson progress.** Key
`compete-ready:authored-lesson-progress:v1:<sha256 digest>:<slug>`; the digest is
`sha256("authored-lesson-progress:" + userId).slice(0,16)` — no raw id, email or name in key or payload.
Stored fields are limited to phase, question index, both learner responses, the follow-up unlock flag and
a timestamp. AI feedback, scores, mastery, XP, completion, ratings and ballots are excluded and must stay
excluded.

**Authored follow-up unlock.** Earned by an explicit Continue click, which the UI enables only once the
first response passes the shared eight-word gate. Restore uses the **persisted decision** as the source of
truth and validates it against phase and gate — meaningful text alone never recreates it, and a stored
unlock whose response no longer clears the gate is withdrawn (`withdrewFollowUnlock`). The gate counts
word-like tokens (`/[\p{L}\p{N}]/u`), so punctuation-only and emoji-only input cannot satisfy it. One
helper, `countResponseWords`, serves both the live button and restore — do not add a second.

**Side Coach requests.** `latestStudentSpeech` is bounded at 2 × 4,000 learner characters plus framing
headroom; both per-response 4,000-character limits are unchanged. Rubric IDs must be exactly the authored
set, canonicalised from the lesson's own rubric; anything else fails at the route with a stable
`invalid-rubric-ids`, before any provider call, echoing nothing back.

**AI unavailability.** A provider failure returns `{ message: "", unavailable: true, reason }` with no
learner-specific content. Callers must never render it as coaching. Retry is manual and never loops.
Validation failure and provider unavailability must remain distinguishable.

**Evidence validation.** Authored DECA feedback must carry a two-entry `responseReview` plus one verdict
per authored criterion; every `met`/`partial` verdict needs an excerpt that actually appears in the
response it names; the coach's own example can never serve as evidence. Invalid payloads are discarded
whole, never partially rendered.

**HOSA safety boundary.** CompeteReady never teaches, scores or simulates hands-on clinical procedures,
and app practice does not create clinical readiness. The clinical-skill family links only to the
informational communication lesson.

**Source/freshness.** Official requires an organization and a source label; current requires a season or
document version; a verification date must be a real ISO calendar date; revalidation without a trigger
invents no date; partial and unverified never receive official wording or verified tone. Nothing is
back-filled from the calendar, a file timestamp, a URL path, or another organization's schedule. No source
URL is rendered.

**Grouping honesty.** CompeteReady's event families/scopes are **training-navigation groupings**, not
official DECA or HOSA taxonomy, and both browsing surfaces say so where the groups are browsed.

## Validation status and its limits

Local, at the Phase C closeout: `npm run db:generate`, TypeScript, lint (**0 errors**, one pre-existing
`<img>` warning), a production build, and **29/29 safe smoke suites**. Browser checks were done by
serving emitted SSR markup with the app's compiled CSS at 375×812, 390×844 and 1280×900, including real
keyboard Tab for focus rings.

**Not done, and not to be claimed:**

- the three database-writing suites (`auth`, `team`, `assignment`) — excluded, no result claimed;
- any authenticated run of the practice session flow, in any environment;
- live authenticated deployment verification;
- screen-reader certification, a full keyboard journey, end-to-end production coverage.

The browser-preview helper cannot launch from `~/Documents`, which is why the local-server approach is
used. **Do not treat an authentication redirect as verification of the page behind it.**

## Production deployment status

**Production runs `bb397350029975520e0b96c1c741e7f873f59086`** — the full M13E2 stack. The two M14
commits are local. M13E1G (`95fdd4c`), Phase A (`221e07f`) and the Phase C stack (`bb39735`) were
each pushed and their Production deployments verified in their own passes; the `bb39735` record is
deployment `5783679689` / commit status `51784302970`, alias `https://debate-arena-ai.vercel.app`.

The most recent full commit-linked deployment record on file is for
`d7efcb59ed94ca887f9d562ef21ea4723dde1175`, verified from unauthenticated GitHub metadata:

| Field | Value |
|---|---|
| GitHub deployment ID | `5700303276` |
| Commit status ID | `51469218987` |
| Environment | `Production` |
| State | `success` ("Deployment has completed") |
| Deployment-specific URL | `https://debate-arena-k697ureau-habibisters-projects.vercel.app` |
| Production alias | `https://debate-arena-ai.vercel.app` |

The **deployment-specific URL is behind Vercel Deployment Protection** — every route there redirects to
Vercel SSO, so it shows nothing about the app without provider authentication. The **production alias**
serves CompeteReady and `/` returns **200**.

**Public route results.** `/training/hosa`, `/training/hosa/events`, `/training/hosa/practice`,
`/training/hosa/room`, `/training/hosa/event/medical-terminology`, `/training/deca/events`, `/lessons`,
`/compete` and `/debate` each returned **307** to `/signin?callbackUrl=…`, then **200** on the sign-in
page — one redirect each, no loops.

**API boundary.** Unauthenticated `POST /api/ai/hosa-scenario` and `POST /api/ai/judge-hosa` both
returned **401** (`{"error":"You must be signed in to do that."}`).

### Keep these three levels of evidence distinct

1. **Deployment verification** — proven for the commits named above.
2. **Route existence and auth boundary** — proven: the routes exist and are auth-gated; the two HOSA-only
   AI endpoints authenticate first.
3. **Authenticated protected-page product behaviour** — **not verified in production.** No session was
   used. Everything behind sign-in is verified **locally only** — including every M13E2 guarantee.

A public alias cannot by itself prove which commit it serves; commit-linked deployment metadata is what
establishes a deployment.

## Remote incident — read before pushing

On 2026-07-31 at 16:22:41 local, `origin/main` moved from `a6f0e78` to `700f40e`: a push from this clone
that was not part of any approved step. **The source is unknown and is not attributed to anyone.**

Consequence: the remote can change outside this workflow. **Always re-verify immediately before pushing:**

```bash
git ls-remote origin refs/heads/main && git rev-parse origin/main && git rev-parse HEAD && git rev-list --left-right --count origin/main...HEAD
```

If `origin/main` is not what you expect, stop and reconcile before doing anything else.

## Recovery bundle (outside the repository — never commit it)

`$HOME/compete-ready-backups/m13e2-c1-59dd52bc/` holds a durable copy of the Phase C work: a git bundle,
the `origin/main..HEAD` patch, the legacy pre-closeout document backups, a `RECORD.txt`, and
`MANIFEST.sha256`. Verify it with:

```bash
cd "$HOME/compete-ready-backups/m13e2-c1-59dd52bc" && shasum -a 256 -c MANIFEST.sha256
```

All six entries must report `OK`. This replaced the earlier `/private/tmp` artifact set, most of which
the OS reaped. Never stage or commit any of it.

## The exact safe sequence for the next engineer

1. Re-verify the remote with the command above, then review the stack:
   `git log origin/main..HEAD` and `git diff origin/main..HEAD`.
2. **Push the Phase 1e G19 commit (and this docs commit) through GitHub Desktop** and verify the
   automatic deployment read-only. G20 is done — authorized, executed, verified.
3. Verify the automatic Vercel Production deployment read-only, from commit-linked public GitHub
   metadata. Do not bypass Deployment Protection and do not authenticate into Production.
4. Perform authenticated verification of the practice flow when a safe session is available: issue,
   check, refresh-and-resume, duplicate submit, and completed-session replay.
5. Remove the unused `initialScenario` prop from `app/(app)/skills/[slug]/practice/page.tsx` and the
   writing client's prop type.
6. Revisit the deferred items: rate limiting for the writing surface, `wins`/`streak` staleness in the
   judge route, and XP-farming policy for repeated writing sessions.
7. Begin the visual redesign, then stabilize the design system, then the games/progression work.

## Rules

- Never force-push. Never rebase, squash or amend approved commits without explicit approval.
- Never commit secrets, `.env` content, or anything under `/private/tmp` or the recovery bundle.
- Never run `db push`, a migration, a seed or a reset against the shared database without explicit
  human authorization — it is shared with production.
- Never run the three database-writing smoke suites casually, and never claim they passed when they
  were not run.
- Never treat an unverified deployment as successful.
- Never treat an authentication redirect as verification of the protected page behind it.
- Never run `npm run build` while a dev server holds `.next`.
- Never present unverified content as official; label AI-generated material as AI-generated.
- Never describe the practice session design as cheat-proof — describe what it actually enforces.
- Qualification does not equal attendance; no unauthorized copies or access-control circumvention.
