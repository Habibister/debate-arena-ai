# 12 — Implementation Checkpoint Plan and Safeguards

Status: **DRAFT V2** — the milestone sequence below replaces the Draft V1 CURRICULUM/CONTENT/PRACTICE
sequence, per the approved Final Research Synthesis + Correction Addendum. **Filename unchanged.**

**Implementation status (2026-07-31), recorded separately from the plan:** M1–M11 in the sequence below
are complete locally, and the twelve M11R1–M11R12 remediation passes that followed the M11 review are
also complete. M4 remains blocked and unstarted. This document stays the **plan of record**, not a status
report — see `docs/CURRENT_STATE.md` for what actually shipped and what is deployed.

Each milestone is a separate approval gate — no stage begins until the prior stage's exit criteria are
approved. Nothing is combined. Every stage obeys the standing rules: builds green, relevant `*:smoke`
suites green, behavior verified, docs updated, **local commit only, no push without approval.**

## Milestone sequence

### M1 — Curriculum Draft V2: principles, policy, course maps
- **Scope:** apply the approved manifest to docs 00–04 and this file; create doc 14.
- **Files:** `docs/curriculum/00, 01, 02, 03, 04, 12, 14`.
- **Tests:** none (documents). Self-review against the approved disposition tables.
- **Stop condition:** every approved proposal ID is represented; every provisional item is labeled.
- **Commit boundary:** one commit — "Curriculum Draft V2: principles, policy, course maps".

### M2 — Curriculum Draft V2: benchmarks and video scripts
- **Scope:** apply the manifest to docs 05–07, 09–11, 13; then a full cross-file consistency audit.
- **Files:** those documents.
- **Tests:** none (documents). Heading/order checks, internal filename checks, rejected-phrase greps.
- **Stop condition:** benchmark text final; scripts carry corrected framing; audit clean.
- **Commit boundary:** one commit — "Curriculum Draft V2: benchmarks and video scripts".

### M3 — Shipped-lesson content revisions, including HOSA privacy-scenario disablement
- **Scope:**
  - **Debate CWI** — additive only: cite the Debate Training Guide specifically; acknowledge
    compatible four-part presentations; add the two-models warning and the "all claims" diagnostic;
    add the **citation-heavy / under-explained-mechanism** weak-example type (never described as
    automatically warrantless). **Mastery wiring untouched.**
  - **DECA lesson** — family scope; per-family judge-question flow with the corrected PSC wording;
    scaffold labeled as ours and mapped to official Solution criteria; five-PI note; prep budget and
    cue-note rule; judge-reality caveat; score-sheet pointer; non-fabricating template; D-E-C-A as
    optional non-official glossary only; **no point totals**.
  - **HOSA lesson** — retitle to **"Patient Communication in HOSA Clinical Skill Events"**; add the
    communication-is-one-layer framing, the official people distinctions, the verbalization nuance,
    the rating-sheet pointer, and the supervision label marked as **CompeteReady policy**.
  - **⛔ HOSA privacy scenario — DEFAULT ACTION: DISABLE.** **Temporarily disable or remove the
    clinic-privacy scenario and its dependent interactive practice by default** — the identify
    questions, the written response, the follow-up, and any rubric item that depends on it. **Preserve
    unaffected framing only where it remains coherent without that scenario.** **No orphaned practice
    steps and no orphaned rubric items may remain.** **No replacement content is authored during M3.**
    The default applies **unless the human reviewer has explicitly accepted the risk of keeping it
    live** — which they have not.
- **Files:** `lib/lessons.ts`, `lib/roleplay-lessons.ts`, `scripts/tracks-smoke.ts`.
- **Tests:** `npm run build`; `tracks:smoke`; `security:smoke`; `side-coach:smoke`; SSR render check.
- **Stop condition:** each lesson renders coherently **without** the disabled scenario; no broken
  practice step; smoke pins updated to the new titles and maps.
- **Commit boundary:** one commit per track; **the HOSA commit names the disablement explicitly.**

