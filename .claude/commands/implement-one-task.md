---
description: Implement exactly one milestone in a single subsystem, with tests.
---

Read `CLAUDE.md`, `docs/CURRENT_STATE.md`, `docs/HANDOFF.md`, `docs/NEXT_TASK.md` (plus the exact files
you'll change). `docs/CURRENT_STATE.md` and `docs/HANDOFF.md` are the authoritative current state and
win over `docs/NEXT_TASK.md`, which is a subordinate pointer. Check their blockers and STOP conditions
BEFORE starting: if either blocks the task, stop and report — do not proceed because NEXT_TASK names
it. Run only the suites those two files say are safe.

Implement the resulting milestone as the smallest safe change in ONE subsystem, reusing existing
utilities. Then run `npm run build` and the relevant `*:smoke` suites and report results honestly. Make
a local commit with a clear message. Update `docs/CURRENT_STATE.md` and `docs/HANDOFF.md`.

Do not: push/merge/deploy, change secrets, install deps, run DB migrations/seed, or touch a second
overlapping subsystem. Show `git diff --stat` and stop for approval before any of those. Request
security + qa review before considering it done.
