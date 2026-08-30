# CONTEXT_INDEX

Routing for a new session. Read the minimum; do not load every document. Goal: know the project's
status, its current blockers, and the current task from ~4 small files.

## Authority hierarchy

When two documents disagree, this order decides — highest first:

1. `CLAUDE.md` — permanent operating rules. Never overridden.
2. `docs/CURRENT_STATE.md` and `docs/HANDOFF.md` — **the authoritative current state.** CURRENT_STATE
   holds repository and project truth; HANDOFF holds the operational handoff, current blockers, STOP
   conditions and execution-safety detail.
3. `docs/NEXT_TASK.md` — a **subordinate** task pointer. It may never override CURRENT_STATE or
   HANDOFF, and calling itself the active milestone does not make it one.

Everything else — the master plan, `.claude` commands, agent definitions, planning notes — sits below
level 2. If any of them conflicts with CURRENT_STATE or HANDOFF, **CURRENT_STATE and HANDOFF win.**

In both canonical documents, only the region **above** the historical-archive boundary is current.
Everything below that marker is preserved history: non-normative, non-executable, and never a
description of current state. Do not run a command copied from below the boundary.

## Always read (every session, in order)

1. `CLAUDE.md` — permanent rules.
2. `docs/CURRENT_STATE.md` — where things stand right now.
3. `docs/HANDOFF.md` — current blockers, STOP conditions, and which commands are safe to run.
4. `docs/NEXT_TASK.md` — the next task, subject to 2 and 3.

Steps 2 and 3 are both mandatory before starting executable work. HANDOFF carries current safety
constraints that are not duplicated anywhere else, so skipping it can bypass an active blocker.

## Read only when relevant

- **Product / feature scope:** `docs/COMPETEREADY_MASTER_PLAN.md`
- **Why an architecture/security/product choice was made:** `docs/DECISIONS.md`
- **Debugging / how to work carefully:** `docs/FABLE_WORKFLOW.md`
- **Track accuracy/sourcing work:** the specific track document only (create per track as needed) —
  not all of them.

## Do not

- Do not paste the master plan into task prompts.
- Do not re-summarize the repository or reread files already covered by `git diff`.
- Do not have multiple agents run the same repository scan.
- Do not begin a task from `docs/NEXT_TASK.md` without first checking the blockers in
  `docs/CURRENT_STATE.md` and `docs/HANDOFF.md`.
