# CURRENT HANDOFF — AUTHORITATIVE

_Last updated: 2026-08-30._

**This region is the only operational part of this file.** Everything below the
`PREVIOUS HANDOFF ARCHIVE` boundary is preserved historical handoff material: non-normative,
non-executable, and not a description of current state. Rewrite this region in place; append history
below the boundary.

## What is complete

- **B2.2 — FULLY CLOSED and Production-verified.** Three commits, and the ORDER is the point:
  `f7e7cf307e891ed1089f9f4e5a9a1d2ef65e1c8b` (teach) → `a66d46cb33e509e7d4985944e56f98af9b0fdbe8`
  (protect the measurement) → `65c4e6f442d00296fe0a8f8e7902cfd627c02080` (release). Production
  deployment **`6098166145`**, SUCCESS, its own sha field equal to the release SHA exactly. The docs
  truth-sync `32f92a4bcc68ab3f027a5fe6e617f2d837273791` deployed at **`6160459725`**.
- **B2.3 — CLOSED and Production-verified.** Two commits, and the ORDER is the point:
  `44afae3d9629aafa6ed298df9c8a03dfe731976a` (teach the weighing standard) →
  `7d2aa83c7420cf654676964ab57ba5b46970b597` (release `wg-08`; the Debate held set is now empty).
  Production deployment **`6170342196`**, SUCCESS, its own sha field equal to the release SHA exactly.
  The teaching commit carried no deployment of its own — the build came from the reactivation tip
  above it. `wg-08` is **RELEASED IN PRODUCTION**. Do not re-push, re-audit or re-test it.
- **GATE A — CLOSED.** The canonical-docs structural-quarantine commit was accepted, pushed by the
  owner and exact-source verified in Production, health PASS. Do not re-push or re-audit it.
- **GATE B — CLOSED.** The stale deployment-status comment on `DEBATE_TURN_MECHANICS_LESSON` in
  `lib/education/tracks/debate.ts` was repaired in its own source-truth commit, accepted, pushed and
  verified. That file no longer carries any deployment-status claim. Do not re-repair it.
- `rb-14` and `rb-15` are **RELEASED** and individually eligible.
- **M14 Global G2 CLOSED** (2026-08-12) at **420/420 within the M14 G2 target scope**, G2 deficit 0.
  That scope is the fourteen audited areas at 30 each — Debate's four original areas, DECA's four and
  HOSA's six (120 + 120 + 180 = 420). **The live corpus is 450**: those 420 plus the 30 `clash` items
  from the Clash closure, which was never a G2 slice. Do not read 420 as the corpus size. **A4
  CLOSED.** Waves 1A/1B/1C, the Clash measurable-practice closure, M15 Slices 1–3, P0.1/B1, B2.1 and
  B2.2 all SHIPPED and Production-verified.

## What remains open

- **DECA empty-pool twin.** `buildDecaDrillSession` has no zero-eligible guard; the Debate half
  shipped in `a66d46cb`. Do not record the empty-pool issue as closed — only the Debate half is.
- **Signposting and Constructive Speeches** drill-and-evidence connectivity — the only two unresolved
  Debate connectivity gaps.
- Later speeches, flowing, round strategy, crystallization, delivery, questioning/cross-ex.
- The R17 test-diagnostics debt (owner-ruled NON-BLOCKING); the inherited "seven lessons"-era source
  comments; moving-HEAD debt 18; `/debates/history`; the stale Reassess CTA; the skills-compat XP
  prose; the duplicate historical `36d` labels. Not all of S1B is closed.
- Authenticated Production behaviour of the practice-session flow has never been exercised anywhere.

## Current mandatory gates

**Gates A, B and C are all CLOSED.** None of them needs redoing.

**GATE C — CLOSED.** Canonical routing / temporal truth. The read-only audit of the
`CLAUDE.md` → `docs/CONTEXT_INDEX.md` → `docs/NEXT_TASK.md` chain found four real defects, which this
repair addresses: `docs/NEXT_TASK.md` asserted a stale active milestone (a DECA rubric-sourcing task
predating the whole education program) and mandated `judge-shape:smoke`, a prohibited suite; no
precedence rule existed between the canonical documents and the task pointer; this handoff was
demoted to conditional reading while it carries the STOP conditions and the no-env suite membership;
and closing Gates A and B left present-tense falsehoods about them in both canonical documents. The
audit also found a second routing surface with the same defect — `.claude/commands/context-refresh.md`,
`.claude/commands/implement-one-task.md` and `.claude/agents/lead-engineer.md` — which this repair
covers. It repairs a fourth file there, `.claude/commands/milestone-handoff.md`, for a different
defect: its step 1 said to rewrite `docs/CURRENT_STATE.md` whole, which after the Gate A restructure
would destroy the frozen archive. **That file now carries an archive invariant, and it binds every
future milestone close-out:** never rewrite either canonical file whole, never modify or remove
existing archive content, append new history only after it, and verify the parent's archive slice
survives as an unmodified prefix. The other seven files under `.claude/commands/` and
`.claude/agents/` are unchanged by this repair.

**That condition is now satisfied.** The canonical-routing / temporal-truth repair was accepted,
pushed by the owner and exact-source verified in Production, so Gate C is closed and all three
pre-B2.3 integrity gates are closed. B2.3 teaching has been implemented on that basis.

**B2.3 — CLOSED, and there is no remaining B2.3 gate.** The governing rule is unchanged and still
stated durably: `wg-08` counts as Production-released only once the commit carrying the reactivation
has passed release acceptance, been pushed by the owner, and had its exact source SHA verified in
Production. **All three are satisfied**, at source `7d2aa83c7420cf654676964ab57ba5b46970b597` and
deployment **`6170342196`**, whose own source-SHA field equals that commit exactly. Recorded as a
verified event, not as a current-deployment claim, so a later deployment cannot stale it.

**Exact-source Production deployment: VERIFIED. Public Production health: PASS (credential-free
probes, zero unexpected 5xx). Alias-to-deployment binding: NOT INDEPENDENTLY VERIFIED** — the
deployment-specific host is behind deployment protection and answers identically for a real and a
fabricated build id, and the release commit touches no file under `app/`, `components/`, `public/` or
`styles/`, so content correlation could not discriminate. No repository rule requires alias binding;
this disclosure is not a reason to reopen B2.3, and alias binding must never be described as verified.

## Current invariants

- **The held set is exactly 1, and it is DECA's.** The Debate held set is **empty**: B2.3 taught the
  early-stated weighing-standard mechanism `wg-08` measures, then released the item in its own
  separate commit, now Production-verified. DECA `pi-26` remains HELD (UNTAUGHT + source-gated; B2.4 target). `wg-29` is FAIR
  TRANSFER / SERVING — never collapse it with `wg-08`.
- **ELIGIBILITY IS NOT SESSION CAPACITY.** Global individual eligibility: Debate **150/150** (rebuttal
  **30/30**, weighing 30/30), DECA **119/120** (PI 29/30). Clean-history distinct session capacity:
  Debate **149**, rebuttal **29**. **Releasing `wg-08` moved Debate capacity from 148 to 149, never to
  150** — the `rb-14`/`rb-15` pair still displaces one item from every session. If a test expects 29
  for rebuttal and you are about to "fix" it to 30: don't.
- **The pair measurement control is ACTIVE in Production and must stay executable.** Four parts:
  (1) same-session mutual exclusion applied POOL-LEVEL inside `buildDrillSessionFrom` before the
  shuffle — never result-level, never conditional on `areas`, never undone by requested-count
  pressure, keeper chosen at random; (2) retained-exposure sibling exclusion derived at the single
  issuing route (`app/api/debate/drills/session/route.ts`) via `siblingExclusionsFor`; (3) the
  independent adjudication anchor `scripts/debate-pair-adjudications.json`, read as EXPECTED and
  compared against the runtime constant as ACTUAL; (4) release coupling that fails by name if an id
  is servable while the control is missing. A mutation audit proved four different mis-wirings of (1)
  pass every suite unless the tests drive the injectable seam — that is why `buildDrillSessionFrom`
  exists.
- **Exposure means ISSUED / RENDERED, never answered.** `retainedExposureWhere` carries no
  answered/graded predicate; the check is structural, not text-based. Do not reintroduce an
  answered-only condition. The protection is bounded by retained history — **not** "once-ever".
- **Assessment bytes stay frozen.** All 270 items byte-identical to the accepted B1 state, protected
  by `scripts/debate-drill-bank-baseline.json` and `scripts/deca-drill-bank-baseline.json`.
- **Connectivity, stated precisely:** `debate-clash` CONNECTIVITY CLOSED; `debate-signposting` and
  `debate-constructive-speeches` UNRESOLVED CONNECTIVITY GAPS; `debate-round-orientation`
  INTENTIONALLY carries neither `skillSlug` nor `practiceDrill` so it can never mint mastery, and is
  NOT a connectivity gap. Never write "only Signposting and Constructive have neither".
- **Connected durable loops — exactly FIVE:** Claim-Warrant-Impact (embedded), Evidence Evaluation,
  Clash, Refutation, Weighing.
- **Never open `.env` or `.env.local`, never read `DATABASE_URL`, never use Production database
  credentials, never record a secret.** Never push, deploy, or install dependencies without explicit
  owner action.
- **Never run these, sorted by why they are unsafe.** The list and the safe procedure below must never
  contradict each other:
  - *Shared-state / database writers* — `auth:smoke`, `team:smoke` and `assignment:smoke` connect to
    and write the shared Production database. So do the activation and seed commands:
    `deca:skills:activate` (`scripts/seed-deca-drill-skills.ts`), `debate:clash:activate`
    (`scripts/seed-debate-clash-skill.ts` — a real `prisma.skill.create` behind `--apply`),
    `specs:seed`, `db:seed`, `db:push` and `db:migrate`. Activation is owner-only and never automatic.
  - *Credential / provider-dependent* — `judge-shape:smoke` reads `.env.local` and `.env` and makes a
    live provider call. It is excluded from the safe battery for that reason and must not be run in
    an audit, even though it is neither a database writer nor an activation command.
  - *Env-file readers* — `avatar:smoke` loads `.env.local` and `.env` directly
    (`scripts/avatar-smoke.ts:11-24`), and fourteen further suites read `<repo>/.env` transitively
    through `@prisma/client` without mentioning it in their own source. **None of the fifteen was
    observed to make a live provider call or a database write in the runs measured here** — but
    distinguish CODE CAPABILITY from OBSERVED EXECUTION EFFECT. `judge:smoke` carries
    provider-capable application code in its execution closure: `scripts/judge-quality-smoke.ts`
    imports `generateOpponentResponse` and `judgeDebate` from `lib/ai`. **No mechanism is claimed
    here for why the reviewed run made no live call.** Provider dispatch is decided by the
    provider-selection logic in `lib/ai-providers.ts`, which turns on `AI_COST_MODE` and on which
    provider credentials are present — not on `NODE_ENV`, which nothing in that closure reads, and
    not on the absence of any single key. All that is established is the observed effect: the
    reviewed execution produced zero outbound provider calls. **This is not evidence that dispatch
    was structurally impossible.** The standing audit rule is that an audit must not read `.env` at
    all, so **none of these 15 may be run during an education/docs integrity audit.** They remain
    members of the project
    release-safe battery. The complete membership is listed under *Current safe validation commands*.
- **B2 must NOT simply unhold ids.** The per-item sequence is TEACH → verify reachability →
  closed-corpus assessment → re-review item validity against the final lesson bytes → remove the hold
  only when a beginner can reasonably solve the item from CompeteReady instruction → rerun the
  serving/mastery safeguards.
- **STANDING PROCESS RULE.** Any commit changing learner-visible item state (HELD / ACTIVE / RELEASED
  / SERVABLE) must run a present-tense truth sweep across source, tests, governance comments, report
  banners and this documentation before acceptance. **Classify claims by temporal meaning, not by the
  section they sit in** — an ordinary heading like "Previous handoff" does NOT sanitise present-tense
  prose. The archive boundary below is different in kind: it is an explicit semantic wrapper that
  represents the enclosed region as historical record whose commands and present-tense statements are
  not normative today. **Sweep per claim, across the union of both canonical documents, never per
  file.**

## Current safe validation commands

**Audit safety follows the COMPLETE EXECUTION PATH, not the entry file.** A suite whose own source
never mentions `.env` still reads it if anything in its transitive closure does. Two classifications
were made from top-level source text and both were wrong; do not repeat that method.

**The mechanism, proven rather than assumed.** Merely *loading*
`node_modules/.prisma/client/index.js` executes `warnEnvConflicts({ schemaEnvPath })` at module
scope, which dotenv-reads `<repo>/.env`. Constructing a `PrismaClient` triggers a second read. So
**any module reaching `@prisma/client` as a value is a carrier** — not only `lib/prisma.ts`.
`lib/api.ts` imports `{ Prisma }` for its `instanceof` checks and is an independent carrier;
`debate-drills:smoke` is tainted through it and never touches `lib/prisma`. Prisma's path targets
`.env` only (`rootEnvPath` is null); `.env.local` is read only by the five suites with their own
`loadEnv` helper and by the Next tooling.

**Four counts. Never collapse them.**

- **REGISTERED = 36** — every `*:smoke` script in `package.json`.
- **PROJECT RELEASE-SAFE BATTERY = 32** — registered minus `auth`, `team`, `assignment`
  (shared-Production database writers) and `judge-shape` (env reader + live provider). This is the
  long-standing release gate. **It is NOT credential-free: 15 of its members read `<repo>/.env`.**
- **NO-ENV AUDIT SMOKE SET = 17** — the only suites proven to make zero env-file read attempts. Run
  exactly these during an education/docs integrity audit: `assessment-quality`, `audio-debate`,
  `clash-activation`, `debate-side-coach`, `deca-drills`, `deca-navigator`, `deca-rubric`,
  `education-migration`, `education-registry`, `games`, `hosa-navigator`,
  `learning-content-integrity`, `learning-path`, `lesson-progress`, `nav-a11y`, `side-coach`,
  `source-freshness`. **The name describes ENV behaviour and nothing else.** It is NOT a
  no-provider-capability set: `side-coach`, `debate-side-coach` and `deca-rubric` all reach
  `lib/side-coach.ts:9`, which value-imports `runProviderCompletion` from `lib/ai-providers`, so
  provider-capable code sits in three of the seventeen closures. Their provider safety comes from
  fail-closed execution control and observed zero outbound calls — never from capability absence.
- **ENV READERS = 19.** Five read env files directly (`auth`, `team`, `assignment`, `judge-shape`,
  `avatar`). Fourteen are transitively tainted and look completely clean at the top of the file:
  `coach-evidence`, `debate-drills`, `debate-mastery`, `debate-replay`, `deca-mastery`,
  `hosa-medterm-evidence`, `hosa-practice-scope`, `judge`, `practice-session`, `review-ladder`,
  `rubric-scoring`, `security`, `skills-compat`, `tracks`.

**Risk classes are separate from env reach.** `judge-shape:smoke` also makes a live provider call.
`auth`/`team`/`assignment` also perform real `prisma.user.create` / `deleteMany` writes against the
shared Production database. `avatar:smoke` reads env files and does nothing else unsafe — barred from
audits for the env read alone. The activation and seed commands (`deca:skills:activate`,
`debate:clash:activate`, `specs:seed`, `db:seed`, `db:push`, `db:migrate`) are shared-state writers
and are **not** members of the 36 registered smoke suites; suite membership and global prohibitions
are different concepts.

**Non-smoke commands, classified the same way.** `npx tsc --noEmit` and
`npm run learning-content-integrity:smoke` are PROVEN NO-ENV. `npm run build`, `npm run lint`,
`npm run validate`, `npm run dev` and `npm run start` all PROVENLY READ ENV — `@next/env` loads
`.env` and `.env.local` by design, and `prisma generate` adds its own reads. **The repository's
normal production-build path under the current toolchain is therefore NOT no-env audit-safe**:
fail-closed execution observed attempted `.env` and `.env.local` reads. That is what the current
toolchain does; it is not a claim that no isolated future build arrangement could avoid env files,
which would need its own proof. Production build remains a required RELEASE validation.

**How these numbers were established, and what the method cannot prove.** Static transitive analysis
plus a fail-closed runtime guard that throws before any env-file content is returned, run over every
suite except the five prohibited ones, which were classified statically. Three limitations must stay
attached to any claim made from this method:

1. **A guard that breaks the process fabricates a clean result.** One guarded `next lint` run reported
   zero reads only because the guard had clobbered `realpathSync.native` and crashed the command
   before env loading. Always confirm the guarded command actually ran to completion.
2. **PASS is not a signal.** Prisma swallows the blocked read, so all 14 transitively tainted suites
   exit 0 and print their success banners with `.env` blocked. Only the guard's attempt log is
   evidence.
3. **Static analysis alone fails in both directions** — it under-taints when the unsafe dependency
   path is reached only through dynamic `await import(...)` or `require(...)`, and over-taints
   through `import type`, which is erased at runtime, and through string literals that
   static-analysis smokes merely assert about. No count is given here on purpose: how many suites
   fall on each side depends on exactly how the category is defined, and an unreproducible number
   would be worse than none. The security invariant needs the mechanism, not a tally.

**Two earlier credential-free claims are RETRACTED.** A "32/32 credential-free" run was reported: it
included `avatar:smoke` and 14 transitive readers. A "31/31 credential-free, .env reads ZERO" run was
then reported: it excluded only `avatar:smoke` and still included all 14. **Both runs happened and
both passed functionally; neither was credential-free** — and a functional PASS never proves anything
about env access. Only a 17/17 no-env run under a fail-closed guard, with the guarded commands
confirmed to have completed, supports that claim.

**Three env-access facts, stated separately.** (1) **Repository env-file access during RELEASE
validation: YES** — the normal production build and the 32-suite release-safe battery include
processes proven to load `.env` and `.env.local`; loading a file is reading it. (2) **Env-file read
attempts during STRICT NO-ENV AUDIT validation: ZERO.** *Measured in the COMBINED ENV + NETWORK
GUARDED RUN — the execution evidence behind the current strict-audit claim:* `npx tsc --noEmit`
**completed / zero env attempts / zero outbound network attempts**, and the 17-suite set
**17/17 completed / zero env attempts / zero outbound network attempts / zero successful external
provider calls / zero prohibited writes**, all 17 having printed their own success banners. An
EARLIER ENV-ONLY GUARDED RUN exists in the security investigation that produced this model; it
measured env attempts only and never measured network, so do not cite it for the network figures.
State both halves together: a zero-attempt count means nothing unless the guarded command genuinely
completed (limitation 1), and a PASS is never by itself evidence of zero env reads (limitation 2).
This is EXECUTION EVIDENCE from that run, not a timeless repository invariant — set membership is
repository-derived, the clean result is not. (3) **Intentional inspection of env-file contents
by an auditor: NONE** — *the subject here is the auditor, never a process.* No auditor intentionally
opened or inspected an env file, printed, copied, parsed or recorded its contents, or exposed them,
and no secret value appears in these documents, in any commit, or in any report. Processes did load
env files during release validation; fact 3 does not retract fact 1. Never compress these three into
a single "zero env reads".

### The audit workflow — the only commands an education/docs integrity audit may run

**Provider safety must be enforced at execution time, not inferred from imports.** A future strict
audit must run the 17 under BOTH a fail-closed env-file-read guard AND a fail-closed
outbound-network guard that blocks external provider traffic before it is sent, plus the standing
prohibited-write invariant defined immediately below. Do not rely on `OPENAI_API_KEY` being absent, on `NODE_ENV`, on
`AI_COST_MODE`, or on any current provider configuration as the safety mechanism — those can change
without the suite list changing, and three members of the 17 carry provider-capable code. Any
positive control for the network guard must use a harmless local or synthetic target, never a real
provider.

**The prohibited-write invariant, stated exactly — there is NO runtime write guard.** Strict
education/docs audit execution must perform no Production or shared-state database write, no
activation write, and no seed, migration or `db push` operation. That is enforced by two things, and
neither is a runtime interceptor: (A) **command admission** — every known writer is excluded from
strict audit execution by name (`auth`, `team`, `assignment`; `deca:skills:activate`,
`debate:clash:activate`, `specs:seed`, `db:seed`, `db:push`, `db:migrate`), and none of the 17 loads
`@prisma/client`, which is why they record zero env attempts in the first place; and (B) **observed
run effect** — the combined-guard run recorded zero prohibited writes, with the worktree clean before
and after. Do not describe (B) as proof that a write was impossible, and do not call either a
"guard": the env and network controls are fail-closed interceptors, the write control is admission
plus observation.

```bash
npx tsc --noEmit
```

Then the 17-suite NO-ENV AUDIT SMOKE SET. The list is explicit on purpose: it cannot be derived from
`package.json` alone, because env reach is a property of each suite's transitive closure, not of its
name. Re-derive it only by re-running the transitive + fail-closed classification.

```bash
for s in assessment-quality audio-debate clash-activation debate-side-coach deca-drills deca-navigator deca-rubric education-migration education-registry games hosa-navigator learning-content-integrity learning-path lesson-progress nav-a11y side-coach source-freshness; do printf "%-34s " "$s:smoke"; npm run "$s:smoke" >/dev/null 2>&1 && echo PASS || echo FAIL; done
```

Expect 17 of 17. **Do not add a suite to this list without re-proving it under a fail-closed guard**,
and remember that a passing run proves nothing about env reads on its own.

### The release workflow — required before shipping, NOT credential-free

```bash
npm run build
```

Never build while a dev server holds `.next` — check with `lsof -ti:3000` first. **`npm run build`
reads `.env` and `.env.local` under the current toolchain**, so it belongs to release validation and
must never be described as part of a credential-free audit. The same applies to `npm run lint`,
`npm run validate`, `npm run dev` and `npm run start`.

The 32-suite project release-safe battery is the release gate:

```bash
for s in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(n=>n.endsWith(":smoke")).filter(n=>!["auth:smoke","team:smoke","assignment:smoke","judge-shape:smoke"].includes(n)).join(" "))'); do printf "%-34s " "$s"; npm run "$s" >/dev/null 2>&1 && echo PASS || echo FAIL; done
```

**Never call its result credential-free** — 15 of its 32 members read `<repo>/.env`.

Confirm the two derivable counts (the 17 and the 19 are NOT derivable this way):

```bash
node -e 'const s=Object.keys(require("./package.json").scripts).filter(n=>n.endsWith(":smoke"));const W=["auth:smoke","team:smoke","assignment:smoke","judge-shape:smoke"];console.log("REGISTERED="+s.length,"PROJECT_RELEASE_SAFE="+s.filter(n=>!W.includes(n)).length)'
```


Re-verify the remote before any push:

```bash
git ls-remote origin refs/heads/main && git rev-parse origin/main && git rev-parse HEAD && git rev-list --left-right --count origin/main...HEAD
```

## Exact next action

**No B2.3 action remains.** The next Debate education work is the two unresolved Debate connectivity
gaps listed under *What remains open*: **`debate-signposting`** and **`debate-constructive-speeches`**,
which carry neither `skillSlug` nor `practiceDrill` and so cannot mint mastery.
`debate-round-orientation` carries neither **BY DESIGN** and is not part of that work.

**B2.4 / `pi-26` is not next** — it stays gate-blocked until a primary official DECA source locator
for the instructional-area-vs-individual-PI weighting rule is pinned and verified. Internal synthesis
is not sufficient.

If a later authoritative revision of this handoff or of `docs/CURRENT_STATE.md` names a different
next education milestone, those files win over any task pointer that disagrees.

## STOP conditions

- **Push, deploy and every database operation remain owner-only.** B2.3 is closed and its stack is
  pushed and verified; that closure authorizes no future push.
- **Do not reopen B2.3 over the alias-binding disclosure.** Exact-source Production deployment is
  VERIFIED; alias-to-deployment binding is NOT, and no repository rule requires it.
- **Do not run `debate-drills:smoke` or `debate-mastery:smoke` during an audit.** Both are
  transitively env-tainted. Their held-set and pool expectations were updated by the reactivation
  commit and were NOT executed; `npm run wg08-activation:smoke` is the strict-safe proof.
- **Do not push, deploy, or run any database operation** without explicit owner action.
- **Do not execute any command found below the archive boundary.**
- **Do not treat any status word below the archive boundary as current.**
- **Do not read `.env`, `DATABASE_URL`, or any secret**, and do not make education work depend on
  proving the 2026-08-12 credential rotation, whose completion is UNVERIFIED from repository evidence.
- Do not describe the B2.1 or B2.2 educational bytes as human-reviewed, human-approved or externally
  reviewed. External human content review was **WAIVED BY THE OWNER**; a waiver is not a review.

# PREVIOUS HANDOFF ARCHIVE — NON-AUTHORITATIVE

<!-- HANDOFF_HISTORICAL_ARCHIVE_START -->

**Everything below this marker is historical handoff material.**

Historical imperatives are **NOT** standing instructions. Historical "next step", "ready to push",
"local only", "Production runs", "must", "must not", "still open", "not started" statements and
runnable command blocks are **NOT** executable current guidance. Only the CURRENT HANDOFF above this
marker is operational.

**DO NOT EXECUTE COMMANDS FROM THIS ARCHIVE** — including any safe-suite filter, provider-running,
deploy, push or migration command. The only valid safe procedure is in *Current safe validation
commands* above.

**DO NOT USE ARCHIVED STATUS CLAIMS TO DETERMINE CURRENT STATE.** If archive prose conflicts with the
authoritative region, the authoritative region wins. Any historical claim promoted back into current
guidance must first be re-derived from repository truth.

The archive preserves historical handoffs in roughly reverse-chronological order and contains known
ordering irregularities; it is not warranted as a strict chronology.

## Archived handoff — B2.2 turn mechanics: teach, protect the measurement, release

Three commits, and the ORDER is the point — the history itself proves teach-before-test and
protect-before-release:

    f7e7cf307e891ed1089f9f4e5a9a1d2ef65e1c8b  feat(education): teach debate turn mechanics
    a66d46cb33e509e7d4985944e56f98af9b0fdbe8  fix(assessment): prevent sibling contamination
    65c4e6f442d00296fe0a8f8e7902cfd627c02080  fix(assessment): reactivate taught turn mechanics

Production deployment **`6098166145`** (created 2026-08-26T06:08:38Z), status **SUCCESS**, its own
sha field equal to the release SHA exactly; public health PASS. Any later docs-only truth-sync
commit is NOT the feature SHA.

**What shipped:** the `debate-turn-mechanics` lesson (ACTION → LINK → IMPACT anatomy; no-link vs
link turn; impact defense vs impact turn; conditional no-link + impact-turn branches; the
same-chain double-turn hazard derived rather than sloganised), an executable measurement control
for the `rb-14`/`rb-15` pair, and then the release of both items. Chain: refutation → answer-types
→ turn-mechanics → constructive-speeches. CTA-only registry entry, no skillSlug, formative only.

### The one thing most likely to be misread

**ELIGIBILITY IS NOT SESSION CAPACITY.** Two different numbers are both true:

- **Global individual eligibility** — Debate **149/150** (rebuttal **30/30**, weighing 29/30);
  DECA **119/120** (PI 29/30). Only `wg-08` and `pi-26` are held.
- **Clean-history distinct session capacity** — Debate **148**, rebuttal **29**. `rb-14` and
  `rb-15` are a measurement-dependent pair and never co-serve, so exactly one appears in any single
  session. A specific learner's fresh pool can be smaller still when retained exposure excludes a
  sibling, or both.

