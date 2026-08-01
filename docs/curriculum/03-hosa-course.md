# 03 — HOSA Event Navigator, Branch Architecture, and Course Maps

Status: **DRAFT V2** — revised per the approved Final Research Synthesis + Correction Addendum
(dispositions H1–H12, HR-1–HR-15, HV-1–HV-5).

**Critical rule: HOSA is NOT one universal role-play format.** HOSA spans written tests,
presentations, clinical/skill performances, team events, emergency-preparedness events, interview
events, and other event-specific formats. Everything HOSA-facing starts from the learner's EXACT
event.

⟨H1 — the finding that anchors this track⟩ **No standalone patient-conversation event was located in
the complete 2025-26 official event roster and guidelines reviewed.** What exists is **patient
communication scored as rating-sheet rows inside clinical skill rounds**, plus **interview events**
with a judge acting as interviewer. Draft V1's "scenario / patient-facing events" category is
withdrawn. *Absence from the reviewed corpus is not proof HOSA has never offered such an event.*

**Season status.** The current final official set is **2025-26**. HOSA publishes annual
competitive-event guidelines; **the official site states the final 2026-27 guidelines are expected
September 1, 2026.** Preliminary 2026-27 announcements are **not final rules**. Every officially
dependent detail below carries a **September 1 revalidation gate** (doc 00 §3). Sourced today:
Medical Terminology only (50q/60min, verified 2026-07-05).

## 1. HOSA Event Navigator (mandatory first step)

The Navigator is the mandatory first step of the HOSA track: the learner selects their exact event
before any training is recommended.

### Data model (per event; registry-style provenance on every field)

- Event name + **official category** (category names come from the sourced guideline, never guessed)
- Individual or team (+ team size)
- **Round structure** ⟨HR-11⟩ — rounds, what advances a competitor, and **when results become
  available**
- **Prejudged / onsite / both** ⟨HR-11⟩ — a distinct and decision-relevant field; some events are
  determined by material submitted weeks in advance
- Components present: written test? presentation? skill performance? interview? portfolio?
- Required resources/materials (portfolios, secondary materials, equipment)
- **Official rating-sheet summary** (sourced only; otherwise "placeholder — not yet sourced")
- Equipment requirements
- **What CompeteReady can teach** (knowledge drills, communication, rating-sheet reading…)
- **What requires supervised in-person practice** — flagged explicitly, and **labeled as CompeteReady
  policy** (§7)
- **Association-dependence caution** ⟨HR-2⟩ — see §6
- Current official source + last-verified date + **CURRENT / STABLE-TEACHING / POSSIBLY-OUTDATED**

### Behavior rules

