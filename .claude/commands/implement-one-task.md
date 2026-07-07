---
description: Implement exactly one milestone in a single subsystem, with tests.
---

Read `CLAUDE.md`, `docs/CURRENT_STATE.md`, `docs/NEXT_TASK.md` only (plus the exact files you'll change).
Implement the active milestone as the smallest safe change in ONE subsystem, reusing existing utilities.
Then run `npm run build` and the relevant `*:smoke` suites and report results honestly. Make a local commit
with a clear message. Update `docs/CURRENT_STATE.md` and `docs/HANDOFF.md`.

Do not: push/merge/deploy, change secrets, install deps, run DB migrations/seed, or touch a second
overlapping subsystem. Show `git diff --stat` and stop for approval before any of those. Request
security + qa review before considering it done.
