# NEXT_TASK

**This file is a subordinate task pointer, not an authority.** It does not decide what is blocked,
what is complete, or what may be run. `docs/CURRENT_STATE.md` and `docs/HANDOFF.md` decide those, and
they win over this file whenever they disagree with it.

## How to use this file

1. Read `docs/CURRENT_STATE.md` and `docs/HANDOFF.md` first.
2. If either lists an unmet blocker, a mandatory gate, or a STOP condition, **obey it before anything
   written here.** Nothing in this file can authorize work that either of those files blocks.
3. Only when the canonical blockers are clear does the milestone below become actionable.
4. If a later revision of either canonical file names a different next milestone, **that file wins**
   and this pointer is stale by definition.

## Current task: OWNER BEGINNER QA — not an agent task

**DECA P1 is FROZEN at `77a8fab`** (freeze result P0 = 0, P1 = 0). Agent-driven DECA feature
development stops there. The next step belongs to the owner, not to an agent: use the site as an
actual beginner — click through Learn, take drills, trigger a due review, run a simulation,
deliberately make mistakes — and record anything confusing, misleading, broken or annoying.

Only deterministic issues the owner finds become repair tasks, and each stays narrow. Do not start
new DECA authoring, do not publish `deca-professional-communication`, and do not schedule design or
polish work ahead of the QA pass.

Roadmap: 1. DECA P1 frozen. 2. canonical docs synced. 3. **owner beginner QA (here)**. 4. focused
repairs for deterministic findings. 5. design. 6. website polish. 7. external review. 8. fixes for
legitimate criticism. 9. final freeze / launch.

## Deferred education milestone: Debate connectivity — `debate-signposting` and `debate-constructive-speeches`

**Deferred, not next.** It stays recorded here so it is not lost, and becomes actionable only when
the canonical files say so.

**B2.3 / `wg-08` is CLOSED.** Its accepted stack was owner-pushed and exact-source Production-verified
at `7d2aa83c7420cf654676964ab57ba5b46970b597`, deployment `6170342196`. No B2.3 acceptance, push or
verification work remains, and this file must not route anyone back into it.

The next Debate education target, per the canonical open-gaps lists, is the **two unresolved Debate
connectivity gaps**: `debate-signposting` and `debate-constructive-speeches` carry neither
`skillSlug` nor `practiceDrill`, so neither can mint mastery. `debate-round-orientation` carries
neither **BY DESIGN** and is not a connectivity gap — never write that Signposting and Constructive
are the only two lessons with neither.

Scope, ordering and blockers for that work come from `docs/CURRENT_STATE.md` and `docs/HANDOFF.md`,
not from this pointer. Read their open-gaps sections before starting.

## Backlog, not active

- **B2.4 / `pi-26`** — blocked on sourcing: a primary official DECA source locator for the
  instructional-area-vs-individual-PI weighting rule must be pinned and verified first. Internal
  synthesis is not sufficient.
- **Rubric Engine stage 2** — blocked on sourcing an authoritative current DECA Individual Series
  per-category point split. The weighted-scoring engine exists and is live for HOSA MT; it stays
  dormant for DECA until real point data is sourced. Do **not** fabricate point values to "finish"
  it — a blocked item that stays honest is the correct state.
- **P0.2** and the DECA empty-pool twin. The Signposting / Constructive Speeches connectivity gaps
  are **no longer backlog** — they are the active milestone named above.

## Validation and safety

This file prescribes no test commands. Which suites are safe to run, and which are prohibited, is
stated in `docs/CURRENT_STATE.md` and `docs/HANDOFF.md` — read them there rather than copying a
command list into this file, which is how a stale command outlives the task that needed it.

Push, deploy, dependency installs, DB migrations and seeds remain owner-approved actions.
