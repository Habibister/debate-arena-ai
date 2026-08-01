# HANDOFF

Everything the next engineer needs to continue safely. Rewrite in place; do not append history.

## Latest handoff — post-deployment verification (2026-08-01)

M11's independent review returned **NOT READY** and enumerated findings from BLOCKER down to LOW. Twelve
remediation passes (M11R1–M11R12) closed every one of them. **No confirmed M11 code finding remains
open.** The code and tests are clean and pushed.

The nine approved commits are **pushed and deployed**. This handoff was written after re-verifying the
repository directly — commit stack, cumulative diff and runtime behaviour — rather than trusting the
earlier milestone reports, and then after verifying the production deployment from commit-linked public
metadata.

## Repository state

- **Branch:** `main`
- **Synchronized commit before this update:** `d7efcb5`
- **origin/main:** `d7efcb5` · **Remote `refs/heads/main`:** `d7efcb5`
- **Ahead/behind: `0 0`.** Working tree was clean before this pass's documentation edits.
- `docs/curriculum/` is now tracked (committed in `d7efcb5`) and is the approved research record — treat
  it as such, not as app source.
- No production or test file differs from `d7efcb5`.

## The nine pushed commits and what each is for

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

All nine were pushed in one normal fast-forward (`700f40e..d7efcb5`). No force, no rebase, no squash,
no merge, no history rewrite.

Cumulative against `700f40e`: 27 files, +1,728/−247, one deletion, one addition. No schema, migration,
API-route addition, dependency or lockfile change. `package.json` changed only to register one smoke script.

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

**24 registered `*:smoke` scripts** as of this handoff: `security`, `judge`, `judge-shape`,
`rubric-scoring`, `debate-drills`, `deca-drills`, `auth`, `audio-debate`, `team`, `assignment`,
`games`, `tracks`, `hosa-practice-scope`, `side-coach`, `debate-side-coach`, `deca-rubric`,
`hosa-navigator`, `deca-navigator`, `source-freshness`, `nav-a11y`, `lesson-progress`, `debate-replay`,
`learning-path`, `avatar`.

Run them all:

```bash
for s in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(n=>n.endsWith(":smoke")).join(" "))'); do printf "%-24s " "$s"; npm run "$s" >/dev/null 2>&1 && echo PASS || echo FAIL; done
```

**`judge-shape:smoke` makes a live Gemini call** and is unreliable in two ways: it has failed once and
passed on re-run, and `scripts/judge-shape-smoke.ts:78-82` **exits 0 with only a console warning** when
no provider responds after four attempts. A green result can therefore mean the live check was
*skipped*. **The bulk loop above discards stdout, so it will print PASS in exactly that case** — run this
one on its own and read its output before trusting it.

The focused M8/M9/M10 and M11R2–M11R12 harnesses live in the session scratchpad, not the repository.
They are not required to reproduce a green build; the 24 smoke suites are.

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

## Final product truth

**Debate.** Role-play/practice active at `/debate`. CWI is one supported model, not the only one. No
universal 0–30 speaker-point scale is claimed.

**DECA.** Role-play practice active at `/training/deca/practice`; the room at `/training/deca/room`
serves DECA only. Timing is family-specific — Individual Series 10/10 and TDM 30/15 are sourced; PBA,
PFL and PSC have none and none is invented. TDM exam weighting is unresolved and absent. PSC is
unresolved and routes to the DECA hub, not the role-play lesson. The "Exam weighting" section renders
only where a family's own sourced facts establish an exam.

**HOSA.** The generic patient/clinical role-play is withdrawn. Medical Terminology practice is active
and records attempts. The communication lesson is informational and communication-only, its interactive
scenario is `temporarily-unavailable`, and it neither teaches nor scores hands-on procedures.

### HOSA fail-closed routes and APIs — preserve these

- `/training/hosa/practice` mounts `HosaEventPrep` only. `HosaRoleplaySetup` is deleted; do not restore it.
- `/training/hosa/room` redirects to `/training/hosa/events` **before** `RoleplayRoom` mounts. The room
  component itself now mounts only for DECA.
- `/compete` offers HOSA event navigation; there is no generic HOSA role-play arena.
- `/api/ai/hosa-scenario` and `/api/ai/judge-hosa` return HTTP **410** with
  `{"unavailable":true,"error":"Generic HOSA role-play practice is unavailable."}` **after** `requireUser()`
  then `enforceRateLimit()`. They must reach no provider, parse no body, produce no score and write nothing.
- `/api/ai/roleplay-turn` is **shared and unchanged** — DECA still needs it. Do not disable it.
- Medical Terminology keeps `/api/hosa/medterm/session` and `/api/hosa/medterm/submit`, its registry
  spec and provenance banner, and its Event HQ practice link.

## Fail-closed contracts to preserve

**Unknown input.** Each Navigator resolves only its own parameter through its own registry, by exact
match after trim + lowercase. Missing, empty, whitespace-only, repeated (array), path-like, unknown and
cross-track identifiers all select nothing. No first-record fallback, no silent redirect; the unknown
state offers list and hub recovery.

