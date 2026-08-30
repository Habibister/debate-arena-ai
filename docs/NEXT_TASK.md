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

## Next education milestone, once canonical blockers are clear: B2.3 / `wg-08`

Teach the competency `wg-08` requires — the **early-stated weighing-standard mechanism**: what a
weighing standard is, and why stating one early shapes every later comparison. The weighing *lenses*
are already taught; this mechanism is not. `wg-08` is HELD and stays HELD until its own reactivation
gate passes.

Same standard as B2.1 and B2.2: teach first, verify reachability from the learner-visible site,
verify closed-corpus preparedness, then run the per-item gate. **Never simply unhold an id.**

## Backlog, not active

- **B2.4 / `pi-26`** — blocked on sourcing: a primary official DECA source locator for the
  instructional-area-vs-individual-PI weighting rule must be pinned and verified first. Internal
  synthesis is not sufficient.
- **Rubric Engine stage 2** — blocked on sourcing an authoritative current DECA Individual Series
  per-category point split. The weighted-scoring engine exists and is live for HOSA MT; it stays
  dormant for DECA until real point data is sourced. Do **not** fabricate point values to "finish"
  it — a blocked item that stays honest is the correct state.
- **P0.2**, the DECA empty-pool twin, and the Signposting / Constructive Speeches connectivity gaps.

## Validation and safety

This file prescribes no test commands. Which suites are safe to run, and which are prohibited, is
stated in `docs/CURRENT_STATE.md` and `docs/HANDOFF.md` — read them there rather than copying a
command list into this file, which is how a stale command outlives the task that needed it.

Push, deploy, dependency installs, DB migrations and seeds remain owner-approved actions.
