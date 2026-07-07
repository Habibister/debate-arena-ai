---
description: Run a focused security review of the current change.
---

Launch the `security-reviewer` agent on the current change. It reads only `git diff`, the touched files,
and `CLAUDE.md` security rules — no unrelated files. It verifies auth-before-rate-limit-before-parse on AI
routes, server-only secrets, server-side access control, and runs `npm run security:smoke`. Relay its
compact verdict (PASS / CHANGES REQUIRED + findings as `file:line`). Do not fix and review in the same
pass — the code author is not the final reviewer.
