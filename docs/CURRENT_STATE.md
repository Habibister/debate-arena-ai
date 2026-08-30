# CURRENT STATE — AUTHORITATIVE

_Last updated: 2026-08-30._

**This region is the only part of this file that describes current reality.** Everything below the
`HISTORICAL ARCHIVE` boundary is preserved historical evidence and is explicitly non-normative and
non-executable. Rewrite this region after each milestone; append history below the boundary.

## Repository and Production

- **Branch** `main`. **No SHA written in this file is current truth.** Re-derive with
  `git rev-parse HEAD`, `git rev-parse origin/main` and `git ls-remote origin main` before acting on
  any SHA. **No SHA below the archive boundary describes what Production runs.**
- **Gate A is CLOSED.** The canonical-docs structural-quarantine commit is pushed and exact-source
  verified in Production.
- **Gate B is CLOSED.** The stale deployment-status comment in `lib/education/tracks/debate.ts` is
  repaired, pushed and exact-source verified in Production.
- **Gate C is CLOSED.** The canonical-routing / temporal-truth repair is pushed and exact-source
  verified in Production. All pre-B2.3 integrity gates are closed.
- **Deployment history — snapshot-scoped, each line pairing a commit with the deployment built from
  it. None of these asserts which commit is the head today.** B2.2 feature source
  `65c4e6f442d00296fe0a8f8e7902cfd627c02080` → deployment **`6098166145`** (SUCCESS). B2.2 docs
  source `32f92a4bcc68ab3f027a5fe6e617f2d837273791` → deployment **`6160459725`** (SUCCESS).
  Gate A docs source `5aa56fb21476c55f3769610d371ff1321df24936` → deployment **`6163533826`**
  (SUCCESS). Gate B source `692b68a581758569278a7bba6e3d007ede03bf4d` → deployment
  **`6163706185`** (SUCCESS). Gate C source `7cb01f86591a89e8b5655c256261fdb9b48d7e2c` → deployment
  **`6164466592`** (SUCCESS). B2.3 release source
  `7d2aa83c7420cf654676964ab57ba5b46970b597` → deployment **`6170342196`** (SUCCESS). **The B2.3
  teaching commit `44afae3d9629aafa6ed298df9c8a03dfe731976a` carried no deployment of its own** —
  the build was created from the reactivation tip, which carries the teaching commit beneath it.
- **Repair baseline for the canonical-routing/temporal-truth commit:**
  `692b68a581758569278a7bba6e3d007ede03bf4d`. That is a historical base reference, not a claim about
  the present head.

## Education state

- **B2.2 — FULLY CLOSED.** Teaching `f7e7cf307e891ed1089f9f4e5a9a1d2ef65e1c8b`, pair-control
  `a66d46cb33e509e7d4985944e56f98af9b0fdbe8`, release `65c4e6f442d00296fe0a8f8e7902cfd627c02080`, in
  that order — the history itself proves TEACH → PROTECT THE MEASUREMENT → RELEASE.
- **B2.3 — CLOSED.** Target `wg-08`. The `debate-weighing` catalog lesson teaches the weighing
  standard, also called a weighing framework: what it is, that it must be stated so either side's
  impact can be tested against it, that it is argued for and contestable, and why putting it up early
  leaves speeches in which it can be answered. Reviewed-content baseline updated for the single
  affected slug **`debate-weighing`**; `LEARNING_CONTENT_BASELINE` pinned to
  `B23-DEBATE-WEIGHING-STANDARD-TEACHING`. Two commits, and the ORDER is the point: teaching
  `44afae3d9629aafa6ed298df9c8a03dfe731976a` (teach the mechanism) →
  `7d2aa83c7420cf654676964ab57ba5b46970b597` (release the item by removing `wg-08` from
  `DEBATE_DRILL_HELD_IDS`, which is now empty). Both passed acceptance, the stack was owner-pushed,
  and the release source was exact-source Production-verified at deployment **`6170342196`**, health
  PASS. **`wg-08` is RELEASED IN PRODUCTION.**
- **B2.4 — NOT STARTED.** Target `pi-26`. Its gate is UNSATISFIED: a primary official DECA source
  locator for the instructional-area-vs-individual-PI weighting rule must be pinned and verified
  before B2.4 teaches the rule or reactivates the item. Internal synthesis is not sufficient.
- **P0.2 — NOT STARTED.**
- **M14 Global G2 — CLOSED** 2026-08-12 by explicit owner decision, at **420/420 within the M14 G2
  target scope**, current G2 deficit **0**. **Read the denominator carefully:** the G2 scope is the
  fourteen areas the M14 audit named — Debate's four original areas (claim-warrant-impact, rebuttal,
  evidence-evaluation, weighing), DECA's four, and HOSA's six — at 30 items each, so
  120 + 120 + 180 = **420**. **It is not the size of the live corpus.** The live corpus is **450**:
  the 420 above plus the 30 `clash` items, which arrived with the Clash measurable-practice closure
  and were never a G2 slice. Debate **150** = the G2 four × 30 plus clash 30. **A4 — CLOSED.** Waves
  1A/1B/1C, the Clash measurable-practice closure, M15 Learning Architecture Slices 1–3, P0.1/B1,
  B2.1 and B2.2 are all SHIPPED and Production-verified.

## Current lesson / curriculum truth

- **Debate learner path**, derived from `nextLessonId`: `debate-round-orientation` →
  `claim-warrant-impact` → `debate-evidence-evaluation` → `debate-signposting` → `debate-clash` →
  `debate-refutation` → `debate-answer-types` → `debate-turn-mechanics` →
  `debate-constructive-speeches` → `debate-weighing` → terminal.
- **Catalog sets — three different sets, never conflate them.** `LEARNING_SKILL_CATALOG`
  (`lib/learning-content.ts`) holds **21 authored** entries: **9 published** through the education
  registry and **12 held**. Separately, `EDUCATION_LESSONS` (`lib/education/registry.ts`) holds
  **12 registry lessons** = those 9 published entries **plus** `claim-warrant-impact`,
  `how-deca-roleplay-works` and `how-hosa-scenario-interaction-works`, which are not catalog entries.
  **The 12 held authored entries and the 12 registry lessons are NOT the same set** — they merely
  share a cardinality.
- **Connected durable loops — exactly FIVE:** Claim-Warrant-Impact (embedded server-graded practice,
  architecturally distinct), Evidence Evaluation, Clash, Refutation, Weighing.
- **Registry mapping.** Four entries carry BOTH `skillSlug` and `practiceDrill`
  (`debate-evidence-evaluation`, `debate-clash`, `debate-refutation`, `debate-weighing`); two carry
  `practiceDrill` as a CTA only (`debate-answer-types`, `debate-turn-mechanics`);
  `claim-warrant-impact` carries `skillSlug` with embedded practice.
- **Connectivity, stated precisely:**
  - `debate-clash` — **CONNECTIVITY CLOSED**.
  - `debate-signposting` — **UNRESOLVED CONNECTIVITY GAP**.
  - `debate-constructive-speeches` — **UNRESOLVED CONNECTIVITY GAP**.
  - `debate-round-orientation` — carries neither `skillSlug` nor `practiceDrill` **BY DESIGN**, so it
    can never mint mastery. It is **INTENTIONALLY UNMAPPED and NOT a connectivity gap.**
  Never write "only Signposting and Constructive have neither" — orientation has neither too.
- DECA and HOSA have no concept-drill mapping.
- Thresholds: `PRACTICING_MASTERY_MIN` **70** and `DRILL_PASS_THRESHOLD` **70** — equal numbers,
  distinct product concepts. DUE ≠ WEAK.

## Current assessment / serving truth

- **Banks.** Debate **150** (five areas × 30); DECA **120** (four areas × 30); HOSA **180** (six
  areas × 30). **Live corpus 450 items total.** All five Debate drill areas and all four DECA drill
  areas are **authorised**. The 270 measured Debate + DECA items are the frozen assessment set; the
  420 in the G2 line above is the M14 G2 target scope, a different denominator.
- **Held set — exactly 1, and it is DECA's.** The Debate held set is **empty**: B2.3 released
  `wg-08` in Production after teaching the weighing-standard mechanism it measures. DECA `pi-26` remains HELD
  (B2.4 target). `rb-14` and `rb-15` are **RELEASED** and individually eligible. `wg-29` is FAIR
  TRANSFER / SERVING — never collapse it with `wg-08`.
- **Two serving numbers, never collapsed.** GLOBAL INDIVIDUAL ELIGIBILITY — Debate **150/150**
  (rebuttal **30/30**, weighing **30/30**), DECA **119/120** (PI **29/30**). CLEAN-HISTORY DISTINCT
  SESSION CAPACITY — Debate **149**, rebuttal **29**, because the measurement-dependent
  `rb-14`/`rb-15` pair never co-serves. **Releasing `wg-08` moved Debate capacity from 148 to 149,
  never to 150** — the pair control still displaces exactly one item from every session, and rebuttal
  capacity is unchanged. If a test expects 29 for rebuttal and you are about to "fix" it to 30:
  don't. Raising session capacity by co-serving the pair destroys the contamination control.
- **The pair measurement control is ACTIVE in Production and must stay executable.** Four parts:
  (1) same-session mutual exclusion applied POOL-LEVEL inside `buildDrillSessionFrom` before the
  shuffle, keeper chosen at random; (2) retained-exposure sibling exclusion derived at the single
  issuing route `app/api/debate/drills/session/route.ts` via `siblingExclusionsFor`; (3) the
  independent adjudication anchor `scripts/debate-pair-adjudications.json`, read as EXPECTED against
  the runtime constant as ACTUAL; (4) release coupling that fails by name if an id is servable while
  the control is missing.
- **Exposure means ISSUED / RENDERED, never answered.** `retainedExposureWhere` carries no
  answered/graded predicate. Do not reintroduce an answered-only condition. The protection is bounded
  by retained history — it is **NOT** "once-ever".
- **Assessment bytes are frozen.** All 270 items are byte-identical to the accepted B1 state,
  protected by `scripts/debate-drill-bank-baseline.json` and `scripts/deca-drill-bank-baseline.json`.

## Current open gaps

- **DECA empty-pool twin — OPEN.** The Debate zero-eligible guard shipped in `a66d46cb`;
  `buildDecaDrillSession` still has no such guard. Do not record the empty-pool issue as closed —
  only the Debate half is.
- **Signposting and Constructive Speeches** drill-and-evidence connectivity (the only two unresolved
  Debate connectivity gaps).
- Later speeches, flowing, round strategy, crystallization, delivery, questioning/cross-ex.
- The R17 test-diagnostics debt (owner-ruled NON-BLOCKING); the inherited "seven lessons"-era source
  comments; moving-HEAD debt 18; `/debates/history`; the stale Reassess CTA; the skills-compat XP
  prose; the duplicate historical `36d` labels. Not all of S1B is closed.
- `initialScenario` is still accepted and never read by the writing client.
- Authenticated Production behaviour of the practice-session flow has never been exercised, in any
  environment.

## Current mandatory gates

**GATE A — CLOSED.** The canonical-docs structural-quarantine commit was accepted, pushed by the
owner and exact-source verified in Production, health PASS. Do not re-push or re-audit it.

**GATE B — CLOSED.** The stale deployment-status comment on `DEBATE_TURN_MECHANICS_LESSON` in
`lib/education/tracks/debate.ts` was repaired in its own source-truth commit, accepted, pushed and
verified. The file no longer carries any deployment-status claim. Do not re-repair it.

**GATE C — CLOSED.** Canonical routing / temporal truth. A read-only audit of the
`CLAUDE.md` → `docs/CONTEXT_INDEX.md` → `docs/NEXT_TASK.md` chain found four real defects, which this
repair addresses: `docs/NEXT_TASK.md` asserted a stale active milestone; no precedence rule existed
between the canonical documents and the task pointer; `docs/HANDOFF.md` was demoted to optional
reading while it carries the STOP conditions and the audit-safe suite membership; and closing Gates A
and B left present-tense falsehoods about them in both canonical documents. The audit also found a
second routing surface with the same defect. This repair edits four files there:
`.claude/commands/context-refresh.md`, `.claude/commands/implement-one-task.md` and
`.claude/agents/lead-engineer.md` gain the read order and the precedence rule;
`.claude/commands/milestone-handoff.md` gains an archive invariant, because its whole-file-rewrite
instruction could have destroyed the frozen archive. **The other seven files under
`.claude/commands/` and `.claude/agents/` are unchanged by this repair.** `docs/CONTEXT_INDEX.md` carries the
canonical statement of that hierarchy, and it governs every surface below level 2 whether or not it
was edited here. **It is not the only place the rule appears:** `docs/NEXT_TASK.md` and the three
`.claude` surfaces named above each state it in their own terms, and
`.claude/commands/milestone-handoff.md` cross-references it. A change to the hierarchy has to be
carried to all of them, not to `docs/CONTEXT_INDEX.md` alone.

**That condition is now satisfied.** The canonical-routing / temporal-truth repair was accepted,
pushed by the owner and exact-source verified in Production, so Gate C is closed and all three
pre-B2.3 integrity gates are closed. B2.3 teaching has begun on that basis.

**B2.3 — CLOSED, and there is no remaining B2.3 gate.** The rule that governed the release is
unchanged and still stated durably: `wg-08` counts as Production-released only once the commit
carrying the reactivation has passed release acceptance, been pushed by the owner, and had its exact
source SHA verified in Production. **All three are satisfied**, at source
`7d2aa83c7420cf654676964ab57ba5b46970b597` and deployment **`6170342196`**, whose own source-SHA
field equals that commit exactly. Stated as a verified event rather than as a current-deployment
claim, so a later deployment cannot stale it.

**What that verification did and did not establish.** Exact-source Production deployment: VERIFIED —
the deployment record's own `sha` field, and its `ref` field, are both the full 40-character release
SHA, so no branch-name inference is load-bearing. Public Production health: PASS — credential-free
probes only, zero unexpected 5xx. Alias-to-deployment binding: **NOT INDEPENDENTLY VERIFIED** — the
deployment-specific host is behind deployment protection and returns the same response for a real and
a fabricated build id, and the release commit touches no file under `app/`, `components/`, `public/`
or `styles/`, so content correlation could not discriminate either. No repository rule requires alias
binding, and this disclosure is **not** a reason to reopen B2.3. Do not describe alias binding as
verified.

**Standing rule learned here — record milestone status as a verified event, never as a pending
state.** Closing B2.3 required this extra docs commit because the previous revision made only the
*deployment word* durable and left the *milestone status* self-staling. A milestone heading that
named the release as still pending, a flat sentence denying closure, and a numbered next-action list
of steps still to take all went false the moment the push and the verification landed. A status
sentence that describes what is still outstanding is a dated claim and will rot. Write what was
accepted, pushed and verified, at which SHA and which deployment. **Do not restate the superseded
wording verbatim in a current region** — a quoted stale claim is indistinguishable from a live one to
any sweep, which is why this paragraph describes the defect instead of reproducing it.

## Validation / suite truth

- **Audit safety follows the COMPLETE EXECUTION PATH, not the entry file.** Loading
  `node_modules/.prisma/client/index.js` dotenv-reads `<repo>/.env` at module scope, so any module
  reaching `@prisma/client` as a value is a carrier — `lib/api.ts` as well as `lib/prisma.ts`. A
  suite whose own source never mentions `.env` still reads it if its closure does.
- **Four counts, never collapsed.** **REGISTERED = 36** (`*:smoke` scripts in `package.json`).
  **PROJECT RELEASE-SAFE BATTERY = 32** — registered minus `auth`, `team`, `assignment`
  (shared-Production database writers) and `judge-shape` (env reader + live provider); the release
  gate, and **NOT credential-free — 15 of its members read `<repo>/.env`.**
  **NO-ENV AUDIT SMOKE SET = 17** — the only suites proven to make zero env-file read attempts; the
  membership is listed in the CURRENT HANDOFF region of `docs/HANDOFF.md`. **ENV READERS = 19** —
  five directly (`auth`, `team`, `assignment`, `judge-shape`, `avatar`), fourteen transitively.
- **Only the 17-suite no-env set, plus `npx tsc --noEmit`, may be run during an education/docs
  integrity audit.** `npm run build`, `lint`, `validate`, `dev` and `start` all read `.env` and
  `.env.local` through `@next/env`. **The repository's normal production-build path under the current
  toolchain is therefore NOT no-env audit-safe** — fail-closed execution observed attempted `.env` and
  `.env.local` reads. That is a statement about the toolchain as it stands today, not a claim that no
  isolated future build arrangement could avoid env files; any such path would need fresh proof.
  Production build is RELEASE validation.
- **Only 36 and 32 are derivable from `package.json`.** The 17 and the 19 are properties of each
  suite's transitive closure and were established by static analysis plus a fail-closed runtime guard;
  re-derive them that way, never by name or by subtraction. A passing run proves nothing — Prisma
  swallows a blocked read, so all 14 transitively tainted suites pass while reading `.env`.
- The commands live in the CURRENT HANDOFF region of `docs/HANDOFF.md`. **Do not run any command
  copied from the historical archive.**

## Security truth

- **2026-08-12 database-credential exposure — HISTORICAL INCIDENT.** An automated review process read
  the connection string from the environment file and ran read-only queries against the shared
  production database, unauthorized. No writes were reported.
- **Credential rotation completion: UNVERIFIED FROM REPOSITORY EVIDENCE.** This file claims neither
  that rotation happened nor that it did not. Establishing it needs provider-side evidence the owner
  holds.
- **Standing safety, unconditional:** never open `.env` or `.env.local`; never read or print
  `DATABASE_URL`; never use Production database credentials; never record a secret in a document,
  commit or transcript. **No education work, B2.3 included, depends on proving rotation.**
- **Three different env-access facts. State them separately; never collapse them into one "zero".**
  1. **Repository env-file access during RELEASE validation: YES.** The normal production build and
     the 32-suite project release-safe battery include processes proven to load `.env` and
     `.env.local`. Loading a file is reading it. Those runs must never be called credential-free or
     no-env.
  2. **Env-file read attempts during STRICT NO-ENV AUDIT validation: ZERO.** *Measured in the
     COMBINED ENV + NETWORK GUARDED RUN — name the run by its guard type, never by chronology:*
     `npx tsc --noEmit` **completed / zero env attempts / zero outbound network attempts**, and the
     17-suite no-env set **17/17 completed / zero env attempts / zero outbound network attempts /
     zero successful external provider calls / zero prohibited writes**, every suite having printed
     its own success banner, under a guard that fails closed on BOTH env-file reads and outbound
     provider traffic. An EARLIER ENV-ONLY GUARDED RUN exists in the investigation that produced
     this model; it measured env attempts only and never measured network — do not cite it for the
     network figures. This is EXECUTION EVIDENCE from that run, not a timeless
     repository invariant — set membership is repository-derived, the clean result is not. Both
     halves must always be stated together: a zero-attempt count is meaningless unless the guarded
     command genuinely completed, and a PASS is never by itself evidence of zero env reads. **The 17
     is a no-env set, not a no-provider-capability set** — `side-coach`, `debate-side-coach` and
     `deca-rubric` all reach provider-capable code via `lib/side-coach.ts:9` — so provider safety
     rests on fail-closed execution control and observed zero outbound calls, never on capability
     absence.
  3. **Intentional inspection of env-file contents by an auditor: NONE.** *The subject of this
     sentence is the auditor, never a process.* No auditor intentionally opened or inspected an env
     file, printed, copied, parsed or recorded its contents, or exposed them; and no secret value
     appears in these documents, in any commit, or in any report. Processes did load env files during
     release validation — see fact 1, which this does not retract.

## Current next action

**No B2.3 action remains.** The next Debate education work is the two unresolved Debate connectivity
gaps named under *Current open gaps*: **`debate-signposting`** and **`debate-constructive-speeches`**,
which carry neither `skillSlug` nor `practiceDrill` and therefore cannot mint mastery. Treat them as
the next education-perfection target, and read *Current open gaps* rather than this line as the
authoritative backlog — `debate-round-orientation` is unmapped **BY DESIGN** and is not part of this
work.

**B2.4 / `pi-26` remains gate-blocked and is not next**: a primary official DECA source locator for
the instructional-area-vs-individual-PI weighting rule must be pinned and verified before B2.4
teaches the rule or reactivates the item. Internal synthesis is not sufficient.

If a later authoritative revision of this file names a different next education milestone, this file
wins over any task pointer that disagrees with it.

## Not claimed

This file does not claim Debate, DECA, HOSA, the education system or CompeteReady is complete or
correct. The education-perfection program has material gaps across all three tracks. The archive
below has **not** been individually fact-checked and is not asserted to be true today.

# HISTORICAL ARCHIVE — NON-AUTHORITATIVE

<!-- CANONICAL_HISTORICAL_ARCHIVE_START -->

**Everything below this marker is historical snapshot material.**

Present-tense verbs, commands, SHAs, deployment statements, "next" actions, "still open" statements,
"ready to push" statements, test commands and imperatives below this boundary describe the historical
snapshot in which they were written. **They MUST NOT be interpreted as current project state or
current instructions.**

**DO NOT EXECUTE COMMANDS FROM THIS ARCHIVE.** Historical commands are preserved only as evidence of
what was run or planned at the time. Any command needed today must appear in the CURRENT HANDOFF
region of `docs/HANDOFF.md` and be validated against the current repository first. This specifically
neutralises stale safe-suite filters, provider-running commands, deploy, push and migration commands.

**DO NOT USE ARCHIVED STATUS CLAIMS TO DETERMINE CURRENT STATE.** Archived OPEN / CLOSED / NEXT /
NOT STARTED / LOCAL / PUSHED / NOT PUSHED / PRODUCTION / READY TO PUSH / DEFICIT / CURRENT / TODAY /
NOW / STILL refer only to their own snapshot. Read current equivalents from the authoritative region
above.

If archive prose conflicts with the authoritative region, **the authoritative region wins.** Any
historical claim promoted back into current guidance must first be re-derived from repository truth.

The archive preserves historical records in roughly reverse-chronological order; it contains known
ordering irregularities and is not warranted as a strict chronology. Current truth is above.

## B2 — curriculum closure of the held concepts (IN PROGRESS)

*This section states the B2 programme rule. The two shipped B2 slices follow as their own top-level
sections, `## B2.1` then `## B2.2`, in shipping order — they are peers of this heading, not
subsections of it. Every section below them is newest-first.*

**Required per-item sequence, unchanged:** TEACH → verify reachability → closed-corpus assessment → re-review question validity
against the final lesson bytes → remove a hold only when a beginner can reasonably solve the item
from CompeteReady instruction → rerun the serving/mastery safeguards. **B2 must NOT simply unhold
ids.**

## B2.1 — answer-types teaching + four-item reactivation — SHIPPED and Production-verified