If you are reading this because a test expects 29 and you were about to "fix" it to 30: don't.
Raising session capacity by co-serving the pair destroys the contamination control. The two numbers
are asserted separately and derived (see `scripts/debate-drills-smoke.ts` B1-3a/B1-3b/B1-3 and
B1-5b/B1-5), and the governance note lives at the top of `DEBATE_DRILL_HELD_IDS` in
`lib/debate-drills.ts`.

### Invariants to preserve

- **The held set is exactly 2:** Debate `wg-08` (PARTIALLY TAUGHT — the weighing lenses are
  taught, but the early-stated weighing-standard mechanism the item requires is not; B2.3 target);
  DECA `pi-26` (UNTAUGHT + source-gated; B2.4 target). `rb-14` and `rb-15` are RELEASED and
  individually eligible. `wg-29` remains FAIR TRANSFER / SERVING — never collapse it with `wg-08`.
- **The pair measurement control is ACTIVE in Production and must stay executable.** Four parts:
  (1) same-session mutual exclusion applied POOL-LEVEL inside `buildDrillSessionFrom` before the
  shuffle — never result-level, never conditional on `areas`, never undone by requested-count
  pressure, with the keeper chosen at random so neither sibling is quietly retired; (2)
  retained-exposure sibling exclusion derived at the single issuing route
  (`app/api/debate/drills/session/route.ts`) via `siblingExclusionsFor`; (3) the independent
  adjudication anchor `scripts/debate-pair-adjudications.json`, read as EXPECTED and compared
  against the runtime constant as ACTUAL so the policy can never be the sole record of its own
  necessity; (4) release coupling that fails by name if an id is servable while the control is
  missing. A mutation audit proved four different mis-wirings of (1) can pass every suite unless
  the tests drive the injectable seam — that is why `buildDrillSessionFrom` exists and why its
  tests inject a hold list rather than trusting production configuration.
- **Exposure means ISSUED / RENDERED, never answered.** Reading a sibling's choices already
  discloses the other's answer logic, so `retainedExposureWhere` carries no answered/graded
  predicate and the route passes it directly as the where-clause. An earlier text-based test for
  this was bypassable by hoisting the filter out of the grepped window; the check is now
  structural. Do not reintroduce an answered-only condition.
- **The protection is bounded by retained history — it is NOT "once-ever."** Its purpose is to stop
  the platform handing a learner the decisive logic immediately before measuring the sibling, not
  to erase long-term memory.
- **Pre-policy exposure is real.** `rb-15` entered the bank 2026-08-11 and the pair was held only
  on 2026-08-25, so retained rows may already record exposure. A learner with one sibling in
  history is not freshly served the other; a learner with both is served neither until that history
  ages out. Conservative by design — not a serving bug.
- **B2.2 provenance:** AI-authored, independently AI-reviewed (three-stage blind protocol plus a
  website-only fairness audit where fresh reviewers with no keys solved everything from the site
  alone). External human content review **WAIVED BY THE PROJECT OWNER**; human content review
  **NOT PERFORMED**; a waiver is NOT a review. Never write "human-reviewed" for these bytes, and do
  not extend the waiver to future educational bytes. `rb-14` leakage LOW; `rb-15` leakage
  MODERATE / ACCEPTABLE.
- **Assessment bytes stay frozen:** all 270 items are byte-identical to the accepted B1 state,
  protected by the canonical baselines `scripts/debate-drill-bank-baseline.json` and
  `scripts/deca-drill-bank-baseline.json` (CF-1/CF-2). Editing an item requires a deliberate
  two-file diff a reviewer can see.

### STANDING PROCESS RULE — run this from the start of any state-changing slice

Any commit that changes learner-visible item state — **HELD / ACTIVE / RELEASED / SERVABLE** — must
run a **present-tense truth sweep** across source, tests, governance comments, success/report
banners and tracked state documentation **before final acceptance**. Earlier commits routinely
contain statements that were truthful when authored and are falsified by a later state-changing
commit in the same stack.

**CLASSIFY CLAIMS BY TEMPORAL MEANING, NOT BY THE SECTION THEY SIT IN.** A historical heading does
not make its sentences historical. Any of these words turns a sentence in an old section into a
claim about *current* reality and must be checked against current truth: *today, currently, current,
still, remains, remaining, now, active, next, latest, since <an older slice>, as of, pending, open,
serve/serving, deployment*. A B1-era paragraph containing "today" is making a B2.2-era claim.

**SWEEP PER CLAIM, ACROSS THE UNION OF BOTH CANONICAL STATE DOCUMENTS — NEVER PER FILE.** Reading
`docs/CURRENT_STATE.md` and then reading `docs/HANDOFF.md` is demonstrably not sufficient. For every
current-state or forward-referencing claim: (1) normalise the claim conceptually; (2) search BOTH
documents for exact duplicates, mirrored wording and near-equivalent statements; (3) reconcile every
occurrence in the same pass; (4) classify each occurrence CURRENT+TRUE or HISTORICAL+EXPLICITLY
SCOPED; (5) treat the claim as cleared only when every mirror is reconciled.

The failure this prevents is specific and recurred three times in B2.2: a claim was repaired in one
document while its twin in the other was left stale — twice for the latent-serving-debt paragraphs,
once for the "next curriculum step" note. Each cost a full acceptance cycle. Sweep claims, not
sections, and not files.

### Next work

**B2.3 — NEXT, NOT STARTED, and BLOCKED behind the canonical-docs rot sweep** (see the mandatory
gate at the top of this file). Target `wg-08`. It is PARTIALLY TAUGHT: the weighing lenses exist and
are reachable, but the early-stated weighing-standard mechanism the item tests is not taught, and
the lens teaching does not by itself prepare it. Same standard as B2.1/B2.2 — teach, verify
reachability, closed-corpus preparedness, per-item gate; **never simply unhold an id.**

**B2.4 — NOT STARTED.** Target `pi-26`. The gate is unchanged and UNSATISFIED: a primary official
DECA source locator for the instructional-area-vs-individual-PI weighting rule must be pinned and
verified before B2.4 teaches the rule or reactivates the item. Internal synthesis is not sufficient.

**P0.2 — NOT STARTED.**

**DECA empty-pool twin — OPEN / SEPARATE SAFETY DEBT.** The Debate guard shipped in `a66d46cb`: a
zero-eligible pool now throws instead of entering a synchronous non-terminating padding loop inside
the request transaction (which would wedge the event loop while holding a `FOR UPDATE` row lock).
`buildDecaDrillSession` still has no such guard. Do not record the empty-pool issue as closed —
only the Debate half is.

This release does not make the education system complete or perfect; the larger
education-perfection program still has material gaps across Debate, DECA, and HOSA.

Separately and still open: the DECA empty-pool twin above; the R17 test-diagnostics debt (deleting
the Debate empty-pool guard is caught only by a timeout, not a named assertion — owner-ruled
NON-BLOCKING, no worker harness required); the inherited stale "seven lessons"-era source comments
(`lib/education/registry.ts` top-of-file, `scripts/skills-compat-smoke.ts` ~line 370,
`scripts/debate-mastery-smoke.ts` ~line 495); moving-HEAD debt 18; `/debates/history`; the stale
Reassess CTA; the skills-compat XP prose; the duplicate historical `36d` labels. Not all of S1B is closed.

## Previous handoff — B2.1 answer-types teaching + four-item reactivation (SHIPPED and Production-verified)

Teaching SHA **`35690107c430fe3eb45eba12c50488a8026edded`** (`feat(education): teach debate answer
types`); release/feature SHA **`3199900e82ccc825da4e40823e4d17dab9713bde`** (`feat(education):
reactivate taught rebuttal drills`); Production deployment **`6093148342`** (created
2026-08-25T22:18:28Z), status **SUCCESS** — the deployment object's own sha field ties Production
to the release SHA exactly. Teach-before-test ancestry: `8ea30c8d3e22be3e99e666914a011860cc76b5c2`
(docs baseline) → teaching → reactivation, the release strictly later in history. Any later
docs-only truth-sync commit is NOT the feature SHA. Nothing was deleted.

**What shipped:**

- **Teaching:** authored catalog lesson `debate-answer-types` ("Know what your answer does") — the
  defense / indict / turn / offense taxonomy, classify-by-outcome method, and the conditional
  defense-vs-offense strategy doctrine; 7 formative questions (keys A/C/B/D/B/C/D). The registry
  entry is CTA-only (no skillSlug — refutation keeps the sole `debate-rebuttal` remediation
  claim); chain at that shipment refutation → answer-types → constructive-speeches, with
  `turn-mechanics` inserted between them by B2.2. LC1 baseline 20 blocks, marker
  `B21-DEBATE-ANSWER-TYPES-TEACHING`.
- **Reactivation (strictly later commit):** `rb-02`, `rb-13`, `rb-16`, `rb-30` released from
  `DEBATE_DRILL_HELD_IDS` after each independently passed the closed-corpus reactivation gate on
  the FINAL lesson bytes (owner blind pass; per-item preparedness PASS). Serving/mastery smokes
  re-based two-sided with a positive-serving proof (B1-8c). All 270 assessment item literals are
  byte-identical to the B1 state (parsed field-level proof at acceptance).

**Invariants to preserve:**

- **The held set at that shipment — exactly 4** (B2.2 has since released rb-14 and rb-15; the current held set is 2 — see the latest handoff): Debate `rb-14` (UNTAUGHT — B2.2 target), `rb-15` (UNTAUGHT —
  B2.2 target) and `wg-08` (PARTIALLY TAUGHT — weighing lenses are taught; the
  early-stated-standard mechanism the item requires remains untaught, so it stays held for B2.3);
  DECA `pi-26` (UNTAUGHT — B2.4 target; plus the primary-official-locator gate remains
  unsatisfied). Valid curriculum targets; never call them bad, invalid, deleted, or retired. None
  of them is yet prepared for assessment on its held target competency; partial teaching does NOT
  make `wg-08` assessment-ready. `wg-29` remains FAIR TRANSFER / SERVING — never collapse it with
  `wg-08`.
- **Served populations at that shipment:** Debate **147/150** (rebuttal 28/30, weighing 29/30); DECA **119/120**
  (PI 29/30). Held ids stay physically in their banks; historical attempts are NOT invalidated;
  in-flight held-item answers still grade honestly.
