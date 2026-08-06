# CURRENT_STATE

Factual snapshot. **Rewrite this file after each milestone** — do not append history.

_Last updated: 2026-08-06 (M14 Phase 1a — track-correct first run, local only)_

## M14 Phase 1a — the first run is track-correct, in local code only

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

**Local commit only — not pushed, not deployed.** No schema change, no migration, no seed, no
dependency, no env change, **no database operation**. `docs/M14_LEARNING_QUALITY_AUDIT.md`
(`a054706`, also local) is the audit this implements the first subphase of.

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
- **Local `HEAD`:** the M14 Phase 1a commit, ahead of `origin/main` by **two local commits**:
  the M14 Phase A audit (`a054706`, adds `docs/M14_LEARNING_QUALITY_AUDIT.md`) and Phase 1a itself
  (track-correct first run). Neither is pushed.
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
| M14 Phase 1a — track-correct first run | **Complete locally** (this commit). Signup organization resolves the track; Public Speaking removed from signup. Unpushed. |
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

1. Review the two local M14 commits (`git log origin/main..HEAD`, `git diff origin/main..HEAD`).
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

- **M14 is not live.** The Phase A audit and Phase 1a (track-correct first run) are local commits
  only; Production learners still get the pre-1a track behaviour, where the signup organization is
  never read and the default is General Debate.
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