Teaching SHA `35690107c430fe3eb45eba12c50488a8026edded` (`feat(education): teach debate answer
types`); release SHA `3199900e82ccc825da4e40823e4d17dab9713bde` (`feat(education): reactivate
taught rebuttal drills`); teach-before-test ancestry `8ea30c8d…` → `35690107…` → `3199900e…`,
the release strictly later in history. Production deployment **`6093148342`** (created
2026-08-25T22:18:28Z), deployment source sha = the release SHA exactly; post-push verification
PASSED (read-only — remote identity, source truth, public-route health, unauthenticated sign-in
redirect; no authenticated learner session was performed: Production serving truth rests on exact
source identity plus the independently accepted local serving proofs).
The lesson: authored catalog entry `debate-answer-types` in `lib/learning-content.ts` (LC1
baseline 19 → 20 blocks, marker `B21-DEBATE-ANSWER-TYPES-TEACHING` — this line is the
affected-slug record the integrity smoke's contract requires); registry entry CTA-only (no
skillSlug — refutation keeps the sole `debate-rebuttal` remediation claim); chain at that shipment
refutation → answer-types → constructive-speeches, with `turn-mechanics` inserted between them by
B2.2. Educational status: ACCEPTED / SHIPPED /
PRODUCTION-VERIFIED.
**Released after teaching + per-item preparedness acceptance:** `rb-02`, `rb-13`, `rb-16`,
`rb-30`. **Held at B2.1 shipment — exactly 4:** `rb-14`, `rb-15` (both since RELEASED by B2.2),
`wg-08` (PARTIALLY TAUGHT — weighing lenses are taught; the early-stated-standard mechanism the
item requires remains untaught, so it stays held for B2.3), `pi-26` (UNTAUGHT — B2.4; plus the
primary-official-locator gate remains unsatisfied). Partial teaching does NOT make `wg-08`
assessment-ready.
**Served populations at B2.1 shipment:** Debate **147/150** (rebuttal 28/30, weighing 29/30);
DECA **119/120** (PI 29/30) — superseded by B2.2 below. All 270 assessment item literals are
byte-identical to the B1 state (parsed field-level proof at acceptance); the release is a
serving-list change only, and in-flight held-item answers still grade honestly.
**B2.1 provenance — record exactly.** The B2.1 educational bytes are AI-authored and
independently AI-reviewed (including the owner's blind closed-corpus protocol). External human
content review was **WAIVED BY THE PROJECT OWNER on 2026-08-25**, scoped to the accepted teaching
bytes at `35690107c430fe3eb45eba12c50488a8026edded`; human content review was **NOT PERFORMED**; a
waiver is NOT human review. Never describe these bytes as human-reviewed, human-approved, or
externally reviewed. Any future change to those educational bytes voids the waiver for the changed
bytes and requires a new provenance/review decision.
**PI-26 source gate (owner ruling, durable — mirrored beside the hold in `lib/deca-drills.ts`).**
The DECA instructional-area-vs-individual-PI weighting doctrine is INTERNALLY GROUNDED only. B2.4
must NOT teach the rule and `pi-26` must NOT be reactivated until a primary official DECA source
locator supporting the claim is pinned and verified; the internal research synthesis alone is not
sufficient. Gate currently UNSATISFIED.
**Inherited stale-comment debt (OPEN, NON-BLOCKING, deferred to the stale-comment truth sweep):**
pre-existing "seven lessons"-era prose comments at `lib/education/registry.ts` (top-of-file),
`scripts/skills-compat-smoke.ts` (~370) and `scripts/debate-mastery-smoke.ts` (~495) predate B2.1
and remain stale; the assertions beneath them are correct and were deliberately not fixed in the
B2.1 commits. The count those assertions carry is now **twelve** — B2.2's teaching commit raised
`scripts/skills-compat-smoke.ts` and its siblings from eleven to twelve when
`debate-turn-mechanics` was registered, and `EDUCATION_LESSONS.length === 12` at HEAD (asserted by
education-registry 1., education-migration 5. and skills-compat 28.). It was eleven at B2.1.

## B2.2 — turn-mechanics teaching + measurement control + two-item reactivation — SHIPPED and Production-verified

Three commits, in an order the history itself proves: teaching
`f7e7cf307e891ed1089f9f4e5a9a1d2ef65e1c8b` (`feat(education): teach debate turn mechanics`), then
the measurement control `a66d46cb33e509e7d4985944e56f98af9b0fdbe8` (`fix(assessment): prevent
sibling contamination`), then the release `65c4e6f442d00296fe0a8f8e7902cfd627c02080`
(`fix(assessment): reactivate taught turn mechanics`). Production deployment **`6098166145`**
(created 2026-08-26T06:08:38Z), deployment source sha = the release SHA exactly; exact-source
verification PASS and public health PASS (root 200, sign-in/sign-up 200, protected routes redirect,
zero unexpected 5xx). TEACH → PROTECT MEASUREMENT → RELEASE.

**The teaching.** Authored catalog entry `debate-turn-mechanics` in `lib/learning-content.ts` (LC1
baseline 20 → 21 blocks, marker `B22-DEBATE-TURN-MECHANICS-TEACHING` — this line is the
affected-slug record the integrity smoke's contract requires): the ACTION → LINK → IMPACT chain
anatomy, no-link vs link turn, impact defense vs impact turn, conditional no-link + impact-turn
branches, and the same-chain double-turn hazard derived rather than sloganised. Chain refutation →
answer-types → turn-mechanics → constructive-speeches; CTA-only registry entry, no skillSlug.
Accepted through the owner's three-stage blind protocol (Stage 1 revised twice for doctrine purity;
Stage 2 keys 11/11 match), plus a website-only blind fairness audit in which fresh reviewers with no
keys and no outside debate knowledge answered every formative and both held items from the
learner-visible site alone.

**Released:** `rb-14` and `rb-15`, each adjudicated INDEPENDENTLY — preparedness PASS,
website-only fairness PASS, reactivation PASS. `rb-14` leakage LOW; `rb-15` leakage MODERATE /
ACCEPTABLE (legitimate concept overlap: teaching why a double turn self-defeats necessarily teaches
the composition `rb-15` measures). Neither is human-reviewed. **Still held — exactly 2:** `wg-08`
(PARTIALLY TAUGHT, B2.3) and `pi-26` (UNTAUGHT + source-gated, B2.4).

**ELIGIBILITY IS NOT SESSION CAPACITY — two different true numbers, never collapse them.**
GLOBAL INDIVIDUAL ELIGIBILITY: Debate **149/150** (rebuttal **30/30**, weighing 29/30); DECA
**119/120** (PI 29/30). Every one of those items may be served. CLEAN-HISTORY DISTINCT SESSION
CAPACITY: Debate **148**, rebuttal **29** — because `rb-14` and `rb-15` are a measurement-dependent
pair and are never co-served in one valid session, so exactly one of them appears in any single
session. A particular learner's fresh pool can be smaller still when retained exposure excludes a
sibling, or both. 148/29 are NOT global serving counts, and 149/30 are NOT simultaneous session
capacity. Raising session capacity by co-serving the pair would be a measurement-validity
regression, not a fix.

**PAIR MEASUREMENT CONTROL — IMPLEMENTED / ACTIVE / PRODUCTION-DEPLOYED** (this supersedes the
former "pair-contamination gate OPEN"). Four parts: (1) same-session mutual exclusion, applied
pool-level inside the builder before the shuffle, keeper chosen at random so neither sibling is
quietly retired; (2) retained-exposure sibling exclusion, derived at the single issuing route from
already-persisted item history; (3) an independent adjudication anchor,
`scripts/debate-pair-adjudications.json`, read as EXPECTED and compared against the runtime constant
as ACTUAL so the policy can never be the sole record of its own necessity; (4) non-vacuous release
coupling — deleting the runtime group or the record fails by name. **Exposure means ISSUED /
RENDERED, never answered**: reading a sibling's choices already discloses the other's logic.
The protection is bounded by retained history, not permanent — it prevents the platform from
handing a learner the decisive logic immediately before measuring the sibling; it does not erase
long-term memory or blacklist an item forever.

**Pre-policy exposure is real, and the conservative behaviour is intentional.** `rb-15` entered the
bank on 2026-08-11 and the pair was only held on 2026-08-25, so retained rows from before the policy
may already record exposure. A learner whose history shows one sibling will not be freshly served
the other; a learner whose history shows both is served neither until that history ages out. That is
the control working, not a serving bug.

**B2.2 provenance — record exactly.** The B2.2 educational bytes are AI-authored and independently
AI-reviewed. External human content review was **WAIVED BY THE PROJECT OWNER**; human content review
was **NOT PERFORMED**; a waiver is NOT a review. Never describe these bytes as human-reviewed,
human-approved, or externally reviewed. The waiver does not extend to any future educational bytes.

**STANDING PROCESS RULE (adopted 2026-08-26, learned the hard way in B2.2).** Any commit that
changes learner-visible item state — HELD, ACTIVE, RELEASED, SERVABLE — must run a PRESENT-TENSE
TRUTH SWEEP across source, tests, governance comments, success/report banners and tracked state
documentation **before final acceptance**. Reason: earlier commits routinely contain comments that
were truthful when authored and are falsified by a later state-changing commit in the same stack.
**Classify claims by temporal meaning, not by the section they sit in** — a historical heading does
not make its sentences historical. These words turn an old paragraph into a claim about CURRENT
reality and must be checked against it: *today, currently, current, still, remains, remaining, now,
active, next, latest, since <an older slice>, as of, pending, open, serve/serving, deployment*.
**And sweep PER CLAIM, across the UNION of both canonical state documents — never per file.** For
each claim: normalise it, search BOTH `docs/CURRENT_STATE.md` and `docs/HANDOFF.md` for exact
duplicates, mirrored wording and near-equivalents, reconcile every occurrence in the same pass, and
mark each one CURRENT+TRUE or HISTORICAL+EXPLICITLY SCOPED. A claim is NOT cleared until every
mirror is reconciled. The failure this prevents is concrete and cost B2.2 three cycles: repairing
the CURRENT_STATE copy of a claim while leaving its HANDOFF twin stale, or the reverse.

**B2.3 — NEXT / NOT STARTED / BLOCKED behind the canonical-docs rot sweep.** Target `wg-08`,
which is PARTIALLY TAUGHT and HELD: the weighing
lenses are taught, but the early-stated weighing-standard mechanism the item requires is not, and
the existing lens teaching does not by itself prepare it. **B2.4 — NOT STARTED** (target `pi-26`;
the primary official DECA locator for the instructional-area weighting rule remains UNSATISFIED, and
B2.4 must not teach the rule or reactivate the item until it is pinned and verified).

**DECA empty-pool twin — OPEN / SEPARATE SAFETY DEBT.** The Debate empty-pool guard shipped in the
B2.2 measurement-control commit (a zero-eligible pool now fails closed instead of entering a
synchronous non-terminating padding loop inside the request transaction). The DECA builder still
lacks that guard. Do NOT record the empty-pool issue as closed — only the Debate half is.

**P0.2 — NOT STARTED.**

**Honest scope.** This release does not make the education system complete or perfect; the larger
education-perfection program still has material gaps across Debate, DECA, and HOSA.

## P0.1 assessment-integrity + B1 educational-validity closure — SHIPPED and Production-verified

Feature/release SHA **`20609a69dc30b37a044c221bd28209a43d9a0a2c`** (the B1 commit), Production
deployment **`6090563687`**, status **SUCCESS** — the deployment object's own sha field ties
Production to the release SHA exactly. The P0.1 assessment-integrity commit is its parent,
`0789278cc09bb771b68a49d23a3c2dd709aa0d0d`; the pre-P0.1 baseline is
`730a350d44e5874d6967491d78c9eeafe1b4a583`, with exact two-commit ancestry from the baseline to the
release SHA. Any later docs-only truth-sync commit is NOT the feature SHA. Nothing was deleted.

**P0.1 — answer-form leakage repaired (NOT cosmetic).** The measured Debate/DECA banks carried
systematic answer-form leakage: blind answer-form heuristics (e.g. always picking the longest
choice) could manufacture durable mastery evidence — measured **83–100% blind accuracy** on
affected areas pre-repair. P0.1 repaired the leaking items and added an **enforced static
assessment-quality guard**; the repaired banks passed the final machine/AI educational review and
guard process. This does not claim overall educational perfection.

**The static guard, precisely.** It checks answer-form signal families — length, cue wording,
duplication — plus mutation tests. Final measured examples: `debate:clash` H_LONG 13.3% / UL 13%;
`deca:performance-indicators` H_LONG 21.7% / UL 20%. The guard **SUPPLEMENTS** educational review —
it never replaces it.

**B1 — closed-corpus educational-validity closure.** After the closed-corpus educational-validity
review, B1: (a) repaired the adjudicated item-validity defects, (b) held valid-but-untaught
questions from NEW serving, (c) rebased the serving/mastery tests to the actual served population,
(d) preserved honest grading for historical and in-flight held-item attempts, and (e) deleted
nothing.

**The closed-corpus review, precisely.** An independent **AI** closed-corpus reviewer answered all
179 reviewed questions blind, before seeing the keys, and matched **178/179** official keys; the
comparison was then used to expose curriculum and one-best-answer defects — not as a score-only
gate. It is an AI review: NOT human review, NOT external review, NOT human approval.

**B1 item repairs.** `cl-08` direct-clash key repaired; `cl-10` formerly semantically-correct
distractor repaired; `cl-30` second defensible non-responsive distractor repaired; `pi-28` key
tightened so the concept verb AND the implementation/measurement scaffold must be satisfied
together.

**The held set at B1 shipment — exactly 8.** Debate `rb-02`, `rb-13`, `rb-14`, `rb-15`, `rb-16`, `rb-30`, `wg-08`;
DECA `pi-26`. These remain **valid curriculum targets**, excluded from NEW durable assessment only
because learner-visible teaching does not yet prepare learners for them. They are not bad, not
invalid, not deleted, not retired. WG distinction to preserve: **`wg-08` is HELD — partially
taught (weighing lenses taught; its required early-stated-standard mechanism untaught); `wg-29` is
FAIR TRANSFER / SERVING** — adjudicated separately; never collapse the two. (B1
record: B2.1 has since released `rb-02`, `rb-13`, `rb-16`, `rb-30` and B2.2 released `rb-14` and
`rb-15`, each after teaching — the CURRENT held set is exactly 2, `wg-08` and `pi-26`; see the
B2.2 section below.)

**Served populations at B1 shipment.** Debate **143/150** (rebuttal 24/30, weighing 29/30); DECA
**119/120** (PI 29/30); since B2.2, Debate global individual eligibility is **149/150** (rebuttal
30/30) — see the B2.2 section for the eligibility-vs-session-capacity distinction.
Held ids stay physically in their banks; historical attempts are NOT invalidated.

**Provenance — record exactly.** B1 final educational content is AI-assisted, independently
AI-reviewed, blind closed-corpus reviewed, and adversarially final-byte validated. External human
content review was **WAIVED BY THE PROJECT OWNER on 2026-08-25**; human content review was **NOT
PERFORMED**. Never describe B1-edited bytes as human-reviewed, human-approved, or externally
human-reviewed — a waiver is not a review.

**Production verification (read-only, concise).** local HEAD = `origin/main` = the true remote
main; exact two-commit ancestry from `730a350d`; the deployment object's own sha field ties
Production to the release SHA; public routes showed no unexpected 5xx; an unauthenticated protected
route preserved its sign-in redirect; no authenticated submission and no DB mutation were
performed.

**Latent serving debt as recorded at B1 — half of it has since SHIPPED.** The session-builder
selection loop can fail to terminate if a requested area ever has zero served items; at that
shipment the treatment was still future work and was deliberately not fixed in the B1 release.
**Debate: FIXED.** The fail-closed guard shipped in B2.2's measurement-control commit
`a66d46cb33e509e7d4985944e56f98af9b0fdbe8` and is Production-deployed — a zero-eligible Debate pool
now throws before the selection loop is entered. **DECA: STILL OPEN** — `buildDecaDrillSession`
has no such guard; see the DECA empty-pool twin below, which remains separate safety debt. Current
Debate serving figures are in the B2.2 section: rebuttal global individual eligibility 30/30 with a
clean-history distinct session capacity of 29; weighing 29/30; PI 29/30.


## Clash measurable-practice closure — SHIPPED and Production-verified

Feature `3e5dace7be9d08d6f73f36fefa99580e6115a0bb`, Production deployment **`6074834885`**. A
post-Wave-1 slice, decided by its own prioritization/viability/release audits — not part of Wave 1.
Schema **ZERO**, migrations **ZERO**, `prisma/seed.ts` **ZERO**.

**The closure.** Debate's Clash lesson was Taught and simulated but not measurable. Now:
lesson **`debate-clash`** ("Create direct clash", `/lessons/debate-clash`) → skillSlug
`debate-clash` → practiceDrill `{ track: "debate", area: "clash" }`
(`/study-arcade?track=debate&area=clash`). The lesson kept its structure, worked example, guided
question and position; the closure included only a narrow quality correction — a deeper explanation
of finding the actual disagreement and engaging it directly, and two recall-level formative
questions replaced with application questions. No second lesson, no format-specific procedure.

**The measured construct — deliberately narrow.** The drill measures **clash recognition and
response selection**: identifying the actual disputed point, identifying which argument needs
answering, distinguishing direct engagement from repetition and parallel argumentation, identifying
non-responsive or irrelevant answers, and choosing the response that directly engages the
opponent's reasoning. It is NOT durable mastery of live spontaneous clash, complete speech
execution, delivery, time-pressure adaptation, round-wide strategy, or judge adaptation.

**Five canonical measured Debate skills.** `debate-claim-building` (claim-warrant-impact),
`debate-evidence` (evidence-evaluation), **`debate-clash` (clash)**, `debate-rebuttal` (rebuttal),
`debate-weighing` (weighing) — 30 items each, **150 authored** (the pre-existing 120 unchanged at
that shipment; since B2.2 — see the B2.2 section above — **149/150 are individually eligible**,
with only `wg-08` held from NEW serving, though one single session tops out at 148 distinct because
the measurement-dependent pair never co-serves; B2.1 had 147 eligible and B1 had held 7). Bank
provenance stays truthful: the 30 Clash items are AI-assisted and are submitted through the
repository's human review-and-approval gate; a personal human content review of the items has not
been separately established and is not claimed.

**Connected durable loops are now exactly FIVE.** CWI (embedded server-graded practice —
architecturally distinct, no registry reverse-remediation mapping), Evidence Evaluation, **Clash**,
Refutation and Weighing (each: exact drill, reverse remediation + Coach). Orientation is not
counted. Registry-mapped drill-backed concept teaching homes are exactly:
`debate-evidence-evaluation`, `debate-clash`, `debate-refutation`, `debate-weighing`.

**DUE ≠ WEAK carries forward.** Due `debate-clash` at 69 → the Clash lesson then the exact drill;
at 70/71 → the exact drill only. `PRACTICING_MASTERY_MIN` (70) and `DRILL_PASS_THRESHOLD` (70)
remain distinct concepts despite the equal number. Most-overdue ordering (`nextReviewAt ASC`)
remains authoritative; a weaker later Clash row never displaces an earlier due row.

**Coach and simulation stay honestly separated.** Clash consumes the existing generic Coach: the
server selects skill, lesson, drill, href and order from durable evidence; the AI explains only;
`NO_DUE_ACTION` unchanged. The AI judge's `centralClashResponse` score remains
diagnostic/simulation-only — it writes no mastery, advances no review, and selects no Coach action.

**Formative/durable boundary.** In-lesson Clash checks remain FORMATIVE ONLY; the external
server-graded Clash drill is the first durable Clash evidence, through the existing session →
grading → `MasteryProgress` → `SkillReviewSchedule` path. No new writer.

**Routing and writing practice.** `/skills/debate-clash` resolves canonically to
`/lessons/debate-clash` — the deliberate lesson-id/Skill-slug collision pattern precedented by
debate-weighing; no alias, no slug-map special case. `debateWritingPracticeSupported("debate-clash")`
is false (canonical resolution shadows compat practice), so no writing route exists for Clash and
the intentional-displacement catalog gained no entry.

**Skill-row release truth.** The `debate-clash` Skill row is NOT created by `prisma/seed.ts`. It is
declared in `ACTIVATION_PENDING_SKILLS` — the category that records operational-script provenance —
and was created in Production by the owner, who explicitly authorized and ran the reviewed
create-or-verify script (`scripts/seed-debate-clash-skill.ts`: dry-run that never connects,
explicit `--apply`, create-or-verify, no update/upsert/delete, Skill-only, conflict fail-closed,
manual only) BEFORE the feature push — owner-reported result: 1 created, 0 already present,
0 conflicts. The production-verification audit did not inspect the database; the activation is the
owner's release evidence. Pre-activation is why no learner-visible "Not tracked yet" window
occurred. This activation is complete — it is not a standing TODO.

**S3-15 trust-boundary transition.** Two former raw byte pins were deliberately retired
(owner-approved) because approved measurement work legitimately extends their catalogs:
`lib/education/skills-compat.ts` is now guarded semantically (canonical lesson precedence, the
weighing and clash collision behavior, CWI's authored-source fail-closed boundary, the source
discriminant, manifest/seed agreement, activation-pending inventory, compat/redirect integrity, no
silent writing-practice activation) and `components/lessons/concept-education-lesson-view.tsx`
likewise (formative "records nothing" framing, CTA conditional on `practiceDrill`, metadata-derived
track/area, no hardcoded Clash CTA, no mastery/review imports, no durable in-lesson claim — its
only production change was the typed Clash label entry). Still byte/executable-protected:
`prisma/schema.prisma`, `concept-education-lesson-practice.tsx`, `lib/spaced-review.ts`, and the
review page's executable behavior.

**Reviewed content.** LC1 marker **`DEBATE-CLASH-MEASURABLE-PRACTICE-CORRECTION`**: 19 entries
before and after; exactly the `debate-clash` entry changed (the narrow correction); the other 18
are canonically unchanged. No twentieth entry.

**Debate learner path at that closure — unchanged by it.** `debate-round-orientation` →
`claim-warrant-impact` → `debate-evidence-evaluation` → `debate-signposting` → `debate-clash` →
`debate-refutation` → `debate-constructive-speeches` → `debate-weighing` → terminal. **B2.1 and B2.2
have since inserted `debate-answer-types` and `debate-turn-mechanics` between refutation and
constructive speeches — see the CANONICAL LIVE STATE block for the current chain.**

**Current curriculum status.** Clash measurable connectivity is closed. The broader remaining
weakness is still coverage/connectivity, not lesson-template quality: Signposting measurable
connectivity, Constructive Speeches measurable connectivity, later speeches / collapse /
crystallization, flowing/note-taking, questioning (cross-ex/crossfire/POI — format-dependent),
delivery, and round strategy / judge adaptation. One clarified design fact, distinct from those
gaps: a due `debate-claim-building` review currently lacks generic reverse-remediation because the
CWI lesson embeds its authoritative durable drill — this is NOT the Evidence/Clash defect class and
has no metadata-only fix; any future CWI remediation needs a separate generic
lesson-with-embedded-durable-practice design decision. **No next Debate curriculum product slice
had been chosen at that shipment; since then the B2 curriculum-closure program began — B2.1
(answer types) and B2.2 (turn mechanics) have both SHIPPED, and B2.3 (`wg-08`, the early-stated
weighing standard) is next — blocked behind the canonical-docs rot sweep (see the B2.2 section
above and the mandatory gate in `docs/HANDOFF.md`).** The Debate curriculum is not complete.

## Debate Curriculum Wave 1C — Evidence Evaluation teaching-home closure — SHIPPED and Production-verified

Implementation `aea7f74f135d233821a0356ac63478987f6f9e5c`, Production deployment **`6073720884`**.
Four production/source paths (one of them comment-only), schema **ZERO**, seed **ZERO**, DB **NONE**.

**The gap this closes.** Before Wave 1C, `debate-evidence` already had the canonical seeded skill,
the 30-question `evidence-evaluation` drill and durable evidence through the existing grading and
review architecture — but no learner teaching home. Wave 1C adds the authored lesson
**`debate-evidence-evaluation`** ("Judge the evidence", `/lessons/debate-evidence-evaluation`) with
skillSlug `debate-evidence` and practiceDrill `{ track: "debate", area: "evidence-evaluation" }`.
The existing measured skill now has exactly one teaching home.

**Zero new architecture — the metadata thesis, proven a third time.** Publishing the entry's
`skillSlug` + `practiceDrill` metadata activated the entire shipped chain with no new code: lesson →
exact existing drill → server grading → durable demonstrated performance → review schedule → due vs
weak → reverse remediation → server-selected Coach action → AI explanation. No Evidence-specific
branch was added to the remediation lookup, `getDueReviews`, review logic, the Coach, spaced review,
Study Arcade grading, or the lesson renderer.

**Exact practice CTA.** The existing generic lesson CTA exposes
`/study-arcade?track=debate&area=evidence-evaluation`. The in-lesson checks remain FORMATIVE ONLY;
the server-graded Evidence drill is the first durable Evidence demonstration on this lesson path.

**What it teaches.** Evaluating whether evidence genuinely supports an argument: evidence-to-claim
fit, source/context quality, study/method quality, interpretation and overclaiming, correlation vs
causation, sampling/representativeness, comparison-group reasoning, alternative explanations,
selective framing/cherry-picking, and comparing conflicting evidence. Evidence evaluation is taught
as comparative and reason-based — the lesson deliberately does NOT teach shallow rules such as
"newer always wins", "larger sample always wins", "experts are always right", "funded research is
automatically false", "correlation is useless", or "one study proves broad causation".

**Format scope.** Broadly format-agnostic reasoning: no universal PF or Parliamentary evidence
rule, speech order, timing, citation-challenge procedure or card-formatting rule was introduced.
The ultimate PF-vs-Parliamentary product target remains unresolved.

**Debate learner path at that wave.** `debate-round-orientation` → `claim-warrant-impact` →
`debate-evidence-evaluation` → `debate-signposting` → `debate-clash` → `debate-refutation` →
`debate-constructive-speeches` → `debate-weighing` → terminal. Evidence sits directly after CWI;
orientation remains first; weighing remains terminal. **Answer-types and turn-mechanics were added
later, by B2.1 and B2.2 — see the CANONICAL LIVE STATE block for the current chain.**

**DUE ≠ WEAK carries forward.** For a due `debate-evidence` under the current PRACTICING floor
(70): 69 → the Evidence lesson, then the exact drill; 70 and 71 → the exact drill only. Due means
re-demonstration timing; low demonstrated performance is what earns the lesson. The drill pass
threshold is a separate product concept that merely also equals 70. Most-overdue ordering
(`nextReviewAt ASC`) remains authoritative: a weaker later due row never displaces the earlier due
row; no ranking logic changed.

**Coach truth.** Coach production logic is unchanged: the server selects the Evidence action from
the learner's durable record; the AI explains only and never chooses a skill, lesson, drill, URL or
ranking. `NO_DUE_ACTION` is unchanged.

**Writing practice vs durable evidence — the Wave 1C product invariant.** The pre-existing
`/skills/debate-evidence/practice` writing route still exists and remains FORMATIVE: it persists a
`PracticeSession` only — it does not write `MasteryProgress`, does not advance
`SkillReviewSchedule`, and cannot resolve the durable due review. Because `debate-evidence` now has
an exact mapped server-graded drill, due-review remediation and the Coach correctly prefer the
drill-backed path — the only path that can produce the demonstration the due review asks for.
`debate-evidence` is the currently intentional overlap between a formative writing-practice
destination and a drill-backed measured remediation path, and the review-ladder guard requires any
such displacement to be explicit rather than silent. The mapped remediation branch takes precedence
over the generic formative destination whenever an exact durable drill exists; review-page
executable behavior did NOT change in Wave 1C — only its explanatory comment now records this
intentional displacement — and the review page remains executable-equivalent to its protected
historical baseline while the other protected learning/evidence surfaces stay frozen.

**`/skills/debate-evidence` routing.** Still resolves through the existing compatibility path to
`/lessons?track=debate`, where the Evidence lesson is now visible. No new redirect architecture, no
alias, no fake Skill identity. No direct lesson redirect was required for Wave 1C's teaching-home
closure: the lesson is already reachable through the curriculum path, its exact CTA, due-review
remediation and the Coach. Whether this compatibility route should eventually resolve directly to
the lesson remains a separate product decision.

**Connected durable loops at Wave 1C shipment: exactly FOUR** (the later Clash closure added the
fifth — see above). Complete teach → server-graded-practice →
durable-evidence loops: **Claim/Warrant/Impact** (embedded server-graded practice — architecturally
distinct, no registry reverse-remediation mapping), **Evidence Evaluation** (exact Evidence drill,
reverse remediation + Coach), **Refutation** (exact Rebuttal drill, reverse remediation + Coach),
and **Weighing** (exact Weighing drill, reverse remediation + Coach).

**Reviewed content.** LC1 review marker **`W1C-DEBATE-EVIDENCE-EVALUATION`**: the 18 existing
reviewed entries are unchanged — Wave 1A Orientation, Wave 1B Weighing, CWI's authored content and
Refutation included — plus one new reviewed Evidence Evaluation entry (19 total), under the
existing CompeteReady-authored provenance.

**The assessment was connected, not rewritten.** The 30 Evidence drill questions, answer keys,
grading, pass threshold, durable-evidence writers and `MasteryProgress`/`SkillReviewSchedule`
semantics are unchanged. No new Skill row, no new drill area, no new evidence mechanism.

**Debate curriculum status after Wave 1.**

- **Wave 1A — beginner Debate orientation: CLOSED.**
- **Wave 1B — Weighing teaching-home closure: CLOSED.**
- **Wave 1C — Evidence Evaluation teaching-home closure: SHIPPED / Production-verified.**

All three planned Wave 1 slices shipped, closing Wave 1. The product story as of that closure:
beginner orientation → foundational argument teaching → evidence evaluation → exact measured
practice where available → durable demonstrated performance → due vs weak → exact remediation /
re-demonstration → server-chosen Coach action → AI explanation → simulation — NOT a complete Debate
curriculum, competition readiness, or complete personalization/diagnosis. The notable gaps at that
point were Signposting/Clash/Constructive Speeches drill-and-evidence connectivity (Clash closed
since — see the Clash closure above), later speeches, flowing, round strategy, crystallization,
delivery, and questioning/cross-ex.

## Debate Curriculum Wave 1A — beginner Debate orientation — SHIPPED and Production-verified

Implementation `a0c4e67f486e2f3bbb5cc75523eeb38d8b9c1f83`, Production deployment **`6073011910`**.
Five production paths, schema **ZERO**, seed **ZERO**, DB **NONE**.

**The beginner-path fix.** Before Wave 1A, a new Debate learner could meet "Start an AI debate
round" before anything explained what a round is. Wave 1A adds the learner-visible lesson
**`debate-round-orientation`** (`/lessons/debate-round-orientation`), first in the Debate lesson
path, and the Debate dashboard now offers: 1. *Learn how a debate round works* · 2. *Start an AI
debate round* · 3. the existing remaining action. The AI round stays fully available — orientation
is offered, never mandatory.

**Static guidance, no completion gating.** Orientation-first is static curriculum guidance. No
learner-specific completion state exists or is inferred — no completion persistence, no storage, no
XP or `MasteryProgress` inference. The application does not know whether orientation was completed,
and returning learners open the AI round immediately.

**Identity.** Catalog/publication id `debate-round-orientation`; **skillSlug NONE, practiceDrill
NONE**; no seeded Skill row, no new drill area, no alias. `/skills/debate-round-orientation`
resolves through existing canonical lesson precedence to the lesson — a routing consequence that
does not make orientation a measured skill.

**What it teaches.** A zero-knowledge beginner learns what debate is, what they are trying to
accomplish, what the two sides are doing, basic argument structure (claim, reason,
why-it-matters — with Claim/Warrant/Impact named as the deeper home), that opposing arguments must
be answered, constructive vs responsive speaking as concepts, why organization matters, why
tracking the opponent's arguments matters, and what to focus on before a first practice round. It
introduces tracking awareness without claiming to teach formal flowing, and it does not replace the
Constructive Speeches or Refutation lessons.

**Format-agnostic first release (locked owner decision).** The lesson avoids universal claims about
speech order, speech names, speech count, team size, timing, prep, Government/Opposition or Pro/Con
labels, cross-ex/crossfire/POIs, and format-specific new-argument rules — it says plainly that
formats differ in names, order and timing. **The ultimate Public Forum vs Parliamentary competition
target remains a future product decision; only the first-release strategy is resolved.**

**No fake measurement — the central invariant.** Orientation is TAUGHT with FORMATIVE checks only
(guided practice, practice questions, a mastery-style check with hints and retries, authored in the
locked template, written independently of the live drill bank). It creates ZERO durable evidence:
no `MasteryProgress`, no `SkillReviewSchedule`, no attempts, no completion persistence, no
remediation mapping, no Coach evidence action. "Knows what debate is" is deliberately not a
measured skill.

**The evidence firewall held.** Wave 1A changed no durable-evidence writers, no spaced review, no
remediation, no `getDueReviews`, no Coach decision logic, no Study Arcade grading, no readiness.
The Coach remains server-evidence-backed and does not recommend orientation because it exists, is
first in the curriculum, sits first on the dashboard, or when no review is due — `NO_DUE_ACTION`
semantics are unchanged. One durable invariant worth keeping: curriculum publication may extend the
education registry, while Coach-facing behavior stays protected by semantic mapping/evidence
invariants rather than by treating the registry file as permanently immutable.

**Orientation added no durable loop.** At Wave 1A shipment the connected loops were exactly three —
CWI (embedded server-graded practice), Refutation and Weighing (exact drills, reverse remediation,
Coach); Wave 1C later added the fourth (Evidence Evaluation — see above). Orientation is none of them.

**Reviewed content.** The new lesson went through the existing LC1 content-integrity mechanism
(review marker **`W1A-DEBATE-ROUND-ORIENTATION`**): the 17 existing reviewed entries are unchanged
— including Wave 1B's corrected Weighing — plus one new reviewed orientation entry. Provenance is
the existing CompeteReady-authored, format-agnostic Debate provenance; no NSDA rule attribution was
fabricated.

**Debate learner path at that wave.** `debate-round-orientation` → `claim-warrant-impact` →
`debate-signposting` → `debate-clash` → `debate-refutation` → `debate-constructive-speeches` →
`debate-weighing` → terminal. **Evidence evaluation (Wave 1C), answer-types (B2.1) and
turn-mechanics (B2.2) were chained in later — see the CANONICAL LIVE STATE block for the current
chain.**

**Debate curriculum sequence.**

- **Wave 1A — beginner Debate orientation: SHIPPED / Production-verified.**
- **Wave 1B — Weighing teaching-home closure: CLOSED.**
- **Wave 1C — Evidence Evaluation teaching-home closure: SHIPPED / Production-verified** — see the
  Wave 1C section above.

## Debate Curriculum Wave 1B — Weighing teaching-home closure — SHIPPED and Production-verified

Implementation `82e76042b6705661e4c5c2e1afc05c6ca227f372`, Production deployment **`6072492323`**.
Three production paths, schema **ZERO**, seed **ZERO**, DB **NONE**. The existing held Weighing lesson
was corrected and published — no new skill, no new drill area, no new Coach or remediation code.

**The shipped mapping.** Lesson `debate-weighing` (`/lessons/debate-weighing`) → skillSlug
`debate-weighing` → practiceDrill `{ track: "debate", area: "weighing" }`
(`/study-arcade?track=debate&area=weighing`). The catalog/publication id is `debate-weighing`; the
legacy/internal alias `debate-weighing-lesson` (stored in historical judge reports) resolves to the
published canonical lesson, and `/skills/debate-weighing` now resolves through the existing canonical
lesson precedence to `/lessons/debate-weighing` — an expected consequence of publication, not new
routing. The drill stays independently reachable at its own URL.

**The pedagogical correction.** Weighing is taught as comparing competing impacts and explaining why
one should matter more for the decision. Magnitude, probability, timeframe and reversibility remain
useful names for common comparison moves — they are NOT required vocabulary a learner must recite to
weigh validly. The lesson's structure, worked example and guided question were preserved; the
recall-heavy formative questions were changed to application items. The correction went through the
existing LC1 content-integrity mechanism (review marker **`W1B-DEBATE-WEIGHING-CORRECTION`**):
exactly the Weighing reviewed-content entry changed, and the sixteen unrelated catalog entries are
unchanged.

**Held → published.** The same reviewed catalog content object moved from held to learner-visible;
no duplicate lesson exists. The other held Debate lessons — rebuttal-speeches, parliamentary roles,
case/topic definitions, and the duplicate CWI — remain held.

**Architecture reuse — the load-bearing result.** Wave 1B required ZERO new learning architecture.
Publishing the entry with its `skillSlug` and `practiceDrill` metadata automatically reused the
shipped Slices 1–3: lesson → exact existing drill → existing durable evidence → exact remediation →
server-chosen Coach action with AI explanation only. No Weighing special case exists in the
remediation lookup, the review page, the Coach, or `getDueReviews`. New curriculum coverage plugs
into the architecture through metadata, not code.

**DUE ≠ WEAK carries forward.** For a due `debate-weighing`: recorded mastery below
`PRACTICING_MASTERY_MIN` → the Weighing lesson, then the exact drill (69 → lesson + drill); at or
above the floor → the exact drill only (70 and 71 → drill only). No lesson merely because a review
is due, and a `MasteryProgress` value is a record of demonstrated performance, not permanent
mastery. When Weighing is the first due skill under the inherited most-overdue ordering
(`nextReviewAt ASC`), the Coach chooses accordingly; no ranking changed.

**The three-loop truth of that moment, precisely.** At Wave 1B shipment, complete teach →
server-graded-practice → durable-evidence loops existed for: **Claim/Warrant/Impact** (embedded server-graded practice), **Refutation**
(exact Rebuttal drill, reverse-remediation and Coach connected), and **Weighing** (exact Weighing
drill, reverse-remediation and Coach connected). CWI's loop is complete but does not use the
reverse-remediation mapping the other two share — the three are not architecturally identical.

**Curriculum status then.** The primary remaining issue was coverage/connectivity, not
lesson-template quality. Notable gaps at that point: an Evidence Evaluation teaching home (closed by
Wave 1C), Signposting/Clash/Constructive Speeches drill-and-evidence connectivity (Clash closed
since — see the Clash closure above), later speeches, flowing, round strategy, crystallization,
delivery, and questioning/cross-ex.

## M15 Learning Architecture Slice 3 — SHIPPED and Production-verified

Implementation `6f69745c0f7135fe1877eb867624126392ea45d1`, Production deployment **`6071131714`**.
Eight paths, schema **ZERO**. The recommendation path is now genuinely learner-facing and genuinely
trustworthy: **the server chooses the next action; the AI may only explain it.**

**The Slice 3 rule — who owns what.** The server owns learner identity, the evidence read, due-skill
selection, the due-vs-weak distinction, the PRACTICING threshold, the action type, lesson and drill
identity, and every routing URL. The model influences exactly one thing: the learner-facing
explanation prose. It cannot determine weakness, mastery, readiness, a mapping, a destination, a
priority, or a sub-concept diagnosis.

**The deterministic flow.** Authenticated learner → `getDueReviews(userId)` → the FIRST due row of
the existing `nextReviewAt ASC` ordering → `PRACTICING_MASTERY_MIN` → `practiceRemediationForSkill`
→ one server-approved action → optional AI explanation. Most-overdue-first is inherited from the
existing review ordering; no weakest-first, remediation-first or AI ranking was introduced.

**The action vocabulary** (DUE ≠ WEAK carries forward unchanged):

- **Low mastery + mapped** → review the exact lesson, then the exact drill.
- **Healthy due + mapped** → the exact drill only — no lesson, no weakness language.
- **Due + unmapped** → the existing compatible review destination, same rule as the review card.
- **No due review** → no personalized evidence-backed action, and **no provider call**.

**The pilot, exactly.** `debate-rebuttal` low-mastery: lesson `debate-refutation`
(`/lessons/debate-refutation`) then the Rebuttal drill (`/study-arcade?track=debate&area=rebuttal`).
Healthy due: the Rebuttal drill only, same URL, no Refutation lesson.

**Client-trust boundary.** The dashboard's AI Coach card asks one question with an empty request —
the strict schema rejects any smuggled learning claim (weaknesses, mastery, scores, lesson
candidates, a skillSlug, readiness). The old recommendations path that let the client declare its
`weaknesses` and supply the `availableLessons` the model chose from is retired. The authenticated
server derives the action from the learner's own durable record.

**Provider boundary.** The model receives only minimal display context — action type, skill display
name, a below-practicing boolean, the due date, and lesson/drill labels. It never receives userId,
name, email, DB ids, raw history, ballot text, XP, formative answers, `masteryPercent`, or any href.
Its output is validated down to one explanation string; clickable destinations are server-built.
Provider failure degrades only the wording (a deterministic template explains the same
server-chosen action, honestly tagged) — the action itself never changes or disappears.

**No-due behavior, truthfully.** No due rows → no personalized action, no provider call, and the
copy says so: "No evidence-backed review is due right now," followed by an explicitly
non-personalized pointer to `/study-arcade` to choose a server-graded drill that **can** build
durable skill evidence. Nothing claims `/skills` builds durable evidence or that every activity
writes the record.

**Deferred, honestly.** `/api/ai/readiness` is unchanged and dormant: it still rests on
client-supplied inputs and has no evidence-backed definition of competition readiness —
**competition-readiness scoring is FUTURE / DEFERRED** and requires materially stronger
multi-evidence support. Ballot-derived `weakSignals` / coach-progress keyword matching also stay
out: they lack stable structured skill identity.

**What Slice 3 did not change:** schema/migrations/seed **ZERO** · no learner-profile table · no
persisted recommendation · no persisted AI prose · `PracticeAttempt`/`QuestionAttempt` not activated
· `getDueReviews` semantics unchanged · Slice 1 and Slice 2 unchanged.

**The trustworthy loop now closed end-to-end:** teach → exact drill → durable evidence → distinguish
due from weak → exact remediation / exact re-demonstration → server chooses the next action → AI
explains it. This is the trustworthy foundation — not full readiness, complete curriculum, complete
diagnosis, or complete personalization.

**The remaining curriculum weakness is coverage, not format.** The lesson format itself is strong.
Some authored lessons are **Taught but not yet Trainable/Measurable** through an exact drill/evidence
loop — at that point Signposting, Clash and Constructive Speeches (Clash has since gained its
exact drill loop — see the Clash closure above), whose content is good
but whose practice/evidence connectivity does not yet exist the way Refutation's does.

**Learning architecture status.**

- **Learning Architecture Slice 1 — lesson → exact drill: SHIPPED / CLOSED.**
- **Learning Architecture Slice 2 — durable evidence → exact re-demonstration + exact remediation: SHIPPED / CLOSED.**
- **Learning Architecture Slice 3 — server chooses the next action, AI explains it: SHIPPED / Production-verified.**
- **Curriculum coverage work: all three planned Wave 1 slices have shipped** — see the Debate
  Curriculum Wave 1C section above. No next curriculum wave had been chosen *at that point*; the B2
  curriculum-closure program was chosen afterwards, B2.1 and B2.2 have since shipped, and B2.3
  (`wg-08`) is the current next slice — blocked behind the canonical-docs rot sweep.

(These are Learning Architecture slice numbers. They are unrelated to the historical **G2** slice
numbering used in the older sections further down this file.)

## M15 Learning Architecture Slice 2 — SHIPPED and Production-verified

Implementation `b72073321b33f2b119f6d1b20cbabf754fc14e8b`, Production deployment **`6070209983`**.
Six paths, schema **ZERO**. The review surface now routes a due skill from its durable record to the
exact practice that measures it — and to teaching only when the record shows the gap.

**The Slice 2 rule — DUE is not WEAK.**

- **Due** = retention timing: the spaced schedule asks for re-demonstration now.
- **Low demonstrated performance** = durable `masteryPercent` below the canonical PRACTICING boundary.
- **Remediation** = low demonstrated performance **and** an exact mapped teaching lesson.

A healthy due skill is scheduled re-demonstration, never weakness. Nothing collapses due into weak.

**Canonical boundary.** `PRACTICING_MASTERY_MIN` (currently **70**) is the PRACTICING mastery floor,
owned by the mastery/review model in `lib/spaced-review.ts` and used by `masteryLevelFor` itself:
below 70 is below PRACTICING; 70 and above is PRACTICING or stronger. `DRILL_PASS_THRESHOLD` also
equals 70 today but is a **different product concept** — one drill attempt's pass mark — and the two
are deliberately not defined in terms of each other.

**The shipped pilot chain** — deterministic, derived from existing education metadata; nothing
persisted, no new table, no `recommendedLessonId`:

durable due-review row → skill `debate-rebuttal` → lesson `debate-refutation`
(`/lessons/debate-refutation`) → practiceDrill `{ track: "debate", area: "rebuttal" }`
(`/study-arcade?track=debate&area=rebuttal`).

- **Healthy due + mapped** (mastery ≥ PRACTICING): the exact Rebuttal drill only — no remediation
  lesson, no weakness language.
- **Low-mastery due + mapped** (mastery < PRACTICING): *Review: Answer with refutation* → the exact
  Rebuttal drill. The wording states low demonstrated performance — it never diagnoses
  misunderstanding, decline or repeated failure.

**Evidence authority.** Remediation derives only from server identity → `getDueReviews(userId)` →
durable `masteryPercent` → the static mapping. XP, lesson views, formative checks, client-supplied
strings, query parameters, browser storage, AI prose and navigation history cannot trigger it. The
URL controls destination only; it is never weakness evidence.

**Reverse lookup.** `educationLessonsForPracticeSkill` derives mapped entries from existing registry
metadata; `practiceRemediationForSkill` is the compatibility-layer lookup the review surface uses. No
new source of truth, no runtime DB lookup for the mapping; unknown, malformed, unmapped, DECA and
HOSA slugs fail safely and never receive a Debate lesson. `review-ladder:smoke` guards mapped
lesson/drill skill agreement and the current one-drill-backed-lesson-per-skill authored-data
assumption; `education-migration:smoke` guards the consumer/import boundary. Unmapped due skills keep
their existing routing — no fabricated lessons, generic review routing was not repaired, and the
stale Reassess CTA remains separate debt.

**What Slice 2 did not change:** schema/migrations **ZERO** · `PracticeAttempt`/`QuestionAttempt` not
activated · `lastOutcome` not consulted · `getDueReviews` contract unchanged · AI Coach unchanged ·
Slice 1 unchanged · LC1 and G2 frozen. Deliberate boundaries, not defects.

**Pre-existing test-label debt discovered during Slice 2, untouched:**
`scripts/education-migration-smoke.ts` carries two historical controls labelled `36d`. Slice 2
neither introduced nor modified them; production comments deliberately cite suites, never ambiguous
control ids.

## M15 Learning Architecture Slice 1 — SHIPPED and Production-verified

Implementation `53e8e08f13c34ee1c6db0a51f28dc7155d704d95`, Production deployment **`6056077343`**.
Eight paths, **zero production-runtime behaviour change** outside the new routing: this slice connects
existing pieces rather than adding a learning system.

**The evidence hierarchy this establishes — the durable architectural rule.**

| Layer | What it is | What it produces |
| --- | --- | --- |
| Lesson | teaching | nothing persisted |
| In-lesson check | formative feedback only | **nothing persisted** |
| Server-graded drill | demonstration | the **first** durable evidence |
| `MasteryProgress` / `SkillReviewSchedule` | the learner record | written downstream of the graded drill |

The authored lesson self-check writes **no `MasteryProgress`, no `SkillReviewSchedule`, no XP, no
progression, no readiness, no `PracticeAttempt`, no `QuestionAttempt`** and makes no durable
learner-evidence claim. It is not mastery evidence and is not described as any. The server-graded
drill remains the first activity that produces a durable record.

**The shipped pilot flow.**

`debate-refutation` → typed `practiceDrill` metadata → track `debate`, area `rebuttal` →
`/study-arcade?track=debate&area=rebuttal` → the existing server-issued, server-graded Debate drill →
skill `debate-rebuttal` → the existing mastery and spaced-review machinery.

**At Slice 1, `debate-refutation → rebuttal` was the only authored mapping.** It is metadata-driven:
no lesson-id special case was introduced in the view, and the call to action is conditional on a real
explicit mapping. **At that slice `debate-signposting`, `debate-clash` and
`debate-constructive-speeches` were unmapped** and deliberately showed no drill action — absence is the honest default, not a disabled button or a link
to unrelated practice. Neither DECA nor HOSA gained a concept-drill mapping at that slice.
**Superseded — current mapping truth, derived from `EDUCATION_LESSONS`:** four entries carry BOTH
`skillSlug` and `practiceDrill` (`debate-evidence-evaluation`, `debate-clash`, `debate-refutation`,
`debate-weighing`); two carry `practiceDrill` as a CTA only, with no skillSlug
(`debate-answer-types`, `debate-turn-mechanics`); `claim-warrant-impact` carries `skillSlug` with
embedded practice and no registry `practiceDrill`.

**`debate-round-orientation` also carries neither, and that is DELIBERATE** — orientation has no
skillSlug, no practiceDrill and no durable evidence precisely so it can never mint mastery, so it is
not a connectivity gap. **The remaining unresolved Debate connectivity gaps are exactly
`debate-signposting` and `debate-constructive-speeches`**; `debate-clash` connectivity is CLOSED.
DECA and HOSA still have no concept-drill mapping.

**The deep-link contract.** The Debate drill component accepts an optional initial `DrillArea`, which
seeds the first render only; manual area switching is unaffected. `DrillArea` has **one canonical
compile-time source of truth**, and the education metadata uses that canonical type, so a renamed or
removed area breaks the build rather than leaving a dead link. The `area` query value is validated at
runtime against the real areas: a valid Debate area may preselect it, while missing, invalid,
non-string and array values fall back to the existing mixed default. DECA and HOSA do not consume
Debate area values.

**What Slice 1 did not change:** schema **ZERO** · LC1 frozen · G2 frozen · AI Coach unchanged ·
no `PracticeAttempt` or `QuestionAttempt` writer added · no lesson-completion persistence added ·
existing Debate drill grading, mastery and review semantics unchanged. These are deliberate boundaries,
not defects.

## M15 S1B — indexOf ordering controls, Batch IV: route resolution / gating (shipped; Production-verified at `6055470720`)

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Shipped SHA `5e21b593d03e4a192ddc62460285baae2bc4f2c4`, Production deployment **`6055470720`**,
environment **Production**, state **SUCCESS**, automatic `vercel[bot]` deployment from the Git push —
no manual deploy, no rollback, nothing superseded it. Previous verified Production baseline `d5f369d`.
**Zero production changes** — two test suites, one shared test-only helper, plus these docs.

**Test-integrity only.** No production route, schema or runtime behaviour changed.

Batch IV repaired the last four defective ordering controls — **IDX-16, IDX-45, IDX-46, IDX-47** —
all `a < b`, so all four exposed their **left** operand: with the left anchor absent `indexOf` returns
`-1` and `-1 < n` still holds, so deleting the very lookup or gate each control exists to sequence left
it green.

| IDX | Suite | Control | Left anchor → right anchor |
| --- | --- | --- | --- |
| IDX-16 | education-migration | `32b` | `getLesson(params.slug)` → `conceptEducationLesson(params.slug)` |
| IDX-45 | skills-compat | `16b` | `practiceSupported ?` → `XP` |
| IDX-46 | skills-compat | `21c` | `resolveSkillsSlug(params.slug)` → `getDebateSkillScenario(params.slug` |
| IDX-47 | skills-compat | `21c2` | `debatePracticeSupported` → `getDebateSkillScenario(params.slug` |

This is the one family where a shared helper was justified. **`scripts/order-assert.ts`** exposes
`assertSourceOrder({ source, left, right, direction: "before" | "after", label, message })`: it captures
both indices, fails closed under `<label>-anchors` when **either** anchor is missing, then applies the
required direction, passing each control's original ordering message through verbatim. It proves
presence and first-occurrence order only — **never containment, uniqueness or runtime behaviour**. The
helper is assertion machinery: it is not a registered smoke suite and adds no control to the ledger.

**Mutation evidence:** each of the four fails closed on **left anchor absent**, **right anchor absent**
and **wrong order**, with target attribution and **0 harness errors**; where an earlier neighbour throws
first, attribution came from the same mechanical isolation used in Batches I–III. The helper itself was
proven fail-closed in **both** directions across all five states. `education-migration:smoke` and
`skills-compat:smoke` both pass.

**Family after Batch IV: route resolution / gating 4/4 safe, 0 defective.**

**Ordering-control ledger: safe 44 → 48 · defective 4 → 0 · unresolved 0. The indexOf ordering-control
debt is CLOSED.**

**What 48 means.** It is the **audited logical-control ledger** locked by the original string-aware
audit at `0127177` — 48 controls across the original 14 registered safe suites, with historical
checksums **26 direct / 22 captured** and **43 `<` / 5 `>`**. Those are historical audit figures, not
counts of the current literal `<`/`>` tokens: Batch IV centralises four controls through one helper, so
a raw syntax scan of today's tree is deliberately **not** equivalent to the denominator. The original
scanner-generated 48-row physical table is not persisted in this repository, and no fresh full
reconstruction of it is claimed here.

**This closes the indexOf ordering-control debt only.** Moving-HEAD debt is unchanged at **18**
(Class B 12, Class C seed 6, learning-content 0) and remains separate, as do `/debates/history`, the
stale Reassess CTA and the skills-compat XP prose. **After Batch IV ships there is no next indexOf
batch** — the project returns to M15 product and learning work.

**Validation:** both affected suites pass; entrypoints were inspected first and neither loads `.env`
or reaches a provider or database. `judge-shape:smoke` was deliberately **not** run: it loads
`.env`/`.env.local` and calls a live provider when credentials exist. No build, `db:generate` or
`tsc` was run for a test-only change. Batch I, II and III guards intact; auth/rate-limit 9/9 untouched;
LC1 CLOSED and byte-identical; A2 unchanged; A4 remains CLOSED. No database access.

## M15 S1B — indexOf ordering controls, Batch III: transaction / exactly-once (shipped; Production-verified at `6054639863`)

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Deployed stack HEAD `2c643c862d755fb6f9c4267ca280fc517b83d6de`, Production deployment
**`6054639863`**, environment **Production**, state **SUCCESS**, automatic `vercel[bot]` deployment
from the Git push — no manual deploy, no rollback, nothing superseded it. Previous verified Production
baseline `1ed3bbe`. **Zero production changes** — one test suite plus these docs.

The batch shipped as a four-commit stack: implementation `f94a2fb247115ce4373ba75215588d813a58fc23`,
ordering-message fix `cad1217e7dd6caccb96bd1c294ac830c90acb981`, semantic-wording cleanup
`3085f9f6df17ff481139ad26b36b4d9af72cf518`, local-stack status fix `2c643c8…` — published in one push,
so Vercel built the pushed head and `6054639863` contains the other three as ancestors.

**This repaired a TEST ASSERTION, not production behaviour.** A2 (exactly-once judged-attempt claim)
and A4 (reward integrity) were already CLOSED and are byte-identical here. Batch III did not fix
idempotency, transaction ordering, XP ordering, reward behaviour or any runtime race — it made one
piece of TEST COVERAGE non-vacuous.

**IDX-30 is control `A2-7b` in `scripts/judge-shape-smoke.ts`**, the only defective member of the
14-control transaction claim / lock / session family (13 were already safe). It runs inside a loop
over the four progression effects — `awardXpInTransaction(`, `tx.debate.update(`, `tx.user.update(`,
`tx.xPLog.create(` — and asserts, over the comment-stripped judge route, that each effect's first
occurrence comes **after** the progression transaction opens:

| operand | expression | role |
| --- | --- | --- |
| left | `judgeRouteSrc.indexOf(effect)` | the guarded progression effect |
| right | `judgeRouteSrc.indexOf("prisma.$transaction(async (tx) =>")` | the transaction boundary carrying the exactly-once claim |

The operator is **`>`**, so the **right** operand was the vulnerable one: with the transaction opener
absent `indexOf` returns `-1` and `effectAt > -1` holds for **all four** effects, so deleting the very
boundary the control exists to police left the assertion green. It was **Category C** — the only
control that went red was the neighbouring **`A2-1`** ("the judge persistence transaction was
located"), never `A2-7b` itself. Both indices are now captured, both are proven present under
`A2-7b-anchors`, and only then is the original ordering assertion evaluated. The `A2-7b` label, the
ordering expression, its operator and its direction are preserved exactly; both messages were narrowed
during acceptance to state only what the assertions prove — the ordering message no longer claims the
effect "exists nowhere outside the progression transaction" (a containment property no executable
control establishes), and the presence message no longer implies containment either.

**Mutation evidence (scratch clone, committed artifacts):**

| state | mutation | result |
| --- | --- | --- |
| A | none | `judge-shape` **PASS** |
| B | transaction opener removed (`(tx) =>` → `(tx)  =>`) | `A2-7b-anchors` **fails**; the pre-repair expression was vacuously **true** for all four effects |
| C | `tx.xPLog.create(` removed (`create (`) | `A2-7b-anchors` **fails** |
| D | an earlier occurrence of `tx.xPLog.create(` inserted before the boundary | `A2-7b` **fails by its own label at suite level** |
| E | harmless rename inside the judge route | target passes; the suite reddens only on the unrelated immutable pin `A4b-C3` |
| E2 | harmless reformat of the repaired assertion | `judge-shape` **PASS** |

**0 harness errors.** For states B and C an earlier neighbour (`A2-1`, `P1c-8b`) throws first, so
target attribution came from **in-situ isolation** — the target's own expressions, the suite's own
`strip`, the same receiver — exactly as in Batches I and II. **State E can never turn the suite green
by construction:** `A4b-C3` byte-freezes the judge route against the A4a baseline, so *any* edit to
that file reddens the suite. The honest reading of E is that the **target** did not fire on a harmless
change; E2 supplies the green harmless-change state.

**Family after Batch III: transaction claim / lock / session 14/14 safe, 0 defective.** The other 13
controls are untouched.

**Ordering-control state: safe 43 → 44 · defective 5 → 4 · unresolved 0.** Remaining at that batch:

- **Batch IV — route resolution / gating order (4):** IDX-16, IDX-45, IDX-46, IDX-47

**Batch IV had not been started at that point**, and no shared route-resolution helper existed yet.
*(Superseded: Batch IV SHIPPED and is Production-verified — see its section above.)*

The audited denominator is unchanged: **48 ordering comparisons across 14 safe suites**, of which
**30 were safe as written** and **18 defective** before any repair. **Not all 48 were defective.**

**Production verification (read-only):** deployment **`6054639863`** · Production · automatic
`vercel[bot]` · state **success**. local HEAD = `origin/main` = live remote = `2c643c8`, repository
clean at **0 ahead / 0 behind**. The full published diff from the prior verified Production SHA is
**exactly three paths** — `scripts/judge-shape-smoke.ts`, `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`;
**production/runtime source changes ZERO, schema ZERO, snapshot ZERO, LC1 ZERO**, and `app/`,
`components/`, `lib/`, `prisma/` and `package.json` are byte-identical. The deployed control carries the
accepted logic with no drift — only the two message lines differ from `f94a2fb`. Live route sample: `/`
**200**, `/signin` **200**, `/dashboard` and `/lessons` **307** to `/signin`, the protected APIs
**401** unauthenticated, **no 5xx observed**. The Vercel runtime does **not** execute smoke-test
assertions — none were run there. `/debates/history` still returns an unauthenticated 200: the
already-tracked soft-redirect debt, unchanged.

**Process boundary learned in this batch:** `scripts/judge-shape-smoke.ts` loads `.env`/`.env.local` at
import and makes a real provider call when credentials exist. Run it credential-free (a clone with no
`.env`) when a deterministic check is wanted; it was not run during the Production verification or this
sync.

**Validation:** `db:generate` PASS · `tsc` clean · `lint` (1 pre-existing `<img>` warning at
`components/profile/user-avatar.tsx:48`) · `build` PASS · **30/30 safe suites green**, `judge-shape`
also run individually against a live provider. Batch I's nine guards and Batch II's four intact;
auth/rate-limit 9/9 untouched; moving-HEAD debt unchanged at **18** (Class B 12, Class C seed 6,
learning-content 0) and byte-identical to the baseline; LC1 CLOSED and byte-identical; Batch IV
untouched. A2 unchanged; A4 remains CLOSED. No database access.

## M15 S1B — indexOf ordering controls, Batch II: evidence-before-mastery (shipped; Production-verified at `6053725391`)

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Implementation commit `64ad487f8448517f3fbdf3d46fc677249f521da5`; docs-only semantic-fix child and
deployed HEAD `98ddbed03d72348be08e02a7b11cdc79c971844a`; Production deployment **`6053725391`**,
status **SUCCESS**, automatic `vercel[bot]` deployment from the Git push — no manual deploy, no
rollback. Previous baseline `0abdff1`. **Zero production changes** — four test suites plus these docs.

**Deployment topology — one push, one deployment.** `64ad487` is the Batch II implementation commit;
`98ddbed` is its docs-only semantic-fix child. Both were published in a **single push**, so Vercel
created **one** Production deployment, for the pushed HEAD `98ddbed`; deployment `6053725391` therefore
contains the implementation as an **ancestor**. **`64ad487` has no separate deployment record, and that
is expected rather than an error** — Vercel builds the pushed head, not every intermediate commit. Do
not read this history as every individual commit receiving its own deployment.

The **evidence-before-mastery** family had 5 controls: 1 already safe, 4 defective (IDX-17 Category B;
IDX-01, IDX-08, IDX-39 Category C). Each defective control compared an earlier evidence-related
anchor against the later write or progression operation it must precede — for IDX-01, IDX-08 and
IDX-39 the review/evidence writer before the mastery writer, and for **IDX-17 the evidence-floor
decision before the review/evidence write call**. With the earlier anchor absent `indexOf` returned
`-1` and `-1 < n` still held, so deleting the very step the control exists to sequence turned it
green.

| IDX | Suite | Control | Earlier anchor → later anchor |
| --- | --- | --- | --- |
| IDX-01 | debate-mastery | `13b` | `recordPracticeOutcomeInTransaction(` → `recordDrillMasteryInTransaction(` |
| IDX-08 | deca-mastery | `11c` | `recordPracticeOutcomeInTransaction(` → `recordDrillMasteryInTransaction(` |
| IDX-17 | hosa-medterm-evidence | `28b` | `const hasEnoughEvidence` → `recordPracticeOutcomeInTransaction(` |
| IDX-39 | review-ladder | `38b2` | `recordPracticeOutcomeInTransaction(` → `recordDrillMasteryInTransaction(` |

Each now captures both indices, asserts both present under a `<label>-anchors` control, then asserts
the order — inline, no shared helper, original ordering label and message preserved verbatim. The
already-safe fifth member (**IDX-38**) was not touched.

**Mutation evidence:** every target assertion was evaluated in isolation at its real call site.
**4/4 satisfy all four states** — presence fails when the evidence anchor is absent, presence fails
when the mastery anchor is absent, ordering fails when both are present but reversed, and harmless
source-form changes pass. **0 harness errors.** Duplicate coverage was not accepted for the three
Category C members. At suite level IDX-17 fires by its own name (`28b-anchors`); for IDX-08 and
IDX-39 an earlier control sharing the same anchor throws first, which is why per-target isolation is
the decisive evidence.

**Family after Batch II: evidence-before-mastery 5/5 safe, 0 defective.**

**Ordering-control state: safe 39 → 43 · defective 9 → 5 · unresolved 0.** Remaining at that batch:

- **Batch III — transaction (1):** IDX-30
- **Batch IV — route resolution / gating order (4):** IDX-16, IDX-45, IDX-46, IDX-47

**Neither batch had been started at that point.** Batch III stayed deliberately isolated because
IDX-30 sits beside the A2/A4 transaction / exactly-once controls. *(Historical: superseded — Batches II, III and IV all SHIPPED and are Production-verified; see their sections above.)*

The audited denominator is unchanged: **48 ordering comparisons across 14 safe suites**, of which
**30 were safe as written** and **18 defective** before any repair. **Not all 48 were defective.**
Batch II was **test-integrity only** — no runtime behaviour and no security defect was repaired.

**Acceptance evidence (committed artifact `64ad487`):** **20/20 mutation states**, **0 harness
errors**, target attribution for all four repaired controls, **4/4 affected suites** and **30/30 safe
suites** green, `db:generate` PASS, `tsc` clean, `build` PASS, and `lint` clean apart from the known
pre-existing `<img>` warning. The narrow recheck of `98ddbed` then proved that it changed **docs only**,
that the implementation code stayed **byte-identical**, that the IDX-17 documentation semantics were
corrected, and that the prior implementation acceptance evidence therefore remained applicable.

**Production verification (read-only):** deployment **`6053725391`**, environment **Production**,
creator automatic **`vercel[bot]`**, state **success**. local HEAD = `origin/main` = live remote =
`98ddbed`, repository clean at **0 ahead / 0 behind**. Published scope `0abdff1 → 98ddbed` = **four
test suites plus two docs**; **production/runtime source changes ZERO**, **schema changes ZERO**. Live
routes: public routes healthy, protected routes redirect or reject unauthenticated requests correctly,
the four API routes these controls guard (`/api/debate/drills/submit`, `/api/deca/drills/submit`,
`/api/hosa/medterm/submit`, `/api/skills/debate-writing`) each returned **401** unauthenticated,
sampled AI routes returned **401**, and **no 5xx was observed**. The Vercel runtime does **not** execute
smoke-test assertions — none were run there.

**Live-route observations.** `/debates/history` returns an unauthenticated 200 with sign-in-oriented
content — the **already-tracked soft-redirect debt**, unchanged. `/settings` returns an unauthenticated
client-rendered loading shell with **no user-identifying strings** in the sampled body; that is an
observation, **not a new defect**.

**Honest Production limit.** Batch II is a **test-integrity repair**. Production verification proves the
accepted commit stack deployed successfully, that live application health remained good, and that no
runtime regression was observed. It does **not** prove that smoke-test behaviour executed inside Vercel,
that runtime evidence ordering changed, or that security behaviour was repaired — **no production or
runtime file changed.**

**Validation:** `db:generate` · `tsc` · `lint` (1 pre-existing `<img>` warning) · `build` ·
**30/30 safe suites green**. Batch I's nine guards intact; moving-HEAD debt unchanged at **18**
(Class B 12, Class C seed 6). LC1 CLOSED and byte-identical. IDX-30 and Batch IV untouched. A2
unchanged; A4 remains CLOSED. No database access.

## M15 S1B — indexOf ordering controls, Batch I: completed-retry (shipped; Production-verified at `5895669302`)

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Commit `b71fc34723603fa295fab0737f92a152a5cc6c9d`, Production deployment **`5895669302`**, status
**SUCCESS**, automatic `vercel[bot]` deployment from the Git push — no manual deploy, no rollback,
nothing superseded it. Previous baseline `0127177`. **Zero production changes** — six test suites
plus these docs.

**Production verification passed:** exact SHA deployed, 8-file scope, production trees byte-identical,
all 9 repairs verified in the deployed artifact, 6/6 affected suites and 30/30 safe suites green, and
a mutation spot-check on one former Category B target (IDX-15) and one former Category C target
(IDX-42) confirmed the repaired **target** guards fire — 0 harness errors.

### The audited denominator, corrected

**48 ordering comparisons across 14 safe suites** (26 direct + 22 captured; 43 `<` + 5 `>`). The
earlier figure of **"24 vacuous ordering controls" was incomplete**: it counted only direct same-line
`<` comparisons, so it missed every captured-index comparison and every `>` comparison — and it
asserted a defect rate the evidence did not support. **Not all 48 were defective.**

**Audited state before this batch:** **30 safe as written** — an executable guard on the vulnerable
operand fires first (an explicit `>= 0` / `!== -1` check, an `includes(anchor)` assertion, or a
preceding conjunct in a comparison chain). **18 empirically defective**: **10** where the suite
survived entirely and **8** where a different named control caught the mutation while the ordering
assertion itself still passed. **0 unresolved.**

Vulnerability follows the operand, not the first anchor: for `a < b` the exposed side is the **left**
(`-1 < n` holds); for `a > b` it is the **right** (`n > -1` holds).

### What Batch I repaired

The **completed-retry** family — 9 of 9 were defective, the weakest family in the corpus. Each read
`recv.indexOf("parseStoredResult(") < recv.indexOf(<effect>)`, so deleting the very short-circuit the
control exists to protect made `indexOf` return `-1` and left `-1 < n` true. Each now computes both
indices, asserts both are present under a `<label>-anchors` control, and only then asserts the order:

| IDX | Suite | Ordering control |
| --- | --- | --- |
| IDX-03 | debate-mastery | `27c3` |
| IDX-04 | debate-mastery | `29c4` |
| IDX-11 | deca-mastery | `26c3` |
| IDX-13 | deca-mastery | `29f2g` |
| IDX-15 | education-migration | `4b6f` |
| IDX-19 | hosa-medterm-evidence | `35d4` |
| IDX-36 | practice-session | `133` |
| IDX-40 | review-ladder | `56` |
| IDX-42 | review-ladder | `65h9` |

Three of the nine (IDX-36, 40, 42) were Category C — a different control happened to catch the
mutation. Duplicate coverage was **not** accepted as sufficient: each repaired target was proven to
fire on its own.

**Mutation evidence:** every target assertion was evaluated in isolation at its real call site.
**9/9 fire on all three of their own mutations** — presence fails when the short-circuit anchor is
absent, presence fails when the effect anchor is absent, and ordering fails when both are present but
reversed. Harmless source-form changes pass. **0 harness errors.**

**Family after Batch I: completed-retry 9/9 safe, 0 defective.**

### Ordering-control state

**Safe 30 → 39 · defective 18 → 9 · unresolved 0.** Remaining defective at that batch:

- **Batch II — evidence-before-mastery (4):** IDX-01, IDX-08, IDX-17, IDX-39
- **Batch III — transaction (1):** IDX-30
- **Batch IV — route resolution / gating order (4):** IDX-16, IDX-45, IDX-46, IDX-47

**The auth/rate-limit family (9 of 9) is safe as written and needs no change** — every member guards
its operands today, and Batch I did not touch it. **Batch I was test-integrity only: it repaired no
runtime behaviour and no security defect.**

**Recommended next implementation order AS RECORDED AT THAT BATCH — all three have since SHIPPED
and are Production-verified (see the Batch II/III/IV sections above):** (1) **Batch II — evidence-before-mastery**: IDX-01, IDX-08,
IDX-17, IDX-39 (same inline mechanism, four controls); (2) **Batch III — transaction**: IDX-30, kept
isolated because it sits on the transaction/exactly-once evidence boundary even though the change is
test-only; (3) **Batch IV — route resolution / gating**: IDX-16, IDX-45, IDX-46, IDX-47.

**Validation:** `db:generate` · `tsc` · `lint` (1 pre-existing `<img>` warning) · `build` ·
**30/30 safe suites green**, before the commit and again against the deployed artifact. Moving-HEAD
debt unchanged at **18** (Class B 12, Class C seed 6). LC1 CLOSED and byte-identical. A2 unchanged;
A4 remains CLOSED. No database access.

## M15 S1B-LC1 — Authored learning content is protected (shipped; Production-verified at `5894098786`)

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Commit `c9b0a1dd41698bdb6b5f719f7c710c0a96199745`, Production deployment **`5894098786`**, status
**SUCCESS**, automatic `vercel[bot]` deployment from the Git push — no manual deploy, no rollback,
nothing superseded it. Previous baseline `e5aeefd`. **Zero production changes.**

**Production verification passed:** exact SHA deployed, 8-file scope, production trees byte-identical,
snapshot fidelity re-derived from the deployed module, 24/24 mutation probes matched with 0 harness
errors and 0 survivors, 30/30 safe suites green.

At that batch, `lib/learning-content.ts` held **17** authored entries: **4** published through the
education registry, the other **13** held. The published four had presence checks
(`education-migration` 15b–16c); the held thirteen had **nothing** once the moving-HEAD pins
self-healed. Owner decision: **one contract for every entry** — "held" governs whether a learner can
reach a lesson, not whether reviewed authored content may silently mutate.

**Superseded — current derived truth:** `LEARNING_SKILL_CATALOG` holds **21** authored entries; **9** of them are published through the education registry and **12** are held. `EDUCATION_LESSONS` totals **12** — those 9 catalog-sourced entries plus `claim-warrant-impact`, `how-deca-roleplay-works` and `how-hosa-scenario-interaction-works`, which are not catalog entries. The integrity contract covers all 21.

**Mechanism.** `scripts/learning-content-integrity-smoke.ts` canonicalises the module's **runtime
values** and compares them to a checked-in reviewed snapshot,
`scripts/learning-content-baseline.json` (**1694 lines at that batch**, an **array sorted by stable slug** — not an
object keyed by slug, because JSON permits duplicate keys and `JSON.parse` silently keeps the last,
which would make "no duplicate baseline ids" unprovable). Canonicalising runtime values is what makes
the control immune to comments, formatting, imports, helper renames and declaration order while still
catching every authored-text change. A full snapshot rather than hashes: a hash cannot reconstruct the
previous prose, so an edit shows as a **2-line diff naming the exact sentence** instead of an opaque
hash transition.

**Protected:** identity (`slug`, `lesson.slug`), association (`organization`, `track`, `category`),
every authored string, learner-visible `lesson.estimatedMinutes`, and the **order** of `steps`,
`choices`, `practiceQuestions` and `masteryCheck` — all four are rendered to learners in array order.
**Excluded, each with a live guard:** `retryPrompt`/`retryChoices`/`retryCorrectAnswer` are excluded
only because all questions — **85** at that batch, 111 now — are provably derived from
`prompt`/`choices`/`correctAnswer`, and an
executable invariant fails the moment one diverges; seed-level `order` is excluded only because
nothing reads it, re-proved each run against `lib/education/tracks/debate.ts`.

**Fail-closed.** Every runtime layer asserts its key set exactly (seed 8, lesson 5, content 8,
workedExample 4, question 9). An unclassified learner-facing field fails with the layer and slug
named. Stated honestly: a **type-only** edit adding an optional field that no entry carries at runtime
leaves the suite green — there is no learner-visible content yet. The moment any entry carries the
field, it fails until classified. The suite asserts runtime shape; it does not read type declarations.

**ID-set equality, both directions.** A new entry without its snapshot block FAILS, so a new lesson
cannot land permanently unprotected; a removed or renamed entry FAILS as an orphan.

**`LEARNING_CONTENT_BASELINE` is a review signal, not a security boundary.** A deliberate developer
can change source, snapshot and marker in one commit — that is fine, because the reviewed prose delta
is explicit in the diff. The retired pins were different in kind: committing **alone** changed the
expected bytes. Nothing here is ever derived from HEAD.

**Mutation evidence, as re-verified at Production verification against the deployed artifact:**
**24 probes · 19 expected FAIL · 5 expected PASS · 24/24 matched · 0 harness errors · 0 unnamed kills
· 0 unexpected survivors.** Every mutation was committed before the run, so the retired hashes could
not manufacture a kill, and only the new suite was executed. Killed: title, prose,
`workedExample.prompt`, field deletion and association change on **both** a published
(`debate-signposting`) and a held (`hosa-healthcare-ethics`, `debate-weighing`) entry;
`estimatedMinutes`; renamed id; duplicate slug; broken `lesson.slug` relation; unknown runtime field;
diverging `retryPrompt`; entry removal; new entry without a snapshot block; **swapped and appended
`steps`**. Passed: new entry **with** a reviewed snapshot block; inert `order`-only change; comment,
helper rename and catalog declaration-order refactors.

**Moving-HEAD debt: 20 → 18** — Class B **12**, Class C seed **6**, learning-content **0**. The two
former learning-content pins (`education-migration` `4.`, `skills-compat` `27.`) are **RETIRED**, and
were retired only after the replacement control passed the mutation gate.

**Safe suite set 29 → 30 at that batch**; registered `*:smoke` inventory 32 → 33. Both have grown
since — 36 registered, safe battery 32.
`scripts/learning-content-integrity-smoke.ts` is registered and was part of the safe 30 at that
batch — not a dead script. It is still registered; the safe battery is now 32 of 36 registered. `hosa-practice-scope` control `43b` was updated to the exact new count, kept as equality.

**Still separate, not repaired at that batch:** **24** controls across **7** suites used a pattern equivalent to
`indexOf(a) < indexOf(b)` without first establishing that `a` exists, so they **can** pass vacuously
when the first anchor is absent (`indexOf` returns `-1`, and `-1 < anything` holds). **One** instance
has been empirically demonstrated so far; the remaining 23 match the pattern structurally and have
**not** been individually proven vacuous. Pre-existing — introduced by neither S1B-1 nor S1B-LC1.

**Validation:** `db:generate` · `tsc` · `lint` (1 pre-existing `<img>` warning) · `build` ·
**30/30 safe suites green while still uncommitted with HEAD at `e5aeefd`**, and again after
deployment. No database access.

## M15 S1B-1 — Redundant HEAD-relative pins retired (shipped; Production-verified at `5892804337`)

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Commit `9c66b04f31ea0316dc3b4365a9ff8936ec5965e4`, Production deployment **`5892804337`**, status
**SUCCESS**, automatic `vercel[bot]` deployment from the Git push — no manual deploy, no rollback,
and nothing has superseded it. Baseline `PRE_M15_S1B = d82e714`. **Zero production-code changes.**

The read-only S1B audit corrected the debt figure: **34** HEAD-relative pin entries, not 50, across
**6** suites (not 4) and 16 production files. The old 50 summed every `for (const file of [...])`
loop in only four suites — including ordinary content-assertion loops with no HEAD helper — and
omitted `hosa-medterm-evidence-smoke.ts` and `review-ladder-smoke.ts` entirely.

A HEAD-relative pin compares a file against `git show HEAD:<file>`. It therefore fails only while a
change is *uncommitted* and passes again the moment HEAD advances onto that same change. Isolated on
a scratch clone against `lib/roleplay-lessons.ts`:

| state | byte pin | retained control (`tracks:smoke`) |
| --- | --- | --- |
| clean | PASS | PASS |
| cosmetic edit, uncommitted | **FAIL** (false alarm) | PASS |
| cosmetic edit, committed | PASS | PASS |
| property broken, uncommitted | FAIL | **FAIL** |
| property broken, **committed** | **PASS** — waves the break through | **FAIL** |

**14 of the 16 authorized Class A entries were retired**, each only after its property was mapped to
a named executable control that imports the module and asserts runtime values. Seven distinct
semantic properties were mutation-proved to fire.

**Two entries were held back, both `lib/learning-content.ts`** (in `education-migration-smoke.ts` and
`skills-compat-smoke.ts`). The audit classified them Class A on the strength of controls `3b`/`17b`,
and that was wrong: `3b` asserts the registry entry **is** the catalog object (strict `===`), so
`17b` compares that object's strings against themselves and is a tautology that cannot fail on a
content change.

The finding was then sharpened during Production verification, and the distinction matters for
whoever designs the replacement — **do not read this as "the file is untested":**

- **Authored field PRESENCE *is* covered.** Emptying `whyItWorks` on an audited migrated lesson is
  killed by four suites (`15b`–`15e` require every authored field to be non-empty).
- **Authored TEXT VALUES are *not* covered.** Changing that same lesson's title, replacing its prose,
  or rewriting `workedExample.prompt` each survived **all 29** safe suites when the mutation was
  committed so the moving-HEAD hash self-healed.

So the gap is specifically *content integrity over authored text*, not coverage in general. The
(weak, self-healing) hash stays until a dedicated batch writes a real content control. These two
entries are **not** redundant and **not** Class B by default; they need their own control design.

**Remaining HEAD-relative debt: 20** — Class B 12, Class C 6 (`prisma/seed.ts`, all six untouched),
plus these 2 held-back entries.

**Separate open S1B test-integrity debt — 24 vacuous ordering controls.** Twenty-four controls across
**seven** suites use ordering logic equivalent to `indexOf(a) < indexOf(b)` without first proving `a`
exists. When `a` is absent `indexOf(a)` returns `-1`, and `-1 < anything` is true, so the assertion
passes vacuously — deleting the very thing it guards makes it green. Found while mutation-testing the
`4b9.` retirement: renaming `parseStoredResult` throughout the Debate drill submit route left
`education-migration`'s `4b6f` passing (the property was still caught, by `practice-session` and
`review-ladder`). The count is **identical at the S1B-1 baseline `d82e714`**, so this is pre-existing
and **not introduced by S1B-1**. Not repaired at that batch; it was kept separate from the
`learning-content.ts` content-control design — different defect, different fix. *(Historical: the 24 vacuous ordering controls were repaired by Batches I-IV; ordering-control state at Batch IV was safe 44 / defective 4 / unresolved 0.)*

**Validation:** `db:generate` · `tsc` · `lint` (1 pre-existing `<img>` warning in
`components/profile/user-avatar.tsx`, untouched) · `build` · **29/29 safe suites green while still
uncommitted with HEAD at `d82e714`**. **Zero production changes** — test files and docs only. A4, A3,
A2, A1, G2 and the schema byte-identical. **No database access.**

## M15 S1A A4b — Practice-session copy matches real activity (shipped; Production-verified at `5884961320`)

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.** Commit `d82e714`,
Production deployment **`5884961320`**, status **SUCCESS**, automatic `vercel[bot]` deployment.

The last reward-honesty batch. **One production file, copy only.**

**Before:** `{n} practice sessions completed — debates, tests, and lessons.` and
`Complete a debate, test, or lesson to start your record.`
**After:** `{n} practice sessions completed — debates and graded tests.` and
`Complete a debate or a practice test to start your record.`

Both old lines were false. `User.streak` has exactly **two** writers — the Debate judge route and the
PracticeTest grade route — and `XP_REWARDS.lessonCompleted` is declared once and consumed nowhere.
Finishing a lesson could never move that number, so naming lessons promised progress that could not
happen.

**Semantics, unchanged:** `User.streak` keeps its legacy schema name and its meaning — a **lifetime
count of completed Debate and graded PracticeTest sessions**. Not a streak, not consecutive days. No
counter logic, reward logic, quota, XP, XPLog, rank or lesson behaviour was touched; the historical
value is untouched. The word "streak" still exists as the prop identifier but never reaches a learner
as text.

**Already-truthful surfaces left alone:** dashboard, coach detail, profile and home all say "Practice
sessions" and were correct before this batch.

### Validation

`db:generate` · `tsc` · `lint` (1 pre-existing `<img>` warning) · `build` ·
**29/29 safe suites green while still uncommitted with HEAD at the A4a baseline** · **8/8 mutation
probes killed**. All six A4a production files **byte-identical**; A3, A2, A1, G2 and the schema
frozen. **No database access.**

### Still open AS OF THAT BATCH

**S1B, open:** 18 HEAD-relative test pins (Class B 12 · Class C seed 6; learning-content **0** —
retired by S1B-LC1) · **5 defective ordering controls** remaining of 48 audited across 14 suites
(Batch III 1 · Batch IV 4; Batch I's 9 completed-retry and Batch II's 4 evidence-before-mastery
controls are repaired, and 30 were safe as written) · `/debates/history` soft-redirect gating · stale
"Reassess now" CTA · skills-compat prose. **M16:** semantic judging, authoritative winner,
readiness, snapshot/wins restoration.

**Recommended order for the next batches:** (1) the 24 `indexOf` ordering controls; (2) the 12
Class B pins; (3) Class C seed strategy. The learning-content design audit and its control are DONE
(S1B-LC1). **The safe gate became 30/30 at that batch — a report of 29/29 no longer meant full
coverage.** **Superseded — current gate: 36 registered `*:smoke` scripts, safe battery 32** (36 minus the three database-writing suites `auth`/`team`/`assignment` and the live-provider suite `judge-shape`). Derive both numbers from `package.json`; never accept a hard-coded figure, and never accept a 30/30 report as full coverage.

## M15 S1A A4a — Daily XP bounded, practice unlimited (shipped; Production-verified at `5884247160`)

### M15 S1A A4a — Daily XP bounded, practice unlimited — record written BEFORE the push (SUPERSEDED)

**Status when written (superseded — since pushed): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

The A4 audit measured the exploit: Debate creation had **no rate limit at all**, so 300 judged rounds
per hour was reachable — **7,500 XP/hr, MASTER rank in about an hour** of scripted requests — and
~18 meaningful words satisfied a rewarded round. A4a bounds the reward without touching the practice.

### Policy

Per **UTC** day: the first **3** qualifying Debate completions earn 25 XP each, the first **3**
qualifying PracticeTest completions earn 20 XP each. **Quotas are separate.** Past the quota a round
still completes, is still judged or graded, keeps all coaching, still counts as a practice session and
remains valid assignment evidence — it simply pays 0. **Practice itself is never limited.**
Neither a Debate's score/winner nor a PracticeTest's score gates XP: a bad result is exactly when more
practice helps.

### Transaction protocol (identical in both writers)

1. **A2 same-source claim — still the FIRST operation** (unchanged)
2. `lockUserRow` — the existing `SELECT … FOR UPDATE`, reused rather than duplicated. This is what
   makes the quota exact across **distinct** sources; without it two concurrent judgements could both
   read "2 awards today" and both award a third.
3. one server `now`, captured **after** the lock — the lock can block, so a request starting at
   23:59:58 UTC could otherwise be billed to the wrong day
4. count same-day XPLog rows with `amount > 0` for that `sourceType`
5. award only when under quota — `awardXpInTransaction` is **not** called with 0
6. write the ledger row (always)
7. increment the practice-session counter (always)

### Z1 — a ledger row on every completion, `amount: 0` past the quota

XPLog's only reader is `getLastActivityForUsers`, which takes `max(createdAt)` for the coach's
"active" date. Omitting post-cap rows would make a student who practised three more rounds today look
inactive since yesterday. The zero row also **is** the persisted reward fact the PracticeTest results
page reads. Nothing sums XPLog into `User.xp` and nothing filters on `amount`, so zero rows are
harmless — and the quota query excludes them explicitly.

### `User.streak` deliberately NOT converted

It has no date field, no comparison and no reset anywhere: it is a **lifetime count of completed
practice activities**, and the UI already calls it "Practice sessions". Capping only future increments
while grandfathering the stored value would make one column mean "sessions" below some row and "days"
above it. It now uses `{ increment: 1 }` — same semantics, but the stale read-add-write that could
lose a concurrent update is gone. A real consecutive-day streak needs its own date-aware model later.

### Reward truth on both result surfaces

**Debate** consumes the judge response, so it gets a real `xpEarned` plus `rewardLimitReached` and
never renders a bare "+0 XP". **PracticeTest could not** — the client parses the grade response only
for `error`, discards it, and navigates to a server component. The results page therefore reads the
persisted XPLog row for that test. Its hardcoded `+20` is gone. **A missing row renders nothing**: it
is not proof of an award and not proof the limit was hit, and pre-A4a tests have no row at all.

### Preserved

A3 fully frozen (no score/winner reward, no `User.wins` write, no snapshot, ballot framing intact),
A2 claim first, A1 formative, G2 banks and `prisma/schema.prisma` byte-identical, all **eight**
pre-existing `lockUserRow` callers unchanged (`sessionNotFound` remains the default), assignments
untouched, history grandfathered. **No schema change, no migration, no backfill.**

### Validation

`db:generate` · `tsc` · `lint` (1 pre-existing `<img>` warning) · `build` · **29/29 safe suites green
while still uncommitted with HEAD at the A4 baseline** — the controls are valid before commit, not
self-healed. **20/20 mutation probes killed.** **No database access.**

**Structural concurrency limitation, stated honestly:** the quota's exactness under truly simultaneous
requests rests on PostgreSQL `SELECT … FOR UPDATE` semantics and is proven **structurally** — the lock
is taken, in the right order, and no read-add-write survives. It was **not** empirically
concurrency-tested, exactly as with A2.

### Still open AS OF THAT BATCH

**A4b:** the false "debates, tests, and lessons" copy in `components/app/xp-progress-card.tsx`.
**S1B:** `/debates/history` gating, stale Reassess CTA, skills-compat prose, 50 HEAD-relative pins
*(estimate as of this batch; the S1B audit later measured 34, and S1B-1 retired 14 of them)*.
**M16:** semantic judging.

## M15 S1A A3b-3 — Coach and assignment labels align (shipped; Production-verified at `5883101376`)

### M15 S1A A3b-3 — Coach and assignment labels align — record written BEFORE the push (SUPERSEDED)

**Status when written (superseded — since pushed): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

The last batch of the A3 honesty pass. Presentation only; no historical data changed.

**Coach roster** ([page.tsx](app/(app)/coach/page.tsx)) — `{xp} XP · {n} wins` → **`{xp} XP`**. The frozen
counter is hidden, not relabelled and not deleted. Its activity condition was
`hasActivity = u.xp > 0 || u.wins > 0` and is now **`u.xp > 0`**: A3a froze `User.wins`, so it can no
longer answer "does this student have activity now". XP is a strict superset and hides nobody — every
win was awarded in the same transaction as the round's completion XP, and XP is only ever incremented.
The condition gates the XP line and the rank line only, never membership or permissions. **No new
query**; `lastActivity` was already in scope but XP was the smaller sufficient change.

**Coach student detail** — `Avg judge score` → **`Avg practice ballot score`**. `Judged rounds` and
A3a's removal of the fabricated win/loss record both preserved.

**Assignment evidence picker** ([assignments.ts](lib/assignments.ts)) — `{topic} ({87})` →
**`{topic} — practice ballot score 87`**. A bare parenthesised number read as a grade. A round with
no score keeps the completion-only label (the old form emitted a trailing space there); nothing is
invented. **Qualification is untouched** — ownership, `status: "JUDGED"`, and the `PRACTICE_REBUTTAL`
format filter all unchanged, and no score has ever gated Debate evidence.

### Test-integrity correction (found by this batch, not a production defect)

Four suites carried a blanket **HEAD-relative** byte-pin on `lib/assignments.ts`:
`education-migration` (`4.`), `skills-compat` (`27.`), `deca-mastery` (`24-28.`),
`debate-mastery` (`27-31.`). Each compared the working tree against `git show HEAD:<path>`, so it
**failed only while a change was uncommitted and passed again the moment HEAD advanced onto that same
change** — it could not protect the file across commits. Committing would have turned all four green
without anything being verified.

Only the `lib/assignments.ts` entries were retired, each replaced with semantic controls matched to
that suite's own domain rather than one pasted assertion:

- **education-migration `4A`** — LESSON evidence still resolves to a COMPLETED `PracticeAttempt` owned
  by the learner, narrowed to the assignment's target lesson slug, recorded as `LESSON_ATTEMPT`.
- **skills-compat `27A`** — assignments still resolve their target by stored slug (so legacy `/skills`
  slugs keep working) and take no dependency on the skills-compat layer; plus `27A3`, an **immutable**
  pin of `lib/assignment-types.ts` against `e652cbe3` rather than HEAD.
- **deca-mastery `24A`** — `PRACTICE_TEST` evidence still requires a COMPLETED test owned by the
  learner, and the assignment engine still writes no mastery or XP of its own.
- **debate-mastery `27A`** — the full Debate qualification contract, **scoped per function**:
  `validateEvidence` (which accepts a submission) and `getStudentEvidenceOptions` (which lists
  selectable rounds) are asserted separately for JUDGED, ownership and `PRACTICE_REBUTTAL`, plus no
  ballot-score threshold.

That per-function scoping matters: an earlier draft searched the file globally, and a mutation probe
removing the JUDGED gate from the **accepting** path survived it because the picker's copy still
matched. Both paths are now bound independently.

**Carried test-integrity debt (inventoried, not fixed):** 50 further HEAD-relative pins remain across
those four files — 20 in education-migration, 16 in skills-compat, 8 in deca-mastery, 6 in
debate-mastery. Each has the same self-healing flaw. Not broadened into this batch.
*(Superseded — the S1B audit measured this exactly: **34** entries across **6** suites, not 50 across
4. The estimate above counted every file loop in four suites, including non-HEAD content-assertion
loops, and missed two suites. Kept as written to record what was believed at the time.)*

### Preserved

A3b-2's three surfaces, A3b-1's ballot files, the A3a authority route, `lib/coach-progress.ts`,
`lib/assignment-types.ts`, A1, all four G2 banks and `prisma/schema.prisma` are byte-identical to
`e652cbe3`. The only production change in `lib/assignments.ts` is the picker label.

### Validation

`db:generate` · `tsc --noEmit` · `lint` (1 pre-existing `<img>` warning) · `build` ·
**29/29 safe suites green WHILE STILL UNCOMMITTED**, with HEAD unmoved — the repaired controls are
valid before commit, not self-healed. **10/10 presentation mutants and 11/11 qualification mutants
killed, 0 survivors.** **No database access.**

### Still open AS OF THAT BATCH

**A4:** uncapped Debate creation, completion-XP farming, PracticeTest XP policy, streak semantics,
reward design. **S1B:** `/debates/history` soft-redirect gating style, stale "Reassess now" CTA,
skills-compat summary prose, the HEAD-relative pin debt above. **M16:** semantic judging.

## M15 S1A A3b-2 — Learner stats speak the ballot's language (shipped; Production-verified at `5882568067`)

### M15 S1A A3b-2 — Learner stats speak the ballot's language — record written BEFORE the push (SUPERSEDED)

**Status when written (superseded — since pushed): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

A3b-1 made the ballot truthful. A3b-2 carries the same terminology to the three surfaces that re-showed
the same formative numbers under stronger names. **Presentation only** — no stored value is read
differently, written, reset or backfilled, and no new query was added.

**Dashboard** ([page.tsx](app/(app)/dashboard/page.tsx)) — the "Judged rounds" card detail was
`{n} wins · avg judge score {x}.` and is now `Avg practice ballot score {x}.`; the judged-round panel
chip was `{n} wins · avg judge score {x}` and is now
`{n} judged rounds · avg practice ballot score {x}`, using the judged-round count the page already
computes.

**Profile** ([page.tsx](app/(app)/profile/page.tsx)) — the `{n} wins` chip is **removed**, not
relabelled: "Legacy wins" or "Practice wins" would keep a permanently frozen number prominent. The
stat grid drops to one column so the surviving "practice sessions" chip does not sit beside an empty
cell, and the now-unused `Trophy` import goes with it. Recent debates read
`Judged · practice ballot score {n}` instead of `Judged · {n}% judge score` — the percent sign made a
formative number look like a graded mastery percentage.

**Replay** ([page.tsx](app/(app)/debates/[debateId]/replay/page.tsx)) — **three** score surfaces, not
the two originally listed: the visible `Overall score: {n}`, the separate **read-aloud** string
`Overall score {n}.`, and the attempt-list `· Overall {n}`. All three now say practice ballot, so the
spoken experience makes exactly the same claim as the visible one.

### Two carried test-quality fixes, both implemented

1. **Disclaimer-density checks are now case-insensitive.** The A3b-1 control counted
   `not mastery or readiness` case-sensitively, so a duplicate that merely re-capitalised the
   sentence slipped through — a mutation probe demonstrated that escape. Both qualifiers are now
   counted case-insensitively, and the competition-record qualifier is counted too, which it never
   was. A control proves the new counter catches a capitalisation-only duplicate.
2. **Explicit frozen-baseline proof of the DECA defect.** The old `Winner unavailable wins` headline
   was never one literal — it was composed at render time from `winnerLabel()` returning
   `"Winner unavailable"` plus the template appending `" wins"`. `A3b-C9`…`C9e` rebuild that
   composition from the A3b-1 baseline's own source and show the current ballot routes the same case
   to `Practice round scored`.

**Two immutable pins are now in play and are not interchangeable:** `PRE_M15_A3B1` (`9b396753`) for
ballot-era defects, `PRE_M15_A3B2` (`7b4f78ac`) for the stat surfaces. Each control pins the commit
where its defect actually existed. Neither is HEAD-relative.

### Corrections to the A3b plan found while implementing

- The dashboard's `hasActivity` does **not** use `wins` (it is
  `xp > 0 || recentTests.length > 0 || judgedDebateCount > 0`), so no activity-logic change was
  needed. The `xp > 0 || wins > 0` condition is in the **coach roster**, which is A3b-3.
