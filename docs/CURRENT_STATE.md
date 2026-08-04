# CURRENT_STATE

Factual snapshot. **Rewrite this file after each milestone** — do not append history.

_Last updated: 2026-08-04 (M13E2 Phase A — additive practice-session schema)_

## M13E2 Phase A — what this pass did, and what it deliberately did not do

M13E2 Phase A adds **Prisma definitions only**: two enums (`PracticeSessionKind`,
`PracticeSessionStatus`), two models (`PracticeSession`, `PracticeSessionItem`), and exactly one
additive virtual back-relation on `User` (`practiceSessions PracticeSession[]`, which adds no column
to the `User` table). The schema now holds 32 models and 21 enums.

What is true right now:

- **The database tables do not exist.** They exist only as source definitions. `npm run db:push` was
  **not** run, and no migration, seed, activation or learner-data operation occurred.
- **No route, library or component imports or queries the new models.** Phase A is asserted to be
  runtime-inert, and Production learner-facing behavior is unchanged.
- **Phase B (shared-Production `db push`) requires explicit human authorization** — it targets the
  database shared with production.
- **Phase C is blocked until Phase B succeeds.** Route and component cutover must not deploy before
  the tables are activated.
- **No Redis and no signing secret are used or required.**
- The approved Phase C direction is server-authoritative PostgreSQL sessions with transaction-native
  *internal* review/mastery cores, leaving the public M13E1G helpers (`recordPracticeOutcome`,
  `recordDrillMasteryDetailed`, `recordDrillMastery`) and their contracts unchanged.
- **M13E2 is not active and not complete.** Sessions are not bound, answer keys are not yet withheld,
  and no replay resistance exists yet.

The six suites that byte-pinned `prisma/schema.prisma` against a moving `HEAD` now use an immutable
control at `95fdd4c8` plus structural assertions, so the schema change is validated **before** the
commit rather than going green because `HEAD` moved.

## Repository state

- **Branch:** `main`
- **Parent of the Phase A commit:** `95fdd4c` (`fix(review): gate the spaced ladder on due reassessment`)
- **origin/main and remote `refs/heads/main`:** `95fdd4c` — the Phase A commit is **local only**.
- **Ahead/behind: `0 1`** after the Phase A commit; nothing has been pushed or deployed by the agent.
- Sections below this point describe the M11 close-out and were last re-verified on 2026-08-01 against
  `d7efcb5`; fifteen commits have landed since, through `95fdd4c`.
- The nine approved M11 commits (eight code, one documentation) were **pushed through a normal
  fast-forward**. No force-push, rebase, squash, merge or history rewrite occurred at any point.
- **Working tree:** clean apart from this pass's own edits to the two documentation files.

### The nine pushed commits

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

Cumulative code change against `700f40e`: 27 files changed, 1,728 insertions, 247 deletions — one deleted
(`components/training/hosa-roleplay-setup.tsx`), one added (`scripts/hosa-practice-scope-smoke.ts`).
No schema change, no migration, no API route added, no package dependency added, no lockfile change.
`package.json` changed only to register one new smoke script.

## Milestone status

| Milestone | Status |
|---|---|
| M1–M10 | Complete |
| M11 — independent review + documentation | Complete. Its verdict was NOT READY; every finding it raised has since been remediated. |
| M11R1–M11R12 — remediation passes | Complete. **No confirmed M11 code finding remains open.** |
| M13E1D–M13E1F — drill evidence safety (DECA, Debate, HOSA) | Complete, pushed and deployed. |
| M13E1G — due-gated spaced review | Complete, pushed and deployed (`95fdd4c`). |
| M13E2 Phase A — additive practice-session schema | **Code complete, local commit only. Database activation NOT run.** |
| M13E2 Phase B — shared-Production `db push` | **Not started. Requires explicit human authorization.** |
| M13E2 Phase C — route/component cutover | **Blocked until Phase B succeeds.** |
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
styling and the keyboard focus ring render together.

## Test results (2026-07-31, against `e44fb6f` plus these documentation edits)

- `npx tsc --noEmit` — passes.
- `npm run lint` — passes with **one pre-existing warning** (`<img>` in `components/profile/user-avatar.tsx`).
- `npm run build` — compiles successfully. The build was never run alongside a dev server.
- **24/24 registered `*:smoke` suites pass:** security, judge, judge-shape, rubric-scoring,
  debate-drills, deca-drills, auth, audio-debate, team, assignment, games, tracks,
  hosa-practice-scope, side-coach, debate-side-coach, deca-rubric, hosa-navigator, deca-navigator,
  source-freshness, nav-a11y, lesson-progress, debate-replay, learning-path, avatar.
- Focused harnesses pass: M8A, M8B and M9 SSR; M10 navigation/accessibility; and M11R2, M11R3, M11R4,
  M11R5, M11R6, M11R7, M11R8, M11R9, M11R10, M11R11, M11R12. These live in the session scratchpad,
  not in the repository.

## Browser and mobile validation