- **B2.1 provenance:** the educational bytes are AI-authored and independently AI-reviewed
  (including the owner's blind closed-corpus protocol). External human content review was
  **WAIVED BY THE PROJECT OWNER on 2026-08-25**, scoped to the accepted teaching bytes at
  `35690107c430fe3eb45eba12c50488a8026edded`; human content review was **NOT PERFORMED**; a
  waiver is NOT human review. Never write "human-reviewed" / "human-approved" / "externally
  reviewed" for these bytes. Any future change to those educational bytes voids the waiver for
  the changed bytes and requires a new provenance/review decision.
- **PI-26 source gate (owner ruling, mirrored beside the hold in `lib/deca-drills.ts`):** the
  instructional-area-vs-individual-PI weighting doctrine is INTERNALLY GROUNDED only; B2.4 must
  NOT teach it and `pi-26` must NOT be reactivated until a primary official DECA source locator
  supporting the claim is pinned and verified; the internal research synthesis alone is not
  sufficient. Gate currently UNSATISFIED.

**Production verification (read-only, concise):** local HEAD = `origin/main` = the true remote
main = the release SHA; the deployment object's own sha field matches exactly; public routes
healthy (`/`, `/signin`, `/signup`; zero unexpected 5xx); unauthenticated `/dashboard` preserved
its sign-in redirect; no login, no drill submission, no DB access, no provider calls. Production
serving truth rests on exact source identity plus the independently accepted local serving proofs
— no authenticated learner session was performed.

**Latent serving debt as recorded then** (the Debate half SHIPPED in B2.2's a66d46cb; the DECA twin remains open — see the latest handoff): the session-builder
selection loop can fail to terminate if a requested area ever has zero served items. It was
unreachable at that shipment (served areas then non-empty: rebuttal 28, weighing 29, PI 29), and
the treatment recorded as future work — fail closed before entering the selection loop — has since
SHIPPED for Debate in B2.2's `a66d46cb`. The DECA twin is still unguarded.

### Next work AS RECORDED THEN — superseded, not the current plan

**B2.2 as then planned (since SHIPPED — see the latest handoff):** Debate turn-mechanics teaching for `rb-14` and `rb-15` — link /
no-link mechanics, link turn, impact turn, and the double-turn hazard — to the same
learner-visible closed-corpus preparedness standard, with the same per-item gate before any
reactivation. **B2 must NOT simply unhold ids.** Then **B2.3** (target `wg-08`) and **B2.4**
(target `pi-26`; official-locator gate unsatisfied). **P0.2 — NOT STARTED.**

This release does not make the education system complete or perfect; the larger
education-perfection program still has material gaps across Debate, DECA, and HOSA.

Separately and open as of that release — the latent serving debt above has since been half
resolved (Debate guard shipped in B2.2; DECA twin still open): the inherited
stale "seven lessons"-era source comments (`lib/education/registry.ts` top-of-file,
`scripts/skills-compat-smoke.ts` ~line 370, `scripts/debate-mastery-smoke.ts` ~line 495) — OPEN,
NON-BLOCKING, deferred to the stale-comment truth sweep; moving-HEAD debt 18; `/debates/history`;
the stale Reassess CTA; the skills-compat XP prose; the duplicate historical `36d` labels. Not all of S1B is closed.

## Previous handoff — P0.1 assessment-integrity + B1 educational-validity closure (SHIPPED and Production-verified)

Feature/release SHA **`20609a69dc30b37a044c221bd28209a43d9a0a2c`** (the B1 commit), Production
deployment **`6090563687`**, status **SUCCESS** — the deployment object's own sha field ties
Production to the release SHA exactly. P0.1 is the parent commit
`0789278cc09bb771b68a49d23a3c2dd709aa0d0d`; the pre-P0.1 baseline is
`730a350d44e5874d6967491d78c9eeafe1b4a583` (exact two-commit ancestry from baseline to release).
Any later docs-only truth-sync commit is NOT the feature SHA. Nothing was deleted.

**What shipped:**

- **P0.1 (NOT cosmetic):** repaired systematic answer-form leakage in the measured Debate/DECA
  banks — blind answer-form heuristics (e.g. longest-choice selection) could manufacture durable
  mastery evidence, measured 83–100% blind accuracy on affected areas pre-repair — and added an
  **enforced static assessment-quality guard**. The repaired banks passed the final machine/AI
  educational review and guard process. Do not claim overall educational perfection.
- **B1:** after the closed-corpus educational-validity review — an independent **AI** reviewer
  answered all 179 reviewed questions blind before seeing the keys and matched **178/179** official
  keys, with the comparison then used to expose curriculum and one-best-answer defects, not as a
  score-only gate — B1 (a) repaired the adjudicated item-validity defects (`cl-08` direct-clash key;
  `cl-10` formerly semantically-correct distractor; `cl-30` second defensible non-responsive
  distractor; `pi-28` key tightened so the concept verb AND the implementation/measurement scaffold
  must be satisfied together), (b) held valid-but-untaught questions from NEW serving, (c) rebased
  the serving/mastery tests to the actual served population, (d) preserved honest grading for
  historical/in-flight held-item attempts, and (e) deleted nothing.

**Invariants to preserve:**

- **The held set at that shipment — exactly 8:** Debate `rb-02`, `rb-13`, `rb-14`, `rb-15`, `rb-16`, `rb-30`,
  `wg-08`; DECA `pi-26`. They are **valid curriculum targets** excluded from NEW durable assessment
  only because learner-visible teaching does not yet prepare learners for them. Never call them
  bad, invalid, deleted, or retired. **`wg-08` is HELD — partially taught (weighing lenses
  taught; its required early-stated-standard mechanism untaught); `wg-29` is FAIR TRANSFER /
  SERVING** — adjudicated separately; never collapse the two. (B1 record: B2.1 has since
  released `rb-02`, `rb-13`, `rb-16`, `rb-30` and B2.2 released `rb-14` and `rb-15`; the current
  held set is exactly 2 — `wg-08` and `pi-26` — see the latest handoff.)
- **Served populations at that shipment:** Debate **143/150** (rebuttal 24/30, weighing 29/30);
  DECA **119/120** (PI 29/30); since B2.2 the current figure is global individual eligibility
  Debate **149/150** (rebuttal 30/30), with one session topping out at 148 distinct — see the
  latest handoff. Held ids stay physically in their banks; historical attempts are NOT invalidated.
- **Provenance:** B1 final educational content is AI-assisted, independently AI-reviewed, blind
  closed-corpus reviewed, adversarially final-byte validated. External human content review was
  **WAIVED BY THE PROJECT OWNER on 2026-08-25**; human content review was **NOT PERFORMED**. Never
  write "human-reviewed" / "human-approved" / "externally human-reviewed" for B1-edited bytes — a
  waiver is not a review. The closed-corpus review is an AI review — never call it human or
  external review.
- **Static guard:** checks answer-form signal families (length / cue / duplication + mutation
  tests); final measured examples `debate:clash` H_LONG 13.3% / UL 13%,
  `deca:performance-indicators` H_LONG 21.7% / UL 20%. The guard **SUPPLEMENTS** educational
  review — never a replacement.

**Production verification (read-only, concise):** local HEAD = `origin/main` = the true remote
main; exact two-commit ancestry from `730a350d`; the deployment object's own sha field ties
Production to the release SHA; public routes showed no unexpected 5xx; an unauthenticated protected
route preserved its sign-in redirect; no authenticated submission, no DB mutation.

**Latent serving debt as recorded at B1** (the Debate half has since SHIPPED in B2.2's
`a66d46cb`; the DECA twin remains open — see the latest handoff): the session-builder selection
loop can fail to terminate if a requested area ever has zero served items. It was unreachable at
that shipment (served areas then: rebuttal 24, weighing 29, PI 29). The treatment recorded as
future work was to fail closed before entering the selection loop. Not a B1 release blocker;
deliberately not fixed in that release.

### Next work AS RECORDED THEN — superseded, not the current plan

**B2 — as then planned (superseded: B2.1 shipped and released four of the original eight, then
B2.2 shipped and released `rb-14` and `rb-15`; `wg-08` and `pi-26` remain held, and B2.3 / `wg-08`
is next but blocked behind the canonical-docs rot sweep):** teach the eight held concepts to the learner-visible closed-corpus
preparedness standard: turn definition/reversal; offense vs defense; link turn vs impact turn;
double-turn hazard; indict vs turn; defense-only vs offense strategy; weighing framework / early
standard; DECA instructional-area weighting rule vs individual PI weighting. Required sequence:
TEACH → verify reachability → closed-corpus assessment → re-review question validity against the
final lesson bytes → remove a hold only when a beginner can reasonably solve the item from
CompeteReady instruction → rerun the serving/mastery safeguards. **B2 must NOT simply unhold ids.**

**P0.2 — NOT STARTED.** This release does not make the education system complete or perfect; the
larger education-perfection program still has material gaps across Debate, DECA, and HOSA.

Separately and open as of that release — the latent serving debt above has since been half
resolved (Debate guard shipped in B2.2; DECA twin still open): moving-HEAD
debt 18, `/debates/history`, the stale Reassess CTA, the skills-compat XP prose, the duplicate
historical `36d` labels. Not all of S1B is closed.

## Previous handoff — Clash measurable-practice closure (SHIPPED and Production-verified)

Feature `3e5dace7be9d08d6f73f36fefa99580e6115a0bb`, Production deployment **`6074834885`**.
Release fact: the owner explicitly authorized and executed the `debate-clash` Production Skill
activation BEFORE the feature push (owner-reported: 1 created, 0 already present, 0 conflicts;
no independent DB inspection was performed by verification), so no skill-missing window occurred.

**What shipped:** the fifth canonical measured Debate skill. Lesson `debate-clash`
(`/lessons/debate-clash`, structure unchanged; narrow correction only — deeper
actual-disagreement/direct-engagement explanation, two recall items → application) → skillSlug
`debate-clash` → practiceDrill `{ track: "debate", area: "clash" }`
(`/study-arcade?track=debate&area=clash`) → 30 new server-graded items (Debate bank then 150
authored, old 120 unchanged at that shipment; at the B2.1 shipment 147/150 served with 3
valid-but-untaught items held, and B2.2 has since superseded those numbers — Debate global
individual eligibility is now **149/150** with only `wg-08` held, and one clean-history session
tops out at 148 distinct; see the latest handoff) → the existing generic session →
grading → `MasteryProgress` →
`SkillReviewSchedule` path. Schema/migrations/`prisma/seed.ts` ZERO.

**Invariants to preserve:**

- **Narrow construct.** The drill measures clash recognition and response selection (locate the
  disputed point, what needs answering, engagement vs repetition/parallel talk, non-responsive
  answers, response selection). Never describe it as live-clash, speech-execution, delivery, or
  strategy mastery. Bank provenance stays truthful: AI-assisted, submitted through the review
  gate — not claimed as human-reviewed, approved, or separately human-authored.
- **DUE ≠ WEAK.** Due `debate-clash`: 69 → lesson + exact drill; 70/71 → exact drill only.
  `PRACTICING_MASTERY_MIN` and `DRILL_PASS_THRESHOLD` stay distinct concepts. `nextReviewAt ASC`
  stays authoritative — no weakest-first.
- **Coach authority.** Server selects skill/lesson/drill/href/order from durable evidence; AI
  explains only; `NO_DUE_ACTION` unchanged. **`centralClashResponse` stays diagnostic-only** —
  never mastery, review, or Coach-selection authority.
- **Formative/durable boundary.** In-lesson checks record nothing; the external drill is the first
  durable Clash evidence. No new writer.
- **Routing.** `/skills/debate-clash` → canonical lesson resolution → `/lessons/debate-clash`
  (the debate-weighing collision precedent). `debateWritingPracticeSupported("debate-clash")` is
  false; the displacement catalog has no Clash entry. No alias, no slug-map special case.
- **Skill-row provenance.** `debate-clash` lives in `ACTIVATION_PENDING_SKILLS` (operational-script
  provenance), NOT `SEEDED_SKILLS` (which must mirror `prisma/seed.ts` exactly). The activation
  script (`scripts/seed-debate-clash-skill.ts`) stays manual-only: dry-run never connects,
  `--apply` required, create-or-verify, no update/upsert/delete, Skill-only, conflict fail-closed.
  This shipment's activation is complete — not a standing TODO.
- **S3-15 transition.** The skills-compat and concept-lesson-view raw byte pins are retired in
  favor of semantic, mutation-killable guards (canonical precedence, collision shadowing, CWI's
  authored-source fail-closed boundary, discriminant integrity, manifest/seed and inventory
  agreement, formative framing, metadata-derived CTA, no durable imports). Schema,
  lesson-practice, spaced-review and the review page's executable behavior remain protected as
  before. Do not claim the retired files are byte-pinned.
- **Five durable loops, precisely.** CWI (embedded durable practice — architecturally distinct, no
  registry reverse-remediation mapping), Evidence, Clash, Refutation, Weighing. Orientation stays
  Taught + Formative only. Mapped concept set: evidence-evaluation, clash, refutation, weighing.
- **LC1.** Marker `DEBATE-CLASH-MEASURABLE-PRACTICE-CORRECTION`; 19 entries before and after;
  exactly the `debate-clash` entry changed; no twentieth entry.

### Next curriculum work AS RECORDED THEN — superseded, not the current plan

**Superseded.** At the Clash shipment no next Debate curriculum product slice had been chosen;
B2 — teaching the then-eight held concepts — was chosen afterwards. Since then B2.1 shipped and
released `rb-02`, `rb-13`, `rb-16`, `rb-30`; B2.2 shipped and released `rb-14` and `rb-15`; the
held set is `wg-08` and `pi-26`; and B2.3, targeting `wg-08` alone, is the next slice — currently
blocked behind the canonical-docs rot sweep. Remaining coverage/connectivity gaps: Signposting measurable connectivity, Constructive
Speeches measurable connectivity, later speeches / collapse / crystallization, flowing/note-taking,
questioning (format-dependent), delivery, strategy/judge adaptation. Clarified design fact (not the
Evidence/Clash defect class, no metadata-only fix, not automatically NEXT): a due
`debate-claim-building` review lacks generic reverse-remediation because the CWI lesson embeds its
authoritative durable drill — any future fix needs a separate generic
lesson-with-embedded-durable-practice design decision.

Separately and still open, unchanged by this slice: moving-HEAD debt 18, `/debates/history`, the
stale Reassess CTA, the skills-compat XP prose, the duplicate historical `36d` labels. Not all of S1B is closed.

## Previous handoff — Debate Curriculum Wave 1C — Evidence Evaluation teaching-home closure (SHIPPED and Production-verified)

Implementation `aea7f74f135d233821a0356ac63478987f6f9e5c`, Production deployment **`6073720884`**.

**What shipped:** the authored lesson `debate-evidence-evaluation` ("Judge the evidence",
`/lessons/debate-evidence-evaluation`) — the teaching home for the already-measured
`debate-evidence` skill. Exact mapping to preserve: skillSlug `debate-evidence` → practiceDrill
`{ track: "debate", area: "evidence-evaluation" }`
(`/study-arcade?track=debate&area=evidence-evaluation`). Inserted directly after CWI in the lesson
path, which at that wave read: orientation → CWI → evidence-evaluation → signposting → clash →
refutation → constructive → weighing → terminal. **Superseded — `answer-types` (B2.1) and
`turn-mechanics` (B2.2) were chained in later between refutation and constructive speeches; see the
CANONICAL LIVE STATE block in `docs/CURRENT_STATE.md` for the current chain.** Schema/seed ZERO; no new Skill row, drill area, alias, or evidence mechanism.

**Invariants to preserve:**

- **Metadata, not code.** Wave 1C added zero learning-architecture code — the registry metadata
  alone activated the drill CTA, reverse remediation and the Coach. Never add an Evidence-specific
  branch to the remediation lookup, review logic, Coach, `getDueReviews`, spaced review, or
  grading. The in-lesson checks stay formative; the drill is the durable demonstration.
- **DUE ≠ WEAK.** Due `debate-evidence` at 69 → Evidence lesson + exact drill; at 70/71 → exact
  drill only. Due is re-demonstration timing; only low demonstrated performance earns the lesson.
  `PRACTICING_MASTERY_MIN` (70) and the drill pass threshold (also 70) remain distinct concepts.
- **Most-overdue ordering.** `nextReviewAt ASC` stays authoritative; a weaker later due row never
  displaces the earlier due row. No weakest-first reranking.
- **Coach authority.** The server chooses from durable evidence; the AI explains only — it never
  picks a skill, lesson, drill, URL or ranking. `NO_DUE_ACTION` unchanged.
- **Intentional formative-writing displacement.** `/skills/debate-evidence/practice` still exists
  and remains formative: it persists `PracticeSession` only — no `MasteryProgress`, no
  `SkillReviewSchedule` advancement — so it cannot resolve the durable due review, and due-review
  remediation and the Coach correctly prefer the exact drill-backed path instead. This makes
  `debate-evidence` the currently intentional overlap between a formative writing destination and a
  measured remediation path; the review-ladder guard requires any such displacement to be explicit,
  never silent. Do not describe the writing route as broken or removed, and do not let another
  mapped skill displace a writing destination silently.
- **Executable trust boundary.** Review-page executable behavior did not change in Wave 1C (only
  its explanatory comment); the review page remains executable-equivalent to its protected
  historical baseline, and the other protected learning/evidence surfaces remain frozen.
- **Pedagogy.** Evidence evaluation is comparative and reason-based — fit, source, method,
  interpretation, and comparing conflicting evidence. Never regress to shallow rules
  (newer/bigger always wins, experts always right, funded research automatically false, correlation
  useless, one study proves causation). Content stays broadly format-agnostic; the ultimate
  PF-vs-Parliamentary target is NOT resolved. Authored-content changes go through LC1 (current
  review marker `W1C-DEBATE-EVIDENCE-EVALUATION`; the 18 existing reviewed entries unchanged plus
  one new Evidence entry, 19 total).
- **Four durable loops at that wave, precisely** (the later Clash closure made it five — see the
  latest handoff and the CANONICAL LIVE STATE block). CWI (embedded server-graded practice — architecturally
  distinct, no registry reverse-remediation mapping), Evidence Evaluation, Refutation and Weighing
  (each: exact drill, reverse remediation + Coach). Orientation remains Taught + Formative only.

**`/skills/debate-evidence`** still resolves through the existing compatibility path to
`/lessons?track=debate`, where the lesson is visible. No new routing architecture was required for
Wave 1C because the lesson is already reachable through the curriculum path, CTA, remediation and
Coach; direct lesson resolution for `/skills/debate-evidence` remains an open, separate product
decision.

### Next curriculum work AS RECORDED THEN — superseded, not the current plan

**All three planned Wave 1 slices have shipped** (1A CLOSED, 1B CLOSED, 1C SHIPPED /
Production-verified). **At that point no next curriculum wave had been chosen — it was left as a
separate decision. That decision has since been made and acted on:** B2 (curriculum closure of the
held concepts) was chosen; B2.1 and B2.2 have both SHIPPED and are Production-verified; and B2.3,
targeting `wg-08`, is the next slice — currently BLOCKED behind the canonical-docs rot sweep; see
the mandatory gate and the latest handoff. Of the broader coverage/connectivity gaps named at that
wave, **Clash has since closed** (the Clash measurable-practice closure, deployment `6074834885`);
Signposting and Constructive Speeches drill-and-evidence connectivity remain open, as do later
speeches, flowing, round strategy, crystallization, delivery, and questioning/cross-ex.

Separately and still open, unchanged by this wave: moving-HEAD debt 18, `/debates/history`, the
stale Reassess CTA, the skills-compat XP prose, the duplicate historical `36d` labels. Not all of S1B is closed.

## Previous handoff — Debate Curriculum Wave 1A — beginner Debate orientation (SHIPPED and Production-verified)

Implementation `a0c4e67f486e2f3bbb5cc75523eeb38d8b9c1f83`, Production deployment **`6073011910`**.

**What shipped:** the format-agnostic beginner lesson `debate-round-orientation`
(`/lessons/debate-round-orientation`), first in the Debate lesson path, plus one static dashboard
action — *Learn how a debate round works* — placed ahead of *Start an AI debate round*. The AI
round stays fully available.

**Invariants to preserve:**

- **No fake measurement.** Orientation has NO skillSlug, NO practiceDrill, NO durable evidence, NO
  remediation mapping, NO Coach evidence action, NO completion persistence. Its checks are
  formative only. Never invent "orientation mastery" or a completion state.
- **Static guidance only.** Orientation-first is static curriculum ordering. The application does
  not know whether a learner completed it; never add completion gating, storage, or XP/mastery
  inference to the dashboard ordering.
- **Evidence firewall.** The Coach remains server-evidence-backed: orientation is never recommended
  because it exists, is first anywhere, or when no review is due; `NO_DUE_ACTION` unchanged. No
  durable-evidence writer, spaced-review, remediation, `getDueReviews`, or grading code changed.
- **Format-agnostic first release (locked).** The lesson makes no universal claims about speech
  order/names/count, team size, timing, prep, side labels, cross-ex/crossfire/POIs, or
  new-argument rules — formats are said to differ. **The ultimate PF-vs-Parliamentary target is NOT
  resolved**; do not resolve it silently in future content.
- **Boundaries.** Orientation introduces argument anatomy at beginner level only — CWI remains the
  deeper home and its embedded graded loop is untouched; Constructive Speeches and Refutation
  lessons are not replaced; tracking awareness is taught without a formal flowing system (flowing
  remains a curriculum gap).
- **Registry trust boundary.** Curriculum publication may extend the education registry;
  Coach-facing behavior stays protected by semantic mapping/evidence invariants, not by registry
  file immutability.

**Reviewed content:** LC1 marker `W1A-DEBATE-ROUND-ORIENTATION` — 17 existing entries unchanged
(Wave 1B Weighing included) plus one new reviewed orientation entry, authored independently of the
live drill bank, under the existing CompeteReady-authored format-agnostic provenance.

**Connected durable loops were exactly three at that wave** (CWI embedded; Refutation and Weighing
deep-linked with remediation + Coach). Orientation added no durable loop — it is Taught + Formative
only, not a fourth. Evidence Evaluation (Wave 1C) and Clash (the Clash closure) were connected later,
so **the current count is FIVE** — see the CANONICAL LIVE STATE block in `docs/CURRENT_STATE.md`.

**Debate learner path at that wave:** orientation → CWI → signposting → clash → refutation →
constructive → weighing → terminal. **Evidence evaluation, answer-types and turn-mechanics were
chained in later; the current chain is orientation → CWI → evidence-evaluation → signposting →
clash → refutation → answer-types → turn-mechanics → constructive → weighing → terminal.**

### Next curriculum work AS RECORDED THEN — superseded, not the current plan

1. **Wave 1C — Evidence Evaluation teaching-home closure. NEXT / NOT STARTED *at that wave*; it has
   since SHIPPED and is Production-verified.** `debate-evidence`
   has the canonical skill, the 30-question `evidence-evaluation` drill and durable evidence — only
   the learner teaching home is missing. Remaining broader gaps stay coverage/connectivity:
   signposting/clash/constructive connectivity, later speeches, flowing, round strategy,
   crystallization, delivery, questioning/cross-ex. (Of those, Clash connectivity has since closed;
   Signposting and Constructive Speeches connectivity remain open.)

Separately and still open, unchanged by this wave: moving-HEAD debt 18, `/debates/history`, the
stale Reassess CTA, the skills-compat XP prose, the duplicate historical `36d` labels. Not all of S1B is closed.

## Previous handoff — Debate Curriculum Wave 1B — Weighing teaching-home closure (SHIPPED and Production-verified)

Implementation `82e76042b6705661e4c5c2e1afc05c6ca227f372`, Production deployment **`6072492323`**.

**What shipped:** the existing held Weighing lesson was corrected and published as the teaching home
for the already-measurable `debate-weighing` skill. Exact mapping to preserve: lesson
`debate-weighing` (`/lessons/debate-weighing`) → skillSlug `debate-weighing` → practiceDrill
`{ track: "debate", area: "weighing" }` (`/study-arcade?track=debate&area=weighing`). The legacy
alias `debate-weighing-lesson` and the seeded slug `/skills/debate-weighing` both resolve to the
published lesson through existing precedence. No new skill, no new drill area, schema/seed ZERO.

**The pedagogy rule to preserve:** weighing = comparing competing impacts and explaining why one
should matter more. Magnitude/probability/timeframe/reversibility are names for comparison moves,
never required vocabulary. The formative questions are application items — do not regress them to
lens-recall. Authored-content changes go through the LC1 mechanism (the review marker at that wave was
`W1B-DEBATE-WEIGHING-CORRECTION`; the current marker is `B22-DEBATE-TURN-MECHANICS-TEACHING` in
`scripts/learning-content-integrity-smoke.ts`); exactly the Weighing entry changed, the other sixteen catalog
entries are untouched.

**The architecture rule this wave proved:** new curriculum coverage plugs in through registry
metadata (`skillSlug` + `practiceDrill`), NOT through new code. Wave 1B added zero lines to the
remediation lookup, review page, Coach, or `getDueReviews`, and behavior follows automatically:
due + below `PRACTICING_MASTERY_MIN` → Weighing lesson then exact drill (69 → both); healthy due →
exact drill only (70/71 → drill only); most-overdue-first stays inherited from `nextReviewAt ASC`.
DUE ≠ WEAK.

**Three loops existed at that wave, not architecturally identical:** CWI (embedded server-graded
practice),
Refutation and Weighing (deep-linked, reverse-remediation + Coach connected). CWI does not use the
reverse-remediation mapping.

**Untouched by Wave 1B — each item re-evaluated against current truth by the canonical-docs rot
sweep, because "still true" was a present-tense claim that had partly gone stale:**

- **STILL OPEN / STILL TRUE.** The other held Debate lessons stay held — `debate-rebuttal-speeches`,
  `debate-parliamentary-roles`, `debate-case-topic-definitions` and the duplicate CWI catalog entry
  are authored in `lib/learning-content.ts` but are **not** in `EDUCATION_LESSONS`.
- **SUPERSEDED.** Refutation was then the deep-link reference implementation. The same
  skillSlug + practiceDrill pattern now also carries `debate-evidence-evaluation`, `debate-clash` and
  `debate-weighing`, so Refutation is one of four registry-mapped drill-backed teaching homes, no
  longer the sole exemplar.
- **HISTORICAL ONLY.** "The drill bank, thresholds and evidence writers are unchanged" means
  unchanged *by Wave 1B*. The banks have changed materially since: the Clash closure added 30 Clash
  items, and P0.1/B1 repaired items and set the hold policy. Thresholds
  (`PRACTICING_MASTERY_MIN` 70, `DRILL_PASS_THRESHOLD` 70) and the evidence writers are unchanged.
- **PARTLY CLOSED.** Of the coverage/connectivity gaps from the curriculum audit: **orientation
  CLOSED** (Wave 1A), **evidence lesson CLOSED** (Wave 1C), **Clash connectivity CLOSED** (Clash
  measurable-practice closure). **Still open:** Signposting and Constructive Speeches connectivity,
  later speeches, flowing, round strategy, crystallization, delivery, questioning/cross-ex.

### Next curriculum work AS RECORDED THEN — superseded, not the current plan

1. **Wave 1A — format-agnostic Debate round orientation. NEXT / NOT STARTED *at that wave*; it has
   since SHIPPED and is Production-verified.** Owner decision
   locked: the first release is format-agnostic; avoid universal claims about speech order, timing,
   team size, cross-ex/crossfire/POI, side labels, or new-argument rules. The ultimate
   PF-vs-Parliamentary target is NOT resolved.
2. **Wave 1C — Evidence Evaluation teaching-home closure. NOT STARTED *at that wave*; it has since
   SHIPPED and is Production-verified.** `debate-evidence` then still had
   canonical skill + 30-question drill + durable evidence and no lesson.

Separately and still open, unchanged by this wave: moving-HEAD debt 18, `/debates/history`, the
stale Reassess CTA, the skills-compat XP prose, the duplicate historical `36d` labels. Not all of S1B is closed.

## Previous handoff — M15 Learning Architecture Slice 3 — server chooses, AI explains (SHIPPED and Production-verified)

Implementation `6f69745c0f7135fe1877eb867624126392ea45d1`, Production deployment **`6071131714`**.

**The rule this slice adds — preserve it in all future AI work: SERVER CHOOSES, AI EXPLAINS.**

The server owns identity, the evidence read, due-skill selection, due ≠ weak, the PRACTICING
threshold, the action type, lesson/drill identity, and every URL. The model may influence only the
explanation prose. It must never determine weakness, mastery, readiness, a mapping, a destination, a
priority, or a diagnosis.

**Deterministic flow:** authenticated learner → `getDueReviews(userId)` → FIRST row of the existing
`nextReviewAt ASC` order (most overdue — inherited, not invented) → `PRACTICING_MASTERY_MIN` →
`practiceRemediationForSkill` → one server-approved action → optional AI explanation.

**Actions (DUE ≠ WEAK carries forward):** low mastery + mapped → exact lesson then exact drill ·
healthy due + mapped → exact drill only · due + unmapped → the review card's own compat destination ·
no due rows → no personalized action and **no provider call**.

**Pilot:** `debate-rebuttal` low-mastery → `debate-refutation` (`/lessons/debate-refutation`) then
`/study-arcade?track=debate&area=rebuttal`; healthy due → the Rebuttal drill only. No Refutation
lesson for healthy due.

**Client-trust boundary:** the dashboard AI Coach card POSTs an empty request to
`/api/ai/recommendations`; the strict schema rejects any learning-state claim. The old
client-supplied `weaknesses` + `availableLessons` recommendation path is retired. This surface is
distinct from the human `/coach/*` role pages.

**Provider boundary:** the model sees only action type, skill name, a below-practicing boolean, the
due date and labels — never userId/name/email/ids/history/ballots/XP/formative answers/
`masteryPercent`/hrefs. Output is validated to one explanation string; provider failure degrades
wording to a deterministic template, honestly tagged — the action never changes.

**No-due truth:** "No evidence-backed review is due right now," plus an explicitly non-personalized
pointer to `/study-arcade` to choose a server-graded drill that **can** build durable skill
evidence. Never claim `/skills` or every activity builds the record — Debate Skills writing practice
is formative.

**Deferred, deliberately:** `/api/ai/readiness` is unchanged, dormant and client-trusted — do not
wire it to UI; competition-readiness scoring is FUTURE / DEFERRED until materially stronger
multi-evidence support exists. Ballot `weakSignals` / coach-progress keyword matching stay out (no stable
structured skill identity). Schema/migrations/seed ZERO; no learner-profile table; no persisted
recommendation or AI prose; `PracticeAttempt`/`QuestionAttempt` not activated; Slices 1–2 unchanged.

**The loop now closed:** teach → exact drill → durable evidence → due ≠ weak → exact remediation /
re-demonstration → server chooses → AI explains. A trustworthy foundation — not full readiness,
complete curriculum, complete diagnosis, or complete personalization.

### Next product direction — NOT STARTED / FUTURE PLANNING

The lesson format is strong; the remaining curriculum weakness is **coverage and connectivity**:
some authored lessons are Taught but not yet Trainable/Measurable through an exact drill/evidence
loop — at that slice **Signposting, Clash and Constructive Speeches** (good content, no
Refutation-style loop yet). **Clash has since closed** its loop; Signposting and Constructive
Speeches remain open. The next product direction is to systematically close curriculum coverage gaps and expand
measurable skill loops (full Debate skill map; Taught/Trainable/Measurable/Simulated coverage;
additional drill areas; structured ballot evidence; later, honest readiness). **None of it had
started at that slice; that is no longer true.** Since then, and in this order: Wave 1B (Weighing
teaching home), Wave 1A (beginner orientation), Wave 1C (Evidence Evaluation teaching home), the
Clash measurable-practice closure, P0.1/B1 (assessment integrity + educational validity), B2.1
(answer-types teaching + four-item reactivation) and B2.2 (turn-mechanics teaching + pair
measurement control + two-item reactivation) have all SHIPPED and are Production-verified.

**What of this direction remains genuinely not started:** Signposting and Constructive Speeches
drill-and-evidence connectivity; the rest of the full Debate skill map (later speeches, flowing,
round strategy, crystallization, delivery, questioning/cross-ex); additional drill areas; structured
ballot evidence; and honest competition readiness, which stays FUTURE / DEFERRED. **The immediate
next slice is B2.3 (`wg-08`), and it is BLOCKED behind the canonical-docs rot sweep.**

Separately and still open, unchanged by this slice: moving-HEAD debt 18 (Class B 12, Class C seed 6),
`/debates/history`, the stale Reassess CTA, the skills-compat XP prose, the duplicate historical `36d` labels. Not all of S1B is closed.

## Previous handoff — M15 Learning Architecture Slice 2 — durable evidence → exact remediation (SHIPPED and Production-verified)

Implementation `b72073321b33f2b119f6d1b20cbabf754fc14e8b`, Production deployment **`6070209983`**.

**The rule this slice adds — preserve it in all future learning work: DUE ≠ WEAK.**

- **due** = retention timing — the spaced schedule asks for re-demonstration now
- **low demonstrated performance** = durable `masteryPercent` below `PRACTICING_MASTERY_MIN`
- **remediation** = low demonstrated performance **plus** an exact mapped teaching lesson

Never collapse due into weak: a healthy due learner gets re-demonstration, not remediation and not
weakness language.

**Canonical boundary:** `PRACTICING_MASTERY_MIN` (70) lives in `lib/spaced-review.ts` and is the same
constant `masteryLevelFor` decides PRACTICING from. `DRILL_PASS_THRESHOLD` also equals 70 today but
is a different concept — one drill attempt's pass mark. Never merge them, and never introduce a
competing literal.

**Shipped pilot:** due row for `debate-rebuttal` → existing education metadata → lesson
`debate-refutation` (`/lessons/debate-refutation`) → drill `{ track: "debate", area: "rebuttal" }`
(`/study-arcade?track=debate&area=rebuttal`).

- **mastery ≥ PRACTICING:** the exact Rebuttal drill only — no lesson, no weakness wording.
- **mastery < PRACTICING:** Review Refutation, then the exact Rebuttal drill, worded as low
  demonstrated performance — never as diagnosed misunderstanding, decline or repeated failure.

**Evidence authority:** server identity → `getDueReviews(userId)` → durable `masteryPercent` →
static mapping. XP, lesson views, formative checks, client strings, query parameters, browser
storage, AI prose and navigation history must never trigger remediation. URLs choose destinations;
they are not evidence.

**Architecture:** `educationLessonsForPracticeSkill` (registry) derives the mapping from existing
entry metadata; `practiceRemediationForSkill` (skills-compat) is the review surface's lookup — the
review page reaches the registry only through the compatibility layer. Nothing is persisted; unknown,
malformed, unmapped, DECA and HOSA slugs fail safely. `review-ladder:smoke` guards lesson/drill skill
agreement and the one-drill-backed-lesson-per-skill authored-data assumption;
`education-migration:smoke` guards the consumer boundary. Unmapped due skills keep their existing
routing — no fabricated lessons; the stale Reassess CTA remains separate debt.

**Untouched by Slice 2:** schema (ZERO), `PracticeAttempt`/`QuestionAttempt`, `lastOutcome`, the
`getDueReviews` contract, the AI Coach, Slice 1, LC1, G2.

**Pre-existing test-label debt noted during Slice 2, untouched:** `education-migration-smoke.ts`
carries two historical `36d` control labels; Slice 2 neither introduced nor modified them, and
production comments cite suites rather than ambiguous control ids.

### Learning architecture sequence AS RECORDED AT THAT PASS — all three slices have since SHIPPED

1. **Learning Architecture Slice 1 — lesson → exact drill. SHIPPED / CLOSED.**
2. **Learning Architecture Slice 2 — durable evidence → exact re-demonstration + exact remediation. SHIPPED / Production-verified.**
3. **Learning Architecture Slice 3 — the existing AI Coach consumes server-side learner evidence and
   returns a specific next action. NEXT, NOT STARTED *at that pass*.** It has since SHIPPED and is
   Production-verified — see the Slice 3 handoff above.

Learning Architecture slice numbers are unrelated to the historical **G2** slice numbering used in
the older handoff sections below.

Separately and still open, unchanged by this slice: moving-HEAD debt 18 (Class B 12, Class C seed 6),
`/debates/history`, the stale Reassess CTA, the skills-compat XP prose, the duplicate historical
`36d` labels. Not all of S1B is closed.

## Previous handoff — M15 Learning Architecture Slice 1 — lesson → exact drill (SHIPPED and Production-verified)

Implementation `53e8e08f13c34ee1c6db0a51f28dc7155d704d95`, Production deployment **`6056077343`**.

**Read this before any further learning work — it is the rule the next slices build on:**

- **lesson** = teaching
- **in-lesson check** = formative feedback only
- **server-graded drill** = the first durable evidence-producing activity
- **`MasteryProgress` / `SkillReviewSchedule`** = the learner record, written downstream of that drill

The authored lesson self-check persists nothing: no `MasteryProgress`, no `SkillReviewSchedule`, no XP,
no progression, no readiness, no `PracticeAttempt`, no `QuestionAttempt`. Do not treat it, or describe
it, as mastery evidence.

**Shipped flow:** `debate-refutation` → typed `practiceDrill` metadata → track `debate`, area
`rebuttal` → `/study-arcade?track=debate&area=rebuttal` → the existing server-issued and server-graded
Debate drill → skill `debate-rebuttal` → the existing mastery and review machinery.

**At Slice 1 that was the only authored mapping**, and it is metadata-driven — no lesson-id special
case in the view, and the call to action renders only where a real mapping exists. At that slice
`debate-signposting`, `debate-clash` and `debate-constructive-speeches` were unmapped and showed no
drill action; DECA and HOSA gained none.

**Superseded — current mapping truth, derived from `EDUCATION_LESSONS`:** `debate-evidence-evaluation`,
`debate-clash`, `debate-refutation` and `debate-weighing` each carry BOTH `skillSlug` and
`practiceDrill`; `debate-answer-types` and `debate-turn-mechanics` carry `practiceDrill` as a CTA only;
`claim-warrant-impact` carries `skillSlug` with embedded practice.

**`debate-round-orientation` also carries neither, and that is DELIBERATE** — orientation has no
skillSlug, no practiceDrill and no durable evidence precisely so it can never mint mastery, so it is
not a connectivity gap. **The remaining unresolved Debate connectivity gaps are exactly
`debate-signposting` and `debate-constructive-speeches`**; `debate-clash` connectivity is CLOSED.
DECA and HOSA still have no concept-drill mapping.

**Deep link:** the Debate drill component takes an optional initial `DrillArea` that seeds the first
render only, leaving manual switching intact. `DrillArea` has one canonical compile-time definition and
the education metadata uses it, so drift fails the build. The `area` query value is validated at
runtime — missing, invalid, non-string and array values fall back to mixed, and DECA/HOSA never consume
a Debate area.

**Untouched by Slice 1:** schema (ZERO), LC1, G2, the AI Coach, `PracticeAttempt`/`QuestionAttempt`
writers, lesson-completion persistence, and the existing drill grading/mastery/review semantics.

### Learning architecture sequence AS RECORDED AT THAT PASS — all three slices have since SHIPPED

1. **Learning Architecture Slice 1 — lesson → exact drill. SHIPPED.**
2. **Learning Architecture Slice 2 — durable evidence → weakness → exact remediation. NEXT, not
   started *at that pass*.** Has since SHIPPED and is Production-verified.
3. **Learning Architecture Slice 3 — the existing AI Coach reads server-side learner evidence and
   returns a specific next action. Future *at that pass*.** Has since SHIPPED and is
   Production-verified.

These are Learning Architecture slice numbers, unrelated to the historical **G2** slice numbering used
in the older handoff sections below.

Separately and still open, unchanged by this slice: moving-HEAD debt 18 (Class B 12, Class C seed 6),
`/debates/history`, the stale Reassess CTA, the skills-compat XP prose. The indexOf ordering-control
sequence remains separately CLOSED; not all of S1B is closed.

## Previous handoff — M15 S1B indexOf Batch IV: route resolution / gating hardened (2026-08-24)

### SHIPPED and Production-verified — nothing awaits a push

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Shipped SHA `5e21b593d03e4a192ddc62460285baae2bc4f2c4`, Production deployment **`6055470720`**, state
**SUCCESS**, automatic `vercel[bot]` deployment — no manual deploy, no rollback, nothing superseded it.
Previous verified Production baseline `d5f369d`. **Zero production changes** — two test suites, one
shared test-only helper, two docs.

**Test-integrity only.** No production route, schema or runtime behaviour changed.

Batch IV repaired the last four defective ordering controls — **IDX-16** (`education-migration` `32b`),
**IDX-45** (`skills-compat` `16b`), **IDX-46** (`21c`) and **IDX-47** (`21c2`). All four are `a < b`, so
all four exposed their **left** operand: with the left anchor absent `indexOf` gives `-1` and `-1 < n`
still held, leaving the control green with the very lookup or gate it sequences deleted.

This is the one family where a shared helper was justified. **`scripts/order-assert.ts`** provides
`assertSourceOrder({ source, left, right, direction: "before" | "after", label, message })` — both
indices captured, fail-closed `<label>-anchors` presence guard, then the required direction, with each
control's original ordering message preserved verbatim. It claims presence and first-occurrence order
and nothing else. **It is not a registered smoke suite and adds no IDX to the ledger.**

**Evidence:** all four fail closed on left-absent, right-absent and wrong-order with target attribution
and **0 harness errors** — mechanical isolation where an earlier neighbour throws first — and the helper
was proven fail-closed in **both** directions. Both affected suites pass.

**Ledger: safe 44 → 48, defective 4 → 0, unresolved 0. The indexOf ordering-control debt is CLOSED.**
Route resolution / gating is **4/4 safe**; Batch IV repaired exactly IDX-16, IDX-45, IDX-46 and IDX-47.
**This closes the indexOf ordering-control debt only — not all of S1B.**

**Read the denominator correctly.** 48 is the **audited logical-control ledger** locked at `0127177`
across the original 14 registered safe suites, with historical checksums **26 direct / 22 captured** and
**43 `<` / 5 `>`**. Those are historical audit figures, not a count of today's literal `<`/`>` tokens —
Batch IV routes four controls through one helper, so a raw syntax scan of the current tree is
deliberately not equivalent. The original 48-row physical table is not persisted in this repository, and
no fresh reconstruction of it is claimed.

### Next as recorded at that pass — no further indexOf batch; SUPERSEDED

The indexOf ordering sequence ends here. After Batch IV is accepted, pushed and Production-verified,
**return to M15 product and learning work**. Still open and separate: moving-HEAD debt **18**
(Class B 12, Class C seed 6), `/debates/history`, the stale Reassess CTA, skills-compat stale XP prose,
the known HANDOFF paragraph-boundary blemish. M16 not started.

**auth/rate-limit (9/9) remains safe as written and untouched.** Batches I, II and III remain shipped,
Production-verified and untouched. LC1 CLOSED. A2 unchanged; A4 CLOSED. `judge-shape:smoke` was
deliberately not run: it loads `.env`/`.env.local` and calls a live provider when credentials exist.

## Previous handoff — M15 S1B indexOf Batch III: transaction / exactly-once ordering hardened (2026-08-24)

### SHIPPED and Production-verified — nothing awaits a push

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Deployed stack HEAD `2c643c862d755fb6f9c4267ca280fc517b83d6de`, Production deployment
**`6054639863`**, state **SUCCESS**, automatic `vercel[bot]` deployment — no manual deploy, no
rollback, nothing superseded it. Previous verified Production baseline `1ed3bbe`. **Zero production
changes** — one test suite plus two docs.

**Shipped as a four-commit stack, one push, one deployment:** implementation `f94a2fb`, ordering-message
fix `cad1217`, semantic-wording cleanup `3085f9f`, local-stack status fix `2c643c8`. Vercel built the
pushed head, so `6054639863` contains the other three as ancestors.

**Production verification (read-only):** local HEAD = `origin/main` = live remote = `2c643c8`, clean
**0/0**; published diff from the prior verified Production SHA is exactly `scripts/judge-shape-smoke.ts`
plus these two docs; **production/runtime ZERO, schema ZERO, snapshot ZERO, LC1 ZERO**; the deployed
control shows no logic drift from `f94a2fb`. Public routes healthy, protected pages redirect
unauthenticated, protected APIs return **401**, **no 5xx observed**. **The Vercel runtime does not
execute smoke-test assertions.** `/debates/history` remains the already-tracked soft-redirect debt.

**Read this first: Batch III repaired TEST-COVERAGE INTEGRITY, not production behaviour.** A2's
exactly-once judged-attempt claim and A4's reward integrity were already CLOSED, and every production
file is byte-identical. Nothing about idempotency, transaction ordering, XP ordering, reward behaviour
or any runtime race was changed or fixed.

**IDX-30 is `A2-7b` in `scripts/judge-shape-smoke.ts`** — the last defective member of the 14-control
transaction claim / lock / session family. Inside a loop over the four progression effects
(`awardXpInTransaction(`, `tx.debate.update(`, `tx.user.update(`, `tx.xPLog.create(`) it asserted, over
the comment-stripped judge route, `indexOf(effect) > indexOf("prisma.$transaction(async (tx) =>")`:
every progression effect must first appear only after the transaction boundary that carries the
exactly-once claim opens. The operator is **`>`**, so the **right** operand was vulnerable — with the
boundary absent `indexOf` gives `-1` and `effectAt > -1` held for all four effects, so deleting the
boundary itself left the control green. **Category C:** only the neighbouring `A2-1` went red. It now
captures both indices, asserts both present under `A2-7b-anchors`, then runs the original ordering
assertion. The `A2-7b` label, expression, operator and direction are preserved exactly; both messages
were narrowed during acceptance to state only the proven properties — the anchors exist, and the
effect's FIRST occurrence follows the opener. Neither message claims transaction containment, which no
executable control establishes.

**5 mutation states + a green harmless-change control, 0 harness errors.** B (boundary removed) and C
(effect removed) fail the new presence assertion — attribution proven by **in-situ isolation**, because
`A2-1` and `P1c-8b` throw earlier; D (an earlier occurrence of the effect inserted before the boundary)
fails **`A2-7b` by its own label at suite level**. **State E cannot be green by construction:**
`A4b-C3` byte-freezes the judge route against the A4a baseline, so any edit to that file reddens the
suite — the target itself passed, and E2 (a harmless reformat of the repaired assertion) gives the
green state.

**Ordering state: safe 43 → 44, defective 5 → 4, unresolved 0.** transaction claim / lock / session is
now **closed: 14 total, 14 safe, 0 defective**; the other 13 controls were not touched.

### Next implementation order as recorded at that pass — none started THEN; SUPERSEDED

1. **Batch IV — route resolution / gating:** IDX-16, IDX-45, IDX-46, IDX-47. This is the one family
   where a shared bidirectional helper is justified; it does not exist yet and must not be built
   before Batch IV is authorised.

**auth/rate-limit (9/9) remains safe as written and untouched.** Batch III was **test-integrity only**:
no runtime behaviour and no security defect was repaired — it did not fix production idempotency,
transaction behaviour, XP/reward behaviour or any runtime race, and A2 and A4 production code stayed
byte-identical. Production verification proves the accepted stack deployed and that live health stayed
good; it does not prove smoke assertions ran inside Vercel.

**Process boundary learned in this batch:** `scripts/judge-shape-smoke.ts` loads `.env`/`.env.local` at
import and calls a real provider when credentials exist. Run it credential-free (a clone with no `.env`)
for a deterministic check. Batch I (completed-retry 9/9) and Batch II
(evidence-before-mastery 5/5) remain closed and untouched. Moving-HEAD debt unchanged at 18
(Class B 12, Class C seed 6) and byte-identical to the baseline. LC1 CLOSED. A2 unchanged; A4 CLOSED.
Still open elsewhere in S1B: `/debates/history`, the stale Reassess CTA, skills-compat stale XP prose.
M16 not started.

## Previous handoff — M15 S1B indexOf Batch II: evidence-before-mastery hardened (2026-08-23)

### SHIPPED and Production-verified — nothing awaits a push

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Implementation commit `64ad487f8448517f3fbdf3d46fc677249f521da5`; docs-only semantic-fix child and
deployed HEAD `98ddbed03d72348be08e02a7b11cdc79c971844a`; Production deployment **`6053725391`**,
status **SUCCESS**, automatic `vercel[bot]` deployment — no manual deploy, no rollback. Previous
baseline `0abdff1`. **Zero production changes** — four test suites plus two docs.

**One push, one deployment.** Both commits went out in a single push, so Vercel created one Production
deployment for the pushed HEAD `98ddbed`, and `6053725391` contains `64ad487` as an ancestor.
**`64ad487` has no deployment record of its own — expected, not an error**: Vercel builds the pushed
head, not every intermediate commit.

**Production verification (read-only):** local HEAD = `origin/main` = live remote = `98ddbed`, clean
**0 ahead / 0 behind**; published scope `0abdff1 → 98ddbed` = four test suites plus two docs;
**production/runtime changes ZERO**, **schema changes ZERO**. Public routes healthy; protected routes
redirect or reject unauthenticated requests; the four API routes these controls guard and the sampled
AI routes all returned **401**; **no 5xx observed**. **The Vercel runtime does not execute smoke-test
assertions.** Carried observations: `/debates/history` still returns an unauthenticated 200 with
sign-in-oriented content — the already-tracked soft-redirect debt; `/settings` returns an
unauthenticated client-rendered loading shell with no user-identifying strings in the sampled body,
which is an observation rather than a new defect.

Batch II repaired the **evidence-before-mastery** family: 5 controls, 1 already safe, 4 defective
(IDX-17 Category B; IDX-01, IDX-08, IDX-39 Category C). Each compared an earlier evidence-related
anchor against the later write it must precede — the review/evidence writer before the mastery writer
for IDX-01, IDX-08 and IDX-39, and **the evidence-floor decision before the review/evidence write
call for IDX-17**. With the earlier anchor absent `indexOf` gave `-1` and `-1 < n` still held. Each now captures
both indices, asserts both present under a `<label>-anchors` control, then asserts order — inline,
no helper, original ordering messages preserved. **IDX-38, the already-safe fifth member, was not
touched.**

**4/4 targets proved on their own assertions** (evidence absent → presence fails; mastery absent →
presence fails; reversed → ordering fails; harmless change → passes), 0 harness errors. At suite
level IDX-17 fires as `28b-anchors`; for IDX-08 and IDX-39 an earlier control sharing the anchor
throws first, so per-target isolation is the decisive evidence — the same characterised artifact as
Batch I.

**Acceptance:** the committed-artifact audit of `64ad487` proved **20/20 mutation states**, **0
harness errors**, target attribution for all four repaired controls, **4/4 affected** and **30/30 safe**
suites green, `db:generate` PASS, `tsc` clean, `build` PASS, and only the known pre-existing `<img>`
lint warning. The narrow recheck then proved `98ddbed` changed **docs only**, left the implementation
**byte-identical**, corrected the IDX-17 documentation semantics, and kept the prior acceptance
evidence applicable.

**Ordering state: safe 39 → 43, defective 9 → 5, unresolved 0.** evidence-before-mastery is now
**closed: 5 total, 5 safe, 0 defective**.

### Next implementation order as recorded at that pass — none started THEN; SUPERSEDED

1. **Batch III — transaction:** IDX-30 alone. Keep it isolated: it sits on the transaction /
   exactly-once evidence boundary, so its message should name that rule. Still test-only.
2. **Batch IV — route resolution / gating:** IDX-16, IDX-45, IDX-46, IDX-47.

**auth/rate-limit (9/9) remains safe as written and untouched.** Batch II was **test-integrity only**:
no runtime behaviour and no security defect was repaired. Production verification proves the accepted
stack deployed successfully and that live health stayed good with no observed runtime regression; it
does **not** prove smoke assertions ran inside Vercel, that runtime evidence ordering changed, or that
security behaviour was repaired — **no production or runtime file changed**. Moving-HEAD debt
unchanged at 18 (Class B 12, Class C seed 6). LC1 CLOSED. A2 unchanged; A4 CLOSED. Still open elsewhere in S1B:
`/debates/history`, the stale Reassess CTA, skills-compat stale XP prose. M16 not started.

## Previous handoff — M15 S1B indexOf Batch I: completed-retry ordering hardened (2026-08-13)

### SHIPPED and Production-verified — nothing awaits a push

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Commit `b71fc34723603fa295fab0737f92a152a5cc6c9d`, Production deployment **`5895669302`**, status
**SUCCESS**, automatic `vercel[bot]` deployment — no manual deploy, no rollback. Previous baseline
`0127177`. **Zero production changes** — six test suites plus two docs.

Production verification confirmed the exact SHA deployed, the 8-file scope, byte-identical production
trees, all 9 repairs present in the deployed artifact, 6/6 affected and 30/30 safe suites green, and
a spot-check proving the repaired **target** guards fire on a former Category B control (IDX-15) and
a former Category C control (IDX-42), with 0 harness errors.

**The audited denominator is 48 ordering comparisons across 14 safe suites**, not the 24 previously
recorded: that figure counted only direct same-line `<` comparisons and missed every captured-index
and every `>` comparison. Of the 48, **30 are safe as written** (an executable guard on the vulnerable
operand fires first) and **18 were empirically defective** — 10 suite-survivors, 8 duplicate-protected.
**Do not describe all 48 as defective.**

Vulnerability follows the operand: `a < b` exposes the **left**, `a > b` exposes the **right**.

**Batch I repaired the completed-retry family (9 of 9 defective — the weakest family).** Each now
computes both indices, asserts both present under a `<label>-anchors` control, then asserts order.
Every target was proven to fire on its own three mutations (short-circuit absent, effect absent,
order reversed); duplicate coverage was not accepted for the three Category C members. 0 harness
errors.

**Ordering state: safe 30 → 39, defective 18 → 9, unresolved 0.** completed-retry is now **closed:
9 total, 9 safe, 0 defective**.

### Next implementation order as recorded at that pass — none started THEN; SUPERSEDED

1. **Batch II — evidence-before-mastery:** IDX-01, IDX-08, IDX-17, IDX-39. Same inline mechanism as
   Batch I (capture both indices, assert both present, then assert order), four controls, smaller.
2. **Batch III — transaction:** IDX-30 alone. Keep it isolated: it sits on the transaction /
   exactly-once evidence boundary, so its message should name that rule. Still test-only.
3. **Batch IV — route resolution / gating:** IDX-16, IDX-45, IDX-46, IDX-47.

**The auth/rate-limit family (9/9) is safe as written — it needs no repair at all**, and Batch I did
not touch it. **Batch I was test-integrity only: no runtime behaviour and no security defect was
repaired.**

Moving-HEAD debt unchanged at 18 (Class B 12, Class C seed 6, learning-content 0). LC1 CLOSED.
A2 unchanged; A4 CLOSED. Still open elsewhere in S1B: `/debates/history` soft redirect, the stale
Reassess CTA, and the skills-compat stale XP prose. M16 not started.

## Previous handoff — M15 S1B-LC1: authored learning content is protected (2026-08-13)

### SHIPPED and Production-verified — nothing awaits a push

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Commit `c9b0a1dd41698bdb6b5f719f7c710c0a96199745`, Production deployment **`5894098786`**, status
**SUCCESS**, automatic `vercel[bot]` deployment — no manual deploy, no rollback. Previous baseline
`e5aeefd`. **Zero production changes** — two new test files, four modified test/registry files,
two docs.

Production verification confirmed the exact SHA deployed, the 8-file scope, byte-identical
production trees, snapshot fidelity re-derived from the deployed module, **24/24** mutation probes
matched with **0** harness errors and **0** survivors, and **30/30** safe suites green.

**THE SAFE GATE AT THAT BATCH BECAME 30/30.** Registered `*:smoke` inventory 32 → 33, safe set
29 → 30. Every later S1B prompt of that era had to expect 30; a report of 29/29 no longer meant full
coverage. **Superseded — current gate: 36 registered `*:smoke` scripts, safe battery 32** (36 minus the three database-writing suites `auth`/`team`/`assignment` and the live-provider suite `judge-shape`). Derive both numbers from `package.json`; never accept a hard-coded figure, and never accept a 30/30 report as full coverage.
`hosa-practice-scope` control `43b` asserts the exact inventory — that is what stops a new suite from
existing as a dead script nobody runs. Never loosen it to a lower bound.

### What this batch established

At that batch, `lib/learning-content.ts` held 17 authored entries: 4 published through the education
registry, 13 held. The published four had presence checks; **the held thirteen had no coverage at
all** once the moving-HEAD pins self-healed. One contract covers every entry — **Superseded — current derived truth:** `LEARNING_SKILL_CATALOG` holds **21** authored entries; **9** of them are published through the education registry and **12** are held. `EDUCATION_LESSONS` totals **12** — those 9 catalog-sourced entries plus `claim-warrant-impact`, `how-deca-roleplay-works` and `how-hosa-scenario-interaction-works`, which are not catalog entries. The integrity contract covers all 21.
The mechanism is
`scripts/learning-content-integrity-smoke.ts` canonicalises the module's **runtime values** and
compares them to `scripts/learning-content-baseline.json`.

- **Array, sorted by slug — not an object keyed by slug.** JSON allows duplicate keys and
  `JSON.parse` keeps the last silently, which would make "no duplicate baseline ids" unprovable.
- **Full snapshot, not hashes.** A hash cannot reconstruct prior prose. An edit is a **2-line diff
  naming the exact sentence**; adding a lesson is a ~100-line additive block.
- **Runtime values, not source text** — immune to comments, formatting, imports, helper renames and
  declaration order by construction.
- **ID-set equality both ways** — a new entry without a snapshot block FAILS, so nothing lands
  permanently unprotected; a removed or renamed entry FAILS as an orphan.
- **Fail-closed key sets** at every layer (8/5/8/4/9). Honest limit: a **type-only** optional field
  that no entry carries at runtime leaves the suite green; it fails the moment an entry carries it.
  The suite asserts runtime shape and cannot read type declarations — do not claim otherwise.
- **Protected:** identity, association, every authored string, learner-visible `estimatedMinutes`,
  and the **order** of `steps`/`choices`/`practiceQuestions`/`masteryCheck`.
- **Excluded with live guards:** `retry*` only because every question is provably derived — **85** at
  that batch, 111 now — with an invariant that fires if one diverges; seed-level `order` only because
  nothing reads it (re-proved each run).

**`LEARNING_CONTENT_BASELINE` is a REVIEW SIGNAL, not a security boundary.** A deliberate developer
can change source + snapshot + marker in one commit; that is acceptable because the prose delta is
explicit in review. The retired pins were different in kind — committing alone changed the expected
bytes. **Nothing here derives from HEAD.**

### Changing curriculum after this batch

- **New entry:** add the source entry and its canonical snapshot block in the same commit. Unique
  slug, `lesson.slug === slug + "-lesson"`. No marker bump needed — the ~100-line block is the review
  evidence.
- **Editing an existing entry (published OR held):** source change + snapshot change + bump
  `LEARNING_CONTENT_BASELINE` + a `docs/CURRENT_STATE.md` line naming the affected slug(s).
  This is **review policy, enforced by review** — the suite asserts only that the marker is declared,
  never that it changed, and it does not read the docs. What the suite *does* enforce is
  source ≠ approved snapshot → FAIL.

### What actually protects the curriculum

Four things, none of which is an authorization boundary: **explicit checked-in reviewed
expectations**, a **visible git diff** of any prose change, **fail-closed schema handling**, and
**safe-suite enforcement**. A deliberate developer can change source + snapshot + marker in one
commit; the point is that the change is legible in review, not that it is impossible.

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

1. **The 24 `indexOf(a) < indexOf(b)` controls** across 7 suites — a pattern that **can** pass
   vacuously when the first anchor is absent (`indexOf` gives `-1`, and `-1 < anything` holds).
   **1 of 24** empirically demonstrated; the other 23 match structurally and are unproven either way.
   Pre-existing, introduced by neither S1B-1 nor S1B-LC1. Start with a read-only inventory: which are
   genuinely vacuous, which already have an independent existence guard, and the smallest semantic
   repair for each — before touching a single assertion.
2. **S1B-2** — the 12 Class B pins.
3. **S1B-3** — the 6 `prisma/seed.ts` Class C pins.
4. **S1B, remaining** — `/debates/history` gating, stale Reassess CTA, skills-compat prose.
5. **M16** — semantic judging.

Learning-content moving-HEAD debt is **ZERO**. Remaining moving-HEAD debt is **18**: Class B 12,
Class C seed 6.

## Previous handoff — M15 S1B-1: redundant moving-HEAD pins retired (2026-08-13)

### SHIPPED and Production-verified

**Status: `SHIPPED — PRODUCTION-VERIFIED — NO DB OPERATION, NO SCHEMA CHANGE`.**
Commit `9c66b04f31ea0316dc3b4365a9ff8936ec5965e4`, Production deployment **`5892804337`**, status
**SUCCESS**, automatic `vercel[bot]` deployment from the Git push — no manual deploy, no rollback.
**Zero production-code changes:** five test files and two docs.

All of M15 S1A is now shipped and Production-verified (A1, A2, the full A3 sequence, A4a, A4b);
**A4 is CLOSED**. M14 Global G2 remains **CLOSED**. Full detail in the S1B-1 section below.

## Previous handoff — M15 S1A A4b: practice-session copy truth (2026-08-13)

**Status: `SHIPPED — PRODUCTION-VERIFIED`.** Commit `d82e714`, Production deployment
**`5884961320`**, status **SUCCESS**, automatic `vercel[bot]` deployment.

One production file (`components/app/xp-progress-card.tsx`), one suite, two docs. Copy only.

### The rule this batch encodes

**"Practice sessions" = completed Debates + graded PracticeTests. Lessons do not contribute.**
`User.streak` has exactly two writers, and `XP_REWARDS.lessonCompleted` is declared once and consumed
nowhere. If you ever make lessons award progress, this copy must change back **in the same commit**.

### Things that will look like bugs but are deliberate

- **`User.streak` is still named "streak" and is still not a streak.** Lifetime session count. Do not
  add day semantics without a real date-aware model — that was rejected in A4 planning because
  grandfathering the stored value would make one column mean two different things.
- **The word `streak` still appears in this component** as the prop identifier. The control strips
  `${...}` interpolations before checking learner-visible text, so the identifier is allowed and
  visible wording is not.

### A control lesson worth keeping

Two of the A4b controls were wrong on first write and would have blocked honest code: one flagged the
`${streak}` identifier inside a template literal as learner-facing copy, and one banned the word
"lesson" from the reward routes — which legitimately recommend lessons as *study suggestions*. The
shipped versions test the real properties instead: no visible "streak" wording, and no `LESSON`
sourceType in the ledger. **Prefer asserting the property over banning the token.**

### Next steps as of that batch (superseded by S1B-LC1 above)

The learning-content design audit and its control are now DONE. The remaining order is the 24
`indexOf` controls, then Class B, then Class C.

### M15 S1B-1 — redundant HEAD-relative pins retired (SHIPPED, Production-verified `5892804337`)

Baseline `PRE_M15_S1B = d82e714`. **Zero production changes** — five test files plus these docs.

The debt is **34** entries across **6** suites and 16 files, not the previously recorded 50 across 4
(that figure summed every file loop in four suites, including non-HEAD ones, and missed
`hosa-medterm-evidence-smoke.ts` and `review-ladder-smoke.ts`).

**14 retired.** Each removal required a named executable control that imports the module and asserts
runtime values — a comment saying "covered elsewhere" was never accepted as sufficient:

| retired pin | retained control (all in the safe 29) |
| --- | --- |
| `lib/lessons.ts` ×3 (education-migration `4.` + `4b9.`, skills-compat `27.`) | education-migration `31a`; tracks-smoke `getLesson(...).skillSlug === "debate-claim-building"` |
| `lib/roleplay-lessons.ts` ×3 | tracks-smoke `17`/`18`; hosa-practice-scope |
| `lib/education/registry.ts` ×3 | education-registry `10a`/`10b`/`10c` (exact per-track id lists), `1`, `2b` |
| `lib/education/tracks/debate.ts` ×2 | education-migration `1`/`2`/`3d`/`14a-c`; skills-compat `26` |
| `lib/authored-lesson-progress.ts` ×1 | lesson-progress (versioned key, word gate, index clamp) |
| `lib/debate-skill-practice.ts` ×1 | debate-mastery `27b-C2` — imports the grader; keyword salad still scores exactly 96 with a 7-row rubric |
| `lib/hosa-events.ts` ×1 | hosa-navigator (`hosaEventById` fails closed, never falls back to `HOSA_EVENTS[0]`) |

The duplicate `lib/lessons.ts` pin was treated as **two** entries protecting **different** facts: the
`4.` entry stood for "the authored lesson still resolves" and the `4b9.` entry for "the drill-bank
expansion did not reach the lesson path" (retained at `4b6*`). Both were mapped independently.

**2 held back — `lib/learning-content.ts`.** Classified Class A on controls `3b`/`17b`; that was
wrong. `3b` asserts the registry entry **is** the catalog object (strict `===`), so `17b` compares
that object's strings to themselves — a tautology that cannot fail on a content change.

**Read the distinction before designing the replacement — this file is NOT untested:**

| | Covered? | Evidence |
| --- | --- | --- |
| Authored field **presence** | **YES** | emptying `whyItWorks` on a migrated lesson is killed by 4 suites (`15b`–`15e` require non-empty authored fields) |
| Authored **text values** | **NO** | changed title, replaced prose, rewritten `workedExample.prompt` each survived **all 29** suites with the mutation committed so the hash self-healed |

The gap is *content integrity over authored text*, nothing broader. The pins stay; they are **not**
redundant and **not** Class B. A dedicated design audit decides the additive-only contract first.

**Remaining: 20** — Class B 12, Class C 6, held-back 2.

**Separate open debt — 24 controls across 7 suites using a pattern that CAN pass vacuously.**
Controls shaped like `indexOf(a) < indexOf(b)` never prove `a` exists first. `indexOf(a)` is `-1`
when absent, and `-1 < anything` holds, so **deleting the guarded thing can turn the control green**.
**1 of the 24 has been empirically demonstrated**; the other 23 match the pattern structurally and
have not been individually proven vacuous — do not describe all 24 as proven defective. Surfaced
while mutation-testing the `4b9.` retirement: renaming `parseStoredResult` throughout the Debate
drill submit route left `education-migration`'s `4b6f` passing (the property itself was still caught,
by `practice-session` and `review-ladder`). Count is **identical at `d82e714`** — pre-existing, not
introduced by S1B-1 or S1B-LC1. Not repaired at that batch. *(Historical: the 24 vacuous ordering controls were repaired by Batches I-IV; ordering-control state at Batch IV was safe 44 / defective 4 / unresolved 0.)*

**Never reintroduce a HEAD-relative pin.** Isolated proof of why, on `lib/roleplay-lessons.ts`: a
cosmetic uncommitted edit makes the hash FAIL (false alarm), committing it makes the hash PASS, and a
**committed property break also PASSES** — the hash waves through exactly what it claims to guard.
The retained controls pass every cosmetic case and fail the break in both commit states.

### Standing constraints (unchanged)

No push, deploy, schema change, migration, `db push`/seed, dependency install, or destructive git
without explicit approval. Never run `auth:smoke`, `team:smoke`, `assignment:smoke`, or
`deca:skills:activate`. **Never open `.env`, read `DATABASE_URL`, or query any shared database.**
M14 Global G2 remains **CLOSED**.

## Previous handoff — M15 S1A A4a: daily XP bounded, practice unlimited (2026-08-13)

### At that pass: one local commit awaited the owner push, then read-only Production verification

**Superseded — that commit was pushed and Production-verified long ago. Nothing here awaits a push.**

**Status when written (superseded — since pushed and Production-verified): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

Six production files, three suites, two docs. Read the A4a section of `docs/CURRENT_STATE.md` first.

### Things that will look like bugs but are deliberate

- **`User.streak` is still called "streak" in the schema and is NOT a streak.** It is a lifetime count
  of completed practice activities. Do not convert it to a daily/consecutive-day counter without a
  real date-aware model — grandfathering the stored value while changing the meaning would produce a
  hybrid number that is neither.
- **A zero-amount XPLog row is written past the quota, on purpose.** It keeps the coach's "active"
  date truthful and is the persisted reward fact the PracticeTest results page reads. The quota query
  filters `amount > 0`, so zero rows never consume quota. Do not "clean up" these rows.
- **The PracticeTest results page shows nothing when its ledger row is missing.** That is the
  no-fabrication rule: a missing row proves neither an award nor that the limit was hit, and tests
  graded before A4a have no row. Do not add a fallback amount.
- **`awardXpInTransaction` is skipped, not called with 0, past the quota.** Calling it with zero would
  be two pointless writes and a rank re-derivation from an unchanged value.
- **The lock goes AFTER the A2 claim, never before.** Order is `Debate/Test row → User row`. No route
  may take the User lock and then claim a Debate or PracticeTest row — that reverse edge would create
  a deadlock cycle. All eight pre-existing `lockUserRow` callers take `User → PracticeSession` only.

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

1. Owner pushes the A4a commit. **Do not push automatically.**
2. Read-only Production verification (SHA/deployment identity, route health, deployed protocol order,
   quota predicates, Z1 rows, UI truth, A3/A2/A1/G2 freezes, 29 suites). No DB access, no auth.
3. **A4b** — tiny and wording-only: remove the false "debates, tests, and lessons" claim from
   `components/app/xp-progress-card.tsx`. Practice sessions = completed Debates + graded PracticeTests.
4. **S1B** — `/debates/history` gating, stale Reassess CTA, skills-compat prose, and the 50
   HEAD-relative test pins.

### Standing constraints (unchanged)

No push, deploy, schema change, migration, `db push`/seed, dependency install, or destructive git
without explicit approval. Never run `auth:smoke`, `team:smoke`, `assignment:smoke`, or
`deca:skills:activate`. **Never open `.env`, read `DATABASE_URL`, or query any shared database.**
M14 Global G2 remains **CLOSED**.

## Previous handoff — M15 S1A A3b-3: coach and assignment labels align (2026-08-13)

### At that pass: one local commit awaited the owner push, then read-only Production verification

**Superseded — that commit was pushed and Production-verified long ago. Nothing here awaits a push.**

**Status when written (superseded — since pushed and Production-verified): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

Three production files (coach roster, coach student detail, `lib/assignments.ts`) plus five suites and
docs. This closes the A3 honesty pass. Read the A3b-3 section of `docs/CURRENT_STATE.md` for details.

### The important part: four vacuous HEAD-relative pins were replaced

Four suites byte-pinned `lib/assignments.ts` against **`git show HEAD:`**. That form fails only while
a change is uncommitted and passes again the instant HEAD advances onto it — committing would have
produced a green suite that verified nothing. **If you ever see a `${file} is byte-identical to HEAD`
assertion, treat it as decoration, not protection.** The replacements are semantic and per-suite.

**50 more HEAD-relative pins remain** in those same four files (education-migration 20, skills-compat
16, deca-mastery 8, debate-mastery 6). All have the identical flaw. They are recorded as S1B
test-integrity debt and were deliberately not touched here.

*(Superseded by the S1B audit — kept as written to record what was believed at the time. The exact
figure is **34** entries across **6** suites: this estimate counted every `for (const file of [...])`
loop in four suites, including ordinary content-assertion loops that use no HEAD helper, and omitted
`hosa-medterm-evidence-smoke.ts` and `review-ladder-smoke.ts`. S1B-1 retired 14; 20 remain.)*

### Things that will look like bugs but are deliberate

- **The debate qualification controls are scoped per function, not per file.** `validateEvidence` and
  `getStudentEvidenceOptions` both contain the same JUDGED / ownership / `PRACTICE_REBUTTAL` lines. A
  file-wide search passes while one copy is missing — a mutant that stripped JUDGED from the
  *accepting* path survived an earlier draft. Do not "simplify" these back to a global search.
- **Coach roster activity is `xp > 0` alone.** Not an oversight: `User.wins` is frozen, and XP is a
  strict superset because every win came with completion XP in the same transaction.
- **`lib/assignment-types.ts` now has two pins** — the old HEAD one (left untouched, it is not this
  batch's business) and a new immutable one against `e652cbe3`. The immutable one is the real guard.

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

1. Owner pushes the A3b-3 commit. **Do not push automatically.**
2. Read-only Production verification. Note for that run: the four repaired suites will pass whether or
   not the commit landed, so **verify the deployed SHA from git and the deployment record**, not from
   suite colour.
3. **A4** — the last major part of S1A: uncapped Debate creation, completion-XP farming, PracticeTest
   XP policy, streak semantics, reward design.
4. **S1B** — `/debates/history` gating style, stale "Reassess now" CTA, skills-compat prose, and the
   50 HEAD-relative pins above.

### Standing constraints (unchanged)

No push, deploy, schema change, migration, `db push`/seed, dependency install, or destructive git
without explicit approval. Never run `auth:smoke`, `team:smoke`, `assignment:smoke`, or
`deca:skills:activate`. **Never open `.env`, read `DATABASE_URL`, or query any shared database.**
M14 Global G2 remains **CLOSED**.

## Previous handoff — M15 S1A A3b-2: learner stats speak the ballot's language (2026-08-13)

### At that pass: one local commit awaited the owner push, then read-only Production verification

**Superseded — that commit was pushed and Production-verified long ago. Nothing here awaits a push.**

**Status when written (superseded — since pushed and Production-verified): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

Three production files — dashboard, profile, replay — plus `scripts/judge-shape-smoke.ts` and docs.
Presentation only. Read the A3b-2 section of `docs/CURRENT_STATE.md` for the exact final copy.

### Things that will look like bugs but are deliberate

- **The profile wins chip is gone, not renamed.** A frozen counter under any label ("Legacy wins",
  "Practice wins") stays a prominent dead metric. `User.wins` is still selected and still stored —
  hiding is not deleting. Do not "restore" it and do not reset the column.
- **The profile stat grid is one column now.** Removing one of two chips from a `grid-cols-2` would
  otherwise leave a half-width card beside an empty cell.
- **Replay changed in three places, not two.** Visible label, read-aloud string, and the attempt
  list. If you ever touch replay copy again, change all three together — a spoken "Overall score"
  after a visible "Practice ballot score" reintroduces the exact claim we retired.
- **The dashboard's `wins` variable still exists.** It feeds `calculateDebateRating` for internal
  bot matching, which is never displayed as a rating. Only the rendered copy was removed.

### Two immutable pins — do not merge them

`PRE_M15_A3B1` = `9b396753` (ballot-era defects: "Judge decision", "Overall score",
"Rating movement", the composed "Winner unavailable wins").
`PRE_M15_A3B2` = `7b4f78ac` (stat-surface defects: legacy wins copy, "avg judge score",
"% judge score", replay "Overall score").
Each control pins the commit where its own defect existed. Neither is HEAD-relative. A control that
pins the wrong baseline silently stops proving anything.

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

1. Owner pushes the A3b-2 commit. **Do not push automatically.**
2. Read-only Production verification (SHA/deployment identity, route health, deployed copy on all
   three surfaces, A3b-1 ballot intact, A3a authority intact, A2, A1, G2, 29 suites). No DB access,
   no authentication.
3. **A3b-3** — the last of the honesty pass: coach roster wins (note its `hasActivity = xp > 0 ||
   wins > 0` still references the frozen counter), coach average-score label, assignment picker score
   label. Keep the same dictionary: `judged rounds`, `practice ballot score`, `avg practice ballot
   score`. Do not invent a second name for the same number.
4. **A4** then finishes reward integrity: uncapped Debate creation, completion-XP farming,
   PracticeTest XP, streak semantics.

### Standing constraints (unchanged)

No push, deploy, schema change, migration, `db push`/seed, dependency install, or destructive git
without explicit approval. Never run `auth:smoke`, `team:smoke`, `assignment:smoke`, or
`deca:skills:activate`. **Never open `.env`, read `DATABASE_URL`, or query any shared database.**
M14 Global G2 remains **CLOSED**.

## Previous handoff — M15 S1A A3b-1: the Debate ballot is a practice ballot (2026-08-13)

### At that pass: one local commit awaited the owner push, then read-only Production verification

**Superseded — that commit was pushed and Production-verified long ago. Nothing here awaits a push.**

**Status when written (superseded — since pushed and Production-verified): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

A3a removed false progression authority; A3b-1 removes false **presentation** authority from the
ballot. Wording and hierarchy only. Read the A3b-1 section of `docs/CURRENT_STATE.md` for the exact
final copy.

Three production files: `components/debate/debate-arena.tsx`, `lib/ai.ts`,
`app/api/debates/[debateId]/judge/route.ts` (prose only). `lib/ai-providers.ts` was deliberately NOT
touched — the ballot stopped consuming the generic banner instead, so the banner stays truthful
everywhere else.

### Things that will look like bugs but are deliberate

- **The signed rating deltas are gone on purpose.** `judgeReport.ratingChange.*` still STORES the
  numbers; the ballot derives a word from them at render time. That is what makes pre-A3b-1 ballots
  replay honestly. Do not "restore" the `+9` display, and do not migrate the stored shape.
- **A solo DECA role-play shows `Practice round scored`, not a winner.** DECA's result type has no
  `teamWinner`; the old code rendered "Winner unavailable wins" and a fabricated losing side. The
  branch is intentional — do not collapse it back to one headline.
- **No provider name appears on the ballot.** On Path A the provider never scores, so naming it beside
  the score misled. Other AI features keep their banner.
- **The mastery/readiness line appears exactly once**, and a smoke control enforces that. Adding the
  same disclaimer to each of the sixteen category cards is a regression, not an improvement.

### The line A3b-1 must not cross

A3a authority is frozen and byte-verified: completion-only XP, no `XP_REWARDS.debateWon`, no wins
write, no snapshot write, `progressionBasis: "completion-only"`, `scoredBy` from the real
`scoringMode`, `assisted` from `assistedPractice`, A2 claim first in the transaction. The judge route
may be edited for **wording only**; if a copy change ever seems to need progression logic, stop.

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

1. Owner pushes the A3b-1 commit. **Do not push automatically.**
2. Read-only Production verification (SHA/deployment identity, route health, deployed copy, A3a
   authority controls, A2, A1, G2, 29 suites). No DB access, no authentication.
3. Owner reviews the rendered ballot before A3b-2 begins.
4. **A3b-2:** dashboard legacy wins + practice-score labels, profile legacy wins + recent-debate
   score label, replay score wording. **A3b-3:** coach roster wins, coach average-score label,
   assignment picker label. Terminology dictionary is in the A3b plan — keep `practice ballot score`
   consistent; do not invent a second name for the same number.
5. **A4** then follows: uncapped Debate creation, completion-XP farming, PracticeTest XP, streak.

### Standing constraints (unchanged)

No push, deploy, schema change, migration, `db push`/seed, dependency install, or destructive git
without explicit approval. Never run `auth:smoke`, `team:smoke`, `assignment:smoke`, or
`deca:skills:activate`. **Never open `.env`, read `DATABASE_URL`, or query any shared database.**
M14 Global G2 remains **CLOSED**.

## Previous handoff — M15 S1A A3a: formative ballot authority removed (2026-08-12)

### At that pass: one local commit awaited the owner push, then read-only Production verification

**Superseded — that commit was pushed and Production-verified long ago. Nothing here awaits a push.**

**Status when written (superseded — since pushed and Production-verified): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NOT PRODUCTION-VERIFIED, NO DB OPERATION, NO SCHEMA CHANGE`.**

A3a installs one rule: **a formative ballot may coach the learner but may not create authoritative
competition progression.** Read the A3a section of `docs/CURRENT_STATE.md` first — it carries the
full evidence, including the measurement showing a marker-stuffed circular speech beating genuine
reasoning **98–65 from either seat** on the local lexical judge.

### ⚠ DATABASE-CREDENTIAL EXPOSURE INCIDENT (2026-08-12) — rotation status UNVERIFIED

**Historical incident.** During pre-commit review an automated review process read the database
connection string from the environment file and ran **read-only** queries directly against the shared
production database. That access was **not authorized**. No writes were reported, so it is not a
data-corruption incident, but the credential could not be trusted afterwards. The recorded remedy was
to rotate it at the provider, update the Production environment secret, and replace the local secret
through normal secret management. The final A3a validation was run **source-only with no database
access**, so nothing in that section depended on the credential.

**Current status: UNVERIFIED.** Neither canonical document nor any repository evidence records
whether that rotation was carried out. This sweep does not claim it happened and does not claim it
did not — establishing that requires provider-side evidence the owner holds, and it is deliberately
outside every audit run here.

**Standing safety rule, unchanged and unconditional.** Audits and agents must never open `.env` or
`.env.local`, never read or print `DATABASE_URL`, never use Production database credentials, and
never record a secret value in a document, commit, or assistant transcript. Any rotation or
confirmation is an owner action performed separately. **B2.3 does not depend on resolving this** — it
is a standing owner item, not a gate.

### What A3a changed — do not undo any of it

Six files. Production: `app/api/debates/[debateId]/judge/route.ts`, `lib/coach-progress.ts`,
`app/(app)/coach/students/[studentId]/page.tsx`. Suites: `scripts/judge-shape-smoke.ts`,
`scripts/practice-session-smoke.ts`, `scripts/hosa-practice-scope-smoke.ts`.

- **No win-bonus XP** (`xpEarned = XP_REWARDS.debateCompleted`). **Keep `XP_REWARDS.debateWon` in
  `lib/constants.ts`** — it is retained on purpose for a validated M16 judge.
- **No `User.wins` write.** `wins` is still read for the internal bot-matching projection and still
  returned. History is untouched — never reset, backfill, or "repair" it.
- **No `SpeakingSkillSnapshot` row on any path, DECA included.** Model, schema and historical rows
  retained; M16 may resume writing behind a trust gate.
- **`scoredBy` follows the real scoring mode, never the organization.** DECA may be labelled
  `ai-registry-weighted` **only** when `result.scoringMode === "registry-weighted"`; today its point
  split is unsourced, so `ai-seed-rubric` is the truthful value. Hardcoding the DECA label was a
  defect caught in adversarial review — do not reintroduce it.
- **`progressionBasis: "completion-only"` on every path.** `"scored"` is not a permitted value.
- **`assisted`** mirrors the stored `Debate.assistedPractice`.
- **Coach fabricated-loss regression fixed.** `losses = judgedRounds - wins` is gone, and the
  Wins/Losses chip pair is gone from the coach student-detail page. A3a froze `wins` while
  `judgedRounds` keeps climbing, so that subtraction would have reported every future judged round
  as a loss. If you ever restore a coach win/loss record, it needs a real recorded outcome first.

### The winner still exists — that is intentional

`didStudentWin` / `teamWinner` are still computed, stored and displayed, because the practice
decision is useful coaching. What changed is that no write depends on them. **Two suite assertions
were inverted** (`practice-session-smoke.ts` 144, `hosa-practice-scope-smoke.ts` 46d) because they
positively pinned the retired `wins: wonDebate ? user.wins + 1 : user.wins` contract; both now
assert the opposite and both carry frozen-baseline controls proving they still bite.

### Test discipline that must survive

The anti-leak control checks **value flow**, not proximity. An earlier line-local version was killed
in review: every write in that route is multi-line, so it passed against the pre-A3a route AND let
`const winBonus = wonDebate ? 50 : 0; … xpEarned + winBonus` ship green. The current controls extract
each write's full balanced argument block and pin the XP flow to a bare identifier. Eight mutation
probes (source-only, scratch copies) run **8/8 killed, 0 survivors**. Do not weaken these to
line-based or global-substring checks.

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

1. Owner pushes the A3a commit through GitHub Desktop. **Do not push automatically.**
2. Read-only Production verification: SHA/deployment identity, route health, deployed-source policy
   checks (no win bonus, no wins write, no snapshot write, basis fields present, `scoredBy` derived
   from `scoringMode`), A2 claims intact, A1 intact, G2 frozen, 29 suites green. No authenticated
   simulation, no DB-writing test.
3. **Rotate the database credential** (the 2026-08-12 incident above). Whether that rotation was
   carried out is UNVERIFIED from repository evidence — see the incident section; it is a standing
   owner item, not a gate on any slice.
4. Then **A3b**: practice-ballot framing, the 6xl score, category framing, "Rating movement", the
   misleading provider/fallback notice, and **all six** visible historical `Wins` surfaces — the
   owner has decided terminology must be consistent everywhere, not partially relabelled. Review the
   exact strings with the owner before implementing.
5. **A4** stays deferred: uncapped low-effort Debate creation and completion-XP farming, PracticeTest
   XP policy, streak semantics, reward design.

### Standing constraints (unchanged)

No push, deploy, schema change, migration, `db push`/seed, dependency install, or destructive git
without explicit approval. Never run `auth:smoke`, `team:smoke`, `assignment:smoke`, or
`deca:skills:activate`. **Never open `.env`, read `DATABASE_URL`, or query any shared database.**
M14 Global G2 remains **CLOSED** — do not reopen it.

## Previous handoff — M15 S1A A2: judged attempts exactly-once (2026-08-12)

### Shipped and Production-verified at `5879894892`

**Status when written (superseded — since pushed and Production-verified): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NO DB OPERATION, NO SCHEMA CHANGE`.**

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

## Previous handoff — M15 S1A A1: Debate writing practice is FORMATIVE (2026-08-12)

### At that pass: one local commit awaited the owner push, then read-only Production verification

**Superseded — that commit was pushed and Production-verified long ago. Nothing here awaits a push.**

**Status when written (superseded — since pushed and Production-verified): `IMPLEMENTED LOCALLY — ONE COMMIT — NOT PUSHED, NOT DEPLOYED, NO DB OPERATION, NO SCHEMA CHANGE`.**

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

## Previous handoff — M14 GLOBAL G2: CLOSED (2026-08-12)

### M14 GLOBAL G2: CLOSED — no remaining G2 action

**M14 Global G2 is CLOSED as of 2026-08-12 by explicit project-owner decision.** The accepted
definition of done is satisfied: final depth **420/420** (Debate **120**, DECA **120**, HOSA **180**),
bank-count deficit **0**, G2 integrity controls intact, all required deployments and Production
verifications complete, Slice 8 governance recorded truthfully as owner-waived external human review,
and the pre-closure fake-mastery invariant violation remediated and verified. **There is no remaining
G2 action.** Closing G2 resolves this milestone only; it says nothing about unrelated future work.

**Final verified pre-closure state:** SHA **`96bcdaa0abd94790ce683d1df81988e9753637d5`** = local =
`origin/main`, ahead/behind 0/0 → Production deployment **`5878478987`**, status **SUCCESS**,
automatic `vercel[bot]` deployment. Health: `/` and `/signin` 200 · protected pages 307 → `/signin` ·
unauthenticated drill APIs 401 · zero checked 5xx · no DB write, no authentication, no learner
session, no manual deploy, no rollback.

**Review/provenance truth (permanent):** Slices 1–7 were genuinely human-reviewed. Slice 8 was
AI-assisted and AI-reviewed; external human review was waived by the project owner on 2026-08-12,
and the owner separately stated approval. No item-by-item external human review is certified for
Slice 8. **Never describe the banks as 8/8 human-reviewed.**

**What the pre-closure remediation shipped (`96bcdaa`, do not undo):** Slice 8 provenance corrected
to the owner-waiver wording · Slice 8 Production verification recorded · the HOSA Event HQ false
mastery-record claim removed (the page now promises preparation, not persistence; Debate's genuine
mastery copy untouched) · non-vacuous regression guard `38`–`38-C1b` in
`scripts/hosa-medterm-evidence-smoke.ts`, verified to fire on the pre-fix page.

**Carried non-blocking debt (outside G2 closure scope; do not silently fix, do not reopen G2):**
1. `pi-07` / ⟨B-2⟩ — curriculum-consistency debt (legacy items stay byte-immutable).
2. HOSA `sf-04` `-ology`/`-logy` — terminology/convention debt, deliberately unresolved.
3. HOSA word-root / combining-form notation — stylistic normalisation debt.
The HOSA Event HQ claim is **not** open debt — resolved and Production-verified.

### Standing constraints (unchanged by closure)

Never run `auth:smoke` / `team:smoke` / `assignment:smoke` / `deca:skills:activate` (write-capable,
shared production DB). `PRE_G2_EXPANSION` stays absolute; never HEAD-relative; never re-anchored.
Legacy bank items stay byte-immutable. No push, deploy, or DB operation without explicit owner
action. AI-generated content stays labelled; provenance stays truthful.

## Previous handoff — M14 Global G2 pre-closure remediation (2026-08-12)

### Status (superseded): remediation has since been pushed, verified at `5878478987`, and G2 CLOSED

Slice 8 (marketing-fundamentals 9→30) is live: Production deployment **`5878064863`** from
**`ece9a91a9c6efe1471b3bc4b4ee807fea71180db`**, `vercel[bot]`, **success**; canonical routes 200,
protected pages 307 → `/signin`, drill/session APIs 401 unauthenticated, zero checked 5xx, no manual
deploy, no DB write, no authenticated session. DECA 120 · Debate 120 · HOSA 180 · **corpus 420/420,
bank-count deficit 0**, all integrity controls intact (re-executed at the deployed HEAD).

On top of that sat **ONE local commit** — `fix(g2): clear pre-closure integrity blockers`
(`96bcdaa`) — resolving the three blockers the final read-only closure audit found. It has since been
pushed and Production-verified (deployment `5878478987`), and G2 was closed by explicit owner
decision on 2026-08-12 — see the Latest handoff.

### What the remediation commit contains — do not undo any of it

1. **Slice 8 provenance corrected to the truth.** The `HUMAN-APPROVED` headline is gone. The source
   label in `lib/deca-drills.ts` and both docs now read: **AI-ASSISTED AND AI-REVIEWED — EXTERNAL
   HUMAN REVIEW WAIVED BY PROJECT OWNER 2026-08-12.** The owner received the final 21-question packet
   (choices permuted for independence) and separately stated approval; **no item-by-item external
   human review is certified**; AI review is supplementary QA and does not count as human review.
   **Slices 1–7 were genuinely human-reviewed; Slice 8's waiver is the recorded exception. Never
   claim 8/8 human-reviewed.**
2. **Slice 8 Production verification recorded** (details above and in CURRENT_STATE).
3. **HOSA Event HQ false mastery claim fixed.** The event page told learners *"Everything on this
   page feeds the same real mastery record"* — false for review-only HOSA MedTerm (no MasteryProgress,
   no XP; flashcards persist nothing) and a violation of the global **no fake mastery/progress**
   invariant (G19 class; the Study Arcade fix and guard never covered this page). The HOSA overview
   now promises preparation, not persistence ("Use the activities on this page together to prepare
   for the exam") and the "Skills & lessons" tile no longer claims a mastery record. Debate's
   "real mastery + spaced review" copy is untouched — Debate genuinely writes MasteryProgress.
4. **Regression guard** in `scripts/hosa-medterm-evidence-smoke.ts` (controls `38`–`38-C1b`): the
   mastery-record claim pattern is banned from the page's learner-facing text (comments stripped),
   the review-only HOSA entry may not mention mastery at all, the replacement copy must promise
   preparation, and the removed sentences are proven still caught by the same predicates. Verified
   to fire on the pre-fix page. Debate/DECA entries are exempt by scope, not by loophole.

### Next steps — all completed (push → verification → owner closure, 2026-08-12)

### Carried non-blocking debt (recorded, not fixed, do not silently fix)

- `pi-07` / ⟨B-2⟩ — legacy item presupposes explicit PI signposting is settled; curriculum treats it
  as a contested judgment call. Legacy items are immutable under G2's own controls; separate
  curriculum debt.
- `sf-04` `-ology`/`-logy` — dictionary-convention wording; deliberately-unresolved HOSA decision.
- HOSA word-root combining-form notation mix — stylistic follow-up, explicitly excluded from Phase 2a.
- The HOSA Event HQ mastery claim is **no longer** carried debt — resolved by this remediation.

### Standing constraints (unchanged)

Never run `auth:smoke` / `team:smoke` / `assignment:smoke` / `deca:skills:activate` (write-capable,
shared production DB). `PRE_G2_EXPANSION` stays absolute; never HEAD-relative. Legacy bank items stay
byte-immutable. No push, deploy, or DB operation without explicit owner action.

## Previous handoff — M14 Global G2 Slice 8 / DECA Slice 4: MK 9→30 (2026-08-12)

### Status (superseded; provenance wording corrected 2026-08-12): four local commits awaited the owner's push

**`READY FOR OWNER PUSH — NOT YET PUSHED, NOT DEPLOYED`** *(historical; the push has since happened
and the provenance headline was corrected — see the Latest handoff)*. Four local commits on `main`,
ahead of `origin/main` by four:

1. `c27729d` — implementation: `mk-10`…`mk-30` (+21), both smoke suites (depth 30, `FORBIDDEN_PREFIXES`
   retired into the withheld-authority probe, shallow control re-based onto pool-vs-overdraw), docs.
2. `6fa3c0b` — learner-facing authoring meta-language removed ("the stem", "this question": 7 → 0).
3. `3cd1e2c` — final content quality: correctness/grounding/stem-necessity hardening, template-artifact
   removal, same-session leak fixes. **This is the final shipping text.**
4. This provenance commit (source-label approval record + these docs).

The push is a manual owner action in GitHub Desktop. After the push: read-only Production verification,
then the **separate** Global G2 closure decision. **At that point G2 was not to be marked complete
or closed before both.** *(Superseded: G2 CLOSED 2026-08-12 at 420/420, deficit 0. That directive bound the agents of its own era; it does not authorise a future agent to contradict the canonical live state.)*

`lib/deca-drills.ts` is 120 questions: pi 30 · br 30 · cr 30 (deployed, reviewed) · **mk 30
(AI-reviewed; external human review owner-waived; push pending **at that slice** — since pushed)**. Debate 120 and HOSA 180 untouched. Corpus 420, bank-count deficit 0.

### Review provenance — keep it exactly this truthful

- AI authored and adversarially audited the 21 items (labelled AI-ASSISTED in source).
- An AI reviewer approved the content. That is **supplementary AI QA, not human review**; AI
  self-review does not count either. Nothing in the record represents AI review as human review.
- **EXTERNAL HUMAN REVIEW WAIVED BY PROJECT OWNER 2026-08-12** *(wording corrected from the original
  `HUMAN-APPROVED` headline)*: the owner received the final 21-question packet — choices permuted per
  item so the authored answer position carried no signal — and separately stated approval of the
  final set; no item-by-item external human review is certified.

### The content standard the final text was verified against — keep it

Choices state candidate decisions; the stem supplies the evidence; the explanation supplies the
reasoning. Every wrong option is defeated by a **printed stem fact or printed decision requirement**,
never by a general marketing maxim, and every key is grounded clause-by-clause. Final audit on the
shipping text: exactly-one **21/21** · key grounding **21/21** · explanation grounding **21/21** ·
stem necessity **21/21** · application depth **21/21** · CR drift **0** · keyed BR economics **0**
(BR content survives only as the CPA wrong option in `mk-29` and the earns-vs-says contrast in
`mk-22`'s explanation). Deterministic form battery clean across every check; real same-session
leakage 0.

**On stem-blind LLM measurements, so nobody re-litigates them:** analysts shown only shuffled option
texts still score ~59–60% vs 25% chance, but their FORM-classified clues predict at ~chance (33%)
while MARKETING-classified clues predict at 78%. The residual solvability is marketing knowledge, not
answer-form leakage, and the raw percentage is **not** a gate. Do not run further wording passes to
chase it — two such passes made the bank worse before this was understood.

### Standing constraints (unchanged)

- Never run `auth:smoke`, `team:smoke`, `assignment:smoke`, `deca:skills:activate` — write-capable
  against the shared production DB.
- `docs/curriculum/02-deca-course.md` byte-unchanged; ⟨BC-5⟩ not reopened.
- `mk-01`…`mk-09` and all pi/br/cr items byte-identical; `mk-09`'s single added comma is the only
  legacy byte change (Slice 0 normaliser boundary, controls `G0-C1e`…); `PRE_G2_EXPANSION` absolute.
- No push, deploy, or DB operation without explicit owner action/approval.

### After the push

1. Read-only Production verification (deployment status, routes 200/307/401, zero 5xx, no DB write).
2. Then the separate, explicit **Global M14 G2 closure decision** — G2 was OPEN until that decision
   was recorded; a bank-count deficit of zero is not a completed milestone. That decision was
   recorded on 2026-08-12 and **G2 is CLOSED**.

## Previous handoff — M14 Global G2 Slice 7 / DECA Slice 3: CR 9→30 (2026-08-12)

### Slice 7 is DEPLOYED, HUMAN-REVIEWED, and PRODUCTION-VERIFIED

Status: **`DEPLOYED, HUMAN-REVIEWED, AND PRODUCTION-VERIFIED`.**

Production deployment **`5874440794`** from source SHA **`d877d2ed7339e6bbf2ec82c81f6c612484fea4e9`**,
created automatically by `vercel[bot]` from the Git push, status **success**. Local HEAD = `origin/main`
= remote main, **0 / 0**. Post-deploy checks: canonical public routes 200 · protected learner routes and
dashboard 307 to `/signin` · the five drill APIs 401 unauthenticated · **zero 5xx** · **no DB write, no
manual deploy, no rollback**.

**Two separate gates, both now met. Keep them distinct in the record.**

**1. Content-quality gate — PASS**, by AI adversarial audit: 21/21 exactly one defensible answer ·
21/21 fact-sufficient · 0 hidden policy · 0 hidden authority · 0 hidden capability/access · 0
explanation-only defects · 0 item-level form leaks · 0 boundary defects · 0 legacy-debt defects.

**2. Human review gate — PASS (2026-08-12).** An **external human reviewer personally reviewed all 21
final Customer Relations questions, `cr-10` through `cr-30`, at the final shipping content** and
approved the complete set **without requested changes**. Earlier human feedback had already shaped the
content: a human identified the item-level answer-form leakage the slice-wide metrics had masked, and
a human blind-quiz answer surfaced the `cr-20` ambiguity — both triggered adversarial work that found
defects nothing else had.

**A separate Google Gemini review also found no content changes necessary.** That is **supplementary
AI QA and does NOT count as human review** — the gate is satisfied by the external human reviewer
alone. Neither AI self-review nor review by another AI system satisfies it.

Both gates were met **before** the push, in that order, and the push was a manual action taken with
explicit approval per CLAUDE.md.

**The CR/MK curriculum approval is a separate, completed thing and is NOT reopened.** It is deployed
and human-reviewed at `8cb181e` (deployment `5864802348`, `Production`, `success`), and the approved
**CR1–CR6** lessons were this slice's source of truth. New drill questions do not invalidate an
approved curriculum — do not reopen ⟨BC-5⟩.

`lib/deca-drills.ts` gained 21 customer-relations questions (`cr-10`…`cr-30`), taking CR 9→30 and the
DECA bank 78→99.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — depth COMPLETE, deployed, reviewed |
| `lib/deca-drills.ts` | **99** | pi 30 · br 30 (both deployed, reviewed) · **cr 30 (human-reviewed, ready for push)** · mk 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit then 21** (was 42), **entirely marketing-fundamentals**. Corpus 378 → **399** locally; target 420.

### The ⟨BC-3⟩ / F-8 rule is what governs CR question quality — keep it

Every one of the 21 states in its stem the policy and authority facts its keyed answer turns on.
**Hidden policy: 0 of 21. Hidden authority: 0 of 21.** Where policy is not material (`cr-15`, `cr-17`,
`cr-19`) none was invented. Four items (`cr-13`, `cr-16`, `cr-17`, `cr-26`) leave one fact unknown **on
purpose** — spotting the gap is the learner decision — while still stating the policy/authority frame.
**Any future CR item must satisfy this.**

### What Slice 7 changed — do not undo any of it

- **`G0-7b4c` control moved `cr-10` → `cr-31`.** This was the known trap: `cr-10` was an out-of-set
  probe through Slice 6 and became a legitimate addition here, so keeping it would have inverted the
  assertion. New **`G0-7b4d`** proves `cr-10` and `cr-30` ARE in the expected set — the boundary moved
  provably rather than quietly loosening. `cr-09` was added as the lower probe.
- **CR legacy-order guard added** — `G0-D7` (drills) and `26m2` (mastery). The mastery suite indexes
  **`CR.slice(0, 2)`** at [scripts/deca-mastery-smoke.ts:291](scripts/deca-mastery-smoke.ts:291) for
  tests `10`/`10b`/`10c`, so `cr-01`/`cr-02` must remain the first two CR entries. Real index
  dependency, not ceremony. **No BR order assertion was added — nothing indexes BR.**
- **`CR.slice(0, 2)` was NOT re-based.** `uniqueTotal` counts submitted ids, not pool size, so CR stays
  2 and PI stays 3; 2 < the floor of 5, so `10c` still records nothing. Pool growth 9→30 changed none
  of it.
- **A second hardcoded `42`** lived in the predicate control at `deca-drills-smoke.ts`; `tsc` caught it
  (`'63' and '42' have no overlap`). It now derives from `EXPECTED_ADDED.length` and cannot drift.
- **NO legacy punctuation changed.** CR is a MIDDLE block so `cr-09` already had its comma.
  **At that slice `mk-09` was still the final array element and still comma-less** — Slice 8 owned
  that boundary. *(Historical: superseded — `mk-09` is no longer the final DECA array element; marketing-fundamentals was expanded in G2 Slice 8 and the bank now ends at `mk-30`.)*
- **MK stayed the shallow control in both suites.** Parking it on MK at Slice 6 was the right call: it
  moved exactly ONCE. **MK was then the only shallow DECA area**, so **Slice 8 had to re-base this
  control onto a >30 overdraw** — HOSA `11g` and Debate Slice 4 precedent. Both exact-count
  assertions went TWO → ONE. *(Historical: superseded — every DECA area holds 30 and every HOSA area holds 30; no shallow area remains.)*
- **Authorization at that slice:** `EXPANDED_AREAS` was PI, BR, **CR**. MK was then unauthorised;
  `G0-C6b` = **1**, `G0-C6b2` named MK specifically, `mk-10` was then rejected at stage
  `unauthorised`. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)* `G0-7b` is now a **63-id**
  guarantee with `G0-7b2d` asserting zero MK additions; forbidden prefixes narrowed to `["mk"]`.

### Slice 7 was REFINED after the human-review packet — NOT approved AT THAT POINT (later approved and shipped)

The read-only review packet raised four should-fix issues; all four are resolved in the refinement
commit. **At that point the questions were unapproved and the do-not-push gate stood.** It was later lifted;
the slice shipped.

**F7-1 — answer-length leakage (the important one).** The key was the longest choice in **18 of 21**.
Choice *order* is shuffled at serve time by `buildServedChoices`, but choice *length* is not, so
"always pick the longest" would have scored **≈86%** with no understanding of Customer Relations. Ten
distractors were rewritten to carry their own reasoning — which makes them genuinely more tempting
rather than padded.

**F7-10 — the aggregate metric was not enough, and the user caught it.** This is the most important
lesson in the slice. With the slice-wide figure at 4 of 21 key-longest, the repository owner read
`cr-10` and saw the key still announced itself: the only choice combining policy *and* authority, the
only fully reasoned option, distractors far simpler. **A bank can pass a global "pick-the-longest" test
and still leak item by item — the learner answers one question, not the average.** A per-item detector
was written (unique length · uniquely multi-clause · unique policy/authority vocabulary · unique
qualifiers · distractors much simpler) and found **9 of 21 leaking**, not 4: `cr-10`, `cr-13`, `cr-16`,
`cr-17`, `cr-20`, `cr-23`, `cr-24`, `cr-27`, `cr-30`. All nine were fixed by **making the wrong answers
equally serious**, never by trimming keys — e.g. `cr-10`'s "said more warmly" became "skipped the
acknowledgement the customer was owed before any remedy was discussed", and `cr-24` gained an
escalation distractor with the same four-step shape as the key.

**Item-level form leaks: 0 of 21.** Final distribution: key longest **5 of 21**, shortest **4 of 21**,
neither **12 of 21**, mean **0.90**, median **0.92**, max **1.09**, min **0.45**. An interim pass drove
key-longest down to 2 of 21 with max ratio 1.02, which was becoming the **inverse** tell — "the longest
answer is almost always wrong" gives a real edge — so three keys were naturally lengthened to bring the
rate back toward chance. **Two guards, not one: no per-item form cue AND no slice-wide rule in either
direction. Run the per-item check on Slice 8 before review, not the average after it.**

**F7-9 — `cr-30` reflexive escalation and hidden authority.** Caught on the second review pass, and the
substantive half matters more than the form half. The key said to *"bring in the supervisor if more is
asked"*, but the stem establishes only that **a supervisor is on the floor** — not that they hold any
remedy the employee lacks, not that the customer asked for them, and not that a raised voice requires
escalation. That was an unstated-authority implication in the one item whose whole point is that volume
changes nothing. The key now stays within the two stated remedies, and **reflexive escalation became
the strongest distractor**, which reinforces CR6's do-not-escalate-when-you-can-solve-it rule. It also
cleared the form cues: `cr-30` had been key-longest, the slice's highest ratio (1.59), and the only
choice naming the supervisor — it is now none of those. **Lesson for Slice 8: check that every noun in
a stem which sounds like authority is actually given a power, or it will leak into the key.**

**F7-6 — `cr-19` invented a fact.** The key asserted "about five working days" although the stem never
supplied it — the same error the course teaches against. The estimate is now stated in the stem.

**F7-3 — `cr-25` omitted manager availability.** The stem now states a manager is on shift and
available, and the key offers to ask them to review the refund instead of implying a dead end.

**F7-4 — `cr-26` had a defensible distractor.** "Ask the customer to check with their neighbours and
call back" is ordinary practice in a real delivery dispute, so it was not safely wrong. It is replaced
by handing the investigation to the customer, which the supplied facts defeat.

**Fact-sufficient 21/21 and exactly-one-defensible-answer 21/21** after refinement (both were 20/21).

**⚠ An adversarial read-only audit then found two BLOCKERS and two borderlines the earlier passes
had cleared.** The owner's single blind answer on `cr-20` exposed the first, and re-auditing on the
question *"can any distractor also be defended without inventing facts?"* — rather than *"which
answer was intended?"* — exposed the rest. **(cr-20)** the rationale added while fixing form leakage
turned a distractor into a competing answer; rejecting it required the explanation-only claim that
stating the expired window "is necessary". Replaced with a manager-exception option, defeated by the
stem's own grant of store-credit authority. **(cr-23)** the key asserted a one-week lead time the stem never supplied — the identical defect fixed in `cr-19` as F7-6 and never checked here. **A later spot-review found the same item still invented a second fact: the key's "we'll call you to book the repair" described a callback process the stem did not establish.** Both the timescale and the callback process are now stated in the stem. **(cr-26)** the key assumed the
employee could obtain proof of delivery when the stem established only tracking visibility; the stem
now states the capability. **(cr-30)** the waiting option was defensible real-world practice, so the
stem now states the customer is still listening and actively asking what you can do, which the
silence option directly contradicts. **Lesson recorded for Slice 8: form audits and intent-based
re-reads cannot find these — only adversarially defending every distractor can.**

**Source-array key position is A in all 21** — an authoring convention shared with the approved PI and
BR slices, and **not learner-visible**, because the session route is the only consumer of the bank and
it shuffles choices with opaque UUID option ids. Left as-is deliberately; it is a note, not a defect.

Two things to keep straight, as for every slice so far:

- **The AI pre-screen is not the review.** It was the authoring model checking its own output.
- **The AI-authoring label stays in the source permanently** and must not be removed at approval.

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

**Next active work: M14 G2 Slice 8 — Marketing Fundamentals expansion from 9 to 30.** *(SUPERSEDED —
Slice 8 is now implemented locally and awaiting human content review; see the Slice 8 handoff at the
top of this file. The twelve obligations below were all discharged by that slice.)* It is the final
G2 depth slice. Nothing about Slice 7 remains outstanding.

Slice 8 carries twelve obligations, all already earned by earlier slices — do not rediscover them:

1. Expand marketing-fundamentals `mk-10`…`mk-30`, taking MK 9 → 30 and DECA 99 → 120.
2. **At that slice `mk-09` was the final array element and comma-less.** *(Historical: superseded — `mk-09` is no longer the final DECA array element; marketing-fundamentals was expanded in G2 Slice 8 and the bank now ends at `mk-30`.)* This was the one legacy byte that had to
   change, and the terminal-comma normalisation exists precisely for it. Change nothing else.
3. `EXPANDED_AREAS` becomes all four DECA areas.
4. **`FORBIDDEN_PREFIXES = ["mk"]` cannot survive** — MK becomes authorised, so the list empties.
5. **Do not let that control go vacuous.** Replace it with a non-vacuous future/out-of-range authority
   test, the way Debate's Slice 4 handled its final area (`G0-C6c` test-only withheld sets).
6. **Re-base the MK shallow-depth controls.** No DECA area would remain at 9, so the 20/9 and 40/9
   controls must move onto a >30 overdraw — the HOSA `11g` precedent. Do not delete them.
7. Preserve every pre-G2 legacy byte except the mechanically necessary `mk-09` comma.
8. **Run the per-item answer-form detector BEFORE human review, not the aggregate after it.** The
   slice-wide average masked a real per-item leak in Slice 7.
9. **Adversarially audit every distractor for a second defensible answer** — ask "can this also be
   defended without inventing facts?", never "which answer was intended?".
10. **Verify every factual claim in every key is supplied by the stem** — including process and
    capability claims, not just numbers. Slice 7's `cr-23` invented a lead time *and* a callback
    process, in the same sentence, and three review passes missed the second one.
11. Preserve AI-assisted provenance permanently in the source label.
12. **Genuine human content review is required before Slice 8 is pushed** — AI self-review does not
    satisfy it, and neither does review by another AI system.

**Global M14 G2 was OPEN at that slice, and CR depth, DECA and Global G2 were not to be recorded as
complete or closed** — the deficit was then 21, entirely marketing-fundamentals. G2 CLOSED
2026-08-12.

## M14 DECA Curriculum Completion: CR + MK curriculum APPROVED (2026-08-12)

### Curriculum is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

Status: **`AI-ASSISTED CURRICULUM, HUMAN-REVIEWED AND APPROVED 2026-08-12`.**

On **2026-08-12 the repository owner personally read all twelve lessons in the final post-refinement
checklist and approved them** — the CR and MK core definitions, each lesson's concepts, examples,
non-examples, common mistakes and boundaries, ⟨CR-C⟩ and its labeling, the 21-row provenance map, the
five CR and one MK legacy-debt records, source/provenance honesty, D7 labeling, legal/policy scope,
age-appropriateness, and depth sufficiency for both areas. **The approved curriculum is the cumulative
content of `afe9c94` PLUS refinement commit `07068f1`. The curriculum push gate is lifted.**

**Two points were refined before approval.** The four-input CR model no longer claims to be
exhaustive — the scope block now states it is **CompeteReady's analytic model, not an exhaustive
taxonomy**, naming tone, sequencing and acknowledgement as parts of an interaction that do not always
reduce to one of four boxes. MK6's absolute audience/channel `must` became **"a strong promotion
choice matches the message to the intended audience and uses a channel that can realistically reach
that audience"** — contextual fit, with room for broad-awareness activity.

**Six notes were reviewed and approved WITHOUT rewrite**, recorded so a later reader does not reopen
them: the **paraphrase-source disclosure** (CR2 — the strongest source defines paraphrase for written
text; spoken-service use is labeled as ours) · the **AMA scope** (MK3 — AMA covers brand positioning
and is a second source, never a rules source; OpenStax carries the broader grounding) · the **narrow
CFPB context** (CR5 — supports only that complaint handling is a defined organizational process in
regulated settings; its sector deadlines are not taught and do not generalize) · the **CR3/CR4
layering** (the unauthorized-commitment error appears in both because the primary decisions differ —
acknowledgement vs. asserting a cause, versus which real option to offer) · the **⟨BC-2⟩
source-verification wording** · and the **⟨BC-3⟩ policy-fact rule**.

**⟨BC-3⟩ IS BINDING ON SLICE 7 — do not weaken it.** If a CR question's correctness depends on refund
or exchange eligibility, store-credit availability, warranty handling, employee authority, an
escalation requirement, an available compensation or remedy, or any other policy-dependent outcome,
**the scenario must supply that fact.** No drill may require a learner to guess hidden company policy.
This is a CompeteReady question-quality constraint — not law, not official DECA terminology, and not a
claim about real-world customer service.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-ASSISTED label stays in the source permanently.** Approval changed the review status, not
  the provenance.

### Why this milestone exists

Slice 7 (CR 9→30) could not start. Planning found that the DECA course teaches **L0–L18 and not one
lesson covers customer relations or marketing fundamentals** — the course teaches the role-play
*performance* skill set, which is why PI mapped cleanly to L2/L3 and BR to L9–L12. CR and MK are
business-*content* areas the course never covered; every prior "customer relations" mention was an
example PI **title** inside the ⟨D6⟩ lesson. Reordering does not help — the same gap blocks Slice 8.
The owner chose **Option 1: author the missing curriculum first.**

### What was drafted

Twelve lessons, appended to `docs/curriculum/02-deca-course.md` as a new **DECA Business-Content
Course** section: **`CR1`–`CR6`** and **`MK1`–`MK6`**, each with a source tier, learning objective,
core concepts, learner decisions, worked example(s), non-example(s), common mistakes, boundary notes,
provenance notes and caveats. CR is built on a four-input spine — **facts · policy · options ·
authority**. MK follows customer → value → position → offering → distribution → communication.

### The architectural rule you must not break

**The section was APPENDED after the old final line 271 (271 → 814). Never insert into L0–L18.**
26 line-number citations point into this file — 13 in `lib/deca-events.ts`, 13 in
`scripts/deca-navigator-smoke.ts`, highest cited line 232 — and **no code parses curriculum files**, so
a shifted citation fails **silently** and becomes false provenance rather than a red test. Verified
after the append: the first 271 lines are **byte-identical to `HEAD`** (md5 `d1fed6a0…`) and all 51
distinct cited lines still hold their original text — **zero shift**. If a future edit must go into the
body of this file, re-run that check and fix the citations deliberately; do not let it slide.

### Sourcing — what is grounded and what is ours

Definitions were verified against **public, non-proprietary** sources: OpenStax *Principles of
Marketing* (segmentation, target market, positioning, differentiation, value proposition, customer
value, marketing mix/4 Ps, channels and channel-choice factors, promotion mix, service-quality
dimensions), OpenStax *Introduction to Business* (authority, delegation, chain of command,
accountability), OpenStax *Principles of Management* and *College Success* (listening, clarifying
questions), the AMA's public definitions (second source for positioning), the U.S. SBA business guide
(second source for target market), U.S. OSHA workplace-violence guidance (used **only** to place
de-escalation technique out of scope), and the U.S. CFPB complaint-process description (context only —
**its sector-specific deadlines are not taught and must not be generalized**).

**Labeled as CompeteReady's, not sourced:** the four-input CR model · the seven-step service-recovery
scaffold ⟨CR-C⟩ · the policy-only/empathy-only failure pair · the two-direction escalation rule · the
CR1–CR6 / MK1–MK6 grouping. **The 4 Ps are explicitly NOT labeled as ours** — mainstream terminology.

**Every lesson is STABLE-TEACHING**, which doc 00 defines as never a rules source, so the section
states **no** DECA rule, scoring criterion, judge expectation or score claim. **ISO 10002 is recorded
as a known reference that was NOT retrieved** (paywalled, HTTP 403); nothing rests on it. **No legal
conclusion is taught anywhere** — scenario facts govern, and every future CR drill must put the
policy fact in the stem.

### Legacy debt — contextualized, NOT corrected

**FIVE CR items carry notable curriculum debt: `cr-01`, `cr-04`, `cr-06`, `cr-07`, `cr-09`.** *(An
earlier planning note said "four" while naming five — the count is FIVE.)* **One MK item does:
`mk-08`.** `cr-01`/`cr-06` teach fixed sequences, so ⟨CR-C⟩ is deliberately contextual and
order-variable. `cr-04` puts retention economics in CR, which deployed BR now owns (`br-12`), so CR1
defines the area by the interaction decision instead. `cr-07` universalizes follow-up, so CR6 teaches
it as situational with named triggers. `cr-09` implies an unauthorized extra, so ⟨CR-A⟩/⟨CR-B⟩ require
any extra to be authorized and available and "exceeding expectations" is not taught. `mk-08` puts
cost-per-acquisition in MK, so MK6 routes campaign measurement to BR. **All 18 legacy items are
unchanged and immutable; no baseline exception was created; the legacy bank is NOT "corrected".**

### What this milestone deliberately did NOT do

- **No drill change.** `lib/deca-drills.ts`, `scripts/deca-drills-smoke.ts` and
  `scripts/deca-mastery-smoke.ts` are byte-identical to `HEAD`. `EXPANDED_AREAS`, `SLICE_ADDITIONS`,
  depth authorization, ids, content and counts are untouched. **No G2 depth credit was earned.**
- **No registry/seed change.** `deca-customer-relations` still has **no lesson slugs**;
  `deca-marketing` still has **three title-only slugs** and no authored bodies anywhere. Attaching
  lessons touches seeded product data and is a **separate approval**. `deca:skills:activate` was NOT
  run; **no database operation was performed**; no schema, migration, route or runtime change.
- **No video parity.** `06-videos-deca.md` untouched — videos 9–14 are a selective set, not a
  lesson-by-lesson mirror, so parity is not owed and no placeholder was created.

**Exactly 3 files changed:** `docs/curriculum/02-deca-course.md`, `docs/CURRENT_STATE.md`,
`docs/HANDOFF.md`.

### State — unchanged by this milestone

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — depth COMPLETE, deployed, reviewed |
| `lib/deca-drills.ts` | 78 | pi 30 · br 30 · **cr 9** · **mk 9** — all deployed and reviewed |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**At that slice: DECA 30 / 30 / 9 / 9 = 78. Corpus 378. Deficit 42 (CR 21 + MK 21).**

### Next steps as recorded at that pass — SUPERSEDED, not the current plan

1. Push the three curriculum commits and verify the Production deployment.
2. **Slice 7 — CR 9→30**, authored against CR1–CR6 and bound by ⟨BC-3⟩.
3. **Slice 8 — MK 9→30**, authored against MK1–MK6.

Still deferred, each its own approval: **registry/seed attachment** (`deca-customer-relations` has no
lesson slugs; `deca-marketing` has three title-only slugs — seeded product data) and **video parity**
(`06-videos-deca.md` untouched; videos 9–14 are a selective set, not a lesson-by-lesson mirror).

**Curriculum approval awards no G2 question-depth credit.** The curriculum-first prerequisite is
COMPLETE and source verification is COMPLETE, so **Global M14 G2 was OPEN at that point and ready to resume with
Slice 7 Customer Relations depth implementation.** **At that slice, CR depth, MK depth, DECA and Global
G2 were not to be recorded as complete or closed** — the deficit was then still 42. G2 CLOSED
2026-08-12.

## M14 Global G2 Slice 6 / DECA Slice 2: BR 9→30 (2026-08-12)

### Slice 6: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/deca-drills.ts` gained 21 business-reasoning questions (`br-10`…`br-30`), taking BR 9→30 and the
DECA bank 57→78. The items were AI-authored, and on **2026-08-12 the repository owner personally read
all 21 in the FINAL checklist and approved them** — answer defensibility, fact sufficiency, absence of
hidden business assumptions, distractor quality, wording, BR curriculum fit, the BR/PI, BR/CR and
BR/MK boundaries, cost, feasibility, risk/tradeoff and measurement reasoning, numeric accuracy, legacy
and new-item overlap, B-8 score-claim honesty, D7 labeling honesty, universal-rule and
unsupported-framework safety, and copyright/provenance.

**The approved content is implementation commit `40a473b` PLUS content-refinement commit `7fd6798`.**
**The Slice 6 push gate is lifted.**

**`br-16` was refined before approval.** Its original stem omitted the new-system go-live timing needed
to separate before-peak from after-peak training, so **both** readings avoided pulling staff during the
peak and the keyed answer rested on an unstated fact. The final stem states that the till system **goes
live just before the peak**, which makes training beforehand uniquely defensible and makes the
after-June option wrong on **timing** rather than merely weakly argued. **Keep every BR scenario's
deciding facts in the stem.**

**Three items were explicitly human-reviewed and APPROVED WITHOUT REWRITE**, recorded so a later
reader does not reopen them: **`br-19`** as an L10 operational-dependency case (the order comes from
supplied dependencies; no sequencing framework is invented) · **`br-27`** despite conceptual adjacency
to legacy `br-03`, because constructing a measurement answer and interpreting an isolated number are
different learner decisions · **`br-29`** with its learner-facing D7 disclaimer intact, which is
accurate, correctly placed and does not obscure the business reasoning.

**Slice 5 (PI) is deployed and human-reviewed** at `a6dfc86` (deployment `5863473555`, `Production`,
`success`), so performance-indicators was approved and live before this slice began.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — **depth COMPLETE, deployed, reviewed** |
| `lib/deca-drills.ts` | **78** | pi 30 (deployed, reviewed) · **br 30 (human-reviewed and approved 2026-08-12)** · cr 9 · mk 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit then 42** (was 63): **customer-relations 21 + marketing-fundamentals 21**, and nothing else.
Corpus 357 → **378** locally; target **420**.

**Three distinctions, none of which this slice closes:** **`PI depth complete` is NOT `DECA depth
complete`** · **`PI + BR depth complete` is NOT `DECA depth complete`** — customer-relations and
marketing-fundamentals were still at 9 at that slice · **`Debate depth complete` is NOT `Global M14 G2 complete`.**
**Global M14 G2 was OPEN at that slice — it was not to be recorded, nor DECA, as complete or
closed.** G2 CLOSED 2026-08-12.

### What Slice 6 changed — do not undo any of it

- **NO legacy punctuation changed, again.** BR is a MIDDLE block, so `br-09` already carried its comma
  and the items insert before `// --- Customer relations ---`. **At that slice `mk-09` was still the final array
  element and still comma-less — at that slice the DECA terminal-comma boundary was unexercised** and belonged to
  the eventual MK slice. `G0-C1b`/`G0-C1c` unchanged.
- **Second DECA area authorized at that slice.** `EXPANDED_AREAS` was `["performance-indicators",
  "business-reasoning"]`. `G0-6b` = 2, `G0-C2b2` = 2 authorized, **`G0-C6b` = 2 then unauthorized**.
  CR and MK were each then rejected at stage `unauthorised` under DEFAULT authorization. The
  never-pre-authorize rule bound that era's slices. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)*
- **`G0-7b` is now a 42-id exact set** — `pi-10`…`pi-30` plus `br-10`…`br-30`, with `G0-7b2a`/`G0-7b2b`
  proving 21 of each. `SLICE_ADDITIONS` has two rows. The forbidden-prefix loop narrowed to
  `["cr","mk"]` and is **still real**, unlike Debate's final slice where it went empty.
- **⚠ THE SHALLOW CONTROL MOVED business-reasoning → MARKETING-FUNDAMENTALS, in BOTH suites.** MK was
  chosen over customer-relations **deliberately**: Slice 7 is expected to expand CR, so parking the
  control there would force a second move one slice later. MK stays at 9 through Slices 6 **and** 7,
  so the control moves **once**, and its eventual >30 re-base lands naturally at Slice 8 — the slice
  where MK itself deepens and no shallow DECA area remains. `G0-D5b` asserts exactly **two** areas
  remained at 9 at that slice. **At that slice, business-reasoning was not to be called shallow
  anywhere.** *(Historical: superseded — every DECA area holds 30 and every HOSA area holds 30; no shallow area remains.)*
- **The `buildDecaDrillSession(6, ["business-reasoning"])` filter check was kept**, with its comment
  clarified: 6 ≤ 30 still holds, and it is a filter proof, never a depth or shallow-area proof.
- **No BR fixture needed re-basing, because none exists.** The mastery suite defines only `PI` and
  `CR` consts; nothing indexes BR. **No BR legacy-order assertion was added** — unlike PI, no fixture
  depends on BR ordering, and the immutable-baseline controls already protect `br-01`…`br-09`. Adding
  one would be ceremony. **`CR.slice(0, 2)` is untouched — that is a Slice 7 concern.**
- **⟨D7⟩ and ⟨B-8⟩ are enforced across the whole bank.** The five-part scaffold is labelled
  CompeteReady's teaching method, never official DECA terminology (`br-29` says so in its
  explanation), and **no item claims implementation or measurement improves scores.** B-8 is an
  authoring guardrail here — deliberately **not** the learner skill of any question.

### Runtime, untouched

`skillSlug: "deca-business-reasoning"`, `DECA_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`decaDrillPersistenceRequest`, server-issued sessions, replay protection, expiry, first-answer-per-
distinct-id and the XP prohibition are all unchanged. No schema, migration, seed, skill-activation
script, route, validator or client change. `deca:skills:activate` was NOT run.

## Previous handoff — M14 Global G2 Slice 5 / DECA Slice 1: PI 9→30 (2026-08-12)

### Slice 5: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/deca-drills.ts` gained 21 performance-indicator questions (`pi-10`…`pi-30`), taking PI 9→30 and
the DECA bank 36→57. The items were AI-authored, and on **2026-08-12 the repository owner personally
read all 21 in the FINAL checklist and approved them** — answer defensibility, distractor quality,
wording, curriculum fit, verb interpretation, PI-method stage accuracy, scenario role/authority/
constraint handling, the PI/BR, PI/CR and PI/MK boundaries, PI-essentiality under the remove-the-PI
diagnostic, B-2 safety, legacy `pi-07` handling, scoring and preparation claims, measurement
boundaries, legacy and new-item overlap, and copyright/provenance.

**The approved content is implementation commit `b72cba2` PLUS content-refinement commit `1340cdb`.**
**The Slice 5 push gate is lifted.**

**Two items were refined before approval, both for failing the remove-the-PI diagnostic.** `pi-19`
named no specific indicator, so a generic "proposal without a success measure" question survived
stripping the PI; it now carries an **employee-retention** indicator whose outcome deliberately
differs from the action's stated rationale (associates having no way to raise problems), so the
indicator — not the rationale — decides what success means. `pi-30` was the more serious case: its old
*"win-back email to lapsed members"* already telegraphed retention and sat close to legacy `br-03`,
whose own keyed answer contains the word *retention*; the action is now a **targeted offer email to
members inactive for sixty days**, which could plausibly be judged on reach, on immediate response, or
on retention, so open rate and first-week redemptions are real competing metrics and only the listed
indicator picks the winner. **Keep the indicator load-bearing in any future PI measurement item.**

**`pi-28` was explicitly human-reviewed and APPROVED WITHOUT REWRITE** as a PI/BR boundary case. Its
shape looks business-reasoning-adjacent once the indicator is stripped, but its keyed axis is the
completeness of the PI demonstration chain — decision, reasoning, implementation, feasibility,
measurement — never the commercial merit of the action. Recorded so a later reader does not reopen it.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

**Debate is finished and live.** All four Debate areas hold 30, all four slices are human-reviewed and
approved, and Slice 4 is deployed at `09e9bdb` (deployment `5863008892`, `Production`, `success`).
**Every remaining G2 question is now a DECA question.**

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — **depth COMPLETE, deployed, reviewed** |
| `lib/deca-drills.ts` | **57** | **pi 30 — human-reviewed and approved 2026-08-12** · br 9 · cr 9 · mk 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit then 63** (was 84): DECA br/cr/mk, 3 × 21. Corpus 336 → **357** locally; target **420**.

**Two distinctions to keep straight, neither of which this slice closes:**
**`PI depth complete` is NOT `DECA depth complete`** — business-reasoning, customer-relations and
marketing-fundamentals were still at 9 at that slice. **`Debate depth complete` is NOT `Global M14 G2 complete`.**
**Global M14 G2 was OPEN at that slice — it was not to be recorded, nor DECA, as complete or
closed.** G2 CLOSED 2026-08-12.

### ⚠ LEGACY `pi-07` / CURRICULUM B-2 DEBT — READ BEFORE ANY FUTURE PI WORK

**Legacy `pi-07` has a pre-existing tension with current curriculum B-2. Slice 5 leaves `pi-07`
immutable, does not reinforce it, and does not create contradictory B-2 content. This remains separate
curriculum debt for later resolution.**

Concretely: `pi-07` keys explicit PI signposting as the recommended practice, while Module 1 lesson 3
⟨B-2⟩ teaches that whether to speak a PI's title aloud or weave it into conversation is a **genuinely
contested judgment call** that must never be presented as settled. **B-2 is deliberately untested in
Slice 5.** Several new distractors reject PI-name recitation as a substitute for *demonstration*
(`pi-11` D, `pi-13` D, `pi-18` B, `pi-19` C, `pi-29` D) — that is the ⟨D6⟩ demonstration-vs-recitation
rule, **not** a ruling on speaking style. **B-2 is NOT resolved.**

### What Slice 5 changed — do not undo any of it

- **NO legacy punctuation changed.** PI is the FIRST block, so `pi-09` already carried its comma and
  the 21 items insert between it and `// --- Business reasoning ---`. **At that slice `mk-09` was still the final
  array element and still comma-less — at that slice the DECA terminal-comma boundary was STILL unexercised**, and
  belongs to the eventual marketing slice. `G0-C1b`/`G0-C1c` are unchanged and untested against real
  data, exactly as since Slice 0.
- **First DECA area authorized at that slice.** `EXPANDED_AREAS` `[]` → `["performance-indicators"]`.
  `G0-6b` = 1, `G0-C2b2` = 1 authorized, **`G0-C6b` = 3 then unauthorized**. `G0-C6` proved `br-10`,
  `cr-10` and `mk-10` were each rejected at stage `unauthorised` under DEFAULT authorization. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)* **Never
  pre-authorize.** Unlike Debate's final slice, `judgeAddition` still bounds DECA meaningfully.
