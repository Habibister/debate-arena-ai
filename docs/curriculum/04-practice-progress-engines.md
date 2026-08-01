# 04 — Practice Engine and Progress/Recommendation Engine (specifications)

Status: **DRAFT V2** — revised per the approved Final Research Synthesis + Correction Addendum.
These are product specs, not schema changes. Anything requiring a new DB table/field, or any change to
mastery/rating semantics, is explicitly flagged APPROVAL-REQUIRED and will not be built without a
separate sign-off.

## 1. Practice engine

### 1.1 The universal progression

**Learn → Practice → Apply → Compete**, across every track:

- **Learn** — worked model with line-level annotation. No learner output requested first.
- **Practice** — completion tasks and guided production **with the rubric visible**.
- **Apply** — independent production on **unseen** material, rubric applied after.
- **Compete** — timed/pressured production or a full simulation.

**A skill counts only on unseen material.** Seen and unseen accuracy are separate numbers.

**One deliberate exception, documented:** the **HOSA Clinical-Skill Communication branch** (doc 03
§3B) has its **Compete stage deferred pending advisor/judge validation, with no hands-on simulation**.
Performed patient communication inside clinical skill rounds remains unvalidated, and completing that
branch never means complete-event readiness.

### 1.2 The five scaffold rungs (fading)

1. **Model** — full expert example with annotations (read/watch only).
2. **Completion** — the example with ONE part removed; learner supplies it.
3. **Guided production** — learner produces the whole unit with the rubric visible and hints available.
4. **Independent production** — no rubric visible during production; rubric applied after.
5. **Pressured production** — timed and/or with an in-character push-back before feedback.

A learner's rung per skill is remembered.

### 1.3 The practice block (the atomic unit of all drills)

**PROMPT → LEARNER RESPONSE → WORD-SPECIFIC FEEDBACK → IMMEDIATE REDO → (optionally) TRANSFER PROMPT**

- **The redo is mandatory UI and is the completion event of the block** — not the first attempt. After
  feedback, the response box reopens pre-filled with the learner's text, the feedback beside it, and
  the block completes on the revised submission. Independently corroborated as the most-endorsed
  practice habit in the anecdotal record.
- Feedback must quote or closely paraphrase the learner's words. Feedback is validated against the
  **authored** rubric passed with the request; the AI never invents criteria.
- **Failure honesty:** if the AI is unavailable, the UI says so and offers retry. **A fallback or
  canned response is NEVER displayed as feedback on the learner's words.** Concretely: responses
  carrying `unavailable: true` are treated as failures by every practice UI. *(Shipped for lesson
  practice; the debate Side Coach panel remains an open ticket — doc 12.)*
- **Rubric-complete feedback contract** (shipped): honest strengths only, complete rubric coverage,
  combined evidence across all of the learner's responses, a labeled revised example, and calibration
  so a genuinely good answer is not told it lacks strengths. Applies to every new authored lesson.
- Timed variants run client-timed with honest labels; no fabricated timers for events whose timing
  isn't sourced.
- **The rubric is solo-usable.** ⟨B-10⟩ Practice-partner scarcity is the modal condition; every rubric
  must support **record → self-grade** without a partner, coach, or judge present.

### 1.4 Drill type inventory

- Identify (deterministic MC with explanations — scaffolds only, never the whole lesson)
- Completion (fill the missing part)
- Written production (+ redo, + transfer)
- Compression ladder (60/30/15/one sentence)
- Timed analysis (10-second weakness find; 3-response generation)
- Two-channel drill (HOSA: patient sentence + professional sentence)
- PI-to-action drill (DECA: term/PI → in-character sentence)
- Repair drill (fix the flagged flaw in your OWN prior response)
- Switch-side drill (debate)
- Flow comparison; predict-next-response; independent RFD; **ballot triage** (debate)
- **Rating-sheet reading drill** (HOSA: given a published checklist, name what earns points)
- Spaced-review variants of all of the above with different examples (never the original item)

**Product hypotheses — not approved drills:**

- ⟨V-2⟩ **Adversarial warrant elicitation** — a coach persona asking "why is that true?" until a
  mechanism appears. Observed once, in one round, as a contrast between *conditions* rather than
  between people. **Requires coach validation.**