Verified by serving each surface's emitted SSR markup with the app's own compiled CSS over a local HTTP
server, because the browser-preview helper cannot launch from `~/Documents`. Checked at 375×812,
390×844 and 1280×900: no horizontal overflow, 44px recovery targets on the HOSA hub, coherent heading
order, and — with **real keyboard Tab** — `:focus-visible` matching plus a non-zero project focus ring on
navigator result buttons, including a selected button and in colorblind mode.

**This is not the live authenticated route.** No middleware, session, data fetching or click-through of
real navigation was exercised. No screen-reader certification and no full keyboard journey was performed.

## Known gates and unresolved items

1. **M4 HOSA replacement scenario** — blocked pending an approved scenario and clinical/legal or advisor
   review. If none is approved, the interactive practice stays unavailable.
2. **September 1, 2026 HOSA revalidation** — the final 2026-27 guidelines are expected then; every
   officially dependent HOSA detail must be re-checked against that release and later notices. Nothing
   in the code degrades a record automatically when that date passes.
3. **TDM weighting** — DECA's Guide and its published sample conflict; no figure may be stated until
   DECA resolves it.
4. **PSC scope** — the record places Professional Selling both inside and outside the role-play course;
   unresolved by design, and it routes to the DECA hub rather than the role-play lesson.
5. **`docs/curriculum/` is untracked** — the sole authority for every provenance claim is uncommitted
   and can drift or vanish with no diff. Provenance comments in the registries cite line numbers into
   files that are not under version control.
6. **Advisor/judge validation gates** from the research synthesis remain open; evidence validation
   proves an excerpt is real, not that a verdict is correct.
7. **Authenticated production verification is outstanding** — the deployment itself is verified; see below.

## Remote and deployment status

**A Vercel Production deployment tied directly to `d7efcb59ed94ca887f9d562ef21ea4723dde1175`
completed successfully.** Verified from unauthenticated, commit-linked GitHub metadata:

| Field | Value |
|---|---|
| Provider | Vercel |
| GitHub deployment ID | `5700303276` |
| Commit status ID | `51469218987` |
| Environment | `Production` |
| State | `success` ("Deployment has completed") |
| Deployment-specific URL | `https://debate-arena-k697ureau-habibisters-projects.vercel.app` |
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

**What this does and does not establish.** It establishes that the Production deployment for this
commit succeeded, that those routes exist and are auth-gated, and that the two HOSA-only AI endpoints
authenticate before anything else. It does **not** establish any protected page's internal behaviour:
no authenticated session was used, so nothing behind sign-in was exercised in production. The
post-authentication HOSA `410` contract remains verified **locally only**. A public alias cannot by
itself prove which commit it currently serves; the commit-linked deployment metadata above is the
evidence that `d7efcb5` deployed successfully to Production.

**Remote incident.** On 2026-07-31 at 16:22:41 local, `origin/main` moved from `a6f0e78` to `700f40e`
— a push from this clone that was not part of any approved step. The source is **unknown and is not
attributed to anyone**. The read-only evidence snapshot is preserved at
`/private/tmp/compete-ready-origin-main-incident.txt`. Treat the remote as capable of changing outside
this workflow: re-verify it immediately before any push.

## Environment variables (names only — never store values here)

`GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `OPENROUTER_API_KEY`,
`OPENROUTER_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER`, `AI_COST_MODE`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`, `NEXTAUTH_SECRET`,
`NEXTAUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `UPLOADTHING_TOKEN`.

No environment requirement changed in these eight commits.

## Next operational steps

1. Review this post-deployment documentation update.
2. Commit and safely push the documentation-only change.
3. Verify the automatic Vercel Production deployment for that documentation commit.
4. Perform authenticated protected-route verification when an existing safe session is available.
   This is a tracked follow-up; it does not block step 5.
5. Begin the visual redesign.
6. Stabilize the design system.
7. Add interactive card games, mini-games, progression, XP and streak features.

## What is explicitly NOT true

- **No authenticated production behaviour was verified.** Every protected page's internal behaviour —
  HOSA hub wording, Medical-Terminology-specific practice, the HOSA room's post-auth fail-closed
  redirect, the post-auth HOSA `410` contract, the Compete HOSA entry, DECA training-group wording and
  family-specific timing, PSC's unresolved state, the lessons index, navigator focus rings, heading
  outlines, authored-progress restore and Side Coach structured feedback — remains verified **locally**,
  not through authenticated production access.
- It is **not** claimed that the public alias cryptographically proves which SHA it serves.
- It is **not** claimed that every protected page is error-free; they could not be opened.
- The post-authentication HOSA `410` behaviour was **not** tested in production.
- The source of the earlier remote push is **not** known.
- Generic HOSA patient/clinical role-play is **not** available — it was withdrawn.
- It is **not** true that all HOSA practice is unavailable: Medical Terminology practice is active and
  records attempts.
- CompeteReady's event groupings are **not** official DECA or HOSA taxonomy.
- No universal DECA preparation time or exam weighting is claimed.
- Curriculum guidance is **not** permanently current; the 2026-27 HOSA release requires revalidation.
- Nothing has been rebased, squashed or amended; no schema change, migration, `db push` or seed was run;
  no dependency or lockfile changed.
- `docs/curriculum/` was read as authoritative context; it is not staged or committed.
