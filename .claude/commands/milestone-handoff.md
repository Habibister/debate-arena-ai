---
description: Close out a milestone: rewrite state, write the handoff, prep the local commit.
---

The active milestone is complete. Do this and nothing else:
1. Rewrite `docs/CURRENT_STATE.md` (do not append) — branch, latest commit, working/broken, blockers,
   tests passing, next task, last-updated date.
2. Overwrite the "Latest handoff" in `docs/HANDOFF.md` using its template (task, branch, start/end commit,
   files, behavior, tests run, checks, unresolved, risks, next exact step).
3. If `docs/NEXT_TASK.md` is now stale, replace it with the single next milestone.
4. Show `git diff --stat` and make a local commit with a clear message. Do NOT push.

Use `git diff` rather than rereading files. Keep it factual and short.
