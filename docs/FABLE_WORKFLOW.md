# FABLE_WORKFLOW

A model-independent working discipline. This is not an attempt to imitate or reproduce any specific model
— it is the sequence that produces reliable, honest work regardless of which model runs it.

## The loop

1. **Inspect before acting.** Read the target code and its callers; check `CURRENT_STATE.md` and
   `NEXT_TASK.md`. Reuse existing utilities over writing new ones.
2. **Establish hypotheses.** State what you think is true and how you'd know.
3. **Gather direct evidence.** Reproduce the behavior; read logs, real responses, real data. Prefer
   observation over assumption.
4. **Identify root cause.** Trace to the actual cause, not the first plausible symptom.
5. **Propose the smallest safe change.** One subsystem. Match surrounding style.
6. **Implement one subsystem.** Do not sprawl into unrelated files.
7. **Run targeted tests.** `npm run build` + the relevant `*:smoke` suites. Summarize output; paste only
   the errors that matter, not full logs.
8. **Review independently.** The author is not the final reviewer. Run/ask for security + QA review on
   meaningful changes.
9. **Fix verified findings.** Address confirmed issues; don't chase speculation.
10. **Run final validation.** Build + smokes green; behavior verified in a running environment.
11. **Create a local commit.** Clear message. No push without approval.
12. **Update `CURRENT_STATE.md` and `HANDOFF.md`.** Rewrite state; record the handoff.

## Core rule

**Do not substitute confident prose for evidence.** If you have not run it, observed it, or sourced it,
say so plainly. A verified "blocked" or "unknown" beats a confident guess.

## Token discipline

- Read selectively; use `git diff` instead of rereading whole files.
- Cite exact file paths and line numbers.
- Summarize tool output; don't paste full build logs.
- Don't repeat unchanged repo summaries or the master plan into prompts.
- Research agents return findings; they do not rewrite implementation plans.
- Checkpoint briefly after each phase; stop once the assigned output is complete.
