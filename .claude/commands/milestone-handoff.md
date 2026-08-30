---
description: Close out a milestone: update the authoritative state region, write the handoff, prep the local commit.
---

**ARCHIVE INVARIANT — read before editing either canonical document.** `docs/CURRENT_STATE.md` and
`docs/HANDOFF.md` each hold an authoritative current region at the top and a frozen historical archive
below a boundary marker (`<!-- CANONICAL_HISTORICAL_ARCHIVE_START -->` and
`<!-- HANDOFF_HISTORICAL_ARCHIVE_START -->`). **Never rewrite either file whole.** Never delete,
rewrite, regenerate, truncate, reorder or replace the marker line or any archive content already below
it. The only permitted change below a marker is appending new history *after* all existing archive
content. Verify before committing: the parent commit's archive slice — marker line to end of file —
must still be present, non-empty and unmodified, as an exact leading prefix of the new slice.

The active milestone is complete. Do this and nothing else:
1. In `docs/CURRENT_STATE.md`, replace **only the authoritative current region above
   `<!-- CANONICAL_HISTORICAL_ARCHIVE_START -->`** — branch, latest commit, working/broken, blockers,
   tests passing, next task, last-updated date. Leave the marker and the existing archive untouched.
2. In `docs/HANDOFF.md`, replace **only the authoritative current region above
   `<!-- HANDOFF_HISTORICAL_ARCHIVE_START -->`** (task, branch, start/end commit, files, behavior,
   tests run, checks, unresolved, risks, next exact step). Leave the marker and the existing archive
   untouched.
3. If the milestone's superseded history is worth keeping, append it after the existing archive
   content — never in place of it.
4. If `docs/NEXT_TASK.md` is now stale, update it. It is a subordinate pointer — see
   `docs/CONTEXT_INDEX.md` for the authority hierarchy.
5. Show `git diff --stat` and make a local commit with a clear message. Do NOT push.

Use `git diff` rather than rereading files. Keep it factual and short.
