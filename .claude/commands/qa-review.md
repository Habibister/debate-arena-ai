---
description: Run a focused QA review of the current change.
---

Launch the `qa-reviewer` agent on the current change. It reads only `git diff` and the touched files, runs
`npm run build` + the smoke suites relevant to the change, and verifies behavior (dev server + curl / SSR
when browser preview is unavailable), honest degradation, accessibility (no color-only status), and mobile.
Relay its compact verdict (PASS / CHANGES REQUIRED, build/smoke results, findings). It must not claim a
test passed unless it actually ran.