- The replay file had a **third** score surface (the attempt list) that the plan's inventory missed.

### Preserved

A3b-1's ballot files, the A3a authority route, `lib/ai.ts`, `lib/ai-providers.ts`,
`lib/debate-judge-analysis.ts`, A1's three paths, all four G2 banks, `prisma/schema.prisma`, and
**every A3b-3 target** (`coach/page.tsx`, coach student detail, `lib/assignments.ts`,
`lib/coach-progress.ts`) are byte-identical to `7b4f78ac`. `User.wins` is still selected on the
profile — A3b-2 hides it, it does not delete or reset data. **No historical data changed.**

### Validation

`db:generate` · `tsc --noEmit` · `lint` (1 pre-existing `<img>` warning) · `build` ·
**29/29 safe suites green** · **11/11 mutation probes killed, 0 survivors**. **No database access.**

### Still open AS OF THAT BATCH

**A3b-3:** coach roster wins, coach average-score label, assignment picker score label.
**A4:** uncapped Debate creation, completion-XP farming, PracticeTest XP policy, streak semantics,
reward design. **M16:** semantic judging and any restoration of authoritative progression.

## M15 S1A A3b-1 — The Debate ballot is a PRACTICE ballot (shipped; Production-verified at `5882198754`)

### M15 S1A A3b-1 — The Debate ballot is a PRACTICE ballot — record written BEFORE the push (SUPERSEDED)