### M4 — Replacement-scenario authoring and review (separately gated)
- **Scope:** author a candidate replacement **only on instruction**. Route by content:
  - **Medical, privacy, or legal claims → clinical and legal review.**
  - **Clearly non-medical, non-legal administrative communication → still requires advisor, safety,
    and product review.**
- **Stop condition:** **blocked** until a replacement is authored AND its applicable review is
  complete. **If no replacement is approved, the scenario remains disabled.**
- **Commit boundary:** separate commit; nothing ships without the applicable review.

### M5 — Lesson progress, Phase A
- **Scope:** `localStorage` resume, "Progress saved on this device" label, SSR-safe try/catch (doc 13).
- **Tests:** build; `tracks:smoke`; manual reload test.
- **Stop condition:** resume works; **no server write, no mastery, no XP.**

### M6 — Side Coach unavailable fallback (debate panel)
- **Scope:** extend the shipped honesty check to the debate Side Coach panel — the standing ticket
  from doc 08 item S1.
- **Tests:** build; `side-coach:smoke`; provider-down test.
- **Stop condition:** the panel shows an honest error and retry, **never canned text**.

### M7 — DECA rubric-complete feedback alignment
- **Scope:** align the authored DECA rubric to official Solution categories; **keep the shipped
  rubric-complete feedback contract exactly as-is.**
- **Tests:** build; `side-coach:smoke`; `tracks:smoke`.
- **Stop condition:** rubric within schema caps; contract assertions green.

### M8 — Event Navigator (HOSA first, then DECA)
- **Scope:** fail-closed selector; honest-partial cards; only sourced events show official structure.
- **Tests:** build; `tracks:smoke` **with new fail-closed tests**; `security:smoke`.
- **Stop condition:** an unsourced event shows an honest partial card, **never invented detail.**

### M9 — Source and freshness indicators
- **Scope:** surface last-verified dates and CURRENT / STABLE-TEACHING / POSSIBLY-OUTDATED labels on
  official-fact surfaces; source-tier tags on lessons.
- **Stop condition:** no hardcoded restatement of registry facts.

### M10 — Track isolation and navigation regression
- **Scope:** extend `tracks:smoke` for the new branches and Navigator routes; verify mobile
  reachability and accessibility (status never conveyed by color alone).
- **Stop condition:** all suites green.

### M11 — Final review and commit strategy
- **Scope:** independent security + product/QA review of M3–M10; `docs/CURRENT_STATE.md` and
  `docs/HANDOFF.md` updated.
- **Tests:** full build + all `*:smoke`.
- **Stop condition:** reviews clean. **No push without explicit approval.**

## Deferred beyond this sequence

Bridge drills (DECA PI-to-action, HOSA two-channel) with authored item sets · error-tag storage and
the recommendation engine (schema-gated) · lesson progress Phase B (schema-gated) · video integration
from approved original scripts · further lesson authoring in small approved batches · visual redesign.
The DECA Quiz Bowl pipeline slots in only after the user delivers the document.

## Safe-implementation safeguards (all stages)

- The writer agent never final-reviews its own change; security + product/QA review independently.
- Track isolation smoke stays green at every stage; new branching logic gets fail-closed tests.
- **No fake progress:** guided practice writes nothing; only approved rung-4/5 drills on seeded skills
  write mastery through the existing pipeline; any new storage is separately approved.
- **No fake official content:** unsourced event data renders as honest-partial. No point numbers in
  learner-facing text. **Registry seeding is a separate approval-gated task.**
- **All AI feedback surfaces treat `unavailable: true` as failure.** Shipped for lesson practice;
  M6 closes the debate panel.
- **Never teach as universal:** any cut line, normalization mechanic, advancement model, entry limit,
  question-skipped penalty, device deduction, or dress requirement. **No TDM weighting until DECA
  resolves its Guide-versus-sample conflict. No parliamentary rules until separately sourced.**
- **HOSA:** every officially dependent detail is gated on the **September 1, 2026** revalidation.
  Supervision guidance stays labeled as CompeteReady policy. **No procedural clinical content, ever.**
- Approval-required actions (push, deploy, schema changes, seeds against the shared DB) are always
  shown as diffs and awaited.