- **`G0-7b` is now a 21-id exact set**, driven by a new `SLICE_ADDITIONS` table with one row. The
  forbidden-prefix loop over `["br","cr","mk"]` is **real and non-vacuous** here.
- **DEPTH TESTS WERE ADDED, NOT MOVED.** Neither DECA suite had any depth block or shallow control
  before this slice. Both now prove PI **20/20** and **40/30**, with **business-reasoning** as the
  still-shallow control at **20/9** and **40/9**. `G0-D5b` asserted three areas remained at 9 at that
  slice, so the control could move once more before re-basing on a >30 overdraw. *(Historical: superseded — every DECA area holds 30 and every HOSA area holds 30; no shallow area remains.)*
- **No PI fixture was re-based, because none needed it.** Every mastery fixture indexes
  `PI.slice(0, n≤5)`, `PI[0]` or `PI[5]`, all of which still resolve to legacy items. `G0-D6`/`26m`
  now **assert** that the legacy nine are still the first nine, rather than assuming it. **The PI
  bypass fixture is untouched at raw 76 / evidence 20.**

### Runtime, untouched

`skillSlug: "deca-performance-indicators"`, `DECA_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`decaDrillPersistenceRequest`, server-issued sessions, replay protection, expiry, first-answer-per-
distinct-id and the XP prohibition are all unchanged. No schema, migration, seed, skill-activation
script, route, validator or client change. `deca:skills:activate` was NOT run.

## Previous handoff — M14 Global G2 Slice 4: Debate weighing 9→30 (2026-08-12)

### Slice 4: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/debate-drills.ts` gained 21 weighing questions (`wg-10`…`wg-30`), taking weighing 9→30 and the
Debate bank 99→120. The items were AI-authored, and on **2026-08-11 the repository owner personally
read all 21 in the FINAL checklist and approved them** — answer defensibility, distractor quality,
scenario sufficiency, course-appropriate wording, the weighing/CWI, weighing/rebuttal and
weighing/evidence-evaluation boundaries, Lesson 37 and seeded `debate-weighing` fit, magnitude,
probability, timeframe, reversibility, framework use, V-3 and V-4, contextual rather than universal
weighing claims, legacy and new-item overlap, explanation quality, and protection against unsupported
weighing frameworks.

