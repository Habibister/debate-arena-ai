# CONTEXT_INDEX

Routing for a new session. Read the minimum; do not load every document. Goal: know the project's status
and current task from ~3 small files.

## Always read (every session, in order)

1. `CLAUDE.md` — permanent rules.
2. `docs/CURRENT_STATE.md` — where things stand right now.
3. `docs/NEXT_TASK.md` — the one active milestone.

That is enough to correctly state project status and begin the current task.

## Read only when relevant

- **Product / feature scope:** `docs/COMPETEREADY_MASTER_PLAN.md`
- **Why an architecture/security/product choice was made:** `docs/DECISIONS.md`
- **Continuing or reviewing the previous task:** `docs/HANDOFF.md`
- **Debugging / how to work carefully:** `docs/FABLE_WORKFLOW.md`
- **Track accuracy/sourcing work:** the specific track document only (create per track as needed) — not
  all of them.

## Do not

- Do not paste the master plan into task prompts.
- Do not re-summarize the repository or reread files already covered by `git diff`.
- Do not have multiple agents run the same repository scan.