**Status when written (superseded — since pushed): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

A3a removed false progression **authority**. A3b-1 removes false **presentation** authority from the
primary Debate ballot. Wording and hierarchy only — no scoring, winner, XP or persistence logic
changed. The learner still gets a trophy, a winner, a score, category feedback, an RFD, strengths,
weaknesses, recommendations and AI-written coaching; the page simply names it accurately.

**Ballot copy now:** badge `Practice ballot` (was `Judge decision`) · headline
`{side} wins this practice round` · one status line
`CompeteReady practice decision — for coaching, not your competition record.` ·
`Practice ballot score` with `Formative coaching score — not mastery or readiness.` (stated exactly
once) · score hierarchy `text-6xl` → `text-5xl` · XP relabelled
`+N XP earned for completing the round`, so it is never read as a consequence of the score ·
new parent framing `Practice feedback by area` / `Where the practice judge saw strengths and areas
to improve.`

**`Rating movement` → `Where to focus next`.** The signed deltas (`+14/+9/+4/-3/-8`) are no longer
rendered: they came from a band lookup over a formative score, so a green `+9` claimed measured
rating movement that never occurred. Each area now shows a **word plus an icon** — `Strength`,
`On track`, `Developing`, `Focus`, `Priority` — never colour alone. The per-area explanation, which
is the genuinely useful part, is kept. The stored numbers in `judgeReport.ratingChange` are
**unchanged**, and the word is derived at render time, so ballots judged before A3b-1 replay with
the same honest wording and no history is rewritten.