- **Fail closed:** an event with unsourced structure shows an honest partial card ("we can't yet show
  this event's official structure — here's what we can help with today") rather than invented detail.
- ⟨HR-1 — CONSTRAINT⟩ The "what this event is actually like" orientation is built from **verified
  official structure only** — components, rounds, timing, rating-sheet categories, equipment lists.
  **No invented room detail, staging, judge behavior, or atmosphere.** Where the official record is
  silent, the Navigator says so.
- ⟨HV-3⟩ **Fallback handling:** external official resources are sometimes unavailable — at least one
  officially linked sample was found dead during research. Never assume an official link resolves;
  degrade to the honest partial card.
- Selecting an event routes to its branch (§3) plus the drills that exist for it.

## 2. Official category orientation

⟨HR-10⟩ Beginners use category vocabulary without a working model of the taxonomy — **no reviewed
discussion defined or navigated the categories.** The Navigator therefore teaches the **official
category names** in plain language, sourced from the current guideline index. This is an area where
CompeteReady can be strictly better than community explanation. **Official names only; no invented
groupings.**

> **Implementation status (2026-07-31).** This orientation is not yet shipped. HOSA's own official
> category names are not in the approved source record, so the Navigator shows **no** official category
> at all rather than guessing one; it points the learner at their current guideline instead. The groups
> it does show are labelled, in the UI, as CompeteReady training groups — explicitly not HOSA's
> classification. This section becomes implementable only once the official category names are sourced.

## 3. Event-branching rules

- **Knowledge-test events** → **Branch A**. Question banks, weighted study planning, spaced review, and
  the Knowledge-to-Performance Bridge. Scenario practice is never a requirement for these events.
- **Clinical skill events** → **Branch B**. CompeteReady teaches the **knowledge, communication, and
  rating-sheet-reading layers only.** The psychomotor skill is flagged "supervised in-person practice
  required." **No simulated hands-on competence is ever implied or scored.**
- **Interview events (Job Seeking Skills, Interviewing Skills)** → **Branch C** ⟨H6/HR-7⟩. These are
  the events with published interview rating rows, and the sharpest unanswered learner demand.
- **Presentation events** → **Branch D**. Structure and delivery, grounded in the event's own
  guideline.
- **Team events** → **Branch E**. Orientation only (§3E).
- **All events** → **Branch F** conference/test-day literacy.
- Never present a generic interaction as "your event."

## 3A. Branch A — Knowledge-Test Events

*Outcome: can study by official weightings and demonstrate retention on unseen items. Prerequisite:
Navigator. Classification: family-specific branch.*

- Official **test plan** reading: the guideline publishes content areas and their weights.
- **Weighted study planning** ⟨H8⟩ built from those official weights — never from guesswork.
- Terminology and anatomy drills; the Knowledge-to-Performance Bridge (§5).
- **Tiebreaker literacy**, per the current event guideline. ⟨GATE⟩ Named-event tiebreaker changes are
  expected in 2026-27; **await the September 1 release before teaching any specific format.**
- Spaced review with different items; seen vs unseen accuracy tracked separately.

⟨HR-6 — practice items⟩ Competitors in the reviewed discussions repeatedly reported **difficulty
locating suitable official practice items** and substituted uncalibrated third-party material. That is
a **reported access problem, not proof that no official materials exist.** CompeteReady-generated items
must be **original, labeled AI-generated or CompeteReady-created, weighted only from current official
test plans, never copying official questions or third-party study sets, and never presented as
official, released, or predictive** (doc 00 §6).

## 3B. Branch B — Clinical-Skill Communication

*Outcome: can perform the **communication layer** that a rating sheet scores. Prerequisite: Navigator.
Classification: family-specific branch; **supervision-labeled; validation-gated**.*

**Scope statement, required at the top of every lesson in this branch:**

> **Communication is one layer inside a larger clinical skill event. This branch does not teach or
> score the physical skill. Completing this branch does not mean you are ready for the complete
> clinical event.**

**Compete stage: DEFERRED pending advisor/judge validation. No hands-on simulation.** This is an
**explicit, deliberate exception** to the universal Learn → Practice → Apply → Compete progression
(doc 04). ⟨H1/HR-5⟩ **Performed patient communication inside clinical skill rounds remains
unvalidated** — neither the HOSA anecdotal pass nor the HOSA caption pass produced usable evidence of
it. If a Compete stage is ever enabled here it may only be a **timed communication-only simulation
using an approved scenario**, never a physical skill simulation and never a measure of clinical
competence.

Lessons:

- **B1. Patient Communication in HOSA Clinical Skill Events** — the shipped lesson, retitled. Teaches
  the interaction framework and the scope statement above.
- **B2. Reading Your Rating Sheet** ⟨H9/HR-3⟩ — the sheet is a published step checklist with per-step
  points and, in many events, a 70% threshold. It is literally the list of what earns points.
- **B3. Your Assigned Role and Its Boundaries** — what your role may do; reporting rather than
  independently treating; knowing your limits as a scored professional skill.
- **B4. Plain-Language Explanation** — the patient channel (§5).
- **B5. Verbalizing What You Observe and Do** ⟨H3/HR-4 — official nuance required⟩ — **verbalization
  may be required where the current rating sheet requires it. Verbalization alone does not replace
  performance when the required equipment is present and the action must actually be performed.** The
  current event guideline and rating sheet control. The community maxim "say everything out loud"
  **oversimplifies the official rule** and must not be taught as-is.
- **B6. Reporting Concerns to the Designated Professional** — the officially scored report-and-document
  closing move. ⟨GAP⟩ **No anecdotal or caption evidence exists for how this is performed**; taught on
  official grounds and flagged as the largest unvalidated area in this branch.
- **B7. Checking Understanding** — ⟨PRODUCT INFERENCE⟩ no scored step for this was located in the
  reviewed sheets. Taught as good practice, **never implied to be scored.**
- **B8. Closing Professionally** — warm close plus handoff.
- **B9. Guided Communication Scenario** — full interaction with coach available and rubric visible.
  **Guided only; no mastery, rating, or record writes.**

**Interaction framework taught throughout (CompeteReady's teaching method):**
ACKNOWLEDGE → CLARIFY → RESPOND SAFELY → CHECK UNDERSTANDING → GIVE AN APPROPRIATE NEXT STEP.
⟨H4⟩ **HOSA does not require or publish this sequence.** Its steps map onto official scored steps
only partially: the greeting is scored; "explained skill to patient" is scored; "reported any concerns
to the nurse (judge)" is scored. **Acknowledging feelings and checking understanding are our framing,
not scored rows.**

**Clinic-privacy scenario — DISABLED BY DEFAULT AT M3.** ⟨HR-14/HV-5⟩ The scenario currently shipped
in this branch has **no clinical or legal approval** and must not remain live through an open-ended
interim period. **At M3 it and all dependent interactive practice are temporarily disabled or removed**
unless an approved replacement has completed the applicable review. Unaffected lesson framing is
preserved only where it remains coherent without that scenario. **If no replacement is approved, it
stays disabled.** See docs 12 and 14.

## 3C. Branch C — Interview Events

*Outcome: can structure an interview answer against published rating rows. Prerequisite: Navigator.
Classification: family-specific branch.*

⟨H6/HR-7⟩ Job Seeking Skills and Interviewing Skills are the events with **published interview rating
rows** and a judge acting as interviewer — the nearest official home for interpersonal practice, and
the sharpest unanswered demand in the anecdotal record. Lessons: opening and framing · interpreting
the question actually asked · answer structure · using a concrete example · **acknowledging
uncertainty without fabricating** · professional close.

## 3D. Branch D — Presentation Events

*Outcome: can organise and deliver a prepared presentation. Prerequisite: Navigator. Classification:
family-specific branch; **official grounding only** — the anecdotal record is thin here.*

Prepared Speaking · Research Poster · Clinical Specialty portfolio orientation (portfolio components,
shadowing documentation, and upload requirements per the current guideline). ⟨GATE⟩ Upload
requirements and deadlines are officially dependent — **revalidate after September 1.**

## 3E. Branch E — Team Events

*Outcome: understands team round structure. Classification: **validation-gated — orientation only.***

Biomedical Debate and HOSA Bowl round structure, from official guidelines. ⟨GAP⟩ **No coordination
evidence exists in any research pass** — no anecdotal team-role data, and caption analysis produced
none. **No team-coordination content is authored on this basis.**

## 3F. Branch F — Conference and Test-Day Literacy

*Outcome: avoids avoidable losses independent of content. Applies to: all HOSA. Classification:
competition orientation; **September 1 gated**.*

⟨H7⟩ Photo identification requirements and penalties · late-arrival rules · dress code and the dress
bonus, **with the Academic Testing Center exception** · equipment expectations · upload deadlines ·
test-administration mechanics (answer-sheet entry, permitted calculators, supplied reference charts).
⟨SCOPE⟩ **These are International Leadership Conference rules; chartered associations may deviate** —
wording must say "at the international level" or "check your association." ⟨NOTE⟩ Photo-ID
requirements appear **nowhere in the anecdotal record**, which is why they belong in taught content.

## 4. Two communication channels (taught in Branch B, drilled in doc 04)

- **PATIENT CHANNEL:** plain, calm, empathetic, no unexplained terminology.
- **PROFESSIONAL CHANNEL:** precise, concise, anatomically accurate, relevant to the rating sheet.

⟨H4⟩ This is an **officially supported product inference**, not official doctrine: it is grounded in
paired scored steps (explain-to-patient and report-to-the-professional). **No official "two channels"
concept exists, and no rating row scores "empathy" or "plain language" by those names.**

The two-channel drill (doc 04): given a term or finding, the learner produces BOTH sentences.

> **TERM: Tachycardia**
> Patient-facing: "Your heart is beating faster than expected. I'm going to report that finding to
> the appropriate healthcare professional."
> Professional: "The patient presents with tachycardia."

## 5. Knowledge-to-Performance Bridge

Every applicable term eventually carries:
MEDICAL TERM → CORRECT MEANING → SCENARIO MEANING → WHAT THE LEARNER OBSERVES → PATIENT-FACING
EXPLANATION → PROFESSIONAL REPORT → ACTION PERMITTED WITHIN THE ASSIGNED ROLE.

The existing MT bank (54 authored questions) is the seed corpus; bridge fields are authored additions,
not AI-generated at runtime.

## 6. Association dependence

⟨HR-2⟩ **HOSA guidelines are written for the International Leadership Conference; chartered
associations may modify implementation.** The same event is described very differently between
associations, and advancement is association-controlled. A local difference is **not** evidence that
the ILC guideline is wrong. **No advancement model, entry limit, or field-size figure is ever taught**
— the Navigator states that the association decides and points the learner at their association.

## 7. Safety, supervision, and scope

**Official HOSA safety distinctions (stated as HOSA's):**

- **Live patients or actors may be used for noninvasive components where the current event guideline
  and equipment list specify them.**
- **Invasive, medication, blood-draw, injection, and resuscitation components use appropriate
  manikins, training arms, medication trainers, or other specified simulation equipment.**
- **The exact current event guideline and equipment list control.**

**CompeteReady policy (labeled as ours, not a HOSA rule):** ⟨H5⟩ HOSA publishes **no** supervision
requirement. CompeteReady's own stance is that hands-on clinical skills should be practised with
appropriate supervision and equipment. This must always be attributed to us.

**CompeteReady never teaches, scores, or simulates hands-on clinical procedures, never reproduces or
summarises procedure steps, and never claims that app practice creates clinical readiness.**

⟨HR-13/HV-4⟩ Several publicly available clinical-skill demonstrations surfaced during research were
**procedure-dominant and excluded before analysis**; their prevalence cannot be estimated from a
bounded search. Competitors report preparing from video and remaining unsure what the rating sheet
rewards — which is why Branch B teaches **the sheet**, not the video.

## 8. Copyrighted references

⟨HR-12⟩ **Never host, reproduce, provide, or link to unauthorized copies. Never route around payment,
authentication, licensing, or access controls.** **Lawful links to official publishers, authorized
retailers, or library/school catalogs are permitted.** **Teach from the official reference list and
test plan without copying the protected source content.**

## 9. AI boundaries (hard, encoded in prompts and rubrics)

The AI character/coach never: diagnoses, recommends treatment, invents professional authority, invents
event procedures, or overrides the official guideline. Feedback rubrics are authored per lesson; the
AI validates the learner's words against them and nothing else.

## 10. HOSA Knowledge Mastery

Weakness tracking by: event · body system · anatomy concept · medical term · safety rule ·
rating-sheet step · communication skill · professional-boundary skill.

Loop: MISSED KNOWLEDGE OR STEP → IDENTIFY EVENT/RATING AREA → TARGETED LESSON → FOCUSED PRACTICE →
NEW SCENARIO → SPACED REVIEW.

## Progress dimensions tracked (doc 04 details)

Event · knowledge area · anatomy/terminology · rating-sheet steps · communication · scope/boundaries ·
patient-facing explanation · professional reporting.

## Open validation gates for this track

| Item | Gate |
|---|---|
| All 2026-27 structural detail | **September 1, 2026 revalidation** |
| Performed patient communication inside skill rounds | Advisor / judge / competitor |
| Whether non-verbalization is deducted, and how the equipment-present nuance applies | Judge |
| Who portrays the patient per event | Advisor + Sept-1 equipment lists |
| Whether competitors receive rating sheets or feedback | Advisor |
| Clinic-privacy scenario | **Clinical + legal** (disabled by default at M3) |
