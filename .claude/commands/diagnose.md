---
description: Diagnose a bug with evidence before proposing any change.
---

Diagnose the issue described in $ARGUMENTS following `docs/FABLE_WORKFLOW.md` steps 1-4: inspect the
relevant code and its callers, state a hypothesis, gather direct evidence (reproduce it; read real
logs/responses), and identify the root cause. Read only the files involved — use `git diff`/grep, not a
full scan. Report: hypothesis, evidence observed, root cause (`file:line`), and the smallest safe fix.
Do not implement yet. Do not substitute confident prose for evidence.
