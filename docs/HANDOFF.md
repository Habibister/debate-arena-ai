# HANDOFF

Latest task handoff only. Overwrite each milestone. Move a handoff to `docs/history/` only if it holds
detail genuinely worth keeping.

## Template (copy for each handoff)

- **Task attempted:**
- **Branch:**
- **Starting commit:**
- **Ending commit:**
- **Files changed:**
- **Behavior changed:**
- **Tests run:** (build + which smoke suites, with result)
- **Browser/preview checks:**
- **Unresolved issues:**
- **Known risks:**
- **Next exact step:**

## Latest handoff

- **Task attempted:** C5C1 — DECA/HOSA beginner guided pilot lessons ("How a DECA Role-Play Works",
  "How a HOSA Scenario Interaction Works") + an approved correction round (Side Coach integrity,
  coaching-feedback labeling, required first response, HOSA multi-format reframing, cautious privacy
  copy, honest score-sheet/feedback wording).
- **Branch:** `main`
- **Starting commit:** `74cbeec`
- **Ending commit:** C5C1 commit (this handoff; held for explicit approval before committing).
- **Files changed:** `lib/roleplay-lessons.ts` (new authored content library),
  `components/lessons/roleplay-lesson-view.tsx` + `roleplay-lesson-practice.tsx` (new),
  `app/(app)/lessons/[slug]/page.tsx`, `app/(app)/lessons/page.tsx`,
  `app/(app)/training/[track]/page.tsx`, `scripts/tracks-smoke.ts`, `docs/CURRENT_STATE.md`,
  `docs/HANDOFF.md`.
- **Behavior changed:** /lessons is track-scoped ("Performance Course") and serves the two authored
  pilots; Train hubs for DECA/HOSA show the Guided lessons card. Practice is guided-only (no
  mastery/XP/rating/record), reuses the authenticated Side Coach route for coaching feedback (never
  character role-play), treats `unavailable: true`/empty payloads as failures with an honest retry
  that preserves both learner responses, and requires the first written response before the authored
  follow-up unlocks. HOSA is framed as multi-format (scenario lesson sits beneath a future Event
  Navigator, map index 1); the privacy example avoids absolute legal assurances and refers specifics
  to qualified staff. No new AI routes; no DB/schema changes.
- **Tests run:** `npm run build` (pass); `typecheck` (pass); `tracks:smoke` (pass, incl. 9 new C5C1
  regression assertions + CWI/`debate-claim-building` unchanged pin); `security:smoke` (pass, 18 AI
  routes).
- **Browser/preview checks:** browser-preview can't launch from `~/Documents` (TCC). Verified via dev
  server + curl (all /lessons routes 307→signin, auth gate intact; old HOSA slug dead — never
  published) and a direct SSR render check of both lessons + practice with real components/data
  (titles, Navigator-first map, "You're here" index, privacy fix, DECA typo/timing fix all render).
  Honest limit: retry/gating flows verified by smoke assertions + initial-render SSR, not a
  logged-in click-through.
- **Unresolved issues:** lesson position/completion/resume not persisted (proposal in untracked
  `docs/curriculum/13-lesson-progress-proposal.md`, awaiting review); the debate Side Coach panel has
  the same unavailable-fallback display pattern (out of C5C1 scope — ticket separately);
  `docs/curriculum/` (course maps, video scripts, benchmark lessons, C5C1 audit) is intentionally
  untracked pending the separate research-validation and curriculum-review stage.
- **Known risks:** None to runtime; content-only + client component changes; Debate
  arena/judge/ratings/ballots/turn order/Side Coach server internals untouched.
- **Next exact step:** curriculum review (CURRICULUM-1/2 in `docs/curriculum/`), decisions on the
  progress-persistence proposal, then the still-open items: HOSA MT + Public Forum Full Simulations,
  surgical seed of the 3 DECA drill skills, and `docs/NEXT_TASK.md` DECA point-split sourcing.
