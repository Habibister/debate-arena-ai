# CLAUDE.md — CompeteReady

Permanent operating rules for this repository. Read this every session. For where to read next, see
`docs/CONTEXT_INDEX.md`. This file holds only durable rules — never branch details or project history.

## Mission

CompeteReady trains students for **real competitive events** with practice that mirrors how each event
is actually run and scored. The promise is honesty: real round structure, rubrics grounded in official
guidelines, and never fake progress.

## The four training tracks

**General Debate** (Public Forum + parliamentary), **DECA**, **HOSA**, **Model UN**. Tracks are
**isolated**: a student in one track never sees another track's content presented as their training.
Isolation is enforced end-to-end (pages, APIs, coach dashboards) and covered by `npm run tracks:smoke`.
Never weaken it.

## Non-negotiable product rules

- **No fake progress.** XP, mastery, streaks, and stats shown to students derive from real recorded
  activity. Demo/sample stats exist only for seeded demo accounts. Mastery counts only if it survives
  spaced reassessment.
- **No fake official content.** Competition rules, rubrics, and point values are shown as official only
  when sourced from an authoritative current source. Unverified data is labeled placeholder — never
  guessed, never presented as verified. AI-generated material is always labeled as AI-generated.
- **Honest provenance.** Registry fields are marked sourced vs. placeholder; the UI attributes content
  to "[Org] [Season] guidelines — last verified [date]" and flags partial/unverified specs.

## Security rules

- **AI provider keys and all secrets are server-side only.** Never expose them to the client or logs.
- **Every AI/generation route requires an authenticated session and is rate-limited**, with auth checked
  before rate-limiting and before parsing the request body. `npm run security:smoke` enforces this across
  all AI routes (recursively) — keep it green.
- Access control lives server-side (owner/coach/admin checks). Never trust client-supplied identity.

## Engineering rules

- **Inspect before editing.** Read the target code and its callers first; find existing utilities to
  reuse before writing new code.
- **Small, focused changes.** One subsystem per change. Match surrounding style.
- **Tests before completion.** Run `npm run build` **and the relevant `*:smoke` suites** before calling
  work done — not just typecheck/lint. Never claim a test passed unless it actually ran.
- **Preview before Production.** Verify behavior in a running preview/dev environment before shipping.
  Note: the browser-preview helper cannot launch from `~/Documents` (TCC); verify via a dev server + curl
  + SSR when needed, and say so honestly.
- **`npm run build` and the dev server must not share `.next`.** Stop the dev server before building, or
  restart it after — a concurrent build corrupts the running server.
- **After any interrupted turn, run `git status` first** to catch stray untracked files before resuming.
- **Report uncertainty honestly.** If something is unverified, stale, or a guess, say so. Do not
  substitute confident prose for evidence.

## Actions that require explicit human approval

Never do any of these automatically: **push, merge, deploy, change secrets, install dependencies, run
database migrations or `db push`/`seed` against the shared DB.** Show the diff and wait. Never use
destructive git commands. The database is shared with production — treat every write as production.

## Collaboration rules (for multi-agent work)

- **One implementation agent per overlapping subsystem** at a time. Two agents must not edit the same
  files concurrently.
- **The agent that writes code cannot be its own final reviewer.** Security and QA review every
  meaningful implementation independently.
- Research/review agents inspect and report findings; they do not modify code.

## Accessibility and mobile

- **Preserve accessibility.** Status is never conveyed by color alone — pair color with text and icon.
  Keep ARIA labels, keyboard access, and reduced-motion support intact.
- **Preserve mobile support.** Layouts must remain usable on small screens; navigation must stay reachable
  on mobile.

## Completion standard

A change is done only when: it builds, the relevant smoke suites pass, behavior is verified (preview or
targeted test), it's a local commit with a clear message, and `docs/CURRENT_STATE.md` + `docs/HANDOFF.md`
are updated. No push without approval.
