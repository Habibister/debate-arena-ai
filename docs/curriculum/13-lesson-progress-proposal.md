# 13 — Lesson Progress Persistence: Audit + Proposal (NOT implemented)

Status: **DRAFT V2** — Phase A / Phase B separation **preserved unchanged**; §"Self-review" added per
the approved synthesis (DV-4). **PROPOSAL ONLY. Nothing here is built. No schema change, no new
storage, no writes. Server-side storage is NOT approved.**

## Audit of existing infrastructure (inspected 2026-07-29)

- **`Lesson` (DB)** — the seeded per-skill lessons behind `/skills`. Authored guided lessons (CWI +
  the two role-play pilots) live **in code** (`lib/lessons.ts`, `lib/roleplay-lessons.ts`) and have
  **no DB identity** — nothing existing can reference them by foreign key.
- **`PracticeAttempt` / `QuestionAttempt`** — real drill/practice records; `PracticeAttempt` has
  `status IN_PROGRESS→…`, `startedAt/completedAt`, but **requires `skillId`** — authored role-play
  lessons have no `Skill` row, so reusing it would force fake skill rows or a schema change.
- **`MasteryProgress` + `SkillReviewSchedule`** — real mastery + spaced review, written only via
  `recordDrillMastery` (server-graded). Correctly untouched by guided lessons.
- **`XPLog` / `User.xp`** — XP from real activity. Guided lessons currently award none (correct).
- **`LessonAssignment`** — coach-assigned DB lessons with `completedAt`; keyed to DB `Lesson`, so
  not usable for authored lessons without schema change.
- **Unfinished-session recovery** — `lib/debate-history.ts` (`isUnfinished`: SETUP/ACTIVE) powers
  Home's "continue where you left off." Debate-record-based; not applicable to lessons.
- **Recommendations** — weak-area recs from graded work (`lib/track-recommendations.ts`),
  fail-closed. No lesson-progress input today.

**Conclusion:** nothing existing can persist authored-lesson position/completion without either a
schema change or client-side storage. There is no partial system to extend — which is why the C5C1
pilots are currently stateless (reload restarts; honest, but weak UX).

## Proposal (two phases, both approval-gated)

### Phase A — client-side resume (no DB, no schema; buildable on approval of this doc)

- `localStorage` key `authored-lesson-progress:<slug>` storing `{ step, identifyIndex,
  correctCount, writeText, followText, updatedAt }` (same pattern as the existing track/
  accessibility localStorage usage: try/catch, never crash, SSR-safe).
- Restores position and both learner responses on revisit; cleared on completion.
- Honest label in the UI: "Progress saved on this device" — never presented as account data.
- Limits (stated, accepted): single-device, clearable by the browser. No cross-device resume.

### Phase B — minimal server persistence (requires schema approval + `db push` approval)

One additive table, deliberately NOT a mastery/rating/score system:

```prisma
model AuthoredLessonProgress {
  id          String    @id @default(cuid())
  userId      String
  lessonSlug  String    // code-authored lesson id (CWI, roleplay pilots, future lessons)
  step        String    // e.g. "identify:2" | "respond" | "complete"
  completedAt DateTime?
  updatedAt   DateTime  @updatedAt
  createdAt   DateTime  @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, lessonSlug])
}
```

- **Current lesson step / resume state:** `step` (server copy of Phase A state; learner text stays
  client-side only — no storing of learner writing server-side unless separately approved).
- **Lesson completion:** `completedAt` set when the practice block is finished. Completion is a
  fact ("finished the guided lesson"), never a score, never XP, never mastery, never a competition
  record.
- **Practice attempt:** NOT stored here. If attempt history is ever wanted, that is a separate
  proposal; guided-lesson attempts are hint-assisted and must never enter grading pipelines.
- **Next-lesson eligibility:** derived, not stored — lesson N+1 shows "recommended next" when
  lesson N has `completedAt`. No gating/locking (a learner may open any authored lesson); order is
  guidance, consistent with no-fake-progress.
- Reads/writes behind an authenticated route; owner-only; no coach visibility until separately
  approved.

### Explicitly out of scope (guardrails)

No new rating; no competition record; no XP from guided lessons; no mastery writes outside
`recordDrillMastery`; no parallel scorekeeper; no schema change or `db push` without showing the
diff and waiting for approval (shared production DB).

## Self-review from learner-generated recordings or transcripts — HYPOTHESIS ONLY

⟨DV-4 — added in Draft V2⟩ Three bounded caption-analysis passes established that **third-party
material is often not text-accessible through public routes**. A learner recording or transcribing
**their own** practice is one possible way to get reviewable text where external material is
unavailable — and it also serves the coachless learner, who has no one to review a rep with.

**This is a hypothesis. It is not approved, and nothing is built.** This pass supplied **no direct
evidence that the workflow works.**

**Required before any build:** feasibility · transcription accuracy · cost · **consent · privacy ·
retention · accessibility · age-appropriate safeguarding** · technical review.

**Hard constraints, non-negotiable if it is ever built:**

- **Students must never be required to upload identifiable recordings.** Any recording feature must
  be optional, and local-only processing must be evaluated before any upload path is considered.
- **Transcript feedback must never be presented as equivalent to audiovisual delivery feedback.**
  A transcript cannot show rate, cadence, articulation, posture, eye contact, or composure — and
  feedback built on one must say so.
- **Especially sensitive for HOSA**, where practice may involve clinical settings, real equipment, or
  third parties who have not consented to being recorded.
- Nothing recorded feeds mastery, XP, rating, or any competition record.

**Relationship to Phase B:** independent. Phase B stores a lesson *step* and a completion timestamp.
**Learner writing and learner recordings are not stored server-side under either phase** without a
separate approval.

### Recommendation

Approve Phase A now (pure client UX, honest labeling). Hold Phase B until the course grows past
the pilots — one table then covers CWI + all authored lessons uniformly. **Hold the self-review
hypothesis entirely until its privacy and safeguarding review is done.**