**The approved content is implementation commit `9c20282` PLUS content-refinement commit `a250e40`.**
**The Slice 4 push gate is lifted.**

**`wg-24` was refined before approval, and that is load-bearing.** The drafted stem quantified
probability ("well under one percent" vs near-certain) but left magnitude qualitative ("catastrophic"
vs "moderate"), so a large enough catastrophe could rationally reverse the comparison — and its
explanation claimed "the numbers decide which way" on facts covering only one side of the tradeoff.
The approved `wg-24` quantifies **both**: their harm reaches **25,000** at well under one percent,
yours reaches **20,000** and is near-certain, so their real but modest magnitude edge sits against a
far larger likelihood gap. **Keep both sides of any future tradeoff item quantified.**

Slices 1, 2 and 3 are deployed and human-reviewed (`61b19de`, deployment `5861953872`, `Production`,
`success`), so rebuttal, CWI and evidence-evaluation were already approved and live before this slice.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance. All four Debate slice labels now carry the same two-part form.

Approved judgment calls, recorded so a later reader does not reopen them: `wg-10`/`wg-11`/`wg-12` are
distinct (nothing to compare · both survive uncompared · offense that no longer survives); **`wg-12`
requires the contention to be BOTH fully answered AND no longer defended, so attacked never means
lost**; `wg-13` is contextual magnitude and says changing the severities can reverse it; `wg-14`'s
"$2 billion / 900 lives" is an illustrative example of unlike units, not a hidden stem fact;
`wg-05`/`wg-15`/`wg-26` are a recognition → rejection → discrimination progression; `wg-16`/`wg-17`/
`wg-18`/`wg-24` are four distinct probability decisions; **`wg-17` supplies the chain rather than
asking the learner to repair it, and names link-attack as a different rebuttal task**; `wg-19` rejects
both sooner-always and later-always; **`wg-20` is an ordering comparison, NOT a turns-the-case or
prerequisite framework**; `wg-21` is scoped to reversibility and never claims irreversible wins
overall; `wg-22` rejects a reversibility claim that contradicts the facts; `wg-23`/`wg-24`/`wg-25` are
three different decisions; `wg-25` diagnoses a non-separating axis where legacy `wg-09` breaks a
stated tie; `wg-27` and `wg-28` implement V-4 and V-3; **`wg-29`'s "the one the judge is holding"
describes the practical effect of an uncontested standard, not an automatic-binding rule**; and
**`wg-30` is deliberately procedural — it asks for the next move, not which dimension objectively
wins.**