**HOSA family resolution.** Registry-derived. Exactly one routable member resolves to that named event;
zero or several return an **href-free** non-interactive state — the recovery link is `/training/hosa`,
never the events page the list is rendered on. Order-independent; production registry never mutated.

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

Local: TypeScript, lint (one pre-existing `<img>` warning), production build, 24/24 smoke suites, and the
focused SSR/route/API/state harnesses. Browser checks were done by serving emitted SSR markup with the
app's compiled CSS at 375×812, 390×844 and 1280×900, including real keyboard Tab for focus rings.

**Not done, and not to be claimed:** live authenticated deployment verification; screen-reader
certification; a full keyboard journey; database-backed resume verification; end-to-end production
coverage. The browser-preview helper cannot launch from `~/Documents`, which is why the local-server
approach is used.

## Production deployment status

**Verified from unauthenticated, commit-linked GitHub metadata** — a Vercel **Production** deployment
tied to full SHA `d7efcb59ed94ca887f9d562ef21ea4723dde1175` completed successfully.

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

1. **Deployment verification** — proven: Production, success, tied to `d7efcb5`.
2. **Route existence and auth boundary** — proven: the routes exist and are auth-gated; the two HOSA-only
   AI endpoints authenticate first.
3. **Authenticated protected-page product behaviour** — **not verified in production.** No session was
   used. Everything behind sign-in — HOSA hub wording, Medical-Terminology-specific practice, the room's
   post-auth fail-closed redirect, the post-auth HOSA `410`, the Compete entry, DECA grouping wording and
   family-specific timing, PSC's unresolved state, the lessons index, focus rings, heading outlines,
   authored-progress restore, Side Coach feedback — is verified **locally only**.

A public alias cannot by itself prove which commit it serves; the commit-linked deployment metadata is
what establishes that `d7efcb5` reached Production.

## Remote incident — read before pushing

On 2026-07-31 at 16:22:41 local, `origin/main` moved from `a6f0e78` to `700f40e`: a push from this clone
that was not part of any approved step. **The source is unknown and is not attributed to anyone.**
Evidence snapshot: `/private/tmp/compete-ready-origin-main-incident.txt`.

Consequence: the remote can change outside this workflow. **Always re-verify immediately before pushing:**

```bash
git ls-remote origin refs/heads/main && git rev-parse origin/main && git rev-parse HEAD && git rev-list --left-right --count origin/main...HEAD
```

If `origin/main` is not what you expect, stop and reconcile before doing anything else.

## Preserved artifacts (outside the repository — never commit these)

| Path | What it is |
|---|---|
| `/private/tmp/compete-ready-m11r5-uncommitted.patch` | The M11R5 seven-file diff, backed up before it was restored and reapplied |
| `/private/tmp/compete-ready-m11r5-uncommitted-files.tar` | The same seven files as a tar |
| `/private/tmp/compete-ready-m11r5-backup-sha256.txt` | Hashes for the two above |
| `/private/tmp/compete-ready-origin-main-incident.txt` | Read-only remote-state snapshot for the incident |
| `/private/tmp/compete-ready-final-docs-precloseout.patch` | This closeout's pre-edit backup of the two tracked docs |
| `/private/tmp/compete-ready-final-curriculum-precloseout.tar` | Pre-edit backup of `docs/curriculum/` |
| `/private/tmp/compete-ready-final-docs-precloseout-sha256.txt` | Hashes for the two above |
| `/private/tmp/compete-ready-postdeploy-docs-before.patch` | Pre-edit backup of the two docs at `d7efcb5` |
| `/private/tmp/compete-ready-postdeploy-docs-before.tar` | The same two files as a tar |
| `/private/tmp/compete-ready-postdeploy-docs-before-sha256.txt` | Hashes for the two above |

These are scratch-space artifacts. Verify with `shasum -a 256 -c <hash file>`; never stage or commit them.

## The exact safe sequence for the next engineer

1. Review this post-deployment documentation update (`git diff -- docs/`).
2. Commit and safely push the **documentation only**.
3. Verify the automatic Vercel Production deployment for that documentation commit, using
   commit-linked public GitHub metadata.
4. Perform authenticated protected-route verification when an existing safe session is available — a
   tracked follow-up that does **not** block step 5.
5. Begin the visual redesign.
6. Stabilize the design system.
7. Add interactive card games, mini-games, progression, XP and streak features.

## Rules

- Never force-push. Never rebase, squash or amend the eight approved commits without explicit approval.
- Never commit secrets, `.env` content, or anything under `/private/tmp`.
- Never stage unrelated files; keep `docs/curriculum/` untracked.
- Never treat an unverified deployment as successful.
- Never treat an authentication redirect as verification of the protected page behind it.
- Never run `npm run build` while a dev server holds `.next`.
- Never present unverified content as official; label AI-generated material as AI-generated.
- Qualification does not equal attendance; no unauthorized copies or access-control circumvention.