- ⟨HR-6⟩ **Test-plan-weighted practice-item generation (HOSA).** Items must be **original, labeled
  AI-generated or CompeteReady-created, weighted only from current official test plans, never copying
  official questions/paid references/textbooks/third-party study sets, and never presented as official,
  released, or predictive of competition questions.**

### 1.5 What practice writes (honesty)

- **Guided lesson practice (rungs 1–3): records NOTHING** to mastery/XP/rating — it is guided,
  hint-assisted work. Position/completion persistence for resuming lessons is a UX feature,
  APPROVAL-REQUIRED (new storage), and is **NOT progress data**.
- **Only approved independent drills at rungs 4–5 on seeded skills** write real MasteryProgress and
  spaced review, and only through the EXISTING pipeline (`recordDrillMastery`). **No parallel
  scorekeeper, ever.**
- Simulations: use existing session/ballot records. Nothing new.

### 1.6 Self-review — hypothesis only

⟨DV-4⟩ A learner recording or transcribing **their own** practice may offer a self-review pathway where
third-party material is unavailable. **This is a hypothesis. It is not approved and nothing is built.**

Required before any build: feasibility, transcription accuracy, cost, **consent, privacy, retention,
accessibility, and age-appropriate safeguarding review.**

Hard constraints, non-negotiable if it is ever built:

- **Students must never be required to upload identifiable recordings.**
- **Transcript feedback must never be presented as equivalent to audiovisual delivery feedback.**
- Especially sensitive for HOSA, where practice may involve clinical settings and third parties.

## 2. Progress and recommendation engine

### 2.1 Tracked dimensions (per track)

- **Debate:** warrant quality · evidence explanation · refutation · rebuilding · weighing · delivery ·
  judge adaptation · reasoning-error (fallacy) recurrence.
- **DECA:** career cluster · instructional area · performance indicator (keyed by official code) ·
  repeated exam weakness · role-play weakness (by course-lesson skill) · implementation · metrics ·
  judge-question performance.
- **HOSA:** event · knowledge area · anatomy/terminology · rating-sheet steps · communication ·
  scope/boundaries · patient-facing explanation · professional reporting.

### 2.2 Error taxonomies (authored, versioned; feed error classification)

- **Debate:** unsupported-link · claim-restated-as-warrant · **warrant-outsourced-to-citation** ·
  unweighed-impact · dropped-argument · evidence-unexplained · fallacy:{strawman, false-dilemma,
  slippery-slope, hasty-generalization, circular, ad-hominem, cherry-picking, appeal-to-authority} ·
  delivery:{pace, filler, uptalk, reading}.
- **DECA:** PI-named-not-demonstrated · vague-recommendation · no-business-reason · no-implementation ·
  no-metric · out-of-character · collapsed-under-question · problem-misidentified · **fabricated-answer**.
- **HOSA:** speech-not-conversation · no-acknowledgment · jargon-unexplained · boundary-violation ·
  concern-unanswered · no-understanding-check · no-next-step · report-imprecise ·
  **verbalization-without-performance-context**.

### 2.3 Recommendation rule (the only recommendation pattern)

REPEATED ERROR (same tag ≥2 recorded occurrences) → TARGETED LESSON → SMALL DRILL (one practice
block) → IMMEDIATE REDO → NEW TRANSFER TASK (unseen instance) → SPACED REVIEW (different example).

- Recommendations derive only from real recorded activity. **Fail closed:** if the data doesn't
  identify a pattern, say "not enough graded work yet to spot a pattern" — never invent a weak area,
  never recommend random full tests.
- Only **unseen** accuracy supports "improving/mastered" language.
- Simulations feed the engine: each ballot comment carries the lesson number that trains it.
- **APPROVAL-REQUIRED before build:** error-tag storage (new field/table), lesson↔error-tag mapping,
  and any UI claiming trend lines.

### 2.4 What the progress views show (future)

Per-dimension evidence lists ("3 of your last 4 rebuttals dropped the impact — Lesson 33 trains this")
— always the underlying real events, never a synthetic composite score. Any composite/index number is
out of scope without explicit approval.
