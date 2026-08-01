# 08 — Audit of the Uncommitted C5C1 Lessons Against the Final Specification

> ## ⚠️ HISTORICAL DOCUMENT — READ THIS FIRST
>
> **This audit is preserved as a historical record and its findings are NOT rewritten.** It describes
> the lessons as they stood *before* C5C1 shipped. Three things have changed since:
>
> 1. **Previously shipped behavior.** C5C1, C5C1a and C5C1b are committed and live. Audit item **S1
>    (fallback feedback shown as real feedback) is FIXED** for lesson practice — `unavailable: true`
>    is treated as failure, with an honest error and retry — and the honesty contract was later
>    escalated into the server. **The debate Side Coach panel still carries the old pattern and
>    remains an open ticket** (doc 12, milestone M6). **S3 (skippable first response) is FIXED.**
>    S2 (button label), S4 (no persistence) and S5 (two lesson templates) are addressed in Draft V2
>    and doc 12.
> 2. **Draft V2 decisions supersede this document's recommendations** wherever they differ. In
>    particular, the HOSA revision here (R1–R7) is superseded by the fuller reframing in doc 03: the
>    lesson is retitled **"Patient Communication in HOSA Clinical Skill Events"**, and "scenario /
>    patient-facing events" is withdrawn as a category because **no standalone patient-conversation
>    event was located in the reviewed official corpus.**
> 3. **M3 privacy-scenario disablement.** This audit assessed the clinic-privacy scenario as
>    "appropriately bounded and accurate at the taught level." **That assessment is superseded.** The
>    scenario has **no clinical or legal approval** and is **disabled or removed by default at M3**
>    unless an approved replacement has completed the applicable review (docs 03, 07, 12, 14).
>
> Nothing below is edited. Read it as *what we knew then*.

Status: audit only (historical). The draft files were PRESERVED untouched pending approval at the
time of writing:
`lib/roleplay-lessons.ts`, `components/lessons/roleplay-lesson-view.tsx`,
`components/lessons/roleplay-lesson-practice.tsx` (+ the 4 modified files).

Verdict up front: **both drafts are strong Lesson-0 candidates and should be revised, not
discarded.** The DECA draft is ~80% aligned with the final spec. The HOSA draft's content is good
but its FRAMING violates the spec's critical rule (HOSA ≠ one universal role-play format) and needs
retitling/rescoping plus a Navigator lesson in front of it. One shared mechanical defect (fallback
feedback) must be fixed before either ships.

## A. "How a DECA Role-Play Works" (draft)