**Judge-route prose (wording only, owner-approved).** `ratingReason` emitted
`"Argument rating increased because …"`; it is now `focusReason`, emitting
`"The practice judge scored argument highly because …"` / `"… is a focus area because …"`. The same
band still selects the sentence — no number, threshold or scoring input changed. Every A3a authority
control was re-run unchanged on that file.

**Provider attribution corrected.** On Path A the provider *never* scores: the local practice rubric
produces the numbers and the winner whether the provider is up or down, and the provider is only
asked for prose. So the failure notice `"Live AI judge unavailable — showing the local rubric judge"`
became `"Extra AI-written feedback isn't available right now. Your practice ballot score still comes
from CompeteReady's practice rubric."`, and the success-path provider banner (`"Gemini AI is
active."`) is no longer attached to a ballot at all — it implied the vendor produced the score.
`lib/ai-providers.ts` is **untouched**: the banner stays truthful for side coach and generation.

**Path B (DECA) defect found and fixed.** `PerformanceJudgeResult` carries no `teamWinner`, so the
modal was rendering the literal headline **"Winner unavailable wins"** plus a `Losing side:` line
invented by a `??` fallback — nonsense for a solo role-play with no opposing side. A role-play now
gets `Practice round scored` and no losing-side line; two-sided rounds keep the two-sided copy.

### Preserved

A3a authority is byte-verified intact (completion-only XP, no `debateWon`, no wins write, no
snapshot, `progressionBasis: "completion-only"`, `scoredBy` from the real `scoringMode`, `assisted`
from `assistedPractice`, A2 claim still first in transaction). A1, `lib/debate-judge-analysis.ts`,
`lib/ai-providers.ts`, `lib/coach-progress.ts`, all four G2 banks and `prisma/schema.prisma` are
byte-identical to `9b396753`. All A3b-2 and A3b-3 target files are untouched.

### Validation

`db:generate` (client generation only) · `tsc --noEmit` · `lint` (1 pre-existing `<img>` warning) ·
`build` · **29/29 safe suites green**. **No database was accessed**; no secrets were read.

### Still open AS OF THAT BATCH

**A3b-2:** dashboard legacy wins + practice-score labels, profile legacy wins + recent-debate score
label, replay score wording. **A3b-3:** coach roster wins, coach average-score label, assignment
picker score label. **A4:** uncapped Debate creation, completion-XP farming, PracticeTest XP policy,
streak semantics, reward design. **M16:** semantic judging and any restoration of authoritative
competitive progression.

## M15 S1A A3a — Formative ballot authority REMOVED (shipped; Production-verified at `5881331565`)

### M15 S1A A3a — Formative ballot authority REMOVED — record written BEFORE the push (SUPERSEDED)

**Status when written (superseded — since pushed): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

Third batch of **M15 Slice 1A (Evidence Integrity)**. The governing rule it installs:

> **A formative ballot may coach the learner but may not create authoritative competition
> progression.**

### Why the Debate ballot is formative on BOTH paths

- **Path A — Debate / Mock Trial / Public Speaking / Model UN.** Every number *and the winner* come
  from lexical marker counts in `lib/debate-judge-analysis.ts`. `judgeDebate` computes the local
  ballot **first and unconditionally**; the provider is then asked only for prose under
  `JUDGE_PROSE_SYSTEM`, and `mergeJudgeEnhancement` can write only six string fields — it cannot
  touch a score, `sharedSpeaking`, or `teamWinner`. Measured on the real exported function: an
  on-topic, marker-dense, circular speech scored **98** and beat genuinely reasoned prose at **65**,
  from **either** seat, maxing out every substantive category. Live and fallback differ in prose
  only — there is no degraded *numeric* state, which is why no `degradedJudge` flag is written.
- **Path B — DECA.** AI-scored against a registry rubric and fails closed (no fallback). Genuinely
  stronger, but never validated against human judge ballots — so still formative — and it has no
  opponent at all, meaning `didStudentWin`'s `overallScore >= 80` fallback would call a solo
  role-play a "win".

### What A3a changed

`app/api/debates/[debateId]/judge/route.ts`:

- `xpEarned = XP_REWARDS.debateCompleted` — the winner-conditional bonus is gone.
  **`XP_REWARDS.debateWon` is deliberately retained in `lib/constants.ts`** so a validated M16 judge
  can earn it back without a rewrite.
- **No `wins` write.** `wins` is still read (it feeds the internal bot-matching projection, which
  now uses the stored value rather than a speculative `+1`) and still returned, but no
  `tx.user.update` writes it. Historical values are untouched — no reset, no backfill, no migration.
- **No `SpeakingSkillSnapshot` row on any path, including DECA.** Path A projects those eight
  dimensions from the same lexical counts, and `pacing`/`volume` describe audio this route never
  receives; Path B is unvalidated. The model, schema and every historical row are retained; M16 may
  resume writing behind a trust gate. `result.sharedSpeaking` still feeds the visible ballot.
- The XPLog reason no longer branches on the winner (`"Completed AI debate"`), so no progression
  write is winner-conditional.
- **Judging basis persisted into the existing `judgeReport` Json — no migration.**
  `scoredBy` is derived from the **actual** scoring mode, never from the organization:
  `local-lexical-rubric` for Path A; for DECA, `ai-registry-weighted` **only when
  `result.scoringMode === "registry-weighted"`**, otherwise `ai-seed-rubric`. DECA's per-category
  point split is still unsourced (seeded `points: null` + PLACEHOLDER; see `docs/NEXT_TASK.md`), so
  the truthful current value is `ai-seed-rubric` — the label upgrades itself if a real split lands.
  Also written: `progressionBasis: "completion-only"` on **every** path (`"scored"` is not a
  permitted value), and `assisted` mirrored from the stored `Debate.assistedPractice`.

**Coach evidence integrity (caused by A3a, fixed in A3a).** `lib/coach-progress.ts` derived
`losses = judgedRounds - wins`. The judge route was the **sole** writer of `User.wins`, so freezing
it would have left `wins` static while `judgedRounds` climbed — reporting **every future judged
round as a loss** (a student with 12 rounds shown to their coach as 0 wins / 12 losses), a number
matching no recorded event, since Debate has no `losses` and no `winner` column. The derived field
is removed, and the coach student-detail page no longer renders the Wins/Losses pair — those two
chips only read as a competitive record together. It still shows **Judged rounds** and the average
formative ballot score, both backed by real rows. No learner data was read, written or repaired.

### Authority policy after A3a

- **AUTHORITATIVE:** judged/completed-round fact, transcript, completion XP, activity/streak,
  completion-based assignment evidence.
- **FORMATIVE:** ballot, category scores, overall score, winner/practice decision, RFD, strengths,
  weaknesses, recommendations — all still produced, stored and displayed.
- **NOT AUTHORITATIVE:** lexical winner, the DECA solo `>= 80` "win" concept, win-bonus XP,
  `User.wins`, `SpeakingSkillSnapshot`, and any readiness derived from these.

### Preserved and verified

A2's conditional claim is still the **first** operation in the progression transaction with an
identical predicate, transition and `count === 0` → 409; every progression effect follows it. A1's
three writing paths, `lib/debate-judge-analysis.ts`, `lib/ai.ts`, `components/debate/debate-arena.tsx`,
all four G2 drill banks and `prisma/schema.prisma` are **byte-identical** to `bb7c4dcc`.

### Validation

`db:generate` (client generation only, no DB connection) · `tsc --noEmit` · `lint` (1 pre-existing
`<img>` warning) · `build` · **29/29 safe suites green**. **No database was accessed at any point.**
Eight source-only mutation probes ran on scratch copies — win bonus via a temporary variable, wins
in a multi-line update, fake DECA registry provenance, restored `losses` derivation, restored Losses
chip, progression moved before the A2 claim, reintroduced snapshot, restored direct win bonus —
**8/8 killed, 0 survivors**, with every control also proven to fail against the frozen `bb7c4dcc`.

### Validation incident (recorded factually)

During pre-commit review, an automated review process **read the database connection string from the
environment file and ran read-only queries directly against the shared production database**. That
access was **not authorized**. No writes were reported. It was contained: the final validation above
used repository source only, with no database access and no subordinate processes. **The exposed
database credential should be rotated** through the provider, with the Production secret and the
local secret replaced through normal secret management. No credential value is recorded here.

### Still open AS OF THAT BATCH

**A3b (learner-facing honesty, not started at that batch; A3b-1/-2/-3 have since SHIPPED):** "Judge decision" → practice-ballot framing; the 6xl
score presentation; category-score framing; "Rating movement"; the misleading
`"Live AI judge unavailable — showing the local rubric judge"` notice (it implies the normal ballot
was AI-scored, which it never is); the remaining historical **Wins** surfaces — the owner has decided
**all six** should be made consistent, not a subset; optionally the assignment-picker score label.
**A4 (not started at that batch; A4 has since CLOSED):** uncapped low-effort Debate creation (no rate limit on `POST /api/debates`, no
per-day completion-XP cap), PracticeTest XP policy, streak semantics, reward design.

## M15 S1A A2 — Judged attempts are EXACTLY-ONCE (shipped; Production-verified at `5879894892`)

**Status when written (superseded — since pushed): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NO DB OPERATION, NO SCHEMA CHANGE`.**

Second batch of **M15 Slice 1A (Evidence Integrity)**: one learner attempt can now produce
authoritative progression **at most once**, even under racing requests. Both duplicate-progression
routes gained a conditional PostgreSQL claim as the **first operation inside their existing
progression transaction** — before any read or write:

- **Debate judge** (`app/api/debates/[debateId]/judge/route.ts`):
  `tx.debate.updateMany({ where: { id, status: { notIn: ["JUDGED","ARCHIVED"] } }, data: { status: "JUDGED" } })`,
  `count === 0` → the existing 409. Eligibility is provably identical to the pre-read
  ({SETUP, ACTIVE} → JUDGED). Previously a race duplicated XP, XPLog, wins+1, streak+1 and a
  SpeakingSkillSnapshot row across the whole AI-call window.
- **Practice-test grade** (`app/api/tests/[testId]/grade/route.ts`): same pattern with
  `{ id, userId, status: { not: "COMPLETED" } } → COMPLETED`, placed **before the answer upserts
  and the streak read**. Previously a race duplicated XP, XPLog and streak.

The outside-transaction pre-reads remain as fast paths only — **the claim is the correctness
mechanism**. Under READ COMMITTED the losing transaction blocks on the row lock, re-evaluates its
predicate against the committed row, matches zero rows and exits with the same 409 sequential
duplicates already receive; a post-claim failure rolls the claim back with the transaction, so the
attempt stays retryable. Both UI callers already render 409 safely — zero UI change. *Actual
simultaneous-request behavior relies on PostgreSQL conditional-update semantics; no DB-writing
concurrency test was executed.*

Scoring, winner, fallback policy, XP amounts, win/streak policy, ballots, Side Coach: **unchanged**
(A3/A4 remain not implemented). A1 formative writing, all G2 banks, schema, `lib/xp.ts`,
`lib/spaced-review.ts`, `lib/ai.ts`, `lib/assignments.ts`: **byte-unchanged**. Regression controls in
`judge-shape` (A2-1…C2) and `practice-session` (A2-10…C10b) bind model + id + exact eligibility +
transition + count check + claim-is-first-tx-op + every-effect-after-claim, proven non-vacuous
against the frozen pre-A2 pin `b476ce6`.

**Carried future integrity debt (recorded, deliberately NOT in A2):** ① `startAssignment` racing a
submit can regress a COMPLETED assignment to IN_PROGRESS (status only, no XP) · ② `messages`/
`opponent` routes can insert duplicate speech rows (no unique on debateId+round+role; inflates the
speech-completeness gate, duplicates AI spend, no progression) · ③ `XPLog` lacks a
`(sourceType, sourceId, userId)` uniqueness backstop (schema change, deferred).

## M15 S1A A1 — Debate writing practice is FORMATIVE (since pushed; on `main`)

The commit is `b476ce68bbbeac606f9af8ef1f375e9824d4508b`
(`fix(m15): make debate writing practice formative`, 2026-08-12), an ancestor of the current `main`.
No deployment ID was recorded for it here, so none is claimed; the section below is the record as
written before that push.

### The record written BEFORE the push (superseded)

**Status when written (superseded — since pushed): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NO DB OPERATION, NO SCHEMA CHANGE`.**

First implementation batch of **M15 Slice 1A (Evidence Integrity)**. The Debate writing-practice
grader is a keyword/structure checklist (`lib/debate-skill-practice.ts`): a keyword-stuffed
non-argument scores 96. Before this batch, one such submission wrote **MASTERED**-level
`MasteryProgress` on the same Skill row as the strong server-graded drill path, +10 XP with rank
recompute, advanced the spaced-review ladder, and minted a COMPLETED `PracticeAttempt` with a
`lessonId` — **valid LESSON assignment evidence**. All of that is fabricatable, so it is gone.

**The principle this batch establishes: COACHING VALUE ≠ PROGRESSION AUTHORITY.**

- The submit route (`app/api/skills/debate-writing/route.ts`) keeps the session lifecycle, grader,
  full feedback payload and stored-result replay, and now returns `formative: true`. It writes **no**
  MasteryProgress, XP, XPLog, rank, review-ladder movement, PracticeAttempt or QuestionAttempt.
- Formative writing can therefore no longer satisfy an evidence-gated LESSON assignment; the
  assignments engine itself is untouched.
- UI honesty in the same feature: the component labels the surface "Formative writing practice",
  states it does not affect mastery or XP, frames the number as "Writing checklist: N%" (never an
  achievement variant), and the skills page no longer promises "10 XP and updates this skill's
  mastery".
- Non-vacuous regression controls across five suites (`debate-mastery`, `practice-session`,
  `education-migration`, `review-ladder`, `skills-compat`): the authoritative-write ban lists are
  proven against the **frozen pre-A1 pin `338a88d`** (the old route contains every banned token),
  and the keyword-salad exploit is exercised as a pure function — it still maxes the checklist at
  96, and that 96 now has no write path. `deca-mastery`'s HEAD-relative byte-pin on the shared
  skills page was retired per repo convention and replaced by direct assertions (24b).
- Debate/DECA/HOSA drill mastery, the review ladder's real writers, XP for drills/tests/judge, G2
  banks, schema, and all engines are **byte-unchanged** (verified per-file).

Remaining S1A batches — **not implemented**: A2 judge/tests-grade idempotency, A3 ballot progression
policy, A4 test-XP + streak truth.

## M14 GLOBAL G2 — CLOSED 2026-08-12