### Debate depth is COMPLETE and human-reviewed — GLOBAL G2 IS NOT

**All four Debate areas hold 30, and all four are human-reviewed and approved** — rebuttal, CWI and
evidence-evaluation deployed at `61b19de`, weighing approved 2026-08-11 and ready to push at that slice (since pushed). That is
`Debate depth complete`, and it is **not** the same claim as `Global M14 G2 complete`. **Global M14 G2
was OPEN at that slice** because all four DECA areas were still at 9. G2 CLOSED 2026-08-12.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **120** | cw 30 · rb 30 · ev 30 · **wg 30** — all four at target |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit then 84** (was 105): DECA 4 × 21, and nothing else. Corpus 315 → **336** locally; target **420**.
**Every remaining G2 question is a DECA question.**

### What Slice 4 changed — do not undo any of it

- **The append boundary was finally exercised.** `wg-09` was the last array element and carried no
  comma; it now carries **exactly one**. That is the ONLY change to any legacy item, and it is
  punctuation. `G0-C1d`…`G0-C1d5` assert the real transition against the immutable baseline —
  including **`G0-C1d3`, that the RAW lines differ**, without which the normalisation could silently
  stop doing work. The synthetic `G0-C1b`/`G0-C1c` are unchanged and still prove a one-word content
  edit survives the same normalisation.