1. **Meets the spec:** event explained end-to-end in plain language; complete annotated weak AND
   strong worked role-play on the same scenario; the 5-part recommendation structure (matches the
   spec's PROBLEM→RECOMMENDATION→REASON→IMPLEMENTATION→MEASUREMENT exactly); prep-time outline;
   6 common mistakes with explanations; deterministic identify questions with explanations; learner
   written response + in-character follow-up; feedback tied to the learner's words via the authored
   rubric; track-specific vocabulary (smoke-enforced); terminology positioned as optional support;
   one clear next lesson; provenance note; no mastery/XP/record writes.
2. **Missing (spec steps 10–12):** the **immediate redo** after feedback (current "Get feedback
   again" resubmits the same text — there is no revise-and-resubmit flow); the **transfer
   mini-scenario** (a second, fresh situation applying the same structure); **scheduled later review
   with a different example** (no spaced hook at all — acceptable for a guided lesson, but the spec
   requires at least scheduling intent). Also missing vs the final course: the prep SHEET layout
   (only a prep list is shown), and "entering character" as an explicit step.
3. **Too generic:** very little. "The ballot: a few PI scores plus overall categories" is
   acceptably hedged; with the sourced event shape available it can say "a 100-question cluster exam
   plus the role-play meeting" and stay honest (still no point numbers — the split is placeholder).
4. **Inaccurate/oversimplified:** the weak-example line "A later start would really help." is a
   non-sequitur (likely a typo for "a late checkout"); "often ~10 minutes" prep can state the
   sourced 10 minutes for Individual Series with registry attribution.
5. **Worked example complete?** Yes — weak (4 lines, 3 annotated) and strong (6 lines, 5 annotated),
   same scenario, includes a judge push-back and recovery. Meets the standard.
6. **Teaches a beginner?** Yes. Sequencing (what it is → key ideas → timeline → framework →
   scenario → prep → contrast → mistakes → practice) matches the permanent lesson design steps 1–9.
7. **Practice builds the target skill?** Mostly. Identify questions target scenario decoding; the
   written response targets the recommendation structure; the follow-up targets poise under
   questioning. Weak spots: the first written response can be skipped (empty submit allowed while
   the follow-up box gates the button), and no redo (see 2).
8. **Rubric track-specific?** Yes — specific recommendation / business reason / measurable outcome /
   in-character manager voice. Keep as-is.
9. **Terminology as main path?** No — correctly demoted to an optional support link, smoke-enforced.
10. **N/A (HOSA-specific check).**
11. **Exact revisions required:**
    - R1. Add the redo step: after feedback, reopen the response pre-filled beside the feedback; the
      block completes on the revised submission.
    - R2. Add one transfer mini-scenario (new business situation, same 5-part structure, shorter).
    - R3. Fix the fallback defect (shared, below).
    - R4. Fix the "later start" line; state sourced prep/meeting times with registry attribution.
    - R5. Teach the prep-sheet layout (TOP/LEFT/CENTER/RIGHT/BOTTOM) in the prep section.
    - R6. Relabel the practice button (see shared issue S2).
    - R7. Replace the 11-entry course map with the approved 18-lesson map (doc 02).
    - Full revised learner-facing text implementing R1–R7: doc 10.

## B. "How a HOSA Role-Play Works" (draft)

1. **Meets the spec:** conversation-not-speech framing (exactly the right core idea for scenario
   events); ACKNOWLEDGE→CLARIFY→RESPOND SAFELY→CHECK→NEXT STEP framework (kept verbatim in the
   final spec); complete annotated weak/strong interaction on one scenario; boundaries taught and
   drilled; 8 common mistakes; plain-language emphasis; two-channel seeds present (jargon vs plain);
   honest provenance ("generic, never scored as official"); no mastery writes; track vocabulary
   isolation (smoke-enforced).
2. **Missing:** everything the Navigator provides — event identification, components, rating-sheet
   orientation (spec lessons 1); consent/permission; verbalizing steps; professional reporting (the
   second channel is implied but never taught as a channel); immediate redo; transfer scenario;
   spaced-review hook.
3. **Too generic:** the title and intro generalize one format to the whole org (see 10).
4. **Inaccurate/oversimplified:** "A HOSA role-play is…" presents a universal event type HOSA
   doesn't have; "The feedback: you're evaluated on empathy, clarity…" states scoring criteria as
   general HOSA fact — true in spirit for interaction events but must be scoped ("interaction-style
   events reward…" + defer to the event's official rating sheet). The privacy explanation content
   itself is appropriately bounded and accurate at the taught level.
5. **Worked example complete?** Yes — 4-line weak (3 annotated), 8-line strong (6 annotated), same
   scenario, includes the harder follow-up worry. Meets the standard.
6. **Teaches a beginner?** Yes, for scenario-type events — provided the scoping is fixed so a
   Medical Terminology competitor isn't taught that their event is a conversation.
7. **Practice builds the target skill?** Yes (identify → own-words response → harder follow-up),
   with the same redo/skip gaps as DECA.
8. **Rubric track-specific?** Yes — acknowledge-first / plain-language answer to the actual concern /
   role boundaries / sound next step. Keep as-is.
9. **Terminology as main path?** No — optional support link, correct.
10. **Wrongly implies all HOSA events are role-plays?** **YES — the spec's critical failure, and the
    main required change.** Title ("How a HOSA Role-Play Works"), subtitle, and intro ("A HOSA
    role-play is a short professional conversation") universalize the scenario format. The course
    map also routes every HOSA learner through a conversation-skills path with no event fork.
11. **Exact revisions required:**
    - R1. Retitle to "How a HOSA Scenario Performance Works"; rewrite intro to scope explicitly:
      "HOSA runs many kinds of events… this lesson trains the scenario/interaction kind — first
      confirm yours in the Event Navigator."
    - R2. Insert the Navigator lesson (benchmark, doc 11) BEFORE it in the course; the lessons page
      for HOSA leads with event identification.
    - R3. Scope every "the feedback rewards…" claim to interaction-style events + official rating
      sheet deferral.
    - R4. Add redo + transfer mini-scenario (same as DECA R1–R2).
    - R5. Fix the shared fallback defect (below).
    - R6. Replace the 11-entry course map with the approved 20-lesson shared course (doc 03) with
      the event-branching note.
    - R7. Relabel the practice button (S2).

## C. Shared mechanical issues (both lessons)

- **S1 — Fallback feedback displayed as real feedback (spec: "AI may not create fake feedback after
  a failed request").** `generateSideCoachResponse` returns HTTP 200 with canned
  strength/improvement and `unavailable: true` on provider failure; the practice component's
  guardrail only rejects empty payloads, so canned text renders as "Feedback on your response."
  Required fix: treat `unavailable: true` as failure → show the honest error + Retry. (Audit note:
  the debate Side Coach panel shares this pattern; fixing it there is out of C5C1 scope but should
  be ticketed.)
- **S2 — Button label oversells.** "Get the judge's/patient's reaction" promises an in-character
  reply, but the Side Coach system prompt forbids role-playing a character and returns coach-voiced
  feedback. Either relabel ("Get coaching on your response") or — if the in-character reaction is
  wanted — that's a different route/prompt and a scope decision, not a label fix.
- **S3 — First response skippable.** Gate the feedback button on BOTH text boxes (or explicitly
  design the follow-up-only path).
- **S4 — No persistence.** All progress is in-memory; reload restarts. Acceptable for the pilot;
  lesson position/completion persistence is APPROVAL-REQUIRED storage (doc 04 §1.4) — decide before
  the course grows.
- **S5 — Two lesson templates now exist.** The CWI locked template (skills) vs the role-play
  template (events). The final spec's 13-step sequence covers both; the divergence is intentional
  and should be RATIFIED in docs so future authors don't treat it as drift.