**M14 Global G2 is CLOSED as of 2026-08-12 by explicit project-owner decision.** The milestone's
accepted definition of done is satisfied: final depth is **420/420**, bank-count deficit is **zero**,
G2 integrity controls remain intact, all required deployments and Production verifications are
complete, Slice 8 governance is recorded truthfully as owner-waived external human review, and the
pre-closure fake-mastery invariant violation has been remediated and verified. Named carried debt
remains outside G2 closure scope. Closing G2 resolves this milestone only — it implies nothing about
unrelated future milestones.

**Final result:** Debate **120** (cw 30 · rb 30 · ev 30 · wg 30) · DECA **120** (pi 30 · br 30 ·
cr 30 · mk 30) · HOSA **180** (six areas × 30) · **corpus 420/420 · deficit 0**. All planned G2
depth slices shipped; integrity controls (immutable `PRE_G2_EXPANSION` baseline, byte-identical
legacy items, withheld-authority probes, non-vacuous terminal-comma normalisation, depth/overdraw
controls, mastery duplicate resistance) are intact and re-executed at the final deployed HEAD.

**Review/provenance truth:** Slices 1–7 were genuinely human-reviewed. Slice 8 was AI-assisted and
AI-reviewed; external human review was waived by the project owner on 2026-08-12, and the owner
separately stated approval. No item-by-item external human review is certified for Slice 8.

**Final pre-closure Production record:** source SHA
**`96bcdaa0abd94790ce683d1df81988e9753637d5`**, Production deployment **`5878478987`**, status
**SUCCESS**, automatic `vercel[bot]` deployment from the Git push. Health: `/` 200 · `/signin` 200 ·
protected pages 307 → `/signin` · unauthenticated drill APIs 401 · zero checked 5xx. No DB write, no
authentication, no learner session, no manual deployment, no rollback.

**Carried non-blocking debt (outside G2 closure scope, not reopened by closure):**
1. `pi-07` / ⟨B-2⟩ — curriculum-consistency debt.
2. HOSA `sf-04` `-ology`/`-logy` — terminology/convention debt.
3. HOSA word-root / combining-form notation — stylistic/content-normalisation debt.

The HOSA Event HQ false-mastery claim is **NOT** carried debt — it was resolved by the pre-closure
remediation and is Production-verified, with a non-vacuous regression guard in
`hosa-medterm-evidence:smoke`.

## M14 Global G2 Slice 8 / DECA Slice 4 — DECA marketing-fundamentals 9 → 30 (DEPLOYED AND PRODUCTION-VERIFIED)

**Status: `DEPLOYED AND PRODUCTION-VERIFIED`. Review provenance: `AI-ASSISTED AND AI-REVIEWED —
EXTERNAL HUMAN REVIEW WAIVED BY PROJECT OWNER 2026-08-12`.**

**Production verification (read-only, performed 2026-08-12):** Production deployment **`5878064863`**
from source SHA **`ece9a91a9c6efe1471b3bc4b4ee807fea71180db`**, created automatically by `vercel[bot]`
from the owner's Git push, status **success**. Local HEAD = `origin/main` = remote main, ahead/behind
0 / 0. Canonical checks: `/` and `/signin` **200** · protected pages (`/dashboard`,
`/training/deca/practice`, `/training/debate/practice`) **307 → `/signin`** with correct callback ·
unauthenticated DECA / Debate / HOSA session APIs **401** · unauthenticated DECA / Debate submit APIs
**401** · checked 5xx **0**. **No manual deploy, no rollback, no DB write, no authenticated learner
session.**

Slice 8 expanded **one** DECA area: **marketing-fundamentals 9 → 30** (`mk-10`…`mk-30`, +21).
DECA **99 → 120**. Pushed as four commits (`c27729d` implementation · `6fa3c0b` meta-language ·
`3cd1e2c` final content quality · `ece9a91` provenance), all deployed at `5878064863`.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — deployed, human-reviewed |
| `lib/deca-drills.ts` | **120** | pi 30 · br 30 · cr 30 (deployed, human-reviewed) · **mk 30 (deployed, AI-reviewed — external human review owner-waived)** |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — deployed, human-reviewed |

**Review provenance, kept truthful.** The 21 `mk-10`…`mk-30` questions are AI-assisted and
AI-adversarially audited; a separate AI reviewer approved the content — **supplementary AI QA that
does NOT count as human review**, and neither does AI self-review. **EXTERNAL HUMAN REVIEW WAIVED BY
PROJECT OWNER 2026-08-12:** the owner received the final 21-question review packet (choices permuted
for independence) and separately stated approval of the final set; **no item-by-item external human
review is certified.** Slices 1–7 were genuinely human-reviewed; Slice 8's waiver is the recorded
exception. **Never describe the bank as 8/8 human-reviewed.**

- Design contract verified on the shipping text: choices state candidate decisions, the stem supplies
  the evidence, the explanation supplies the reasoning; every wrong option defeated by a printed stem
  fact or printed decision requirement; final audit exactly-one 21/21 · key grounding 21/21 ·
  explanation grounding 21/21 · stem necessity 21/21 · application depth 21/21 · CR drift 0 · keyed
  BR economics 0. Deterministic form battery clean; real same-session leakage 0.
- `mk-09` boundary: exactly one comma added; `mk-01`…`mk-08` and all 90 pi/br/cr items byte-identical;
  `PRE_G2_EXPANSION` pin absolute; no HEAD-relative pin.

### G2 pre-closure remediation (pushed as `96bcdaa`, deployed and verified at `5878478987`)

The final read-only closure audit (2026-08-12) found three blockers; all were fixed in ONE commit
(`96bcdaa`), pushed and Production-verified at deployment `5878478987`:

1. **Slice 8 provenance corrected** — the earlier `HUMAN-APPROVED` headline was stronger than the
   process certified; the source label and these docs now carry the owner-waiver wording above.
2. **Slice 8 Production verification recorded** (block above).
3. **HOSA Event HQ false mastery claim FIXED.** `app/(app)/training/[track]/event/[eventSlug]/page.tsx`
   claimed *"Everything on this page feeds the same real mastery record"* (and "Guided lessons feeding
   the same mastery record") for HOSA Medical Terminology, which is REVIEW-ONLY — no MasteryProgress,
   no XP; flashcards persist nothing. This violated the global **no fake mastery/progress** invariant
   (the G19 defect class; the earlier Study Arcade fix and its guard never covered this page). The
   copy now promises preparation, not persistence, and `hosa-medterm-evidence:smoke` gained guard
   controls `38`–`38-C1b`: the banned mastery-record claim pattern is asserted absent from
   learner-facing text, the review-only HOSA entry may not mention mastery at all, and the removed
   sentences are proven still caught by the same predicates (verified to fire on the pre-fix page).

**Carried non-blocking debt (recorded, deliberately NOT fixed here):** `pi-07`/⟨B-2⟩ curriculum
consistency (outside G2 — legacy items are immutable under G2's own controls) · `sf-04` `-ology`
convention (HOSA; deliberately-unresolved) · HOSA word-root combining-form notation (stylistic,
explicitly excluded from Phase 2a). The Event HQ claim is REMOVED from carried debt — resolved above.

**Global M14 G2 status: `CLOSED 2026-08-12` — see the closure record at the top of this file.** The
remediation shipped (`96bcdaa` → deployment `5878478987`, verified) and the explicit owner closure
decision was made on 2026-08-12.

## M14 Global G2 Slice 7 / DECA Slice 3 — DECA customer-relations is 30 deep, human-reviewed, deployed

**Status: `DEPLOYED, HUMAN-REVIEWED, AND PRODUCTION-VERIFIED`.**

**SLICE 7 CUSTOMER RELATIONS: DEPLOYED, HUMAN-REVIEWED, AND PRODUCTION-VERIFIED.** Implementation
complete; human-reviewed and approved 2026-08-12; pushed to `main`; **Production deployment
`5874440794`** from source SHA **`d877d2ed7339e6bbf2ec82c81f6c612484fea4e9`**, created automatically by
`vercel[bot]` from the Git push, status **success**, with no manual deployment and no rollback.
Post-deploy verification passed: local HEAD = `origin/main` = remote main, ahead/behind **0 / 0**;
canonical public routes 200; protected learner routes and the dashboard auth-gated with 307 redirects
to `/signin`; the five drill APIs return 401 unauthenticated; **zero 5xx**; **no database write and no
manual deploy performed**.

**Two separate gates, both met, kept distinct in the record.** **(1) Content-quality gate: PASS** by AI
adversarial audit — 21/21 exactly one defensible answer, 21/21 fact-sufficient, 0 hidden policy, 0
hidden authority, 0 hidden capability/access, 0 explanation-only defects, 0 item-level form leaks, 0
boundary defects, 0 legacy-debt defects. **(2) Human review gate: PASS (2026-08-12)** — an **external
human reviewer personally reviewed all 21 final Customer Relations questions, `cr-10` through `cr-30`,
at the final shipping content and approved the complete set without requested changes.** Earlier human
feedback had already shaped the content: a human identified the item-level answer-form leakage the
slice-wide metrics had masked, and a human blind-quiz answer surfaced the `cr-20` ambiguity, both of
which triggered adversarial work that found real defects. **A separate Google Gemini review also found
no content changes necessary — that is supplementary AI QA and does NOT count as human review**, which
the external human reviewer alone satisfies. **AI self-review does NOT count as human review, and
neither does review by another AI system.** **The review gate no longer blocks the push; pushing
remains a manual action requiring explicit approval, and nothing had been pushed or deployed **at
that point**. The CR/MK curriculum has since been pushed and deployed.**

**The CR/MK curriculum is deployed and human-reviewed** at `8cb181e` (deployment `5864802348`,
`Production`, `success`), so the approved **CR1–CR6** lessons were the source of truth for this slice.
**That curriculum approval is untouched and is NOT reopened by new drill questions.**

Slice 7 expands **one** DECA area: **customer-relations 9 → 30** (`cr-10`…`cr-30`, +21). DECA **78 → 99**.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — depth COMPLETE, deployed, reviewed |
| `lib/deca-drills.ts` | **99** | pi 30 (deployed, reviewed) · br 30 (deployed, reviewed) · **cr 30 (human-reviewed, ready for push)** · mk 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

- **⟨BC-3⟩ / F-8 enforced across all 21.** Every item states in its stem the policy and authority facts
  its keyed answer turns on. **Hidden policy required: 0 of 21. Hidden authority required: 0 of 21.**
  Where policy is not material (`cr-15`, `cr-17`, `cr-19`) none was invented to fill a template.
  `cr-13`, `cr-16`, `cr-17` and `cr-26` leave one fact unknown **by design**, because identifying that
  gap is the learner decision — the policy and authority frames are still fully stated.
- **Coverage:** CR1 `cr-10`–`cr-12` · CR2 `cr-13`–`cr-16` · CR3 `cr-17`–`cr-19` · CR4 `cr-20`–`cr-23` ·
  CR5 `cr-24`–`cr-26` · CR6 `cr-27`–`cr-30`. All six lessons represented, max 4 per lesson, 21 distinct
  learner decisions, **zero definition-recall items** — six of the legacy nine are recall, so this is a
  depth change, not just a count change.
- **The five legacy CR debts are not reinforced.** `cr-17`, `cr-19`, `cr-24` and `cr-26` are keyed
  *against* the `cr-01`/`cr-06` fixed-sequence pattern (`cr-26` requires establishing facts before
  accepting fault; `cr-19` makes a habitual apology the wrong move on a routine question). `cr-29`
  keys follow-up to named triggers, against `cr-07`. No item keys retention economics (`cr-04`) or an
  unauthorised extra (`cr-09`). **All nine legacy items are byte-identical and immutable.**
- **`G0-7b4c` control moved `cr-10` → `cr-31`.** `cr-10` was an out-of-set probe through Slice 6 and is
  now a legitimate addition, so leaving it would have inverted the assertion. New `G0-7b4d` proves
  `cr-10` and `cr-30` ARE inside the expected set, so the boundary provably moved rather than silently
  loosening.
- **CR legacy-order guard added** (`G0-D7` in drills, `26m2` in mastery): the mastery suite indexes
  **`CR.slice(0, 2)`** for its cross-area attribution tests, so `cr-01`/`cr-02` must stay first. This
  guards a real index dependency, not symmetry — no BR equivalent was added because nothing indexes BR.
- **A second hardcoded `42`** at `deca-drills-smoke.ts` (the predicate control) was found by the build
  and now derives from `EXPECTED_ADDED.length`, so it cannot drift again.
- **Slice 7 was REFINED after the human-review packet — the questions were NOT yet approved at that
  point.** They were approved afterwards and Slice 7 shipped. The packet
  found four should-fix issues and all four are resolved: **(F7-1)** the key was the longest choice in
  **18 of 21**, and because choice order is shuffled at serve time but *length is not*, "always pick the
  longest" would have scored ≈86% without reading. Ten distractors were given their own reasoning —
  which makes them more tempting, not less.
- **⚠ The aggregate metric was NOT sufficient, and the user's own review caught it.** After the
  slice-wide figure reached 4 of 21 key-longest, the repository owner read `cr-10` and saw that its key
  still visibly announced itself: it was the only choice combining policy *and* authority, the only
  fully reasoned option, and the distractors were far simpler. **A bank can pass a global
  "pick-the-longest" test and still leak on individual items.** A per-item detector was then written
  — flagging unique length, uniquely multi-clause structure, unique policy/authority vocabulary, unique
  qualifiers, and distractors much simpler than the key — and it found **9 of 21 leaking**, not 4. All
  nine were fixed by **strengthening distractors into equally serious misconceptions**, never by
  trimming keys. **Item-level form leaks are now 0 of 21.** Final distribution: key longest **5 of 21**,
  shortest **4 of 21**, neither **12 of 21**, mean **0.90**, median **0.92**, max **1.09**, min 0.45 —
  deliberately restored toward chance after an interim pass had pushed key-longest down to 2 of 21,
  which was itself becoming an inverse tell ("the longest answer is almost always wrong").
  **For Slice 8: run the per-item check, not the average.** **(F7-9)** `cr-30` was refined last: its key both carried the slice's highest ratio and was the
  only choice naming the supervisor, and — more substantively — it said to *"bring in the supervisor if
  more is asked"* when the stem establishes only that a supervisor is **present**, not that they hold
  any remedy the employee lacks. The key now stays with the two stated remedies, and reflexive
  escalation on a raised voice became the strongest distractor, which reinforces CR6's
  do-not-reflexively-escalate rule without teaching "never escalate". **(F7-6)** `cr-19`'s key asserted "about five
  working days", a figure the stem never supplied — the estimate is now stated in the stem, which is
  what ⟨BC-3⟩ requires of the item itself. **(F7-3)** `cr-25` now states that a manager is on shift and
  available, so the key offers to seek approval rather than describing it as a dead end. **(F7-4)**
  `cr-26`'s distractor "check with their neighbours and call back" was genuinely defensible in a real
  delivery dispute; it is replaced with handing the investigation to the customer, which the supplied
  facts defeat. **Fact-sufficient and exactly-one-defensible-answer are now 21/21.**
- **⚠ An adversarial read-only audit then found two BLOCKERS and two borderlines the earlier passes
  had cleared.** The owner's single blind answer on `cr-20` exposed the first, and re-auditing on the
  question *"can any distractor also be defended without inventing facts?"* — rather than *"which
  answer was intended?"* — exposed the rest. **(cr-20)** the rationale added while fixing form leakage
  turned a distractor into a competing answer; rejecting it required the explanation-only claim that
  stating the expired window "is necessary". Replaced with a manager-exception option, defeated by the
  stem's own grant of store-credit authority. **(cr-23)** the key asserted a one-week lead time the stem
  never supplied — the identical defect fixed in `cr-19` as F7-6. **A later spot-review found the same
  item still invented a second fact: the key's callback-to-book-the-repair process was never stated
  either.** Both facts are now in the stem. **(cr-26)** the key assumed the
  employee could obtain proof of delivery when the stem established only tracking visibility; the stem
  now states the capability. **(cr-30)** the waiting option was defensible real-world practice, so the
  stem now states the customer is still listening and actively asking what you can do, which the
  silence option directly contradicts. **Lesson recorded for Slice 8: form audits and intent-based
  re-reads cannot find these — only adversarially defending every distractor can.**

- **Source-array key position is A in all 21** — an authoring convention shared with the approved PI and
  BR slices. It is **not learner-visible**: `app/api/deca/drills/session/route.ts` is the only
  learner-facing consumer and it shuffles choices via `buildServedChoices` with opaque UUID option ids.
  Recorded as a known convention, not a defect.
- **NO legacy punctuation changed.** CR is a MIDDLE block, so `cr-09` already carried its comma.
  **At that slice `mk-09` remained the final array element and comma-less** — the DECA terminal-comma
  boundary was still unexercised at that slice and reserved for Slice 8. *(Superseded: Slice 8 appended past `mk-09` and every DECA area now holds 30.)*
- **Third DECA area authorized at that slice:** `EXPANDED_AREAS` was `["performance-indicators",
  "business-reasoning", "customer-relations"]`. **Marketing-fundamentals was then unauthorised** —
  `G0-C6b` asserted that count was **1**, `G0-C6b2` asserted it was MK specifically, and `mk-10` was
  then rejected at stage `unauthorised`. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)*
- **`G0-7b` is now a 63-id guarantee** — `pi-10`…`pi-30`, `br-10`…`br-30`, `cr-10`…`cr-30`, 21 each,
  with `G0-7b2d` asserting **zero** MK additions. The forbidden-prefix loop narrowed to `["mk"]` and
  stays non-vacuous via an explicit exact-prefix assertion.
- **MK stayed the shallow control in BOTH suites at that slice** and did **not** move — parking it on
  MK at Slice 6 was correct, so it moved exactly ONCE. **MK was then the only shallow DECA area**, so
  Slice 8 had to re-base it onto a >30 overdraw (the HOSA `11g` / Debate Slice 4 precedent). Both
  exact-count assertions changed TWO → **ONE**. *(Historical: superseded — every DECA area holds 30 and every HOSA area holds 30; no shallow area remains.)*
- **Content + tests + docs only.** No schema, migration, seed, registry, route, validator, client,
  session-protocol, XP or mastery-runtime change. `deca:skills:activate` was NOT run and no database
  operation was performed. The curriculum file was NOT modified.

**At that slice: DECA locally 30 / 30 / 30 / 9 = 99. Corpus 399. Remaining G2 deficit then 21,
entirely marketing-fundamentals.** **Global M14 G2 was still OPEN at that slice** (it CLOSED 2026-08-12). *PI depth complete ≠ DECA depth complete ·
PI + BR ≠ DECA depth complete · **PI + BR + CR ≠ DECA depth complete** · Debate depth complete ≠ Global
M14 G2 complete.* At that slice, CR, DECA and Global G2 were not to be recorded as complete. *(Superseded: G2 CLOSED 2026-08-12 at 420/420, deficit 0. That directive bound the agents of its own era; it does not authorise a future agent to contradict the canonical live state.)*

## M14 DECA Curriculum Completion — Customer Relations + Marketing Fundamentals curriculum is human-reviewed and approved

**Status: `AI-ASSISTED CURRICULUM, HUMAN-REVIEWED AND APPROVED 2026-08-12`.**

**The repository owner personally read all twelve lessons in the final post-refinement checklist and
approved them** — the CR and MK core definitions, each lesson's concepts, examples, non-examples,
common mistakes and boundaries, ⟨CR-C⟩ and its labeling, the 21-row provenance map, the five CR and
one MK legacy-debt records, source/provenance honesty, D7 labeling, legal/policy scope,
age-appropriateness, and depth sufficiency for both areas. **The approved curriculum is the cumulative
content of `afe9c94` plus refinement commit `07068f1`.** The Claude/AI pre-screen was the authoring
model checking its own output — neither the review nor independent verification — and **the
AI-ASSISTED label stays in the source permanently**; approval changed the review status, not the
provenance. **The curriculum push gate is lifted.**

**Two points were refined before approval.** The four-input CR model's exhaustive wording was removed,
so the scope block now says explicitly that it is **CompeteReady's analytic model, not an exhaustive
taxonomy**, and names tone, sequencing and acknowledgement as parts of an interaction that do not
always reduce to one of four boxes. MK6's absolute *"the message must suit… the channel must be one
that target market actually uses"* became **"a strong promotion choice matches the message to the
intended audience and uses a channel that can realistically reach that audience"**, which keeps
contextual fit while leaving room for broad-awareness activity.

**Six further notes were personally reviewed and approved WITHOUT rewrite** — the paraphrase-source
disclosure (CR2), the AMA brand-positioning scope (MK3), the narrow CFPB context (CR5), the CR3/CR4
layering, the ⟨BC-2⟩ source-verification wording, and the ⟨BC-3⟩ policy-fact rule. **⟨BC-3⟩ is
deliberately preserved and binds Slice 7 authoring:** if a CR question's correctness depends on refund
or exchange eligibility, store-credit availability, warranty handling, employee authority, an
escalation requirement, or any other policy-dependent remedy, **the scenario must state that fact — no
drill may require guessing hidden company policy.**

**This milestone changes no drill content and earns no G2 depth credit.** It exists because Slice 7
(CR 9→30) was blocked: the DECA course taught **L0–L18 and no lesson covered customer relations or
marketing fundamentals**. The course teaches the role-play *performance* skill set, which is why PI
mapped to L2/L3 and BR mapped to L9–L12 — CR and MK are business-*content* areas the course never
covered. Every prior "customer relations" occurrence in the curriculum was an example PI **title** in
the ⟨D6⟩ recitation lesson. The owner chose **Option 1 — author the missing curriculum first**.

**Twelve lessons drafted** in a new appended section of `docs/curriculum/02-deca-course.md`:
**`CR1`–`CR6`** (what a CR decision decides · understanding the concern · acknowledging without
overpromising · explaining policy and real options · service recovery · authority, escalation and
follow-through) and **`MK1`–`MK6`** (who the customer is · why they would choose you · how you want to
be understood · the offering and its price · getting it to the customer · telling them about it).

- **Architecture: appended after the old final line 271, never inserted.** 271 → 814 lines. **26
  line-number citations point into this file** (13 in `lib/deca-events.ts`, 13 in
  `scripts/deca-navigator-smoke.ts`), the highest at line 232, and **nothing in the repo parses
  curriculum files** — so a shifted citation would fail *silently* rather than break a test. Proven
  after the append: the first 271 lines are **byte-identical** to `HEAD` (md5 `d1fed6a0…` unchanged)
  and **all 51 distinct cited lines still hold their original text. Zero citations shifted.**
- **Separate numbering.** `CR1`–`CR6` / `MK1`–`MK6` do **not** extend L0–L18 and can never collide
  with it.
- **Source verification was performed** against public, non-proprietary sources — OpenStax *Principles
  of Marketing*, *Introduction to Business*, *Principles of Management* and *College Success*, the
  American Marketing Association's public definitions, the U.S. SBA business guide, U.S. OSHA
  workplace-violence guidance (used only to keep de-escalation technique **out** of scope), and the
  U.S. CFPB complaint-process description (context only; its sector deadlines are **not** taught).
  **No DECA exam, role-play prompt, evaluation form, answer key or proprietary text was used.** All
  learner-facing prose is original synthesis; the curriculum contains **no raw URLs**, matching the
  existing curriculum style.
- **Every lesson is tagged STABLE-TEACHING**, which per doc 00 is **never a rules source** — so the
  section states no DECA rule, no scoring criterion, no judge expectation and no score claim.
- **One new CompeteReady scaffold**, the seven-step service-recovery sequence ⟨CR-C⟩, labeled exactly
  as ⟨D7⟩ requires: a CompeteReady teaching scaffold, not official DECA terminology, not a scoring
  formula, order-variable, steps frequently unnecessary. **The 4 Ps are NOT labeled as ours** — they
  are mainstream marketing terminology.
- **Known source gap recorded honestly:** ISO 10002 (complaints-handling guidance) is named as a
  relevant reference that **was not retrieved** — its text is paywalled and returned HTTP 403 — and
  **no claim rests on it.**
- **Legacy debt contextualized, never corrected.** **FIVE** CR items carry notable debt — `cr-01`
  (fixed sequence) · `cr-04` (CR/BR retention economics, now `br-12`'s) · `cr-06` (fixed sequence) ·
  `cr-07` (follow-up universalized) · `cr-09` (authority/"small extra") — and **one** MK item does:
  `mk-08` (MK/BR measurement efficiency). *(The planning record miscounted CR as "four" while naming
  five; the count is FIVE.)* All 18 legacy items are unchanged and immutable, and **no baseline
  exception was created.**
- **Drill banks intentionally untouched.** `lib/deca-drills.ts`, `scripts/deca-drills-smoke.ts` and
  `scripts/deca-mastery-smoke.ts` are byte-identical to `HEAD`. `EXPANDED_AREAS`, `SLICE_ADDITIONS`,
  depth authorization, question ids, question content and all counts are unchanged.
- **Registry/seed attachment DEFERRED.** `deca-customer-relations` still has **no lesson slugs** and
  `deca-marketing` still has **three title-only slugs** with no authored bodies. Attaching lessons
  touches seeded product data and is a **separate approval**. `deca:skills:activate` was NOT run and
  no database operation was performed.
- **Video parity DEFERRED.** `06-videos-deca.md` is untouched; the DECA video set (videos 9–14) is
  selective rather than a lesson-by-lesson mirror, so parity is not owed. No placeholder video exists.

**Exactly 3 files changed:** `docs/curriculum/02-deca-course.md`, `docs/CURRENT_STATE.md`,
`docs/HANDOFF.md`.

**At that slice: DECA 30 / 30 / 9 / 9 = 78. Corpus 378. Deficit then 42 (CR 21 + MK 21).** *(Historical: superseded — every DECA area holds 30 and every HOSA area holds 30; no shallow area remains.)*
**Curriculum approval awards no G2 question-depth credit.** The curriculum-first prerequisite is
COMPLETE, source verification is COMPLETE, and **Global M14 G2 was OPEN at that point and ready to resume with Slice 7
Customer Relations depth implementation.** At that slice CR depth, MK depth, DECA and Global G2 were
all incomplete and were not to be recorded as complete or closed. *(Historical: superseded — G2 CLOSED 2026-08-12 at 420/420, deficit 0.)*

## M14 Global G2 Slice 6 / DECA Slice 2 — DECA business-reasoning is 30 deep, human-reviewed, deployed

**Slice 5 (PI) is deployed and human-reviewed** at `a6dfc86` (deployment `5863473555`, `Production`,
`success`), so performance-indicators was approved and live before this slice began.

Slice 6 expands **one** DECA area: **business-reasoning 9 → 30** (`br-10`…`br-30`, +21). DECA
**57 → 78**.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — **depth COMPLETE, deployed, human-reviewed** |
| `lib/deca-drills.ts` | **78** | performance-indicators 30 (deployed, reviewed) · **business-reasoning 30 (review outstanding)** · customer-relations 9 · marketing-fundamentals 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**The 21 new BR items are AI-ASSISTED content that received HUMAN CONTENT REVIEW on 2026-08-12.** The
repository owner personally read all 21 in the final checklist and approved answer defensibility, fact
sufficiency, absence of hidden assumptions, distractors, wording, BR curriculum fit, the BR/PI, BR/CR
and BR/MK boundaries, cost, feasibility, risk/tradeoff and measurement reasoning, numeric accuracy,
overlap, B-8 and D7 compliance, universal-rule and framework safety, and provenance. **The approved
content is implementation commit `40a473b` plus content-refinement commit `7fd6798`. The Slice 6 push
gate is lifted.**

The Claude/AI pre-screen was the authoring model checking its own output — neither the review nor
independent verification — and **the AI-authoring label stays in the source permanently**; approval
changed the review status, not the provenance.

**`br-16` was refined before approval.** Its original stem omitted the go-live timing needed to
separate before-peak from after-peak training, so both readings avoided pulling staff during the peak
and the keyed answer rested on an unstated fact. The final stem states the till system goes live just
before the peak. **`br-19`, `br-27` and `br-29` were explicitly reviewed and approved WITHOUT rewrite**
— an L10 operational-dependency case, a construction-vs-interpretation distinction from legacy
`br-03`, and a D7 disclaimer that is accurate and correctly placed.

- **Content + tests + docs only.** No schema, migration, seed, skill-activation script, route,
  validator, client, session-protocol, XP or mastery change. `deca:skills:activate` was NOT run.
- **NO legacy punctuation changed.** BR is a MIDDLE block, so `br-09` already carried its comma.
  **At that slice `mk-09` remained the final array element and comma-less** — the DECA terminal-comma
  boundary was still unexercised at that slice. *(Superseded: Slice 8 appended past `mk-09` and every DECA area now holds 30.)*
- **Scope came from Module 2 lessons 9–12** — attaching the "because" (revenue, cost, retention,
  loyalty, brand, risk), implementation and feasibility (who does what by when with what resources),
  cost/risk/tradeoffs, and measuring success (the one or two metrics the business would watch).
- **⟨D7⟩ and ⟨B-8⟩ enforced bank-wide.** The five-part scaffold is CompeteReady's teaching method,
  never presented as official DECA terminology, and **no item claims implementation or measurement
  improves scores.** B-8 is an authoring guardrail, deliberately not the learner skill of any item.
- **Second DECA area authorized at that slice:** `EXPANDED_AREAS` was `["performance-indicators",
  "business-reasoning"]`. **Two recognised areas were then unauthorised** — `G0-C6b` asserted that
  count was **2**, and `cr-10`/`mk-10` were each then rejected at stage `unauthorised` under default
  authorization. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)*
- **`G0-7b` is now a 42-id guarantee** — `pi-10`…`pi-30` plus `br-10`…`br-30`, 21 each. The
  forbidden-prefix loop narrowed to `["cr","mk"]` and remains genuinely non-vacuous.
- **⚠ The shallow control moved business-reasoning → marketing-fundamentals in BOTH suites.** MK was
  chosen over customer-relations because Slice 7 is expected to expand CR; MK stays at 9 through
  Slices 6 and 7, so the control moves once and re-bases onto a >30 overdraw only at Slice 8.
- **No BR fixture needed re-basing, because none exists** — nothing indexes BR, and no BR
  legacy-order assertion was added since no invariant depends on it. `CR.slice(0, 2)` is untouched.

**Global M14 G2 was OPEN at that slice.** Deficit then **63 → 42**: **customer-relations 21 + marketing-fundamentals
21**, and nothing else. Corpus 357 → **378** locally; final target **420**. Every remaining G2
question is a DECA question. **`PI depth complete` is NOT `DECA depth complete`**, **`PI + BR depth
complete` is NOT `DECA depth complete`**, and **`Debate depth complete` is NOT `Global M14 G2
complete`** — at that slice none of them was to be marked closed. *(Historical: superseded — G2 CLOSED 2026-08-12 at 420/420, deficit 0.)* Those distinctions still
hold as reasoning; the closure decision has since been recorded.

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Global G2 Slice 5 / DECA Slice 1 — DECA performance-indicators is 30 deep, human-reviewed, deployed

**Debate is finished and live.** All four Debate areas hold 30, all four slices are human-reviewed and
approved, and Slice 4 is deployed at `09e9bdb` (deployment `5863008892`, `Production`, `success`).

Slice 5 expands **one** DECA area: **performance-indicators 9 → 30** (`pi-10`…`pi-30`, +21). DECA
**36 → 57**.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — **depth COMPLETE, deployed, human-reviewed** |
| `lib/deca-drills.ts` | **57** | **performance-indicators 30** · business-reasoning 9 · customer-relations 9 · marketing-fundamentals 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**The 21 new PI items are AI-ASSISTED content that received HUMAN CONTENT REVIEW on 2026-08-12.** The
repository owner personally read all 21 in the final checklist and approved answer defensibility,
distractors, wording, curriculum fit, verb interpretation, PI-method stages, scenario role and
constraint handling, the PI/BR, PI/CR and PI/MK boundaries, PI-essentiality, B-2 safety, `pi-07`
handling, scoring and preparation claims, measurement boundaries, overlap and provenance. **The
approved content is implementation commit `b72cba2` plus content-refinement commit `1340cdb`. The
Slice 5 push gate is lifted.**

The Claude/AI pre-screen was the authoring model checking its own output — neither the review nor
independent verification — and **the AI-authoring label stays in the source permanently**; approval
changed the review status, not the provenance.

**`pi-19` and `pi-30` were refined before approval**, both for failing the remove-the-PI diagnostic.
`pi-19` now carries an employee-retention indicator whose outcome differs from the action's stated
rationale, so the indicator decides what success means. `pi-30`'s action became a targeted offer email
to members inactive for sixty days — plausibly judged on reach, immediate response or retention — so
only the listed indicator picks the measure, separating it from legacy `br-03`/`br-08`.
**`pi-28` was explicitly reviewed and approved WITHOUT rewrite** as a PI/BR boundary case: its keyed
axis is completeness of the PI demonstration chain, not the commercial merit of the action.

**Legacy `pi-07` has a pre-existing tension with current curriculum B-2. Slice 5 leaves `pi-07`
immutable, does not reinforce it, and does not create contradictory B-2 content. This remains separate
curriculum debt for later resolution.** B-2 — whether to speak a PI's title aloud or weave it in — is
a genuinely contested judgment call in the curriculum and is **deliberately untested** in this slice.
**B-2 is NOT resolved.**

- **Content + tests + docs only.** No schema, migration, seed, skill-activation script, route,
  validator, client, session-protocol, XP or mastery change. `deca:skills:activate` was NOT run.
- **NO legacy punctuation changed.** PI is the FIRST block, so `pi-09` already carried its comma; the
  items insert before `// --- Business reasoning ---`. **At that slice `mk-09` remained the final array element and
  remained comma-less at that slice — the DECA terminal-comma boundary was still unexercised.** *(Superseded: Slice 8 appended past `mk-09` and every DECA area now holds 30.)*
- **Scope came from Module 1 lessons 2 and 3 plus the non-negotiable PI rule** — PIs are behaviours to
  demonstrate, never to recite; the PI method (plain meaning → scenario requirement → in-character
  action → judge-facing explanation → measurement); the 5-extract decode; and the demonstration chain
  (decision → reasoning → implementation → feasibility → measurement).
- **First DECA area authorized at that slice:** `EXPANDED_AREAS` was `["performance-indicators"]`.
  **Three recognised areas were then unauthorised** — `G0-C6b` asserted that count was **3**, and
  `br-10`/`cr-10`/`mk-10` were each then rejected at stage `unauthorised` under default
  authorization. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)*