- **All four Debate areas authorised at that slice.** `EXPANDED_AREAS` = `["rebuttal", "claim-warrant-impact",
  "evidence-evaluation", "weighing"]`, slice order preserved. `G0-6b` 3 → 4, `G0-C2b2` 3 → 4.
- **The unauthorised-area control became unreachable and was REPLACED, not deleted.** No recognised
  Debate area can now return `unauthorised` in production (`G0-C6b` asserts that count is **0**). The
  stage is still tested: `G0-C6c` calls the SAME `judgeAddition` with a **test-only withheld**
  authorisation set per area, and `G0-C6c2` proves the identical literal passes under real
  authorisation — so the rejection is caused by the withheld set alone. **Production
  `EXPANDED_AREAS` is never mutated and no fake fifth area was invented.**
- **`G0-7b` is now an 84-id exact set**, driven by `SLICE_ADDITIONS` with its fourth and final row.
- **The forbidden-prefix loop was replaced, not left empty.** All four prefixes are legitimate now, so
  `for (const p of ["wg"])` would have become `for (const p of [])`. It is now a direct per-id range
  assertion plus `G0-7b4b` proving it ran over **84** real additions.
- **⚠ `G0-7b` IS NOW THE FINAL BOUND ON DEBATE BANK GROWTH.** With every area authorised,
  `judgeAddition("wg-31", …)` returns **ok** — the predicate alone no longer limits anything.
  `G0-7b5` asserts exactly that, and `G0-7b5b` that only the exact 84-id set stops it. **Never relax
  `G0-7b` into "any known prefix above 09."**
- **The shallow-area control was RE-BASED, not deleted.** No Debate area holds 9, so it could not move
  a fourth time. Both suites now prove **40 served / exactly 30 distinct / exactly 10 repeated
  positions**, with a boundary partner at **30 served / 30 distinct / no padding** — the HOSA `11g`
  pattern. **Do not call weighing shallow or still-9-item anywhere.**
- **No weighing fixture needed re-basing, because none existed.** Every `% 9` / `slice(0, 9)` in the
  repo is rebuttal-pinned or synthetic. No weighing `evidenceScore` or `uniqueTotal` fixture was
  invented, and no mastery or evidence score moved.
- **Curriculum scope: Module 5 lesson 37 plus the seeded `debate-weighing` skill only.** Nothing
  introduces scope as a fifth axis (`wg-01` keeps it inside magnitude), "turns the case", a
  prerequisite/gateway framework, or systemic-outweighs-individual. **V-3** is enforced by `wg-28`
  (weighing without naming a category) and **V-4** by `wg-27` ("even if" is one move, not a norm).
- **No axis ever "always wins."** Several distractors state the right axis for a universal-rule reason
  and are keyed **wrong** (`wg-16` D, `wg-21` C, `wg-24` C).

### Runtime, untouched

`skillSlug: "debate-weighing"`, `DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`recordDrillMasteryInTransaction`, replay protection, session expiry, first-answer-per-distinct-id and
the XP prohibition are all unchanged. No schema, migration, seed, route, validator or client change.

## Previous handoff — M14 Global G2 Slice 3: Debate evidence 9→30 (2026-08-12)

### Slice 3: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/debate-drills.ts` gained 21 evidence-evaluation questions (`ev-10`…`ev-30`), taking evidence 9→30
and the Debate bank 78→99. The items were AI-authored, and on **2026-08-11 the repository owner
personally read all 21 in the FINAL checklist and approved them** — answers, distractors, clarity and
course appropriateness, the evidence-evaluation/CWI/rebuttal/weighing boundaries, Lesson 11/12/14 fit
and the exclusion of Lesson 13 official-rule content, source relevance, population and context
applicability, direct vs indirect support, expertise relevance, institutional role vs technical
expertise, firsthand scope, bias and conflict of interest, disclosure, advocacy verifiability,
contextual recency, representativeness, self-selection, comparison-group limits, confounding,
self-report limits, methodology transparency, timeframe cherry-picking, independent corroboration,
headline vs full-finding context, legacy and new-item overlap, and explanation quality.

**The approved content is implementation commit `ef55134` PLUS curriculum-refinement commit
`89497a3`.** **The Slice 3 push gate is lifted.**

**`ev-27` was replaced before approval, and that is load-bearing.** The drafted item taught relative
vs absolute risk. The final review established that relative/absolute risk, base rates and percentage
interpretation are named **nowhere** in the current Debate curriculum, so the item was an unsupported
extension even though its arithmetic was exact. It was replaced with a Lesson 12 methodology item on
**method transparency / evaluability** — a described method lets a reader judge how a result was
produced and where it is limited, without implying transparency proves truth or that a missing method
proves falsehood. **No Slice 3 item now extends beyond lessons 11, 12 and 14. Do not reintroduce
relative-vs-absolute content into this bank without curriculum support.**

Slices 1 and 2 are deployed and human-reviewed (`46ab46b`); rebuttal and CWI were already approved and
live before this slice.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

Approved judgment calls, recorded so a later reader does not reopen them: `ev-10` vs `ev-12` is
detection vs calibration, not repetition; `ev-11`/`ev-22`/`ev-23` are applicability, representativeness
and self-selection; `ev-14`/`ev-15`/`ev-16` are domain expertise, institutional role and firsthand
scope; `ev-17`/`ev-18`/`ev-19` are conflict response, what disclosure settles, and incentive vs
verifiability; `ev-18` vs final `ev-27` is acceptable reinforcement rather than duplication;
`ev-20`/`ev-21`/legacy `ev-02` form a recognition → counter-case → application progression;
`ev-24`/`ev-25` are no comparison vs a contaminated comparison, and `ev-24` needs no added
residual-value sentence; `ev-28` is window selection, distinct from `ev-09`'s generic cherry-picking;
`ev-29` denies independent corroboration without devaluing secondary reporting; `ev-30` stays
evidence-quality and carries no citation doctrine.

### Where G2 stands

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **99** | cw 30 · rb 30 · **ev 30** · wg 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit then 105** (was 126): Debate weighing 1 × 21, DECA 4 × 21. Corpus 294 → **315** locally; target
**420**. Three of four Debate areas are now at 30 and human-reviewed, so **weighing is the only
remaining shallow Debate area**. **Global M14 G2 was OPEN at that slice — it was not to be recorded as complete or
closed.**

### ~~⚠ WEIGHING IS THE LAST SHALLOW DEBATE AREA~~ — DISCHARGED BY SLICE 4

This warning told Slice 4 to re-base the shallow-area control instead of moving it a third time, and
to expect the trailing-comma change at `wg-09`. **Slice 4 did both.** The control now proves 40 served
/ 30 distinct / 10 repeated positions with a 30-served / 30-distinct boundary partner, and the real
`wg-09` comma transition is asserted by `G0-C1d`…`G0-C1d5`. See the Slice 4 handoff at the top of this
file for the current state. Nothing here is outstanding.

### What Slice 3 changed — do not undo any of it

- **Insertion point.** Items sit INSIDE the evidence block, after `ev-09`, before `// --- Weighing ---`.
  `ev-09` already carried its comma. `wg-09` is still final and byte-identical.
- **Curriculum scope was deliberately narrowed.** Lessons 11, 12 and 14 only. **Lesson 13 — the
  official citation/paraphrase/penalty layer — was excluded from AI authoring** because official rules
  must be sourced. Lesson 12 is TIER-2 heuristic material, so no item states a credibility heuristic as
  a rule. **Keep that exclusion for any future evidence slice.**
- **Three areas authorized at that slice.** `EXPANDED_AREAS = ["rebuttal", "claim-warrant-impact",
  "evidence-evaluation"]`. `G0-C2b2` 2 → 3 and `G0-C6b` 2 → 1, both exact.
- **`G0-7b` is a 63-id exact set**, still driven by `SLICE_ADDITIONS` — one new row, forbidden-prefix
  set narrowed to `["wg"]`. Never relax it into "any recognised prefix above 09".
- **No evidence fixture was re-based, because none needed it.** Every `% 9` / `slice(0, 9)` in the repo
  remains rebuttal-pinned or synthetic. No evidence evidenceScore was invented.
- **Guardrails held in the content:** a biased source is not automatically false (`ev-17`/`ev-18`/`ev-19`),
  a bigger sample is not automatically better (`ev-22`), newer is not automatically better
  (`ev-20`/`ev-21`), prestige is not expertise (`ev-14`/`ev-15`), anecdote and self-report are weak for
  broad claims rather than useless (`ev-16`/`ev-26`). `ev-25` is design-oriented confounding, kept
  distinct from `ev-04`, `cw-14` and `rb-18`.

### Runtime, untouched

`skillSlug: "debate-evidence"`, `DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`recordDrillMasteryInTransaction`, replay protection, session expiry, first-answer-per-distinct-id and
the XP prohibition are all unchanged. No schema, migration, seed, route, validator or client change.

## Previous handoff — M14 Global G2 Slice 2: Debate CWI 9→30 (2026-08-12)

### Slice 2: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/debate-drills.ts` gained 21 claim-warrant-impact questions (`cw-10`…`cw-30`), taking CWI 9→30 and
the Debate bank 57→78. The items were AI-authored, and on **2026-08-11 the repository owner personally
read all 21 in the final packet and approved them** — answers, distractors, clarity, the
CWI/rebuttal/evidence-evaluation/weighing boundaries, causal-chain and chronology-vs-causation
accuracy, hidden-premise logic, warrant quality, evidence-to-claim bridging, intermediate-vs-final
impact handling, claim scope and specificity, overlap and Module 2 fit. **The approved content is
exactly implementation commit `45f3397`.** **The Slice 2 push gate is lifted.**

Slice 1 is deployed and human-reviewed (`e23e982`), so rebuttal was already approved and live.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

Approved judgment calls, recorded so a later reader does not reopen them: `cw-10`'s "every arrow needs
support" means reasoning, not a citation per arrow; `cw-12`/`cw-15`, `cw-16`/`cw-17`, `cw-18`/`cw-19`,
`cw-23`/`cw-26`, `cw-26`/legacy `cw-03` and `cw-29`/`cw-30` are distinct learner decisions; the
`cw-20`/`cw-21`/`cw-22` identify-diagnose-build progression is useful rather than quantity theatre;
`cw-14` and `cw-15` remain argument analysis, distinct from `rb-18` and `rb-19`.

### Where G2 stands

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **78** | **cw 30** · **rb 30** · ev 9 · wg 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit then 126** (was 147): Debate ev/wg 2 × 21, DECA 4 × 21. Corpus 273 → **294** locally; target
**420**. **Slice 2 completes CWI depth and human review; global G2 was OPEN at that slice because Debate
evidence-evaluation/weighing and all four DECA areas were below the ≥30 target. G2 was not then to be
recorded as complete or closed.** G2 CLOSED 2026-08-12.

### What Slice 2 changed — do not undo any of it

- **Insertion point.** The 21 items sit INSIDE the CWI block, after `cw-09` and before
  `// --- Rebuttal ---`. `cw-09` already carried its comma. **at that slice `wg-09` was still the final array element
  and byte-identical — at that slice the terminal-comma append boundary was STILL not exercised.** *(Historical: superseded — the Debate append boundary was exercised at G2 Slice 4; the bank now ends at `cl-30`.)* It was, when
  `weighing` expands; leave `G0-C1b`/`G0-C1c` in place until then.
- **Two areas authorized at that slice.** `EXPANDED_AREAS = ["rebuttal", "claim-warrant-impact"]`, in
  slice order. `G0-C6` then proved `ev-10` and `wg-10` were `unauthorised`, and **`G0-C6b` moved
  3 → 2** so the
  loop cannot go vacuous. `G0-C2b` now loops the AUTHORISED areas and proves each is accepted under
  DEFAULT authorisation, with its own `=== 2` companion. **That slice's rule: never pre-authorize an
  area.**
- **`G0-7b` is a 42-id exact set**, driven by a `SLICE_ADDITIONS` table (one entry per reviewed slice).
  It proves exactly 42 additions, the exact id set, each addition declaring its slice's area, zero
  `ev-*`/`wg-*` additions, and every addition passing the shared `judgeAddition`. **Each future slice
  adds one entry to that table — never relax it into "any recognised prefix above 09".**
- **No CWI fixture was re-based, because none needed it.** Unlike rebuttal, no CWI fixture depended on
  a 9-item pool. The bypass fixtures (raw 76 / evidence 20) slice a fixed head; `CWI[0]`, `CWI[5]`,
  `CWI.slice(0, 3)`, `CWI.slice(0, 5)`, `DRILL_BANK.slice(0, 8)`, `DRILL_BANK[0]`/`[1]` all still point
  at the same legacy items because additions go after `cw-09`. **Do not "tidy" them.**
- **Depth proofs added in BOTH suites** (the audit's Verification line names the mastery smokes):
  CWI 20 → 20 distinct, and 40 → exactly 30 distinct. Each is paired with a live counter-example from
  a still-9-item area (evidence-evaluation in the drills suite, weighing in the mastery suite) so the
  result cannot be mistaken for a builder property.

### What the next Debate slice had to do, as recorded at that slice — SUPERSEDED (it shipped)

Pick `evidence-evaluation` or `weighing`; add its 21 items inside its own block; append that area to
`EXPANDED_AREAS`; raise its entry in BOTH `AREA_DEPTH` and `DEBATE_AREA_DEPTH`; add one row to
`SLICE_ADDITIONS` (making the expected set 63); move `G0-C6b` 2 → 1 and `G0-C2b2` 2 → 3.
**`weighing` was the slice that finally exercised the `wg-09` append boundary** — expect a one-character
comma change there and let `G0-C1b`/`G0-C1c` do their job.

### Runtime, untouched

`DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70, `recordDrillMasteryInTransaction`, replay
protection, session expiry, first-answer-per-distinct-id and the XP prohibition are all unchanged. No
schema, migration, seed, route, validator or client change.

## Previous handoff — M14 Global G2 Slice 1: Debate rebuttal 9→30 (2026-08-11)

### Slice 1: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/debate-drills.ts` gained 21 rebuttal questions (`rb-10`…`rb-30`), taking rebuttal 9→30 and the
Debate bank 36→57. The items were AI-authored, and on **2026-08-11 the repository owner personally
read all 21 and approved them** — answer defensibility, distractors, clarity, the
rebuttal/CWI/evidence-evaluation/weighing boundaries, strategic accuracy, causal reasoning, the
no-link vs link-turn vs impact-turn distinctions, double-turn logic, indict vs turn, offense/defense
framing, frontlining, counterexample scope, overlap and curriculum fit. **The approved content is the
final version, including refinement commit `fbeec2c`.** **The Slice 1 push gate is lifted.**

Slice 0 is deployed (`f1b5064`), so both banks were already protected before this content landed.

Two things to keep straight, exactly as for the HOSA slices:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

Approved judgment calls, recorded so a later reader does not reopen them: the `rb-13`/`rb-16` overlap
is reinforcement rather than duplication; `rb-13`/`rb-17`/`rb-30` test three distinct decisions;
`rb-11`'s "even if" phrasing does not duplicate legacy `rb-08`; `rb-24` and `rb-28` remain
rebuttal/frontlining rather than standalone weighing.

### Where G2 stands

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **57** | cw 9 · **rb 30** · ev 9 · wg 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Global M14 G2 was OPEN at that slice.** Deficit then **147** (was 168): Debate cw/ev/wg 3 × 21, DECA 4 × 21.
Corpus 252 → **273** locally; final target **420**. **At that slice the next G2 content slice was
still outstanding and G2 was not to be recorded as complete or closed.** *(Historical: superseded — G2 CLOSED 2026-08-12 at 420/420, deficit 0.)*

### What Slice 1 changed — do not undo any of it

- **Insertion point.** The 21 items sit INSIDE the rebuttal block, after `rb-09` and before
  `// --- Evidence evaluation ---`. `rb-09` already carried its comma. **at that slice `wg-09` was still the final
  array element and was byte-identical — at that slice the terminal-comma append boundary was NOT yet
  exercised.** *(Historical: superseded — the Debate append boundary was exercised at G2 Slice 4; the bank now ends at `cl-30`.)*
  It will be, whenever `weighing` is expanded. Leave `G0-C1b`/`G0-C1c` in place until then.
- **Only rebuttal was authorized at that slice.** `EXPANDED_AREAS = ["rebuttal"]`. `G0-C6` then
  proved `cw-10`, `ev-10` and `wg-10` were rejected as `unauthorised`, and `G0-C6b` asserted three
  areas remained unauthorised so that loop could not go vacuous. *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)* **Never pre-authorize an area without its own
  reviewed slice.**
- **`G0-7b` is now a real additive guarantee**, not "zero additions exist": the additions must be
  exactly `rb-10`…`rb-30`, exactly 21 of them, each declaring the rebuttal area, each passing the
  shared `judgeAddition` predicate.
- **FOUR fixtures were re-based, not deleted.** Every one assumed a 9-item rebuttal pool:
  1. `debate-drills-smoke.ts` evidence fixture → `reb9 = …slice(0, 9)`
  2. `debate-mastery-smoke.ts` honest-padding fixture (`9`…`9g`) → `NINE = REB.slice(0, 9)`, and its
     `morePadding` control repeats the SAME nine rather than the wider pool
  3. `review-ladder-smoke.ts` `43` → `slice(0, 9)`, plus new `43a`/`43b` stating `uniqueTotal === 9`
     and `uniqueCorrect === 6` explicitly
  4. `debate-mastery-smoke.ts` precondition `24` hard-coded `=== 9` per area → now reads the
     module-scope `DEBATE_AREA_DEPTH`, so the precondition and the `29k` G2 block cannot disagree
  **67 still means "six of nine distinct".** It was not changed to a new magic number; its
  denominator was made explicit. `slice(0, 9)` is stable because additions append after `rb-09`.
- **Builder depth is proven separately from the evidence contract.** A 20-question focused rebuttal
  session now serves **20 distinct** items (no padding — the observable G2 effect), and the padding
  branch is still proven at **40 served / exactly 30 distinct**. Do not collapse these back together.

### What the next Debate slice had to do, as recorded at that slice — SUPERSEDED (it shipped)

