# CompeteReady Master Plan

Product vision. Read for feature/product work. Rules that apply everywhere live in `CLAUDE.md` and are
not repeated here. Current status lives in `CURRENT_STATE.md`; the active task in `NEXT_TASK.md`.

## Mission

Train students for real competitive events — General Debate, DECA, HOSA — with practice that
mirrors how each event is actually run and scored, and never shows fake progress.

**Model UN is soft-removed from the active product (2026-07):** hidden from all navigation and selection
surfaces; code, routes (`/api/ai/mun/*`), components (`MunConference`), skills/specs, and user data are
fully retained. Revival requires picking a real conference and sourcing its rules — until then it stays
out of the product rather than shipping an unsourced sandbox.

## Target users

Middle/high-school competitors preparing for real events; coaches who assign practice and track student
progress. Classrooms/coach enrollment are **optional** — a student can practice solo without a coach.

## Product principles

- Honesty over polish: real structure, sourced rubrics, labeled provenance.
- Gamification is evidence-only (enforced 2026-07): no synthetic ratings or bands, no fake "day streak"
  units, no loss-framed pressure copy, no invented percentages. XP/rank derive solely from real recorded
  activity; the activity counter is labeled "practice sessions" until a real date-based streak exists.
- Track isolation: each organization's training is separate and never cross-contaminated.
- AI assists, never impersonates authority: generated content is labeled; official claims require sources.
- Availability: AI never hard-fails the product; deterministic fallbacks keep practice working.

## Current major capabilities

- **AI layer:** multi-provider chain (Gemini → Groq) behind auth + per-user rate limiting; every response
  tagged with its true provider.
- **Competition Specification Registry:** season-versioned `CompetitionSpec` model with round structure,
  rubric categories/points, provenance, and attribution banners.
- **Per-track practice:** debate rooms with AI opponent + judge + argument-flow analysis; DECA role-play
  with in-character objection rounds and split scoring; HOSA Medical Terminology knowledge engine
  (timed/untimed, spaced review) plus a labeled-generic health-science role-play. (Model UN sandbox
  retained in code but soft-removed from the product — see Mission.)
- **Learning system:** skills, mastery, spaced reassessment, Study Arcade, practice tests, replay/retry.
- **Coach tools:** teams, join codes, assignments, progress views.

## Roadmap

1. **Competition Specification Registry** — expand and verify specs. (foundational; in progress)
2. **Rubric Engine** — judges score against registry category points, not hardcoded seeds. (engine built;
   needs sourced per-category point data — see `NEXT_TASK.md`)
3. **Study Arcade depth** — question-bank breadth for MUN and General Debate; unified drills.
4. **Track Simulations** — full timed rounds per track from registry structure.
5. **Coach Tools** — spec-aware assignments.
6. **Live Matchmaking** — student-vs-student rounds once simulations + rubrics are trustworthy.

## Track-specific accuracy rules

- Content is official only when sourced from a current authoritative document. Check a source's actual
  date (e.g. PDF metadata), not its URL, before calling it current.
- Where a point split, rule, or policy can't be sourced, keep it placeholder and label it. Never guess.
- Detailed sourcing per track lives in a track document (create per track as needed), not here.

## Design direction

Clean, focused, low-distraction. Direct paths to practice (one click to a debate room). Mobile-first and
accessible (color never the sole signal). No dark patterns.

## Learning-system philosophy

The learning chain: Competition → Event → Round Structure → Rubric → Skill → Lesson → Drill → Attempt →
Feedback → Redo → Transfer → Spaced Reassessment. Every learning feature must locate itself on this
chain. Mastery is earned and must survive spaced reassessment to count.

## Safety, privacy, and monetization

- Student data is protected; never logged or exposed. AI keys and secrets are server-side only.
- AI-integrity boundaries are modeled per competition (what assistance each org allows) and enforced
  in-app; practice never reproduces protected exam items.
- **No ads. No fake mastery.** Monetization, if any, never comes from advertising or manufactured
  engagement.

## Completion standards

A capability is "done" only when it builds, passes its smoke suite, is verified in a running environment,
attributes any official content to a real source, and preserves accessibility and mobile support.
Scaffolded/partial work is labeled as such in `CURRENT_STATE.md`.