- **`G0-7b` is now a 21-id guarantee** — exactly `pi-10`…`pi-30`, each declaring `performance-indicators`,
  driven by a new one-row `SLICE_ADDITIONS`. The `["br","cr","mk"]` forbidden loop is genuinely non-vacuous.
- **DEPTH TESTS WERE ADDED, NOT MOVED** — neither DECA suite had a depth block or shallow control
  before this slice. Both now prove PI **20 served / 20 distinct** and **40 / 30**, with
  **business-reasoning** as the then-shallow control at **20 / 9** and **40 / 9**. *(Historical:
  superseded — every DECA area holds 30; no shallow control remains.)*
- **No PI fixture needed re-basing** — all index `PI.slice(0, n≤5)`, `PI[0]` or `PI[5]`, which still
  resolve to legacy items. That is now **asserted** (`G0-D6`, `26m`) rather than assumed. The PI
  bypass fixture stays at **raw 76 / evidence 20**.

**Global M14 G2 was OPEN at that slice.** Deficit then **84 → 63**: DECA business-reasoning, customer-relations and
marketing-fundamentals (3 × 21). Corpus 336 → **357** locally; final target **420**. Every remaining
G2 question is a DECA question. **`PI depth complete` is NOT `DECA depth complete`**, and
**`Debate depth complete` is NOT `Global M14 G2 complete`** — at that slice neither was to be marked
closed. *(Historical: superseded — G2 CLOSED 2026-08-12 at 420/420, deficit 0.)* The distinction still holds as reasoning.

**Local commits only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Global G2 Slice 4 — Debate weighing is 30 deep, human-reviewed, deployed

**Slices 1, 2 and 3 are deployed and human-reviewed** (`61b19de`, deployment `5861953872`,
`Production`, `success`), so rebuttal, CWI and evidence-evaluation were approved and live before this
slice began.

Slice 4 expands **one** area: **weighing 9 → 30** (`wg-10`…`wg-30`, +21). Debate **99 → 120**.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **120** | claim-warrant-impact 30 · rebuttal 30 · evidence-evaluation 30 · **weighing 30** |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**The 21 new weighing items are AI-ASSISTED content that received HUMAN CONTENT REVIEW on
2026-08-11.** The repository owner personally read all 21 in the final checklist and approved answer
defensibility, distractors, scenario sufficiency, wording, the weighing/CWI, weighing/rebuttal and
weighing/evidence-evaluation boundaries, Lesson 37 and seeded `debate-weighing` fit, magnitude,
probability, timeframe, reversibility, framework use, V-3 and V-4, contextual rather than universal
weighing claims, overlap and explanation quality. **The approved content is implementation commit
`9c20282` plus content-refinement commit `a250e40`. The Slice 4 push gate is lifted.**

The Claude/AI pre-screen was the authoring model checking its own output — neither the review nor
independent verification — and **the AI-authoring label stays in the source permanently**; approval
changed the review status, not the provenance. All four Debate slice labels now carry that two-part
form.

**`wg-24` was refined before approval.** The drafted stem quantified probability ("well under one
percent" vs near-certain) but left magnitude qualitative ("catastrophic" vs "moderate"), so a large
enough catastrophe could rationally reverse the comparison, and the explanation claimed "the numbers
decide which way" on facts covering only one side of the tradeoff. The approved `wg-24` quantifies
**both** sides — their harm reaches **25,000** at well under one percent, yours reaches **20,000** and
is near-certain — so a real but modest magnitude edge sits against a far larger likelihood gap, with
no expected-value or `probability × magnitude` formula and no universal ranking of the dimensions.

**`Debate depth complete` is NOT `Global M14 G2 complete`.** All four Debate areas now hold 30 and all
four are human-reviewed, which completes Debate depth locally. **Global M14 G2 was still OPEN at that slice** because
all four DECA areas were still at 9 at that slice — every remaining G2 question was then a DECA
question. All four reached 30 by Slice 8.

- **Content + tests + docs only.** No schema, migration, seed, route, validator, client,
  session-protocol, XP or mastery change.
- **THE APPEND BOUNDARY WAS EXERCISED FOR REAL.** `wg-09` was the final array element and carried no
  trailing comma; it now carries **exactly one**. That is the only change to any legacy item and it
  is punctuation, proven by `G0-C1d`…`G0-C1d5` against the immutable baseline — **including
  `G0-C1d3`, that the RAW lines differ**, so the normalisation cannot silently stop doing work. The
  synthetic `G0-C1b`/`G0-C1c` are unchanged.
- **Scope came from Module 5 lesson 37 and the seeded `debate-weighing` skill only** — when weighing
  matters, explicit comparison, and magnitude / probability / timeframe / reversibility. **V-3** is
  enforced by `wg-28` (a real comparison that names no category still counts as weighing) and **V-4**
  by `wg-27` ("even if" is one useful move, never required wording). Scope stays inside magnitude
  exactly as legacy `wg-01` defines it; no "turns the case", gateway framework or impact-calculus
  jargon was introduced.
- **All four Debate areas authorized at that slice:** `EXPANDED_AREAS` was `["rebuttal", "claim-warrant-impact",
  "evidence-evaluation", "weighing"]`. **No recognised Debate area was left unauthorised at that
  slice** — `G0-C6b`
  asserts that count is **0**, and the authorisation stage is now probed with a **test-only withheld**
  set through the same `judgeAddition`, never by mutating production.
- **`G0-7b` is now an 84-id guarantee** — `rb`/`cw`/`ev`/`wg`-10…30, each declaring its slice's area.
  The now-empty forbidden-prefix loop was **replaced** with a direct range assertion over 84 real ids.
- **⚠ `G0-7b` is the FINAL bound on Debate bank growth.** With every area authorised, a structurally
  valid `wg-31` passes `judgeAddition` outright (`G0-7b5`); only the exact 84-id set stops it. Never
  relax it into "any known prefix above 09".
- **The shallow-area control was RE-BASED, not deleted.** No Debate area holds 9, so it could not move
  again. Both suites now prove **40 served / exactly 30 distinct / exactly 10 repeated positions**,
  with a **30 served / 30 distinct** boundary partner showing padding activates only above the pool —
  the HOSA `11g` pattern.
- **No weighing fixture needed re-basing, because none existed.** No weighing `evidenceScore` or
  `uniqueTotal` fixture was invented; the CWI bypass (raw 76 / evidence 20) and rebuttal legacy-nine
  (evidence 67) fixtures are untouched.
- **The observable G2 effect:** a focused 20-question weighing session now serves **20 distinct**
  items with no padding, and the padding branch is still proven at **40 served / exactly 30 distinct**.

**Global M14 G2 was OPEN at that slice.** Deficit then **105 → 84**: all four DECA areas (4 × 21). Corpus 315 →
**336** locally; final target **420**. **Every remaining G2 question was then a DECA question** —
DECA stood at 36 (4 × 9) and HOSA at 180 (6 × 30), both untouched by that slice.

**Local commits only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Global G2 Slice 3 — Debate evidence-evaluation is 30 deep, human-reviewed, deployed

**Slices 1 and 2 are deployed and human-reviewed** (`46ab46b`, deployment `5861389721`, `Production`,
`success`), so rebuttal and CWI were already approved and live before this slice began.

Slice 3 expands **one** area: **evidence-evaluation 9 → 30** (`ev-10`…`ev-30`, +21). Debate **78 → 99**.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **99** | claim-warrant-impact 30 · rebuttal 30 · **evidence-evaluation 30** · weighing 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**The 21 new evidence items are AI-ASSISTED content that received HUMAN CONTENT REVIEW on
2026-08-11.** The repository owner personally read all 21 in the final checklist and approved answers,
distractors, clarity, the evidence-evaluation/CWI/rebuttal/weighing boundaries, Lesson 11/12/14 fit and
the Lesson 13 exclusion, source relevance, applicability, direct vs indirect support, expertise and
institutional role, firsthand scope, bias, disclosure, advocacy verifiability, recency,
representativeness, self-selection, comparison-group limits, confounding, self-report limits,
methodology transparency, timeframe cherry-picking, corroboration, headline vs full finding, overlap
and explanation quality. **The approved content is implementation commit `ef55134` plus
curriculum-refinement commit `89497a3`. The Slice 3 push gate is lifted.**

The Claude/AI pre-screen was the authoring model checking its own output — it was neither the review
nor independent verification, and **the AI-authoring label stays in the source permanently**;
approval changed the review status, not the provenance.

**`ev-27` was replaced before approval.** The drafted item taught relative vs absolute risk. Review
established that relative/absolute risk, base rates and percentage interpretation appear **nowhere**
in the current Debate curriculum, so the item extended scope even though its arithmetic was exact. It
was replaced with a Lesson 12 methodology item on **method transparency / evaluability**: a described
method lets a reader judge how a result was produced and where it is limited, while transparency does
not prove truth and a missing method does not prove falsehood. **No Slice 3 item now extends beyond
lessons 11, 12 and 14.**

- **Content + tests + docs only.** No schema, migration, seed, route, validator, client,
  session-protocol, XP or mastery change.
- **Inserted inside the evidence block**, after `ev-09` and before `// --- Weighing ---`. `ev-09`
  already carried its comma, so **no legacy punctuation changed**; at that slice `wg-09` was still the final array
  element and at that slice the terminal-comma append boundary was again **not** exercised. *(Historical: superseded — the Debate append boundary was exercised at G2 Slice 4; the bank now ends at `cl-30`.)*
- **Scope came from Module 2 lessons 11, 12 and 14 only** — finding and judging a source, evidence
  quality and source credibility (explicitly **TIER-2 heuristics**, never stated as rules), and
  correlation vs causation. **Lesson 13, the official citation-rules layer, was deliberately excluded
  from AI-authored content** — official rules must be sourced, not guessed.
- **Three areas authorized at that slice:** `EXPANDED_AREAS` was `["rebuttal", "claim-warrant-impact",
  "evidence-evaluation"]`. **`wg-10` was then rejected as `unauthorised`**, with the companion counts
  moved to 3 authorized / **1** unauthorized so neither loop could go vacuous. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)*
- **`G0-7b` is now a 63-id guarantee** — additions must be exactly `rb-10`…`rb-30`, `cw-10`…`cw-30`
  and `ev-10`…`ev-30`, each declaring its slice's area, each passing the shared predicate, with zero
  `wg-*` additions. `SLICE_ADDITIONS` grew by exactly one row.
- **The shallow-area non-vacuity control MOVED from evidence-evaluation to weighing** — it was
  asserting 20 served / 9 distinct on evidence, which Slice 3 invalidates. It was moved, not deleted,
  and now has an overdraw partner (40 served / 9 distinct). **Weighing is now the LAST shallow Debate
  area: Slice 4 takes it to 30, so that control cannot move again — it must then re-base on a request
  exceeding a 30-item pool, exactly as HOSA's `11g` did at Phase 2f.**
- **No legacy evidence fixture needed re-basing** — none depended on a 9-item evidence pool.
- **The observable G2 effect:** a focused 20-question evidence session now serves **20 distinct** items
  with no padding, and the padding branch is still proven at **40 served / exactly 30 distinct**.

**Global M14 G2 was OPEN at that slice.** Deficit then **126 → 105**: Debate weighing (1 × 21) plus all four DECA
areas (4 × 21). Corpus 294 → **315** locally; final target **420**. Three of four Debate areas are now
30 deep and human-reviewed, so **weighing is the only remaining shallow Debate area**. DECA stays
36 (4 × 9) and HOSA stays 180 (6 × 30), both untouched by this slice.

**Local commits only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Global G2 Slice 2 — Debate claim-warrant-impact is 30 deep, human-reviewed — local only AT THAT PHASE (since pushed and deployed)

**Slice 1 is deployed and human-reviewed** (`e23e982`, deployment `5861050099`, `Production`,
`success`), so rebuttal was already approved and live before this slice began.

Slice 2 expands **one** area: **claim-warrant-impact 9 → 30** (`cw-10`…`cw-30`, +21). Debate **57 → 78**.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **78** | **claim-warrant-impact 30** · rebuttal 30 · evidence-evaluation 9 · weighing 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Human content review is COMPLETE (2026-08-11).** The 21 CWI items were AI-authored and the
repository owner then personally read all of `cw-10`…`cw-30` in the final packet and approved their
answer defensibility, distractors, clarity, the CWI/rebuttal/evidence-evaluation/weighing boundaries,
claim/evidence/warrant/mechanism/impact terminology, causal-chain and chronology-vs-causation
accuracy, hidden-premise logic, warrant quality, evidence-to-claim bridging, intermediate-consequence
vs final-impact handling, claim scope and specificity, overlap and Module 2 fit. **The approved
content is exactly the content of implementation commit `45f3397`.** Also approved as judgment calls:
`cw-10`'s "every arrow needs support" means reasoning, not a separate citation per arrow;
`cw-12`/`cw-15`, `cw-16`/`cw-17`, `cw-18`/`cw-19`, `cw-23`/`cw-26`, `cw-26`/legacy `cw-03` and
`cw-29`/`cw-30` are distinct learner decisions; the `cw-20`/`cw-21`/`cw-22` progression is useful
rather than quantity theatre; and `cw-14` and `cw-15` remain argument analysis, distinct from `rb-18`
and `rb-19`. **The approval rests on that human reading alone; the Claude/AI pre-screen was the
authoring model checking its own output and constituted neither the review nor independent
verification.** AI-authoring provenance stays labelled in the source permanently. **The Slice 2 push
gate is lifted.**

- **Content + tests + docs only.** No schema, migration, seed, route, validator, client,
  session-protocol, XP or mastery change. Debate still writes `MasteryProgress` legitimately.
- **Inserted inside the CWI block**, after `cw-09` and before `// --- Rebuttal ---`. `cw-09` already
  carried its comma, so **no legacy punctuation changed**; at that slice `wg-09` was still the final array element and
  at that slice the terminal-comma append boundary was again **not** exercised. *(Historical: superseded — the Debate append boundary was exercised at G2 Slice 4; the bank now ends at `cl-30`.)*
- **Scope came from the curriculum, not from the existing nine** — Module 2 lessons 8, 9, 10, 15, 16:
  causal chains where every arrow needs support, missing logical links, argument mapping and
  load-bearing nodes, and contentions where several reasons converge on one shared impact.
- **Two areas authorized at that slice:** `EXPANDED_AREAS` went `["rebuttal"]` → `["rebuttal",
  "claim-warrant-impact"]`. `ev-10` and `wg-10` were then rejected as `unauthorised`, and the
  companion count assertion moved 3 → **2** so that loop cannot go vacuous.
- **`G0-7b` evolved into a 42-id guarantee** — additions must be exactly `rb-10`…`rb-30` **and**
  `cw-10`…`cw-30`, each declaring the area its slice claims, each passing the shared predicate, with
  **zero** `ev-*` or `wg-*` additions. It was widened by an exact set, never relaxed into "any
  recognised prefix above 09".
- **No legacy CWI fixture needed re-basing** — none depended on a 9-item CWI pool. The existing CWI
  bypass fixtures (raw 76 / evidence 20) slice a fixed head and are unchanged, as are `CWI[0]`,
  `CWI[5]`, `CWI.slice(0, 3)`, `CWI.slice(0, 5)` and `DRILL_BANK.slice(0, 8)`.
- **The observable G2 effect:** a focused 20-question CWI session now serves **20 distinct** items with
  no padding, and the padding branch is still proven at **40 served / exactly 30 distinct** — in both
  the drills and mastery suites, each paired with a live counter-example from a still-9-item area.

**Global M14 G2 was OPEN at that slice.** Deficit then **147 → 126**: Debate evidence-evaluation and weighing
(2 × 21) plus all four DECA areas (4 × 21). Corpus 273 → **294** locally; final target **420**.

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Global G2 Slice 1 — Debate rebuttal is 30 deep, human-reviewed — local only AT THAT PHASE (since pushed and deployed)

**Slice 0 is deployed** (`f1b5064`, deployment `5860557516`, `Production`, `success`), so both drill
banks were already under immutable additive protection before any question was authored.

Slice 1 expands **one** area: **rebuttal 9 → 30** (`rb-10`…`rb-30`, +21). Debate bank **36 → 57**.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **57** | claim-warrant-impact 9 · **rebuttal 30** · evidence-evaluation 9 · weighing 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Human content review is COMPLETE (2026-08-11).** The 21 rebuttal items were AI-authored and the
repository owner then personally read all of `rb-10`…`rb-30` and approved their answer defensibility,
distractor quality, clarity, the rebuttal/CWI/evidence-evaluation/weighing boundaries, strategic
accuracy, causal reasoning, the no-link vs link-turn vs impact-turn distinctions, double-turn logic,
indict vs turn, offense/defense framing, frontlining, counterexample scope, legacy and new-item
overlap, and curriculum fit. **The approved content is the final version, including refinement commit
`fbeec2c`** (`rb-14`, `rb-15`, `rb-16`, `rb-17`, `rb-18`, `rb-20`, `rb-25`, `rb-30`). Also approved as
judgment calls: the `rb-13`/`rb-16` overlap is reinforcement; the `rb-13`/`rb-17`/`rb-30` family tests
three distinct decisions; `rb-11`'s "even if" phrasing does not duplicate `rb-08`; `rb-24` and `rb-28`
remain rebuttal rather than weighing. **The approval rests on that human reading alone; the earlier AI
pre-screen was the authoring model checking its own output and formed no part of it.** AI-authoring
provenance stays labelled in the source permanently. **The Slice 1 push gate is lifted.**

- **Content-only for the bank; tests and docs otherwise.** No schema, migration, seed, route,
  validator, client, session-protocol, XP or mastery change. Debate still writes `MasteryProgress`
  legitimately — HOSA's review-only semantics were not imported.
- **Inserted inside the rebuttal block**, after `rb-09` and before `// --- Evidence evaluation ---`,
  so area grouping holds. `rb-09` already had its comma; **At that slice `wg-09` remained the final array element and
  is untouched, so the terminal-comma append boundary was not exercised by that slice.** *(Historical: superseded — the Debate append boundary was exercised at G2 Slice 4; the bank now ends at `cl-30`.)*
- **Only rebuttal was authorized at that slice.** `EXPANDED_AREAS` went `[]` → `["rebuttal"]`.
  `cw-10`, `ev-10` and `wg-10` were then rejected as `unauthorised` under default authorization *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)* — the control that proves
  Slice 1 did not pre-authorize the remaining three Debate slices.
- **`G0-7b` was replaced, not deleted.** It asserted "zero additions exist"; it now asserts the
  additions are **exactly `rb-10`…`rb-30`**, that there are exactly 21, that each declares the
  rebuttal area, and that each passes the shared `judgeAddition` predicate.
- **Four fixtures were re-based, not deleted.** Three padded-rebuttal fixtures plus a per-area
  precondition all assumed a 9-item pool. Each now pins its denominator to the **legacy nine**
  (`slice(0, 9)` = `rb-01`…`rb-09`, stable because additions append after them), so **67 still means
  "six of nine distinct"** rather than drifting to a new number. `uniqueTotal === 9` is now asserted
  explicitly so the denominator is no longer implicit.
- **The observable G2 effect:** a focused 20-question rebuttal session now serves **20 distinct**
  items with no padding. The padding branch is proven separately at **40 served / exactly 30
  distinct**, so growing the bank did not delete that coverage.

**Global M14 G2 was OPEN at that slice.** Remaining deficit then **168 → 147**: Debate
claim-warrant-impact, evidence-evaluation and weighing (3 × 21) plus all four DECA areas (4 × 21).
Corpus 252 → **273** locally, final target **420**.

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Global G2 Slice 0 — the Debate and DECA drill banks are protected, no content added

**No question content was added or changed in this slice.** `lib/debate-drills.ts` and
`lib/deca-drills.ts` have **zero diff**. This slice exists so that the eight remaining Global-G2
expansion slices are provably additive before any of the 168 questions is authored.

**HOSA is done and human-reviewed:** all six Medical Terminology areas are 30 deep,
`MEDTERM_BANK` = 180, every slice approved. **Global M14 G2 was still OPEN at that phase.**

| Bank | Total | Per-area | State |
|---|---|---|---|
| `lib/hosa-medterm.ts` | 180 | six areas × 30 | parity, human-reviewed, deployed |
| `lib/debate-drills.ts` | 36 | claim-warrant-impact 9 · rebuttal 9 · evidence-evaluation 9 · weighing 9 | **G2 outstanding** |
| `lib/deca-drills.ts` | 36 | performance-indicators 9 · business-reasoning 9 · customer-relations 9 · marketing-fundamentals 9 | **G2 outstanding** |

