# CompeteReady Master Plan

_Last updated: 2026-07-05. This document consolidates the product vision into one place. It describes
what CompeteReady is, the learning architecture every feature must fit into, the rules that are not
negotiable, and the order in which the remaining systems get built._

## 1. Core mission

CompeteReady trains students for real competitive events — **General Debate (Public Forum and
parliamentary formats), DECA, HOSA, and Model UN** — with practice that mirrors how each event is
actually run and scored. The product's promise is honesty: a student who trains here practices the
real round structure, is measured against rubrics grounded in the official guidelines, and is never
shown fake progress.

Each organization is a **track**. Tracks are isolated: a HOSA student never sees parliamentary
debate presented as their training, DECA students get role-play simulation rather than rebuttals,
and content is filtered end-to-end (pages, APIs, coach dashboards) by track. This isolation is
already enforced in code (`lib/training-tracks.ts`, `lib/track-server.ts`, `lib/track-content.ts`)
and verified by `npm run tracks:smoke`.

## 2. Central learning architecture

Every learning feature must locate itself on this chain. Anything that can't say where it sits on
the chain doesn't ship.

```
Competition → Event → Round Structure → Rubric → Skill → Lesson → Drill
     → Attempt → Feedback → Redo → Transfer → Spaced Reassessment
```

- **Competition** — the organization and season (DECA 2025-2026). Ground truth lives in the
  Competition Specification Registry (`CompetitionSpec` model), season-versioned and source-linked.
- **Event** — a concrete competitive event (Public Forum, Hotel and Lodging Management Series,
  Medical Terminology, GA Committee Session) with a division and official references.
- **Round Structure** — the real segment order, timings, and prep rules. Simulations must use the
  registry's structure, not hardcoded times.
- **Rubric** — the official categories and point values (or an honest statement that judging is
  holistic, as in PF). The Rubric Engine scores against these; placeholder rubrics are labeled.
- **Skill** — the trainable unit a rubric category decomposes into (already modeled: `Skill`,
  `MasteryProgress`).
- **Lesson** — instruction targeted at one skill (`Lesson`, `LessonType`).
- **Drill** — repetitive, low-stakes practice: flashcard games, question sets, single-segment
  speech reps (already live in Study games and skill practice).
- **Attempt** — a recorded, timestamped performance: a debate, a role-play, a practice test
  (`Debate`, `PracticeAttempt`, `PracticeTest`).
- **Feedback** — judge/coach output tied to rubric categories, with the AI provider identified and
  fallbacks labeled (`aiProvider`, `aiNotice`).
- **Redo** — the same motion/scenario attempted again with the feedback in hand (replay + retry
  already live).
- **Transfer** — a different scenario exercising the same skill, to prove the learning wasn't
  memorized.
- **Spaced Reassessment** — the skill resurfaces on a decay schedule; mastery only counts if it
  survives the gap.

## 3. Non-negotiable rules

1. **No dark patterns.** No fake streaks pressure, no manufactured scarcity, no shame mechanics.
2. **No fake XP or mastery.** Numbers shown to students derive from real recorded activity —
   demo/sample stats exist only for `@debatearena.ai` demo accounts (`lib/demo.ts`). Mastery is
   earned through attempts and survives spaced reassessment, or it isn't mastery.
3. **Season-versioned content.** Rules change (HOSA cut Medical Terminology from 100 questions/90
   min to 50/60 for 2025-26). Content carries a season and a verification status; stale specs are
   superseded by a new version, never silently edited.
4. **AI-integrity boundaries per conference.** Every spec records what AI assistance the
   organization allows or forbids, and how CompeteReady enforces it in-app (e.g., Side Coach is
   practice-only and never writes into transcripts; practice tests never reproduce real exam
   items). Where a policy is unverified, it is marked placeholder — never guessed at as official.
5. **Honest provenance.** Every registry field is marked sourced vs. placeholder (`fieldNotes`),
   and the UI shows "Using [Org] [Season] guidelines — last verified [date]" with an explicit
   "partially verified" / "unverified draft" badge when appropriate.
6. **AI never hard-fails the product, and never silently pretends.** Provider fallback chains and
   deterministic backups keep training available; every response is tagged with its true provider.

## 4. Build order

Each stage builds on the previous one's data.

1. **Competition Specification Registry** _(started 2026-07-05)_ — the `CompetitionSpec` model,
   admin-only write APIs, spec attribution banners, seeded with PF / DECA HLM / HOSA MT / MUN GA.
   Next: verify placeholder fields against official PDFs, add remaining events per track.
2. **Rubric Engine** — judge scoring driven by the registry's rubric categories instead of
   hardcoded rubrics in `lib/rubrics.ts`; every category score traceable to an official category.
3. **Study Arcade** — the drill layer unified: flashcard games, question banks (depth needed for
   MUN and General Debate), and single-skill reps, all feeding `MasteryProgress`.
4. **Track Simulations** — full-round simulation per track from the registry's round structure:
   timed PF rounds (already strong), DECA role-play with 10-minute prep clock, HOSA practice
   tests in the real 50-item/60-minute shape, MUN moderated-caucus practice.
5. **Coach Tools** — assignments, team management, and progress views (already live) extended
   with spec-aware expectations: a coach assigns "HLM role-play, official structure" rather than a
   generic task.
6. **Live Matchmaking** — student-vs-student rounds with the same round structures and rubrics;
   the existing `api/matchmaking` stub becomes real once simulations and rubrics are trustworthy.

## 5. Known gaps (parked deliberately)

- **Mobile secondary navigation** _(noted 2026-07-05)_: the IA rebuild put Assignments / History /
  Skills / Tests / Settings in a "More" group that renders on the desktop sidebar only. On mobile
  these pages remain reachable through in-page links but are absent from the nav bar. Pick up when
  the mobile shell gets its next pass.

## 6. Current state anchors (2026-07-05)

- AI: Gemini → Groq chain, all AI routes require sign-in, distributed per-user rate limiting live.
- Tracks: isolation enforced and smoke-tested; CompeteReady branding shipped.
- Registry: schema + APIs + banner + 4 seeded specs (verification mix: 1 VERIFIED, 2 PARTIALLY,
  1 PLACEHOLDER — see `scripts/seed-competition-specs.ts` for exact provenance).
- Testing: no unit-test runner yet; the safety net is `npm run <suite>:smoke` scripts + typecheck.