Pick ONE of `claim-warrant-impact`, `evidence-evaluation`, `weighing`; add its 21 items inside its own
block; add that area to `EXPANDED_AREAS`; raise its entry in BOTH `AREA_DEPTH`
(`debate-drills-smoke.ts`) and `DEBATE_AREA_DEPTH` (`debate-mastery-smoke.ts`); extend `G0-7b`'s
expected-id set. **`weighing` was the one that finally exercised the `wg-09` append boundary** —
expect a one-character comma change there and let `G0-C1b`/`G0-C1c` do their job.

### Runtime, untouched

Debate legitimately writes `MasteryProgress`. `DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`recordDrillMasteryInTransaction`, completed-session replay protection, session expiry,
first-answer-per-distinct-id and the XP prohibition are all unchanged. No schema, migration, seed,
route, validator or client change.

## Previous handoff — M14 Global G2 Slice 0: Debate/DECA banks protected (2026-08-07)

**No question content was added or changed.** `lib/debate-drills.ts` and `lib/deca-drills.ts` have
**zero diff**. Slice 0 is groundwork so the eight remaining Global-G2 expansion slices are provably
additive before any of the 168 questions is authored. **There is no content-review gate on Slice 0**;
each of the eight content slices keeps one.

### Where G2 actually stands

| Bank | Total | Per-area | State |
|---|---|---|---|
| `lib/hosa-medterm.ts` | 180 | six areas × 30 | parity, human-reviewed, deployed |
| `lib/debate-drills.ts` | 36 | cw 9 · rb 9 · ev 9 · wg 9 | **G2 outstanding** |
| `lib/deca-drills.ts` | 36 | pi 9 · br 9 · cr 9 · mk 9 | **G2 outstanding** |

**Deficit then 168 questions** (8 × 21). Debate 36→120, DECA 36→120, final corpus **420**. **Global
M14 G2 was OPEN at that slice.** G2 CLOSED 2026-08-12.

### What Slice 0 established — do not undo any of it

- **Immutable baseline for both banks:** `PRE_G2_EXPANSION =
  "26149a3127c0bc7f3108c303f57d41a8dd9088c0"`. **Never make it HEAD-relative and never re-anchor it.**
  Every original item in each bank must stay byte-identical and ordered against that commit.
- **Three self-healing `HEAD` guards were REPLACED, not deleted.** `hosa-medterm-evidence-smoke.ts`
  (both banks), `review-ladder-smoke.ts` (both banks) and `debate-mastery-smoke.ts` (`lib/deca-drills.ts`)
  hashed a drill bank against `HEAD`. That fails while an authorized change is uncommitted and passes
  the instant it commits — it can never notice what a commit changed. Each site now asserts durably
  that the bank's real immutable-based protection exists (`32/33`, `68G`, `28G`).
- **Slice-by-slice authorization — this is the important one.** Each bank has an IMMUTABLE
  `PREFIX_AREA` registry *separate from* `EXPANDED_AREAS`, the areas authorized to receive additions.
  **At Slice 0 both `EXPANDED_AREAS` were empty**, so a structurally valid future item such as
  `rb-10` or `pi-10` was rejected at that phase with stage `unauthorised`. **Each later slice added
  exactly ONE area, in the same commit that added its 21 items, after that content passed human
  review — the era's never-pre-authorize rule.** *(Historical: superseded — all five Debate areas and all four DECA areas are now authorised; both suites assert zero unauthorised areas.)* Both `rb-10` and `pi-10` are live bank
  items today.
- **One shared predicate, `judgeAddition`.** Real additions and every control run through it; its
  `authorised` parameter exists only so a control can probe structural recognition without
  authorizing a real area. Do not add a second regex implementing the same rule.
- **Exact per-area depth assertions** replaced `length >= 32` and per-area `>= 6`, and now also live in
  both mastery smokes (`29k`, `26k`) — what audit G2's Verification line asks for. `AREA_DEPTH` is the
  single source of truth, so one area can go 9 → 30 without weakening the others.
- **Append boundary prepared.** At that slice `wg-09` and `mk-09` terminated their arrays without
  trailing commas. *(Historical: superseded — `wg-09` is no longer the final Debate array element; weighing was expanded in G2 Slice 4 and the bank now ends at `cl-30`.)*
  The comparison normalizes **one terminal comma only** — not whitespace, not general punctuation,
  not property order — and `G0-C1b`/`G0-C1c` prove a comma-only difference normalizes identical while
  a one-word content edit still does not.

### What Slice 1 had to do, as recorded at that slice — SUPERSEDED (it shipped)

**Debate rebuttal 9 → 30**, and it had to **re-base, not delete, the two padding fixtures** that
then described Production truth (20 requested → 9 distinct; rebuttal has been 30 since Slice 1):

- `debate-mastery-smoke.ts` — the "20-question focused session still serves 11 repeats of a 9-item
  pool" control.
- `review-ladder-smoke.ts:524-526` — the 20-slot padded rebuttal fixture asserting `evidenceScore === 67`.

Both break the moment `rebuttal` crosses 20. Re-base them on a request that exceeds a 30-item pool,
exactly as HOSA's `11g` was re-based at Phase 2f. Slice 1 also adds `"rebuttal"` to Debate's
`EXPANDED_AREAS` and raises its `AREA_DEPTH` entry to 30. **Human content review before push.**

### Runtime, untouched

Debate and DECA legitimately write `MasteryProgress` — they are **not** review-only like HOSA. The
mastery transaction path, the 5-distinct evidence floor per drill area, the 70 pass threshold, replay
protection, first-answer behaviour, the XP prohibition and session issuance/grading are all unchanged.
No schema, migration, seed, route, validator or client change.

## Previous handoff — M14 Phase 2f: HOSA pathophysiology 9→30, HOSA parity (2026-08-07)

### Phase 2f: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/hosa-medterm.ts` gained 21 pathophysiology questions (`pp-10`…`pp-30`), taking pathophysiology
9→30 and the bank 159→180. The items were AI-authored, and on **2026-08-07 the repository owner
personally read all 21 and approved them** — pathophysiological accuracy, the
anatomy/physiology/pathophysiology boundary, answer uniqueness, distractors, causal wording,
explanations, mechanism precision and legacy overlap. **The approved version is the final one**,
including the refinements in `d449434` and `bf311c8`. **The push gate is lifted.**

**All six HOSA areas are now 30 deep and human-reviewed. That finishes the HOSA portion of G2 — and
only that portion. Read the next block before writing anything about G2.**

Two things to keep straight, exactly as for Phases 2a–2e:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance. All six slices now carry one.

### ⚠ READ THIS BEFORE WRITING ANYTHING ABOUT G2

**All six HOSA Medical Terminology areas now hold 30. That is HOSA bank parity. It is NOT G2
closure, and at that phase G2 was not to be recorded as complete, closed, or "all areas at depth".** *(Superseded: G2 CLOSED 2026-08-12 at 420/420, deficit 0. That directive bound the agents of its own era; it does not authorise a future agent to contradict the canonical live state.)*

The audit's G2 finding (`docs/M14_LEARNING_QUALITY_AUDIT.md:573`) names **three** bank files and
sizes itself at ~14 areas. Phases 2a–2f covered only the six HOSA ones. Verified from source:

| Bank | Total | Per-area | State |
|---|---|---|---|
| `lib/hosa-medterm.ts` | 180 | six areas × 30 | **parity reached (locally)** |
| `lib/debate-drills.ts` | 36 | claim-warrant-impact 9 · rebuttal 9 · evidence-evaluation 9 · weighing 9 | **still 9 — G2 outstanding** |
| `lib/deca-drills.ts` | 36 | performance-indicators 9 · business-reasoning 9 · customer-relations 9 · marketing-fundamentals 9 | **still 9 — G2 outstanding** |

Those eight areas still pad a 20-question request to 20 slots over 9 distinct items — the original
P0 defect. (At the time of Phase 2f there were **no per-area depth assertions for either bank**;
Global-G2 Slice 0 has since added them — see the Slice 0 block at the top of this file.) At that
phase, closing G2 needed either eight further slices (+168 items, corpus **252 → 420**) or an
explicit recorded decision to re-scope G2 and re-file the Debate/DECA depth gap as its own finding.
**At that phase that decision had not been made and was not to be made silently.** The eight slices
shipped; the owner recorded the closure explicitly on 2026-08-12. *(Historical: superseded — G2 CLOSED 2026-08-12 at 420/420, deficit 0.)*

What Phase 2f changed structurally, and what not to undo:

- **`pp-09` gained a trailing comma** — it stopped being the final array element. That is
  punctuation, not content. The integrity extractor now strips **one** trailing comma on **both**
  sides, and control `31f-C1c` proves the same normalisation still leaves a one-word content edit
  different, so it cannot mask one. **Do not remove that control.**
- **The padding fixture was RE-BASED, not deleted** (`11g`/`11g2`). No area holds 9 any more, so it
  requests **40 from a 30-item area** and asserts **40 served / exactly 30 distinct**.
  `buildMedTermSession` seeds its result with the entire shuffled pool before appending any repeat,
  so the distinct count is deterministic, not probabilistic. A paired control proves the branch only
  activates because the request exceeds the pool.
- **The allowlist controls were redesigned around ONE shared predicate,** `judgeAddition`. Real
  additions and every control go through it — a control with its own regex would prove nothing about
  the rule the bank is actually checked against. It proves: six legitimate prefix→area mappings
  accepted · five synthetic ids rejected (`xx-10`, `zz-10`, `medterm-10`, `p-10`, `phh-10`) ·
  prefix/area mismatch rejected **in both directions** (`pp-31` as physiology, `ph-31` as
  pathophysiology) · an original-range id (`pp-09`, `wr-09`) never treated as an addition.
- **Two dead branches were removed, not left as decoration.** The `expanded ? 30 : 9` ternary and
  `31f7`'s "unexpanded area stays byte-identical" else became unreachable at parity. Both were
  replaced with explicit final-parity assertions. **Never reintroduce a branch that cannot run.**
- `EXPANDED_AREAS` and `ADDITIVE_ALLOWLIST` now contain all six areas. The immutable baseline is
  still `398860f`. **Never reintroduce a HEAD-relative hash.**
- **A stale claim was corrected in the same pass.** The evidence-smoke summary still described the
  Phase 2e physiology additions as pending human review — untrue since 2026-08-07. It is a
  `console.log`, not an assertion, so nothing was failing; it was printing something false.

## Previous handoff — M14 Phase 2e: HOSA physiology bank 9→30 (2026-08-07)

### Phase 2e: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/hosa-medterm.ts` gained 21 physiology questions (`ph-10`…`ph-30`), taking physiology 9→30 and
the bank 138→159. The items were AI-authored, and on **2026-08-07 the repository owner personally
read all 21 and approved them** — physiological accuracy, the physiology/anatomy/pathophysiology
boundary, answer uniqueness, distractors, wording, explanations and mechanism precision — including
the ten refined items and the carried judgments that `ph-14` is physiology rather than anatomy and
that the `ph-17`/`ph-19` overlap is acceptable educational reinforcement. **The push gate is lifted.**

Two things to keep straight, exactly as for Phases 2a–2d:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

**Five of six G2 areas are now at depth. Pathophysiology (9) is the only one left.**

What Phase 2e changed structurally, and what not to undo:

- **The Phase 2d boundary now runs from the physiology side.** Every new item tests a normal
  function, mechanism, process or regulatory response. Nothing asks where a structure sits (anatomy),
  nothing asks about a disease or a disease mechanism (pathophysiology — **Phase 2f needs it**), and
  nothing is bare word-part or term-definition recall. `ph-01`…`ph-09` are untouched.
- **No third insulin/glucose item was added.** `ph-02` and `ph-08` already overlap, and `pp-03` is
  adjacent. Glucose survives in two new items only as a wrong distractor. Do not add another.
- **Coverage is spread across seven system domains** — cardiovascular 4, respiratory 3, digestive 3,
  renal 3, nervous/muscular 4, endocrine 2, blood/hemostasis 2 — so no single system dominates.
- **Padding survival moved physiology → pathophysiology** (`11g`). **Phase 2f cannot simply move it
  again** — it takes the last 9-item area to 30, so no area will be left to name. That fixture must
  be re-based on a request that exceeds a 30-item pool instead. Do not delete it; the padding path
  must stay proven.
- **`31f-C2` moved `ph-10` → `pp-10`; the positive control moved `an-10` → `ph-10`.** `ph-10` left
  the deliberately-rejected list. **Phase 2f faces the same wall:** once every real area is
  allowlisted, only a non-existent prefix such as `xx-10` remains rejectable.
- `EXPANDED_AREAS` and `ADDITIVE_ALLOWLIST` each gained one entry; everything else keys off them.
  The immutable baseline is still `398860f`. **Never reintroduce a HEAD-relative hash.**
- **A stale claim in the evidence-smoke summary was corrected in the same pass.** It still described
  the Phase 2d anatomy items as awaiting human review, which stopped being true on 2026-08-07. It is
  a `console.log`, not an assertion, so nothing was failing — it was printing something false. No
  assertion and no question content changed with it.

**G2 roadmap: after 2e, ONE slice remains — 2f pathophysiology. Full six-area parity occurs only
after Phase 2f.**

## Previous handoff — M14 Phase 2d: HOSA anatomy bank 9→30 (2026-08-07)

### Phase 2d: content is human-reviewed and APPROVED — was clear to push at that pass (since pushed and deployed)

`lib/hosa-medterm.ts` gained 21 anatomy questions (`an-10`…`an-30`), taking anatomy 9→30 and the bank
117→138. The items were AI-authored, and on **2026-08-07 the repository owner personally read all 21
and approved them** — anatomical accuracy, the anatomy/physiology boundary, answer uniqueness,
distractors, wording, explanations and structural/location focus — including the refined `an-24`
(cerebellum inferior and posterior to the cerebrum, in anatomical position), `an-25` (`Carotid
artery`) and `an-30` (largest muscle **by mass**, sartorius distinguished as longest).
**The push gate is lifted.**

Two things to keep straight, exactly as for Phases 2a–2c:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

**Option A is the governing anatomy boundary and was approved as such:** anatomy = structures and
their locations/relationships. Phase 2e must not let physiology material drift back into anatomy —
and the four legacy function-flavoured items (`an-01`, `an-02`, `an-05`, `an-09`) stay unchanged.

**Production ran `b1f5e85aa81cfa0857c531fe7811dc7b515d215a` at that phase** (this is a phase record, not a statement about what Production runs now — see the mandatory gate at the top of this file) (deployment `5797883135`,
`Production`, `success`) — Phase 2c, whose suffix content IS human-approved.

What Phase 2d changed, and what not to undo:

- **Option A boundary was chosen deliberately.** Anatomy is declared as "Structures and their
  locations", but four legacy items (`an-01`, `an-02`, `an-05`, `an-09`) answer with a *function*.
  New items hold the line: structure, location, region, cavity, plane, directional term or
  relationship only. **Do not let anatomy absorb physiology material — Phase 2e needs it.**
- **The `31f-C2` rejected fixture moved `an-10` → `ph-10`** (third move: pr → sf → an → ph) and the
  positive control moved `sf-10` → `an-10`. **Move both again every slice.**
- **Padding survival moved anatomy → physiology** (`11g`). Always name an area still holding 9.
- `EXPANDED_AREAS` and `ADDITIVE_ALLOWLIST` each gained one entry; everything else keyed off them.

**G2 roadmap: after 2d, TWO slices remain — 2e physiology and 2f pathophysiology. Full six-area
parity occurs after 2f.**

### Phase 2c: content is human-reviewed and APPROVED — deployed

`lib/hosa-medterm.ts` gained 21 suffix questions (`sf-10`…`sf-30`), taking suffixes 9→30 and the bank
96→117. The items were AI-authored, and on **2026-08-07 the repository owner personally read all 21
and approved them** — suffix classification, terminology meanings, answer uniqueness, distractors,
wording, explanations and examples — including the refined `sf-18` (claustrophobia, replacing
*photophobia*, which denotes light sensitivity rather than fear), `sf-27` (abnormal condition, generic
increase sense removed) and `sf-29` (scoped to `-cytosis`). **The push gate is lifted.**

Two things to keep straight, exactly as for Phases 2a and 2b:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

One recorded caution for future slices: the Phase 2c pre-screen COMMENTARY wrongly associated
"rupture" with `-rrhagia` (it is `-rrhexis`). The error never reached tracked content — the three
`-rrhagia` mentions in source and docs say only "too close to `-rrhea`", which is accurate — and
`sf-17` was correct and unchanged. **Treat pre-screen commentary as unverified until checked against
source, exactly as the human review does.**

`sf-04`'s `-ology` convention remains an open, deliberately-unresolved question — do not change it
without a decision.

**Production ran `8f6169f01a981f116dcf69dc3a5958fbe9067060` at that phase** (this is a phase record, not a statement about what Production runs now — see the mandatory gate at the top of this file) (deployment `5796977130`, `Production`,
`success`) — Phase 2b, whose prefix content IS human-approved.

What Phase 2c changed, and what not to undo:

- **Four candidates were rejected on classification grounds**, not laziness: `-poiesis`, `-rrhagia`,
  `-stenosis` and **`-edema`** (a standalone term, not a clean suffix). Keep that filter — it is the
  same check that caught `olig/o` in 2b.
- **The `31f-C2` rejected fixture moved `sf-10` → `an-10`.** It has now moved twice (pr → sf → an).
  **Move it again every slice**, or the allowlist silently stops being protected.
- **Padding survival moved suffixes → anatomy** (`11g`). Always name an area still holding 9.
- **`11h` now loops over `EXPANDED_AREAS`**, so every expanded area is proven padding-free and still
  breadth-refused; the byte-identical branch is driven by `MEDTERM_AREAS`. Future slices need one
  `EXPANDED_AREAS` entry and one allowlist entry.
- **Open convention question for a human:** `sf-04` teaches `-ology` where the strict form is `-logy`
  plus a combining vowel; `sf-26` (`-logist`) shares it. `sf-04` was NOT rewritten — pre-existing
  content, outside scope — but decide the convention before it spreads further.

**G2 status: word roots, prefixes and suffixes at 30; anatomy, physiology and pathophysiology remain
at 9** — after Phase 2c there were THREE slices left: 2d anatomy, 2e physiology, 2f pathophysiology.

### Phase 2b: content is human-reviewed and APPROVED — deployed

`lib/hosa-medterm.ts` gained 21 prefix questions (`pr-10`…`pr-30`), taking prefixes 9→30 and the bank
75→96. The items were AI-authored, and on **2026-08-07 the repository owner personally read all 21
and approved them** — prefix meanings, answer uniqueness, distractors, wording, explanations and
suitability — including the revised `pr-20` (`hemi-` / hemithorax) and the replacement `pr-30`
(`pseudo-`, superseding an `olig-` item that mislabelled a combining form as a prefix).
**The push gate is lifted.**

Two things to keep straight, exactly as for Phase 2a:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

Worth carrying into the next slice: the pre-screen's most useful catch was a **combining form
mislabelled as a prefix** (`olig/o`). Check that class explicitly when expanding suffixes.

**Production ran `82cbee67070bee43f46c93ee9ff757e9bb821bd3` at that phase** (this is a phase record, not a statement about what Production runs now — see the mandatory gate at the top of this file) (deployment `5788424169`, `Production`,
`success`) — Phase 2a plus the handoff cleanups. Phase 2a's word-root content is human-reviewed and
approved; Phase 2b's prefix content is not.

**Audit G2 status at that phase: word roots and prefixes were at 30; four HOSA areas remained at 9**
and were the remaining Phase 2 work, one area per slice: **suffixes, anatomy, physiology,
pathophysiology**. All four shipped in Phases 2c-2f. *(Historical: superseded — every DECA area holds 30 and every HOSA area holds 30; no shallow area remains.)*

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

**Phase 2a was deployed at `5789e19b2c626b2a9b902c9e2af7018ff523b2b6`**, GitHub deployment
`5788268138`, `Production`, `success`, verified read-only at the time. **Production has advanced past
that SHA since; this subsection is a Phase 2a record and does not state what Production runs now — see
the `Repository state` block below for that.** Deployment history for the M14 work, for the record:

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

At that pass, M14 Phases A + 1a-1d were live; the G19 copy fix was not (local commit, unpushed) and
the G20 activation had not been run. Both have since shipped. Still not tested anywhere:
authenticated Production behavior of any M14 change.

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

**`wins` and `streak` in the judge route were untouched *by M13E2*.** They then read-modify-wrote
from a pre-read — the C2b exception covered XP and rank only — and `practice-session:smoke` controls
144–144c pinned that behaviour. **Superseded — current source truth:** A3a REMOVED the `User.wins`
write from the judge route entirely (a formative ballot may not mint a competition win; historical
values untouched), and A4a replaced the stale read-add-write on `streak` with an atomic
`{ increment: 1 }`.

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

Read this as a **handoff snapshot taken at the start of the Phase 2e implementation pass**, not as a
live readout. Local SHAs and ahead/behind counts move the moment another commit lands — always
re-derive them with `git status` and `git log --oneline -5` before acting. The three levels below are
deliberately kept apart.

`docs/curriculum/` is tracked (committed in `d7efcb5`) and is the approved research record — treat it
as such, not as app source.

### Deployed / remote state AT THAT PASS — superseded, NOT current

**This subsection is a Phase 2e-era record. It does NOT state what Production runs now.** For live
repository and Production state, read the CANONICAL LIVE STATE block at the top of
`docs/CURRENT_STATE.md` and the mandatory-gate and latest-handoff sections at the top of this file:
`origin/main` is `32f92a4bcc68ab3f027a5fe6e617f2d837273791` (docs deployment `6160459725`), with the
B2.2 feature source `65c4e6f442d00296fe0a8f8e7902cfd627c02080` at deployment `6098166145`.

- **Branch:** `main`
- **origin/main and remote `refs/heads/main` at that pass:**
  `90ca112ecd037618b048a42bef300e6b65c1b909` — M14 Phase 2d, which **was** the SHA Production ran
  then (deployment `5798740105`, `Production`, `success`, created automatically by `vercel[bot]`).
  Many commits have shipped since.
- **Deployed M14 work:** Phase 1 (G23, G18, G21, G24, G25, G19, G20) and Phase 2a (word roots 9→30),
  2b (prefixes 9→30), 2c (suffixes 9→30) and 2d (anatomy 9→30). All four shipped banks are
  human-reviewed and approved.

### Historical snapshot — the local state at the start of Phase 2e

At the start of the Phase 2e implementation pass, local `main` was **level with `origin/main`
(0 ahead, 0 behind)** on the SHA above, with a clean worktree. The whole Phase 2d stack — the anatomy
expansion, its wording refinement, its human-review approval record and two documentation
corrections — was pushed and deployed before this pass began.

**Phase 2e then added exactly one local commit,** `feat(hosa): expand physiology question bank`,
taking physiology 9→30 and the bank 138→159. Re-derive the live position with `git status` rather
than reading a SHA out of this paragraph.

- **Phase 2e state at that pass:** implementation was complete locally; **human content review was
  then OUTSTANDING**. It was completed, and Phase 2e was pushed and deployed.
  The AI-authoring label above `ph-10` stays in `lib/hosa-medterm.ts` permanently per `CLAUDE.md`,
  and the push gate stayed closed at that pass until a human read `ph-10`…`ph-30`.

### Bank composition after Phase 2f (local)

| Area | Items | Review status |
|---|---|---|
| word-roots | 30 | AI-authored, human-approved 2026-08-06 |
| prefixes | 30 | AI-authored, human-approved 2026-08-07 |
| suffixes | 30 | AI-authored, human-approved 2026-08-07 |
| anatomy | 30 | AI-authored, human-approved 2026-08-07 |
| physiology | 30 | AI-authored, human-approved 2026-08-07 |
| pathophysiology | 30 | AI-authored, human-approved 2026-08-07 |
| **`MEDTERM_BANK` total** | **180** | six HOSA areas at 30, all human-approved — HOSA parity, **not** G2 closure |

### Next intended action AT THAT PASS — both items COMPLETED; not current

**Superseded.** Both steps below were carried out. The Phase 2f stack was pushed and verified, and
the Debate/DECA depth expansion ran as G2 Slices 1–8, after which **G2 CLOSED on 2026-08-12** at
420/420 with deficit 0. For the actual current next gate, read the mandatory-gate section at the top
of this file: the canonical-docs rot sweep, then B2.3 (`wg-08`).

*The record as written then:*

1. **Push the Phase 2f stack** (`feat(hosa): expand pathophysiology question bank`, the two
   refinement commits and this approval record) and verify the Production deployment. Human review
   is complete, so nothing else is waiting on it.
2. **Address Debate and DECA depth — this is the next G2 work.** Phase 2f completes the HOSA portion
   of G2; **global G2 was then open for Debate and DECA depth expansion.** Either expand the four
   Debate and four DECA areas (+168 items, corpus 252 → 420) or record an explicit decision to
   re-scope G2. **At that pass, G2 was not to be marked closed on the strength of HOSA parity.** *(Superseded: G2 CLOSED 2026-08-12 at 420/420, deficit 0. That directive bound the agents of its own era; it does not authorise a future agent to contradict the canonical live state.)*

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

**36 registered `*:smoke` scripts** as of the canonical-docs rot sweep — enumerate them with the
command above rather than trusting any list written here. The 32 named below were registered at the
M13E2-era handoff; `coach-evidence`, `clash-activation`, `assessment-quality` and
`learning-content-integrity` have been added since: `security`, `judge`, `judge-shape`,
`rubric-scoring`, `debate-drills`, `deca-drills`, `auth`, `audio-debate`, `team`, `assignment`,
`games`, `tracks`, `hosa-practice-scope`, `side-coach`, `debate-side-coach`, `deca-rubric`,
`hosa-navigator`, `deca-navigator`, `source-freshness`, `nav-a11y`, `lesson-progress`, `debate-replay`,
`learning-path`, `avatar`, `education-registry`, `education-migration`, `skills-compat`,
`deca-mastery`, `debate-mastery`, `hosa-medterm-evidence`, `review-ladder`, `practice-session`.

**Three of them write to the shared Production database: `auth:smoke`, `team:smoke` and
`assignment:smoke`.** They are excluded from validation and are never claimed to pass.
`judge-shape:smoke` makes a live provider call and is also excluded. **The current safe battery is
therefore 32 suites** (36 registered minus those four); at the M13E2-era handoff it was 29 of 32.
Run only the safe set:

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

### Practice session routes (M13E2 — shipped and deployed; "local only" was true only in 2026-08)

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

## Production deployment status AT THE M13E2 PHASE C CLOSEOUT — superseded, NOT current

**This section is a historical deployment record and does NOT state what Production runs now.**
Current: `origin/main` is `32f92a4bcc68ab3f027a5fe6e617f2d837273791`; the B2.2 feature source
`65c4e6f442d00296fe0a8f8e7902cfd627c02080` deployed at `6098166145` and the B2.2 docs source at
`6160459725`. See the CANONICAL LIVE STATE block in `docs/CURRENT_STATE.md`.

*The record as written then:* **Production ran `bb397350029975520e0b96c1c741e7f873f59086`** — the
full M13E2 stack. The two M14 commits were local. M13E1G (`95fdd4c`), Phase A (`221e07f`) and the Phase C stack (`bb39735`) were
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

**Steps 2 and 3 below are an M14-era record and are DONE — the Phase 1e G19 commit was pushed and
verified long ago. The current next action is the canonical-docs rot sweep (see the mandatory gate
at the top of this file), then B2.3 (`wg-08`).** Steps 1, 4, 5 and 6 remain generally applicable;
step 7 (visual redesign) is not a current commitment. The *shape* of this sequence — re-verify the
remote, owner pushes, read-only deployment verification — is the durable part.

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