**Remaining deficit at that phase: 168 questions** — 8 areas × 21. Debate 36→120, DECA 36→120, final corpus
180 + 120 + 120 = **420**.

What Slice 0 established:

- **An immutable content baseline for both banks:** `PRE_G2_EXPANSION =
  "26149a3127c0bc7f3108c303f57d41a8dd9088c0"` — the deployed pre-expansion commit. Never
  HEAD-relative, never re-anchored. All 36 original items in each bank must stay byte-identical and
  in order against it.
- **Three self-healing `HEAD` guards were replaced, not deleted.** `hosa-medterm-evidence-smoke.ts`,
  `review-ladder-smoke.ts` and `debate-mastery-smoke.ts` each hashed a drill bank against `HEAD` —
  a check that fails while a change is uncommitted and passes the moment it commits, so it could
  never notice what a commit changed. Each is now a durable assertion that the bank's real,
  immutable-based protection exists.
- **Slice-by-slice authorization.** An immutable prefix→area registry (4 mappings per bank) is
  separate from the set of areas currently *authorized* to receive additions. **Slice 0 authorizes
  zero areas in both banks**, so at that phase a structurally valid future item like `rb-10` was
  rejected. G2 Slices 1-8 later authorised and expanded every area.
  Each later slice adds exactly one area, in the commit that adds its 21 items, after human review.
- **Exact per-area depth assertions** replaced the weak `length >= 32` and per-area `>= 6` floors, and
  were added to both mastery smokes — which is what audit G2's Verification line explicitly asks for.
- **Append-boundary prepared.** At that phase `wg-09` and `mk-09` ended their arrays without trailing
  commas, so the first addition necessarily added one. *(Historical: superseded — `wg-09` is no longer the final Debate array element; weighing was expanded in G2 Slice 4 and the bank now ends at `cl-30`.)* The comparison normalizes **one terminal comma only**, and
  control `G0-C1c` proves that same normalization still leaves a one-word content edit different.
- **Padding fixtures deliberately unchanged** — 20 requested → 9 distinct was Production truth at
  that phase. It is not now: every Debate and DECA area holds 30, so a 20-question focused session
  no longer pads.
  **Slice 1 re-bases them; it must not delete them.**

**No content review applies to Slice 0** — it adds no questions. Human content review is required
before each of the eight content slices is pushed.

**Next content slice AS RECORDED THEN: Debate rebuttal 9 → 30.** It shipped as G2 Slice 1;
rebuttal has held 30 since.

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Phase 2f — HOSA Medical Terminology reaches six-area parity, human-reviewed — local only AT THAT PHASE (since pushed and deployed)

Audit **G2**, sixth and last **HOSA** slice. **Pathophysiology 9 → 30** (`pp-10`…`pp-30`, +21); bank
total **159 → 180**. **All six HOSA Medical Terminology areas now hold 30.**

### ⚠ This is HOSA bank parity — it is NOT G2 closure

**G2 as originally audited was still OPEN at that phase.** The finding names three bank files
(`docs/M14_LEARNING_QUALITY_AUDIT.md:573`) and ~14 areas. Phases 2a–2f covered only the six HOSA
areas. Verified from source, outstanding at that phase (all of it closed by G2 Slices 1-8):

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 36 | claim-warrant-impact 9 · rebuttal 9 · evidence-evaluation 9 · weighing 9 |
| `lib/deca-drills.ts` | 36 | performance-indicators 9 · business-reasoning 9 · customer-relations 9 · marketing-fundamentals 9 |

**At that phase, eight Debate and DECA areas were still at 9 and still padded a 20-question request
to 20 slots over 9 distinct items** — exactly the P0 defect G2 was raised against — and there were
**no per-area depth assertions at all** for those two banks, so a green suite did not mean they were
covered. All of that was resolved by G2 Slices 1-8; **G2 CLOSED 2026-08-12** at 420/420.

### What Phase 2f changed

- **Content-only change** — no schema, migration, seed, route, session-protocol, validator, XP,
  mastery, review or client change. Debate and DECA bank content is untouched.
- **Boundary held from the pathophysiology side.** Every new item tests an abnormal process, a
  disease mechanism, or its consequence. None is a structure's location, a normal function, a
  word-part recall item, diagnostic instruction, treatment advice or clinical management.
- **The nine legacy items are definition-heavy; they stay unchanged, and the additions deliberately
  do not extend that pattern** or duplicate their nine topics.
- Coverage across six mechanism domains: inflammation and immune (5), cardiovascular (4),
  respiratory and acid–base (3), renal and fluid (3), cell and tissue response (4), perfusion and
  infection (2).
- **`pp-09` gained a trailing comma** because it stopped being the final array element. That is
  punctuation, not content: the integrity check now normalises one trailing comma on **both** sides,
  and control `31f-C1c` proves the normalisation still leaves a one-word content edit different, so
  it cannot mask one.
- **The padding fixture was re-based, not deleted.** No area holds 9 any more, so `11g` now requests
  **40 from a 30-item area** and asserts **40 served / exactly 30 distinct**. `buildMedTermSession`
  seeds its result with the entire shuffled pool before appending repeats, so that count is
  deterministic rather than probabilistic.
- **The allowlist controls were redesigned, not weakened.** No real area is unapproved any more, so
  the negatives are synthetic. All controls now run through **one shared predicate** — the same one
  the real additions are judged by — proving six legitimate prefix→area mappings are accepted, five
  synthetic ids are rejected, prefix/area mismatches are rejected in both directions, and an
  original-range id is never treated as an addition.
- **Dead branches removed.** The `expanded ? 30 : 9` ternary and the "unexpanded area stays
  byte-identical" else-branch became unreachable at parity; both were replaced with explicit
  final-parity assertions rather than left in place looking like protection.
- **A stale claim was corrected.** The evidence-smoke summary still described the Phase 2e
  physiology additions as pending human review, untrue since 2026-08-07. It is a `console.log`, not
  an assertion — nothing was failing, it was printing something false.

**Human content review is COMPLETE (2026-08-07).** The 21 pathophysiology items were AI-authored and
the repository owner then personally read all of `pp-10`…`pp-30` and approved their
pathophysiological accuracy, the anatomy/physiology/pathophysiology boundary, answer uniqueness,
distractors, causal wording, explanations, mechanism precision and legacy overlap. **The approved
version is the final one**, including the refinements in `d449434` and `bf311c8` — notably `pp-10`
(excessive/prolonged inflammation), `pp-17` (conditional cardiac output), `pp-18` (`fill OR pump`),
`pp-20` (respiratory acidosis), `pp-26` (apoptosis occurs in normal physiology **or** disease),
`pp-28` (chronic abnormal pressure overload) and `pp-30` (asymptomatic infection permitted). **The
approval rests on that human reading alone; the earlier AI pre-screen was the authoring model
checking its own output and formed no part of it.** Per `CLAUDE.md` the AI-authoring provenance stays
labelled in the source permanently. **The push gate is lifted.**

**All six HOSA Medical Terminology areas are now 30 deep AND human-reviewed.** That is the HOSA
portion of G2 finished — see the block above for why **global G2 was still open at that phase**.

**Weighting after 2f:** all six HOSA areas **16.67%** each (30 ÷ 180). True parity within the HOSA
bank. Correctness unaffected — breadth counts distinct areas, not proportions.

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Phase 2e — the HOSA physiology bank is 30 deep, human-reviewed — local only AT THAT PHASE (since pushed and deployed)

Audit **G2**, fifth slice. **Physiology 9 → 30** (`ph-10`…`ph-30`, +21); bank total **138 → 159**.
Word roots, prefixes, suffixes and anatomy stay at 30; **pathophysiology stays at 9** and is the last
area left. **Five of the six G2 areas are now at depth.**

- **Content-only change** — no schema, migration, seed, route, session-protocol, validator, XP,
  mastery, review or client change.
- **The Phase 2d boundary, applied from the physiology side.** Physiology's declared objective is
  "Normal function of structures and systems", so every NEW item tests a normal function, mechanism,
  process or regulatory response. **No new item asks for a structure's location** (that is anatomy),
  **a disease or a disease mechanism** (that is pathophysiology, reserved for Phase 2f), or a bare
  word-part/term definition (those are the three terminology areas). `ph-01`…`ph-09` are unchanged.
- **Deliberately absent: a third insulin/glucose item.** `ph-02` and `ph-08` already overlap there,
  and `pp-03` sits adjacent. Glucose appears in two new items only as a wrong distractor.
- Coverage across seven system domains: cardiovascular (4), respiratory (3), digestive (3), renal (3),
  nervous and muscular (4), endocrine (2), blood and hemostasis (2).
- **A focused 20-question physiology session now serves 20 distinct items** with no padding, and is
  still refused review on breadth alone. Padding survival moved to **pathophysiology**.
- **The additive allowlist gained one explicit entry** (`ph-*` → physiology), still anchored to the
  immutable `398860f`; the `31f-C2` rejected fixture moved `ph-10` → **`pp-10`** and the positive
  control moved `an-10` → `ph-10`. `ph-10` left the deliberately-rejected list; `pp-10` and `xx-10`
  stay rejected.
- **A stale claim in the evidence-smoke summary was corrected.** It still described the Phase 2d
  anatomy additions as awaiting human review, which stopped being true on 2026-08-07. That summary is
  a `console.log`, not an assertion, so nothing was failing — it was simply printing something false.
  No assertion or question content changed with it.

**Human content review is COMPLETE (2026-08-07).** The 21 physiology items were AI-authored and the
repository owner then personally read all of `ph-10`…`ph-30` and approved their physiological
accuracy, the physiology/anatomy/pathophysiology boundary, answer uniqueness, distractors, wording,
explanations, mechanism precision and suitability for CompeteReady — specifically approving the ten
refined items (`ph-10` ventricles, `ph-11` atrial spread, `ph-13` stroke volume, `ph-15`
partial-pressure gradient, `ph-16` healthy-at-rest scope, `ph-17` small-intestinal absorption with
lymphatic lipid transport, `ph-20` glomerular retention plus selective tubular handling, `ph-24`
chemical-synapse scope, `ph-25` independent autonomic descriptions, `ph-26` calcium–troponin), plus
the carried judgments that `ph-14` is physiology rather than anatomy and that the `ph-17`/`ph-19`
overlap is acceptable educational reinforcement. **The governing boundary remains recorded.** **The
approval rests on that human reading alone; the earlier AI pre-screen was the authoring model
checking its own output and formed no part of it.** Per `CLAUDE.md` the AI-authoring provenance stays
labelled in the source permanently. **The push gate is lifted.**

**Weighting after 2e:** word-roots / prefixes / suffixes / anatomy / physiology ~18.9% each;
pathophysiology ~5.7%. Correctness unaffected — breadth counts distinct areas, not proportions.

**G2 roadmap (corrected): 2f pathophysiology is the final HOSA slice — it is NOT the final G2
slice. Full six-area HOSA parity occurs after Phase 2f, but G2 as audited also covers four Debate
and four DECA areas that remained at 9 each at that phase.** *(Superseded: G2 Slices 1–8 took all
eight to 30; G2 CLOSED 2026-08-12 at 420/420.)*

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Phase 2d — the HOSA anatomy bank is 30 deep, human-reviewed — local only AT THAT PHASE (since pushed and deployed)

Audit **G2**, fourth slice. **Anatomy 9 → 30** (`an-10`…`an-30`, +21); bank total **117 → 138**.
Word roots, prefixes and suffixes stay at 30; physiology and pathophysiology stay at 9.

- **Content-only change** — no schema, migration, seed, route, session-protocol, validator, XP,
  mastery, review or client change.
- **Option A boundary, approved before authoring.** Anatomy's declared objective is "Structures and
  their locations", but four legacy items (`an-01`, `an-02`, `an-05`, `an-09`) are function-flavoured.
  Rather than follow that precedent, every NEW item tests a structure, location, region, cavity,
  plane, directional term or structural relationship. **No new item has a physiological function,
  process, disease or procedure as its answer** — that material is reserved for Phases 2e and 2f.
  The four legacy items were deliberately left unchanged.
- Coverage: directional terminology (superior, distal, anterior, medial, superficial), body cavities
  (cranial, pelvic, the diaphragm boundary), the sagittal plane, and named structures across the
  cardiac, skeletal, nervous, vascular, digestive, urinary and muscular systems.
- **A focused 20-question anatomy session now serves 20 distinct items** with no padding, and is
  still refused review on breadth alone. Padding survival moved to **physiology**.
- **The additive allowlist gained one explicit entry** (`an-*` → anatomy), still anchored to the
  immutable `398860f`; the `31f-C2` rejected fixture moved `an-10` → **`ph-10`** and the positive
  control moved `sf-10` → `an-10`.

**Human content review is COMPLETE (2026-08-07).** The 21 anatomy items were AI-authored and the
repository owner then personally read all of `an-10`…`an-30` and approved their anatomical accuracy,
the anatomy/physiology boundary, answer uniqueness, distractors, wording, explanations and
structural/location focus — specifically approving the refined `an-24` (cerebellum inferior and
posterior to the cerebrum, stated in anatomical position), `an-25` (`Carotid artery` as the complete
distractor name) and `an-30` (largest muscle scoped to **by mass**, with sartorius distinguished as
the longest), plus the carried `an-11`, `an-14` and `an-16` judgments. **Option A remains the
governing boundary.** **The approval rests on that human reading alone; the earlier AI pre-screen was
the authoring model checking its own output and formed no part of it.** Per `CLAUDE.md` the
AI-authoring provenance stays labelled in the source permanently. **The push gate is lifted.**

**Weighting after 2d:** word-roots / prefixes / suffixes / anatomy ~21.7% each; physiology and
pathophysiology ~6.5% each. Continues improving from the 40% peak at 2a. Correctness unaffected —
breadth counts distinct areas, not proportions.

**G2 roadmap: THREE slices remain after 2c — 2d anatomy (this one), 2e physiology, 2f
pathophysiology. Full six-area parity occurs after Phase 2f.**

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Phase 2c — the HOSA suffix bank is 30 deep, human-reviewed — local only AT THAT PHASE (since pushed and deployed)

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
parity after 2f (anatomy, physiology and pathophysiology all remained). Correctness unaffected — breadth counts distinct areas, not proportions.

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Phase 2b — the HOSA prefix bank is 30 deep, human-reviewed — local only AT THAT PHASE (since pushed and deployed)

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

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 Phase 2a — the HOSA word-root bank is 30 deep — local code only AT THAT PHASE (since pushed and deployed)

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

**Local commit only when written — not pushed, not deployed at that point. No database
operation.** (Since pushed and deployed.)

## M14 status AT THAT PHASE — Phases A and 1a–1d DEPLOYED; Phase 1e G19 then local (since pushed)

The five-commit M14 stack (`a054706` audit, `66e7dd6` 1a, `8a7a74f` 1b, `a29e506` 1c, `a37959c` 1d)
was pushed as a normal fast-forward and **deployed to Production** — GitHub deployment `5785864553`,
`Production`, `success`, tied to exact commit `a37959c1500c405d0302e769996d9f850020707e`, verified
read-only with public route checks (all 200/307-to-signin, zero 5xx; the live `/signup` page no
longer offers Public Speaking). **Authenticated Production behavior remains untested** — no learner
action, no judging, no XP/rank/wins/streak/completion, and no database operation was performed in
any verification pass.

**M14 Phase 1e (G19) was complete locally and unpushed when this was written; it has since been
pushed and deployed.** The Study Arcade's two fake-progress
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

## M13E2 — server-bound practice sessions: PUSHED AND DEPLOYED (2026-08-06 record)

**M13E2 is complete, pushed and deployed.** The eight-commit Phase C stack was pushed as a normal
fast-forward on 2026-08-06 and **Production ran `bb397350029975520e0b96c1c741e7f873f59086` at that
point.** That is a 2026-08-06 record, not a statement about what Production runs now: the live source
is `32f92a4bcc68ab3f027a5fe6e617f2d837273791` — see the CANONICAL LIVE STATE block at the top of this
file. Phase B (`npm run db:push` against the shared
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
- **`wins` and `streak` in the judge route were untouched *by that batch*.** They then
  read-modify-wrote from a pre-read, and `practice-session:smoke` controls 144–144c pinned that
  behaviour. **Superseded — current source truth:** `wins` was REMOVED from the judge route's user
  update by A3a (a formative ballot may not mint a competition win; historical values left as they
  stand), and A4a replaced the stale read-add-write on `streak` with an atomic
  `{ increment: 1 }`. See `app/api/debates/[debateId]/judge/route.ts`.
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

## Archived: M13E2 / M14-era snapshot (2026-08-06/07)

**Everything from here to the end of this file is a snapshot taken around the M14 Phase 1e commit.**
It is preserved as chronology, not as a readout. Its SHAs, deployment IDs, milestone table, "next
steps" and suite counts describe that moment and many of them are now false as statements about
today. **For current truth read the CANONICAL LIVE STATE block at the top of this file.** Do not
copy any SHA, deployment ID or next-step out of this region without re-deriving it.

## Repository state AT THAT SNAPSHOT — superseded, NOT current

- **Branch:** `main`
- **origin/main and remote `refs/heads/main` then:** `bb397350029975520e0b96c1c741e7f873f59086` —
  the M13E2 Phase C closeout commit, pushed 2026-08-06 and deployed to Production **at that time**.
  It is not the live SHA now; `origin/main` is `32f92a4bcc68ab3f027a5fe6e617f2d837273791`.
- **Local `HEAD` then:** the M14 Phase 1e (G19) commit, one ahead of `origin/main`, which sat at
  the deployed `a37959c` with the full A+1a–1d stack. That commit was pushed long ago.
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

## Milestone status AT THAT SNAPSHOT — superseded, NOT current

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
| M14 Phase A — learning quality audit | **Complete locally** (`a054706`, `docs/M14_LEARNING_QUALITY_AUDIT.md`). Unpushed **at that snapshot**; since pushed. |
| M14 Phase 1a — track-correct first run | Complete, pushed and deployed (`66e7dd6`). |
| M14 Phase 1b — withdrawn HOSA judging closed | Complete, pushed and deployed (`8a7a74f`). |
| M14 Phase 1c — DECA judging fails closed | Complete, pushed and deployed (`a29e506`). |
| M14 Phase 1d — fabricated Debate speaker cards removed | Complete, pushed and deployed (`a37959c`). |
| M14 Phase 1e — G19 Study Arcade honesty | **Complete locally** (this commit). Recording claims scoped to drills; decks/games labeled unrecorded. Unpushed **at that snapshot**; since pushed. |
| M14 Phase 2a — HOSA word-root bank depth | Complete, pushed and deployed. Word roots 9→30. AI-authored, human-reviewed and approved 2026-08-06. |
| M14 Phase 2b — HOSA prefix bank depth | Complete, pushed and deployed. Prefixes 9→30. AI-authored, human-reviewed and approved 2026-08-07. |
| M14 Phase 2c — HOSA suffix bank depth | Complete, pushed and deployed. Suffixes 9→30. AI-authored, human-reviewed and approved 2026-08-07. |
| M14 Phase 2d — HOSA anatomy bank depth | **Complete locally.** Anatomy 9→30, bank 117→138. AI-authored, **human-reviewed and approved 2026-08-07**. Pushed and deployed. |
| M14 Phase 2e — HOSA physiology bank depth | **Complete.** Physiology 9→30, bank 138→159. AI-authored, human-reviewed and approved 2026-08-07. Pushed and deployed. |
| M14 Phase 2f — HOSA pathophysiology bank depth | **Complete locally.** Pathophysiology 9→30, bank 159→180, six HOSA areas at 30. AI-authored, **human-reviewed and approved 2026-08-07**. Ready to push **at that snapshot** — since pushed and deployed. |
| M14 Global G2 Slice 1 — Debate rebuttal depth | **Complete.** Rebuttal 9→30, bank 36→57. AI-authored, human-reviewed and approved 2026-08-11. Pushed and deployed (`e23e982`). |
| M14 Global G2 Slice 2 — Debate CWI depth | **Complete.** Claim-warrant-impact 9→30, bank 57→78. AI-authored, human-reviewed and approved 2026-08-11. Pushed and deployed (`45f3397`, live at `46ab46b`). |
| M14 Global G2 Slice 3 — Debate evidence depth | **Complete.** Evidence-evaluation 9→30, bank 78→99, three of four Debate areas at 30. AI-authored, **human-reviewed and approved 2026-08-11**; `ev-27` replaced before approval (`ef55134` + `89497a3`) to stay inside the curriculum. Pushed and deployed (`61b19de`). |
| M14 Global G2 Slice 4 — Debate weighing depth | **Complete locally.** Weighing 9→30, bank 99→120, **all four Debate areas at 30 — Debate depth COMPLETE and human-reviewed.** First slice to exercise the `wg-09` terminal-comma append boundary; all four areas now authorized. AI-authored, **human-reviewed and approved 2026-08-11**; `wg-24` refined before approval (`9c20282` + `a250e40`) to remove a magnitude/probability ambiguity. Push gate lifted; ready to push **at that snapshot** — since pushed and deployed. |
| M14 Global G2 Slice 5 / DECA Slice 1 — DECA PI depth | **Complete locally.** Performance-indicators 9→30, DECA bank 36→57. First DECA area authorized; depth tests and a shallow control ADDED to both DECA suites (neither had any). No legacy punctuation changed — `mk-09` boundary still unexercised **at that snapshot** (Slice 8 later exercised it). AI-authored, **human-reviewed and approved 2026-08-12**; `pi-19` and `pi-30` refined before approval (`b72cba2` + `1340cdb`) to make the listed indicator load-bearing, `pi-28` approved without rewrite as a reviewed PI/BR boundary case. Push gate lifted; ready to push **at that snapshot** — since pushed and deployed. |
| M14 Global G2 Slice 6 / DECA Slice 2 — DECA BR depth | **Complete locally.** Business-reasoning 9→30, DECA bank 57→78. Second DECA area authorized; shallow control MOVED business-reasoning → marketing-fundamentals in both suites (chosen over CR because Slice 7 expands CR, so it moves once not twice). No legacy punctuation changed — `mk-09` boundary still unexercised **at that snapshot** (Slice 8 later exercised it). AI-authored, **human-reviewed and approved 2026-08-12**; `br-16` refined before approval (`40a473b` + `7fd6798`) to put the go-live timing in the stem, and `br-19`/`br-27`/`br-29` approved without rewrite as reviewed notes. Push gate lifted; ready to push **at that snapshot** — since pushed and deployed. |
| **G2 (audit finding) — overall** | **CLOSED 2026-08-12** by explicit project-owner decision — final depth **420/420**, bank-count deficit **0**. See the M14 GLOBAL G2 closure section above. *Historical record of this row, true when written and superseded by the closure:* Debate depth was complete at 4 × 30 and deployed, DECA performance-indicators was 30 and human-reviewed, Slice 6 took business-reasoning to 30 locally, and G2 was then open with a deficit of **42** (2 × 21 DECA) because customer-relations and marketing-fundamentals were still at 9. The distinctions that row drew still hold as reasoning: `PI depth complete` is NOT `DECA depth complete`, and `Debate depth complete` is NOT `Global M14 G2 complete`. |
| Legacy `pi-07` / curriculum B-2 | **OPEN DEBT — not resolved.** `pi-07` keys explicit PI signposting as recommended; Module 1 lesson 3 ⟨B-2⟩ teaches that speaking a PI title aloud vs weaving it in is a genuinely contested judgment call. Slice 5 leaves `pi-07` immutable, does not reinforce it, and authors no contradictory content. Separate curriculum debt for later resolution. |
| M14 Phase 1e — G20 DECA skill activation | **Authorized, executed, verified (2026-08-06).** 0 created / 3 already present / 0 conflicts — the rows pre-existed with exact approved fields; all four DECA areas resolve and record. |
| M4 — HOSA replacement scenario | **Still blocked.** Needs an approved scenario and the applicable clinical/legal or advisor review. Until then the lesson's interactive practice stays unavailable. |

## Shipped behavior AT THAT SNAPSHOT (as implemented locally then)

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
- **32 registered `*:smoke` suites at that snapshot; 29 safe/read-only suites were run and all 29
  passed.** There are **36** registered now and the safe battery is **32** — see `docs/HANDOFF.md`.
- **`auth:smoke`, `team:smoke` and `assignment:smoke` write to the shared Production database. They
  were NOT run in this pass and are NOT claimed to pass.**
- `judge-shape:smoke` makes a live provider call and exits 0 with a console warning when no provider
  responds — it was run on its own and its output read, not through a stdout-discarding loop.
- Focused harnesses from earlier milestones (M8A, M8B, M9 SSR; M10 navigation/accessibility; M11R2
  through M11R12) live in the session scratchpad, not in the repository.

## Browser and mobile validation AT THAT SNAPSHOT (2026-08-06)

Verified by serving each surface's emitted SSR markup with the app's own compiled CSS over a local HTTP
server, because the browser-preview helper cannot launch from `~/Documents`. Checked at 375×812,
390×844 and 1280×900: no horizontal overflow, 44px recovery targets on the HOSA hub, coherent heading
order, and — with **real keyboard Tab** — `:focus-visible` matching plus a non-zero project focus ring on
navigator result buttons, including a selected button and in colorblind mode.

**This is not the live authenticated route.** No middleware, session, data fetching or click-through of
real navigation was exercised. No screen-reader certification and no full keyboard journey was performed.
**The converted practice flow has not been exercised against a live authenticated session** in any
environment — its guarantees are established by code and by deterministic suites, not by a learner run.

## Known gates and unresolved items AT THAT SNAPSHOT

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

## Remote and deployment status AT THAT SNAPSHOT — superseded, NOT current

**At that snapshot,** `origin/main` and the remote `refs/heads/main` were both
`bb397350029975520e0b96c1c741e7f873f59086` — the M13E2 Phase C closeout — and that was what
Production ran then. The two M14 commits (the Phase A audit and Phase 1a) were local only.
**None of that is current:** `origin/main` is now
`32f92a4bcc68ab3f027a5fe6e617f2d837273791`, Production carries the B2.2 feature source
`65c4e6f442d00296fe0a8f8e7902cfd627c02080` (deployment `6098166145`) and the B2.2 docs source
(deployment `6160459725`).

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

## Next operational steps AT THAT SNAPSHOT — COMPLETED or SUPERSEDED, NOT current

**Steps 1–4 are done** (the Phase 1e G19 commit was pushed and verified; the M14 roadmap ran to
completion through Phase 2f and G2 Slices 0–8, and **G2 CLOSED 2026-08-12**). Step 5 (authenticated
verification of the practice flow) and step 6 (`initialScenario` removal) remain genuinely
outstanding. **The current next action is the canonical-docs rot sweep, then B2.3 (`wg-08`)** — see
the CANONICAL LIVE STATE block at the top of this file.

*The list as written then:*

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

- **At that snapshot: Phases A and 1a–1d were live** (deployment `5785864553` at `a37959c`) and the
  G19 copy fix was **not** — it was a local commit only. It has since been pushed and deployed.
  **Authenticated Production behavior of the M14 changes was untested then and, as of this sweep,
  still has not been exercised with a live authenticated session.** The G20 activation ran with explicit authorization on
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
