# HANDOFF

Everything the next engineer needs to continue safely. Rewrite in place; do not append history.

## Latest handoff — M14 Global G2 Slice 7 / DECA Slice 3: CR 9→30 (2026-08-12)

### Slice 7 is DEPLOYED, HUMAN-REVIEWED, and PRODUCTION-VERIFIED

Status: **`DEPLOYED, HUMAN-REVIEWED, AND PRODUCTION-VERIFIED`.**

Production deployment **`5874440794`** from source SHA **`d877d2ed7339e6bbf2ec82c81f6c612484fea4e9`**,
created automatically by `vercel[bot]` from the Git push, status **success**. Local HEAD = `origin/main`
= remote main, **0 / 0**. Post-deploy checks: canonical public routes 200 · protected learner routes and
dashboard 307 to `/signin` · the five drill APIs 401 unauthenticated · **zero 5xx** · **no DB write, no
manual deploy, no rollback**.

**Two separate gates, both now met. Keep them distinct in the record.**

**1. Content-quality gate — PASS**, by AI adversarial audit: 21/21 exactly one defensible answer ·
21/21 fact-sufficient · 0 hidden policy · 0 hidden authority · 0 hidden capability/access · 0
explanation-only defects · 0 item-level form leaks · 0 boundary defects · 0 legacy-debt defects.

**2. Human review gate — PASS (2026-08-12).** An **external human reviewer personally reviewed all 21
final Customer Relations questions, `cr-10` through `cr-30`, at the final shipping content** and
approved the complete set **without requested changes**. Earlier human feedback had already shaped the
content: a human identified the item-level answer-form leakage the slice-wide metrics had masked, and
a human blind-quiz answer surfaced the `cr-20` ambiguity — both triggered adversarial work that found
defects nothing else had.

**A separate Google Gemini review also found no content changes necessary.** That is **supplementary
AI QA and does NOT count as human review** — the gate is satisfied by the external human reviewer
alone. Neither AI self-review nor review by another AI system satisfies it.

Both gates were met **before** the push, in that order, and the push was a manual action taken with
explicit approval per CLAUDE.md.

**The CR/MK curriculum approval is a separate, completed thing and is NOT reopened.** It is deployed
and human-reviewed at `8cb181e` (deployment `5864802348`, `Production`, `success`), and the approved
**CR1–CR6** lessons were this slice's source of truth. New drill questions do not invalidate an
approved curriculum — do not reopen ⟨BC-5⟩.

`lib/deca-drills.ts` gained 21 customer-relations questions (`cr-10`…`cr-30`), taking CR 9→30 and the
DECA bank 78→99.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — depth COMPLETE, deployed, reviewed |
| `lib/deca-drills.ts` | **99** | pi 30 · br 30 (both deployed, reviewed) · **cr 30 (human-reviewed, ready for push)** · mk 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit 21** (was 42), **entirely marketing-fundamentals**. Corpus 378 → **399** locally; target 420.

### The ⟨BC-3⟩ / F-8 rule is what governs CR question quality — keep it

Every one of the 21 states in its stem the policy and authority facts its keyed answer turns on.
**Hidden policy: 0 of 21. Hidden authority: 0 of 21.** Where policy is not material (`cr-15`, `cr-17`,
`cr-19`) none was invented. Four items (`cr-13`, `cr-16`, `cr-17`, `cr-26`) leave one fact unknown **on
purpose** — spotting the gap is the learner decision — while still stating the policy/authority frame.
**Any future CR item must satisfy this.**

### What Slice 7 changed — do not undo any of it

- **`G0-7b4c` control moved `cr-10` → `cr-31`.** This was the known trap: `cr-10` was an out-of-set
  probe through Slice 6 and became a legitimate addition here, so keeping it would have inverted the
  assertion. New **`G0-7b4d`** proves `cr-10` and `cr-30` ARE in the expected set — the boundary moved
  provably rather than quietly loosening. `cr-09` was added as the lower probe.
- **CR legacy-order guard added** — `G0-D7` (drills) and `26m2` (mastery). The mastery suite indexes
  **`CR.slice(0, 2)`** at [scripts/deca-mastery-smoke.ts:291](scripts/deca-mastery-smoke.ts:291) for
  tests `10`/`10b`/`10c`, so `cr-01`/`cr-02` must remain the first two CR entries. Real index
  dependency, not ceremony. **No BR order assertion was added — nothing indexes BR.**
- **`CR.slice(0, 2)` was NOT re-based.** `uniqueTotal` counts submitted ids, not pool size, so CR stays
  2 and PI stays 3; 2 < the floor of 5, so `10c` still records nothing. Pool growth 9→30 changed none
  of it.
- **A second hardcoded `42`** lived in the predicate control at `deca-drills-smoke.ts`; `tsc` caught it
  (`'63' and '42' have no overlap`). It now derives from `EXPECTED_ADDED.length` and cannot drift.
- **NO legacy punctuation changed.** CR is a MIDDLE block so `cr-09` already had its comma.
  **`mk-09` is still the final array element and still comma-less** — Slice 8 owns that boundary.
- **MK stayed the shallow control in both suites.** Parking it on MK at Slice 6 was the right call: it
  has moved exactly ONCE. **MK is now the only shallow DECA area**, so **Slice 8 MUST re-base this
  control onto a >30 overdraw** — HOSA `11g` and Debate Slice 4 precedent. Do not delete it. Both
  exact-count assertions went TWO → ONE.
- **Authorization:** `EXPANDED_AREAS` = PI, BR, **CR**. MK unauthorised; `G0-C6b` = **1**, `G0-C6b2`
  names MK specifically, `mk-10` still rejected at stage `unauthorised`. `G0-7b` is now a **63-id**
  guarantee with `G0-7b2d` asserting zero MK additions; forbidden prefixes narrowed to `["mk"]`.

### Slice 7 was REFINED after the human-review packet — still NOT approved

The read-only review packet raised four should-fix issues; all four are resolved in the refinement
commit. **The questions remain unapproved and the do-not-push gate stands.**

**F7-1 — answer-length leakage (the important one).** The key was the longest choice in **18 of 21**.
Choice *order* is shuffled at serve time by `buildServedChoices`, but choice *length* is not, so
"always pick the longest" would have scored **≈86%** with no understanding of Customer Relations. Ten
distractors were rewritten to carry their own reasoning — which makes them genuinely more tempting
rather than padded.

**F7-10 — the aggregate metric was not enough, and the user caught it.** This is the most important
lesson in the slice. With the slice-wide figure at 4 of 21 key-longest, the repository owner read
`cr-10` and saw the key still announced itself: the only choice combining policy *and* authority, the
only fully reasoned option, distractors far simpler. **A bank can pass a global "pick-the-longest" test
and still leak item by item — the learner answers one question, not the average.** A per-item detector
was written (unique length · uniquely multi-clause · unique policy/authority vocabulary · unique
qualifiers · distractors much simpler) and found **9 of 21 leaking**, not 4: `cr-10`, `cr-13`, `cr-16`,
`cr-17`, `cr-20`, `cr-23`, `cr-24`, `cr-27`, `cr-30`. All nine were fixed by **making the wrong answers
equally serious**, never by trimming keys — e.g. `cr-10`'s "said more warmly" became "skipped the
acknowledgement the customer was owed before any remedy was discussed", and `cr-24` gained an
escalation distractor with the same four-step shape as the key.

**Item-level form leaks: 0 of 21.** Final distribution: key longest **5 of 21**, shortest **4 of 21**,
neither **12 of 21**, mean **0.90**, median **0.92**, max **1.09**, min **0.45**. An interim pass drove
key-longest down to 2 of 21 with max ratio 1.02, which was becoming the **inverse** tell — "the longest
answer is almost always wrong" gives a real edge — so three keys were naturally lengthened to bring the
rate back toward chance. **Two guards, not one: no per-item form cue AND no slice-wide rule in either
direction. Run the per-item check on Slice 8 before review, not the average after it.**

**F7-9 — `cr-30` reflexive escalation and hidden authority.** Caught on the second review pass, and the
substantive half matters more than the form half. The key said to *"bring in the supervisor if more is
asked"*, but the stem establishes only that **a supervisor is on the floor** — not that they hold any
remedy the employee lacks, not that the customer asked for them, and not that a raised voice requires
escalation. That was an unstated-authority implication in the one item whose whole point is that volume
changes nothing. The key now stays within the two stated remedies, and **reflexive escalation became
the strongest distractor**, which reinforces CR6's do-not-escalate-when-you-can-solve-it rule. It also
cleared the form cues: `cr-30` had been key-longest, the slice's highest ratio (1.59), and the only
choice naming the supervisor — it is now none of those. **Lesson for Slice 8: check that every noun in
a stem which sounds like authority is actually given a power, or it will leak into the key.**

**F7-6 — `cr-19` invented a fact.** The key asserted "about five working days" although the stem never
supplied it — the same error the course teaches against. The estimate is now stated in the stem.

**F7-3 — `cr-25` omitted manager availability.** The stem now states a manager is on shift and
available, and the key offers to ask them to review the refund instead of implying a dead end.

**F7-4 — `cr-26` had a defensible distractor.** "Ask the customer to check with their neighbours and
call back" is ordinary practice in a real delivery dispute, so it was not safely wrong. It is replaced
by handing the investigation to the customer, which the supplied facts defeat.

**Fact-sufficient 21/21 and exactly-one-defensible-answer 21/21** after refinement (both were 20/21).

**⚠ An adversarial read-only audit then found two BLOCKERS and two borderlines the earlier passes
had cleared.** The owner's single blind answer on `cr-20` exposed the first, and re-auditing on the
question *"can any distractor also be defended without inventing facts?"* — rather than *"which
answer was intended?"* — exposed the rest. **(cr-20)** the rationale added while fixing form leakage
turned a distractor into a competing answer; rejecting it required the explanation-only claim that
stating the expired window "is necessary". Replaced with a manager-exception option, defeated by the
stem's own grant of store-credit authority. **(cr-23)** the key asserted a one-week lead time the stem never supplied — the identical defect fixed in `cr-19` as F7-6 and never checked here. **A later spot-review found the same item still invented a second fact: the key's "we'll call you to book the repair" described a callback process the stem did not establish.** Both the timescale and the callback process are now stated in the stem. **(cr-26)** the key assumed the
employee could obtain proof of delivery when the stem established only tracking visibility; the stem
now states the capability. **(cr-30)** the waiting option was defensible real-world practice, so the
stem now states the customer is still listening and actively asking what you can do, which the
silence option directly contradicts. **Lesson recorded for Slice 8: form audits and intent-based
re-reads cannot find these — only adversarially defending every distractor can.**

**Source-array key position is A in all 21** — an authoring convention shared with the approved PI and
BR slices, and **not learner-visible**, because the session route is the only consumer of the bank and
it shuffles choices with opaque UUID option ids. Left as-is deliberately; it is a note, not a defect.

Two things to keep straight, as for every slice so far:

- **The AI pre-screen is not the review.** It was the authoring model checking its own output.
- **The AI-authoring label stays in the source permanently** and must not be removed at approval.

### Next steps, in order

**Next active work: M14 G2 Slice 8 — Marketing Fundamentals expansion from 9 to 30.** It is the final
G2 depth slice. Nothing about Slice 7 remains outstanding.

Slice 8 carries twelve obligations, all already earned by earlier slices — do not rediscover them:

1. Expand marketing-fundamentals `mk-10`…`mk-30`, taking MK 9 → 30 and DECA 99 → 120.
2. **`mk-09` is the final array element and is comma-less.** This is the one legacy byte that must
   change, and the terminal-comma normalisation exists precisely for it. Change nothing else.
3. `EXPANDED_AREAS` becomes all four DECA areas.
4. **`FORBIDDEN_PREFIXES = ["mk"]` cannot survive** — MK becomes authorised, so the list empties.
5. **Do not let that control go vacuous.** Replace it with a non-vacuous future/out-of-range authority
   test, the way Debate's Slice 4 handled its final area (`G0-C6c` test-only withheld sets).
6. **Re-base the MK shallow-depth controls.** No DECA area will remain at 9, so the 20/9 and 40/9
   controls must move onto a >30 overdraw — the HOSA `11g` precedent. Do not delete them.
7. Preserve every pre-G2 legacy byte except the mechanically necessary `mk-09` comma.
8. **Run the per-item answer-form detector BEFORE human review, not the aggregate after it.** The
   slice-wide average masked a real per-item leak in Slice 7.
9. **Adversarially audit every distractor for a second defensible answer** — ask "can this also be
   defended without inventing facts?", never "which answer was intended?".
10. **Verify every factual claim in every key is supplied by the stem** — including process and
    capability claims, not just numbers. Slice 7's `cr-23` invented a lead time *and* a callback
    process, in the same sentence, and three review passes missed the second one.
11. Preserve AI-assisted provenance permanently in the source label.
12. **Genuine human content review is required before Slice 8 is pushed** — AI self-review does not
    satisfy it, and neither does review by another AI system.

**Global M14 G2 remains OPEN. Do not record CR depth, DECA, or Global G2 as complete or closed** —
the deficit is 21, entirely marketing-fundamentals.

## M14 DECA Curriculum Completion: CR + MK curriculum APPROVED (2026-08-12)

### Curriculum is human-reviewed and APPROVED — clear to push

Status: **`AI-ASSISTED CURRICULUM, HUMAN-REVIEWED AND APPROVED 2026-08-12`.**

On **2026-08-12 the repository owner personally read all twelve lessons in the final post-refinement
checklist and approved them** — the CR and MK core definitions, each lesson's concepts, examples,
non-examples, common mistakes and boundaries, ⟨CR-C⟩ and its labeling, the 21-row provenance map, the
five CR and one MK legacy-debt records, source/provenance honesty, D7 labeling, legal/policy scope,
age-appropriateness, and depth sufficiency for both areas. **The approved curriculum is the cumulative
content of `afe9c94` PLUS refinement commit `07068f1`. The curriculum push gate is lifted.**

**Two points were refined before approval.** The four-input CR model no longer claims to be
exhaustive — the scope block now states it is **CompeteReady's analytic model, not an exhaustive
taxonomy**, naming tone, sequencing and acknowledgement as parts of an interaction that do not always
reduce to one of four boxes. MK6's absolute audience/channel `must` became **"a strong promotion
choice matches the message to the intended audience and uses a channel that can realistically reach
that audience"** — contextual fit, with room for broad-awareness activity.

**Six notes were reviewed and approved WITHOUT rewrite**, recorded so a later reader does not reopen
them: the **paraphrase-source disclosure** (CR2 — the strongest source defines paraphrase for written
text; spoken-service use is labeled as ours) · the **AMA scope** (MK3 — AMA covers brand positioning
and is a second source, never a rules source; OpenStax carries the broader grounding) · the **narrow
CFPB context** (CR5 — supports only that complaint handling is a defined organizational process in
regulated settings; its sector deadlines are not taught and do not generalize) · the **CR3/CR4
layering** (the unauthorized-commitment error appears in both because the primary decisions differ —
acknowledgement vs. asserting a cause, versus which real option to offer) · the **⟨BC-2⟩
source-verification wording** · and the **⟨BC-3⟩ policy-fact rule**.

**⟨BC-3⟩ IS BINDING ON SLICE 7 — do not weaken it.** If a CR question's correctness depends on refund
or exchange eligibility, store-credit availability, warranty handling, employee authority, an
escalation requirement, an available compensation or remedy, or any other policy-dependent outcome,
**the scenario must supply that fact.** No drill may require a learner to guess hidden company policy.
This is a CompeteReady question-quality constraint — not law, not official DECA terminology, and not a
claim about real-world customer service.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-ASSISTED label stays in the source permanently.** Approval changed the review status, not
  the provenance.

### Why this milestone exists

Slice 7 (CR 9→30) could not start. Planning found that the DECA course teaches **L0–L18 and not one
lesson covers customer relations or marketing fundamentals** — the course teaches the role-play
*performance* skill set, which is why PI mapped cleanly to L2/L3 and BR to L9–L12. CR and MK are
business-*content* areas the course never covered; every prior "customer relations" mention was an
example PI **title** inside the ⟨D6⟩ lesson. Reordering does not help — the same gap blocks Slice 8.
The owner chose **Option 1: author the missing curriculum first.**

### What was drafted

Twelve lessons, appended to `docs/curriculum/02-deca-course.md` as a new **DECA Business-Content
Course** section: **`CR1`–`CR6`** and **`MK1`–`MK6`**, each with a source tier, learning objective,
core concepts, learner decisions, worked example(s), non-example(s), common mistakes, boundary notes,
provenance notes and caveats. CR is built on a four-input spine — **facts · policy · options ·
authority**. MK follows customer → value → position → offering → distribution → communication.

### The architectural rule you must not break

**The section was APPENDED after the old final line 271 (271 → 814). Never insert into L0–L18.**
26 line-number citations point into this file — 13 in `lib/deca-events.ts`, 13 in
`scripts/deca-navigator-smoke.ts`, highest cited line 232 — and **no code parses curriculum files**, so
a shifted citation fails **silently** and becomes false provenance rather than a red test. Verified
after the append: the first 271 lines are **byte-identical to `HEAD`** (md5 `d1fed6a0…`) and all 51
distinct cited lines still hold their original text — **zero shift**. If a future edit must go into the
body of this file, re-run that check and fix the citations deliberately; do not let it slide.

### Sourcing — what is grounded and what is ours

Definitions were verified against **public, non-proprietary** sources: OpenStax *Principles of
Marketing* (segmentation, target market, positioning, differentiation, value proposition, customer
value, marketing mix/4 Ps, channels and channel-choice factors, promotion mix, service-quality
dimensions), OpenStax *Introduction to Business* (authority, delegation, chain of command,
accountability), OpenStax *Principles of Management* and *College Success* (listening, clarifying
questions), the AMA's public definitions (second source for positioning), the U.S. SBA business guide
(second source for target market), U.S. OSHA workplace-violence guidance (used **only** to place
de-escalation technique out of scope), and the U.S. CFPB complaint-process description (context only —
**its sector-specific deadlines are not taught and must not be generalized**).

**Labeled as CompeteReady's, not sourced:** the four-input CR model · the seven-step service-recovery
scaffold ⟨CR-C⟩ · the policy-only/empathy-only failure pair · the two-direction escalation rule · the
CR1–CR6 / MK1–MK6 grouping. **The 4 Ps are explicitly NOT labeled as ours** — mainstream terminology.

**Every lesson is STABLE-TEACHING**, which doc 00 defines as never a rules source, so the section
states **no** DECA rule, scoring criterion, judge expectation or score claim. **ISO 10002 is recorded
as a known reference that was NOT retrieved** (paywalled, HTTP 403); nothing rests on it. **No legal
conclusion is taught anywhere** — scenario facts govern, and every future CR drill must put the
policy fact in the stem.

### Legacy debt — contextualized, NOT corrected

**FIVE CR items carry notable curriculum debt: `cr-01`, `cr-04`, `cr-06`, `cr-07`, `cr-09`.** *(An
earlier planning note said "four" while naming five — the count is FIVE.)* **One MK item does:
`mk-08`.** `cr-01`/`cr-06` teach fixed sequences, so ⟨CR-C⟩ is deliberately contextual and
order-variable. `cr-04` puts retention economics in CR, which deployed BR now owns (`br-12`), so CR1
defines the area by the interaction decision instead. `cr-07` universalizes follow-up, so CR6 teaches
it as situational with named triggers. `cr-09` implies an unauthorized extra, so ⟨CR-A⟩/⟨CR-B⟩ require
any extra to be authorized and available and "exceeding expectations" is not taught. `mk-08` puts
cost-per-acquisition in MK, so MK6 routes campaign measurement to BR. **All 18 legacy items are
unchanged and immutable; no baseline exception was created; the legacy bank is NOT "corrected".**

### What this milestone deliberately did NOT do

- **No drill change.** `lib/deca-drills.ts`, `scripts/deca-drills-smoke.ts` and
  `scripts/deca-mastery-smoke.ts` are byte-identical to `HEAD`. `EXPANDED_AREAS`, `SLICE_ADDITIONS`,
  depth authorization, ids, content and counts are untouched. **No G2 depth credit was earned.**
- **No registry/seed change.** `deca-customer-relations` still has **no lesson slugs**;
  `deca-marketing` still has **three title-only slugs** and no authored bodies anywhere. Attaching
  lessons touches seeded product data and is a **separate approval**. `deca:skills:activate` was NOT
  run; **no database operation was performed**; no schema, migration, route or runtime change.
- **No video parity.** `06-videos-deca.md` untouched — videos 9–14 are a selective set, not a
  lesson-by-lesson mirror, so parity is not owed and no placeholder was created.

**Exactly 3 files changed:** `docs/curriculum/02-deca-course.md`, `docs/CURRENT_STATE.md`,
`docs/HANDOFF.md`.

### State — unchanged by this milestone

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — depth COMPLETE, deployed, reviewed |
| `lib/deca-drills.ts` | 78 | pi 30 · br 30 · **cr 9** · **mk 9** — all deployed and reviewed |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**DECA 30 / 30 / 9 / 9 = 78. Corpus 378. Deficit 42 (CR 21 + MK 21).**

### Next steps, in order

1. Push the three curriculum commits and verify the Production deployment.
2. **Slice 7 — CR 9→30**, authored against CR1–CR6 and bound by ⟨BC-3⟩.
3. **Slice 8 — MK 9→30**, authored against MK1–MK6.

Still deferred, each its own approval: **registry/seed attachment** (`deca-customer-relations` has no
lesson slugs; `deca-marketing` has three title-only slugs — seeded product data) and **video parity**
(`06-videos-deca.md` untouched; videos 9–14 are a selective set, not a lesson-by-lesson mirror).

**Curriculum approval awards no G2 question-depth credit.** The curriculum-first prerequisite is
COMPLETE and source verification is COMPLETE, so **Global M14 G2 is OPEN and ready to resume with
Slice 7 Customer Relations depth implementation.** **Do not record CR depth, MK depth, DECA, or Global
G2 as complete or closed** — the deficit is still 42.

## M14 Global G2 Slice 6 / DECA Slice 2: BR 9→30 (2026-08-12)

### Slice 6: content is human-reviewed and APPROVED — clear to push

`lib/deca-drills.ts` gained 21 business-reasoning questions (`br-10`…`br-30`), taking BR 9→30 and the
DECA bank 57→78. The items were AI-authored, and on **2026-08-12 the repository owner personally read
all 21 in the FINAL checklist and approved them** — answer defensibility, fact sufficiency, absence of
hidden business assumptions, distractor quality, wording, BR curriculum fit, the BR/PI, BR/CR and
BR/MK boundaries, cost, feasibility, risk/tradeoff and measurement reasoning, numeric accuracy, legacy
and new-item overlap, B-8 score-claim honesty, D7 labeling honesty, universal-rule and
unsupported-framework safety, and copyright/provenance.

**The approved content is implementation commit `40a473b` PLUS content-refinement commit `7fd6798`.**
**The Slice 6 push gate is lifted.**

**`br-16` was refined before approval.** Its original stem omitted the new-system go-live timing needed
to separate before-peak from after-peak training, so **both** readings avoided pulling staff during the
peak and the keyed answer rested on an unstated fact. The final stem states that the till system **goes
live just before the peak**, which makes training beforehand uniquely defensible and makes the
after-June option wrong on **timing** rather than merely weakly argued. **Keep every BR scenario's
deciding facts in the stem.**

**Three items were explicitly human-reviewed and APPROVED WITHOUT REWRITE**, recorded so a later
reader does not reopen them: **`br-19`** as an L10 operational-dependency case (the order comes from
supplied dependencies; no sequencing framework is invented) · **`br-27`** despite conceptual adjacency
to legacy `br-03`, because constructing a measurement answer and interpreting an isolated number are
different learner decisions · **`br-29`** with its learner-facing D7 disclaimer intact, which is
accurate, correctly placed and does not obscure the business reasoning.

**Slice 5 (PI) is deployed and human-reviewed** at `a6dfc86` (deployment `5863473555`, `Production`,
`success`), so performance-indicators was approved and live before this slice began.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — **depth COMPLETE, deployed, reviewed** |
| `lib/deca-drills.ts` | **78** | pi 30 (deployed, reviewed) · **br 30 (human-reviewed and approved 2026-08-12)** · cr 9 · mk 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit 42** (was 63): **customer-relations 21 + marketing-fundamentals 21**, and nothing else.
Corpus 357 → **378** locally; target **420**.

**Three distinctions, none of which this slice closes:** **`PI depth complete` is NOT `DECA depth
complete`** · **`PI + BR depth complete` is NOT `DECA depth complete`** — customer-relations and
marketing-fundamentals are still at 9 · **`Debate depth complete` is NOT `Global M14 G2 complete`.**
**Global M14 G2 remains OPEN — do not record it, or DECA, as complete or closed.**

### What Slice 6 changed — do not undo any of it

- **NO legacy punctuation changed, again.** BR is a MIDDLE block, so `br-09` already carried its comma
  and the items insert before `// --- Customer relations ---`. **`mk-09` is still the final array
  element and still comma-less — the DECA terminal-comma boundary remains unexercised** and belongs to
  the eventual MK slice. `G0-C1b`/`G0-C1c` unchanged.
- **Second DECA area authorized.** `EXPANDED_AREAS` = `["performance-indicators", "business-reasoning"]`.
  `G0-6b` = 2, `G0-C2b2` = 2 authorized, **`G0-C6b` = 2 still unauthorized**. CR and MK are each still
  rejected at stage `unauthorised` under DEFAULT authorization. **Never pre-authorize.**
- **`G0-7b` is now a 42-id exact set** — `pi-10`…`pi-30` plus `br-10`…`br-30`, with `G0-7b2a`/`G0-7b2b`
  proving 21 of each. `SLICE_ADDITIONS` has two rows. The forbidden-prefix loop narrowed to
  `["cr","mk"]` and is **still real**, unlike Debate's final slice where it went empty.
- **⚠ THE SHALLOW CONTROL MOVED business-reasoning → MARKETING-FUNDAMENTALS, in BOTH suites.** MK was
  chosen over customer-relations **deliberately**: Slice 7 is expected to expand CR, so parking the
  control there would force a second move one slice later. MK stays at 9 through Slices 6 **and** 7,
  so the control moves **once**, and its eventual >30 re-base lands naturally at Slice 8 — the slice
  where MK itself deepens and no shallow DECA area remains. `G0-D5b` asserts exactly **two** areas
  remain at 9. **Do not call business-reasoning shallow anywhere.**
- **The `buildDecaDrillSession(6, ["business-reasoning"])` filter check was kept**, with its comment
  clarified: 6 ≤ 30 still holds, and it is a filter proof, never a depth or shallow-area proof.
- **No BR fixture needed re-basing, because none exists.** The mastery suite defines only `PI` and
  `CR` consts; nothing indexes BR. **No BR legacy-order assertion was added** — unlike PI, no fixture
  depends on BR ordering, and the immutable-baseline controls already protect `br-01`…`br-09`. Adding
  one would be ceremony. **`CR.slice(0, 2)` is untouched — that is a Slice 7 concern.**
- **⟨D7⟩ and ⟨B-8⟩ are enforced across the whole bank.** The five-part scaffold is labelled
  CompeteReady's teaching method, never official DECA terminology (`br-29` says so in its
  explanation), and **no item claims implementation or measurement improves scores.** B-8 is an
  authoring guardrail here — deliberately **not** the learner skill of any question.

### Runtime, untouched

`skillSlug: "deca-business-reasoning"`, `DECA_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`decaDrillPersistenceRequest`, server-issued sessions, replay protection, expiry, first-answer-per-
distinct-id and the XP prohibition are all unchanged. No schema, migration, seed, skill-activation
script, route, validator or client change. `deca:skills:activate` was NOT run.

## Previous handoff — M14 Global G2 Slice 5 / DECA Slice 1: PI 9→30 (2026-08-12)

### Slice 5: content is human-reviewed and APPROVED — clear to push

`lib/deca-drills.ts` gained 21 performance-indicator questions (`pi-10`…`pi-30`), taking PI 9→30 and
the DECA bank 36→57. The items were AI-authored, and on **2026-08-12 the repository owner personally
read all 21 in the FINAL checklist and approved them** — answer defensibility, distractor quality,
wording, curriculum fit, verb interpretation, PI-method stage accuracy, scenario role/authority/
constraint handling, the PI/BR, PI/CR and PI/MK boundaries, PI-essentiality under the remove-the-PI
diagnostic, B-2 safety, legacy `pi-07` handling, scoring and preparation claims, measurement
boundaries, legacy and new-item overlap, and copyright/provenance.

**The approved content is implementation commit `b72cba2` PLUS content-refinement commit `1340cdb`.**
**The Slice 5 push gate is lifted.**

**Two items were refined before approval, both for failing the remove-the-PI diagnostic.** `pi-19`
named no specific indicator, so a generic "proposal without a success measure" question survived
stripping the PI; it now carries an **employee-retention** indicator whose outcome deliberately
differs from the action's stated rationale (associates having no way to raise problems), so the
indicator — not the rationale — decides what success means. `pi-30` was the more serious case: its old
*"win-back email to lapsed members"* already telegraphed retention and sat close to legacy `br-03`,
whose own keyed answer contains the word *retention*; the action is now a **targeted offer email to
members inactive for sixty days**, which could plausibly be judged on reach, on immediate response, or
on retention, so open rate and first-week redemptions are real competing metrics and only the listed
indicator picks the winner. **Keep the indicator load-bearing in any future PI measurement item.**

**`pi-28` was explicitly human-reviewed and APPROVED WITHOUT REWRITE** as a PI/BR boundary case. Its
shape looks business-reasoning-adjacent once the indicator is stripped, but its keyed axis is the
completeness of the PI demonstration chain — decision, reasoning, implementation, feasibility,
measurement — never the commercial merit of the action. Recorded so a later reader does not reopen it.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

**Debate is finished and live.** All four Debate areas hold 30, all four slices are human-reviewed and
approved, and Slice 4 is deployed at `09e9bdb` (deployment `5863008892`, `Production`, `success`).
**Every remaining G2 question is now a DECA question.**

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | 120 | cw 30 · rb 30 · ev 30 · wg 30 — **depth COMPLETE, deployed, reviewed** |
| `lib/deca-drills.ts` | **57** | **pi 30 — human-reviewed and approved 2026-08-12** · br 9 · cr 9 · mk 9 |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit 63** (was 84): DECA br/cr/mk, 3 × 21. Corpus 336 → **357** locally; target **420**.

**Two distinctions to keep straight, neither of which this slice closes:**
**`PI depth complete` is NOT `DECA depth complete`** — business-reasoning, customer-relations and
marketing-fundamentals are still at 9. **`Debate depth complete` is NOT `Global M14 G2 complete`.**
**Global M14 G2 remains OPEN — do not record it, or DECA, as complete or closed.**

### ⚠ LEGACY `pi-07` / CURRICULUM B-2 DEBT — READ BEFORE ANY FUTURE PI WORK

**Legacy `pi-07` has a pre-existing tension with current curriculum B-2. Slice 5 leaves `pi-07`
immutable, does not reinforce it, and does not create contradictory B-2 content. This remains separate
curriculum debt for later resolution.**

Concretely: `pi-07` keys explicit PI signposting as the recommended practice, while Module 1 lesson 3
⟨B-2⟩ teaches that whether to speak a PI's title aloud or weave it into conversation is a **genuinely
contested judgment call** that must never be presented as settled. **B-2 is deliberately untested in
Slice 5.** Several new distractors reject PI-name recitation as a substitute for *demonstration*
(`pi-11` D, `pi-13` D, `pi-18` B, `pi-19` C, `pi-29` D) — that is the ⟨D6⟩ demonstration-vs-recitation
rule, **not** a ruling on speaking style. **B-2 is NOT resolved.**

### What Slice 5 changed — do not undo any of it

- **NO legacy punctuation changed.** PI is the FIRST block, so `pi-09` already carried its comma and
  the 21 items insert between it and `// --- Business reasoning ---`. **`mk-09` is still the final
  array element and still comma-less — the DECA terminal-comma boundary is STILL unexercised**, and
  belongs to the eventual marketing slice. `G0-C1b`/`G0-C1c` are unchanged and untested against real
  data, exactly as since Slice 0.
- **First DECA area authorized.** `EXPANDED_AREAS` `[]` → `["performance-indicators"]`. `G0-6b` = 1,
  `G0-C2b2` = 1 authorized, **`G0-C6b` = 3 still unauthorized**. `G0-C6` proves `br-10`, `cr-10` and
  `mk-10` are each rejected at stage `unauthorised` under DEFAULT authorization. **Never
  pre-authorize.** Unlike Debate's final slice, `judgeAddition` still bounds DECA meaningfully.
- **`G0-7b` is now a 21-id exact set**, driven by a new `SLICE_ADDITIONS` table with one row. The
  forbidden-prefix loop over `["br","cr","mk"]` is **real and non-vacuous** here.
- **DEPTH TESTS WERE ADDED, NOT MOVED.** Neither DECA suite had any depth block or shallow control
  before this slice. Both now prove PI **20/20** and **40/30**, with **business-reasoning** as the
  still-shallow control at **20/9** and **40/9**. `G0-D5b` asserts three areas remain at 9, so this
  control may move once more before it must re-base on a >30 overdraw.
- **No PI fixture was re-based, because none needed it.** Every mastery fixture indexes
  `PI.slice(0, n≤5)`, `PI[0]` or `PI[5]`, all of which still resolve to legacy items. `G0-D6`/`26m`
  now **assert** that the legacy nine are still the first nine, rather than assuming it. **The PI
  bypass fixture is untouched at raw 76 / evidence 20.**

### Runtime, untouched

`skillSlug: "deca-performance-indicators"`, `DECA_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`decaDrillPersistenceRequest`, server-issued sessions, replay protection, expiry, first-answer-per-
distinct-id and the XP prohibition are all unchanged. No schema, migration, seed, skill-activation
script, route, validator or client change. `deca:skills:activate` was NOT run.

## Previous handoff — M14 Global G2 Slice 4: Debate weighing 9→30 (2026-08-12)

### Slice 4: content is human-reviewed and APPROVED — clear to push

`lib/debate-drills.ts` gained 21 weighing questions (`wg-10`…`wg-30`), taking weighing 9→30 and the
Debate bank 99→120. The items were AI-authored, and on **2026-08-11 the repository owner personally
read all 21 in the FINAL checklist and approved them** — answer defensibility, distractor quality,
scenario sufficiency, course-appropriate wording, the weighing/CWI, weighing/rebuttal and
weighing/evidence-evaluation boundaries, Lesson 37 and seeded `debate-weighing` fit, magnitude,
probability, timeframe, reversibility, framework use, V-3 and V-4, contextual rather than universal
weighing claims, legacy and new-item overlap, explanation quality, and protection against unsupported
weighing frameworks.

**The approved content is implementation commit `9c20282` PLUS content-refinement commit `a250e40`.**
**The Slice 4 push gate is lifted.**

**`wg-24` was refined before approval, and that is load-bearing.** The drafted stem quantified
probability ("well under one percent" vs near-certain) but left magnitude qualitative ("catastrophic"
vs "moderate"), so a large enough catastrophe could rationally reverse the comparison — and its
explanation claimed "the numbers decide which way" on facts covering only one side of the tradeoff.
The approved `wg-24` quantifies **both**: their harm reaches **25,000** at well under one percent,
yours reaches **20,000** and is near-certain, so their real but modest magnitude edge sits against a
far larger likelihood gap. **Keep both sides of any future tradeoff item quantified.**

Slices 1, 2 and 3 are deployed and human-reviewed (`61b19de`, deployment `5861953872`, `Production`,
`success`), so rebuttal, CWI and evidence-evaluation were already approved and live before this slice.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance. All four Debate slice labels now carry the same two-part form.

Approved judgment calls, recorded so a later reader does not reopen them: `wg-10`/`wg-11`/`wg-12` are
distinct (nothing to compare · both survive uncompared · offense that no longer survives); **`wg-12`
requires the contention to be BOTH fully answered AND no longer defended, so attacked never means
lost**; `wg-13` is contextual magnitude and says changing the severities can reverse it; `wg-14`'s
"$2 billion / 900 lives" is an illustrative example of unlike units, not a hidden stem fact;
`wg-05`/`wg-15`/`wg-26` are a recognition → rejection → discrimination progression; `wg-16`/`wg-17`/
`wg-18`/`wg-24` are four distinct probability decisions; **`wg-17` supplies the chain rather than
asking the learner to repair it, and names link-attack as a different rebuttal task**; `wg-19` rejects
both sooner-always and later-always; **`wg-20` is an ordering comparison, NOT a turns-the-case or
prerequisite framework**; `wg-21` is scoped to reversibility and never claims irreversible wins
overall; `wg-22` rejects a reversibility claim that contradicts the facts; `wg-23`/`wg-24`/`wg-25` are
three different decisions; `wg-25` diagnoses a non-separating axis where legacy `wg-09` breaks a
stated tie; `wg-27` and `wg-28` implement V-4 and V-3; **`wg-29`'s "the one the judge is holding"
describes the practical effect of an uncontested standard, not an automatic-binding rule**; and
**`wg-30` is deliberately procedural — it asks for the next move, not which dimension objectively
wins.**

### Debate depth is COMPLETE and human-reviewed — GLOBAL G2 IS NOT

**All four Debate areas hold 30, and all four are human-reviewed and approved** — rebuttal, CWI and
evidence-evaluation deployed at `61b19de`, weighing approved 2026-08-11 and ready to push. That is
`Debate depth complete`, and it is **not** the same claim as `Global M14 G2 complete`. **Global M14 G2
remains OPEN** because all four DECA areas are still at 9. Do not record G2 as complete or closed.

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **120** | cw 30 · rb 30 · ev 30 · **wg 30** — all four at target |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit 84** (was 105): DECA 4 × 21, and nothing else. Corpus 315 → **336** locally; target **420**.
**Every remaining G2 question is a DECA question.**

### What Slice 4 changed — do not undo any of it

- **The append boundary was finally exercised.** `wg-09` was the last array element and carried no
  comma; it now carries **exactly one**. That is the ONLY change to any legacy item, and it is
  punctuation. `G0-C1d`…`G0-C1d5` assert the real transition against the immutable baseline —
  including **`G0-C1d3`, that the RAW lines differ**, without which the normalisation could silently
  stop doing work. The synthetic `G0-C1b`/`G0-C1c` are unchanged and still prove a one-word content
  edit survives the same normalisation.
- **All four areas authorised.** `EXPANDED_AREAS` = `["rebuttal", "claim-warrant-impact",
  "evidence-evaluation", "weighing"]`, slice order preserved. `G0-6b` 3 → 4, `G0-C2b2` 3 → 4.
- **The unauthorised-area control became unreachable and was REPLACED, not deleted.** No recognised
  Debate area can now return `unauthorised` in production (`G0-C6b` asserts that count is **0**). The
  stage is still tested: `G0-C6c` calls the SAME `judgeAddition` with a **test-only withheld**
  authorisation set per area, and `G0-C6c2` proves the identical literal passes under real
  authorisation — so the rejection is caused by the withheld set alone. **Production
  `EXPANDED_AREAS` is never mutated and no fake fifth area was invented.**
- **`G0-7b` is now an 84-id exact set**, driven by `SLICE_ADDITIONS` with its fourth and final row.
- **The forbidden-prefix loop was replaced, not left empty.** All four prefixes are legitimate now, so
  `for (const p of ["wg"])` would have become `for (const p of [])`. It is now a direct per-id range
  assertion plus `G0-7b4b` proving it ran over **84** real additions.
- **⚠ `G0-7b` IS NOW THE FINAL BOUND ON DEBATE BANK GROWTH.** With every area authorised,
  `judgeAddition("wg-31", …)` returns **ok** — the predicate alone no longer limits anything.
  `G0-7b5` asserts exactly that, and `G0-7b5b` that only the exact 84-id set stops it. **Never relax
  `G0-7b` into "any known prefix above 09."**
- **The shallow-area control was RE-BASED, not deleted.** No Debate area holds 9, so it could not move
  a fourth time. Both suites now prove **40 served / exactly 30 distinct / exactly 10 repeated
  positions**, with a boundary partner at **30 served / 30 distinct / no padding** — the HOSA `11g`
  pattern. **Do not call weighing shallow or still-9-item anywhere.**
- **No weighing fixture needed re-basing, because none existed.** Every `% 9` / `slice(0, 9)` in the
  repo is rebuttal-pinned or synthetic. No weighing `evidenceScore` or `uniqueTotal` fixture was
  invented, and no mastery or evidence score moved.
- **Curriculum scope: Module 5 lesson 37 plus the seeded `debate-weighing` skill only.** Nothing
  introduces scope as a fifth axis (`wg-01` keeps it inside magnitude), "turns the case", a
  prerequisite/gateway framework, or systemic-outweighs-individual. **V-3** is enforced by `wg-28`
  (weighing without naming a category) and **V-4** by `wg-27` ("even if" is one move, not a norm).
- **No axis ever "always wins."** Several distractors state the right axis for a universal-rule reason
  and are keyed **wrong** (`wg-16` D, `wg-21` C, `wg-24` C).

### Runtime, untouched

`skillSlug: "debate-weighing"`, `DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`recordDrillMasteryInTransaction`, replay protection, session expiry, first-answer-per-distinct-id and
the XP prohibition are all unchanged. No schema, migration, seed, route, validator or client change.

## Previous handoff — M14 Global G2 Slice 3: Debate evidence 9→30 (2026-08-12)

### Slice 3: content is human-reviewed and APPROVED — clear to push

`lib/debate-drills.ts` gained 21 evidence-evaluation questions (`ev-10`…`ev-30`), taking evidence 9→30
and the Debate bank 78→99. The items were AI-authored, and on **2026-08-11 the repository owner
personally read all 21 in the FINAL checklist and approved them** — answers, distractors, clarity and
course appropriateness, the evidence-evaluation/CWI/rebuttal/weighing boundaries, Lesson 11/12/14 fit
and the exclusion of Lesson 13 official-rule content, source relevance, population and context
applicability, direct vs indirect support, expertise relevance, institutional role vs technical
expertise, firsthand scope, bias and conflict of interest, disclosure, advocacy verifiability,
contextual recency, representativeness, self-selection, comparison-group limits, confounding,
self-report limits, methodology transparency, timeframe cherry-picking, independent corroboration,
headline vs full-finding context, legacy and new-item overlap, and explanation quality.

**The approved content is implementation commit `ef55134` PLUS curriculum-refinement commit
`89497a3`.** **The Slice 3 push gate is lifted.**

**`ev-27` was replaced before approval, and that is load-bearing.** The drafted item taught relative
vs absolute risk. The final review established that relative/absolute risk, base rates and percentage
interpretation are named **nowhere** in the current Debate curriculum, so the item was an unsupported
extension even though its arithmetic was exact. It was replaced with a Lesson 12 methodology item on
**method transparency / evaluability** — a described method lets a reader judge how a result was
produced and where it is limited, without implying transparency proves truth or that a missing method
proves falsehood. **No Slice 3 item now extends beyond lessons 11, 12 and 14. Do not reintroduce
relative-vs-absolute content into this bank without curriculum support.**

Slices 1 and 2 are deployed and human-reviewed (`46ab46b`); rebuttal and CWI were already approved and
live before this slice.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

Approved judgment calls, recorded so a later reader does not reopen them: `ev-10` vs `ev-12` is
detection vs calibration, not repetition; `ev-11`/`ev-22`/`ev-23` are applicability, representativeness
and self-selection; `ev-14`/`ev-15`/`ev-16` are domain expertise, institutional role and firsthand
scope; `ev-17`/`ev-18`/`ev-19` are conflict response, what disclosure settles, and incentive vs
verifiability; `ev-18` vs final `ev-27` is acceptable reinforcement rather than duplication;
`ev-20`/`ev-21`/legacy `ev-02` form a recognition → counter-case → application progression;
`ev-24`/`ev-25` are no comparison vs a contaminated comparison, and `ev-24` needs no added
residual-value sentence; `ev-28` is window selection, distinct from `ev-09`'s generic cherry-picking;
`ev-29` denies independent corroboration without devaluing secondary reporting; `ev-30` stays
evidence-quality and carries no citation doctrine.

### Where G2 stands

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **99** | cw 30 · rb 30 · **ev 30** · wg 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit 105** (was 126): Debate weighing 1 × 21, DECA 4 × 21. Corpus 294 → **315** locally; target
**420**. Three of four Debate areas are now at 30 and human-reviewed, so **weighing is the only
remaining shallow Debate area**. **Global M14 G2 remains OPEN — do not record it as complete or
closed.**

### ~~⚠ WEIGHING IS THE LAST SHALLOW DEBATE AREA~~ — DISCHARGED BY SLICE 4

This warning told Slice 4 to re-base the shallow-area control instead of moving it a third time, and
to expect the trailing-comma change at `wg-09`. **Slice 4 did both.** The control now proves 40 served
/ 30 distinct / 10 repeated positions with a 30-served / 30-distinct boundary partner, and the real
`wg-09` comma transition is asserted by `G0-C1d`…`G0-C1d5`. See the Slice 4 handoff at the top of this
file for the current state. Nothing here is outstanding.

### What Slice 3 changed — do not undo any of it

- **Insertion point.** Items sit INSIDE the evidence block, after `ev-09`, before `// --- Weighing ---`.
  `ev-09` already carried its comma. `wg-09` is still final and byte-identical.
- **Curriculum scope was deliberately narrowed.** Lessons 11, 12 and 14 only. **Lesson 13 — the
  official citation/paraphrase/penalty layer — was excluded from AI authoring** because official rules
  must be sourced. Lesson 12 is TIER-2 heuristic material, so no item states a credibility heuristic as
  a rule. **Keep that exclusion for any future evidence slice.**
- **Three areas authorized.** `EXPANDED_AREAS = ["rebuttal", "claim-warrant-impact",
  "evidence-evaluation"]`. `G0-C2b2` 2 → 3 and `G0-C6b` 2 → 1, both exact.
- **`G0-7b` is a 63-id exact set**, still driven by `SLICE_ADDITIONS` — one new row, forbidden-prefix
  set narrowed to `["wg"]`. Never relax it into "any recognised prefix above 09".
- **No evidence fixture was re-based, because none needed it.** Every `% 9` / `slice(0, 9)` in the repo
  remains rebuttal-pinned or synthetic. No evidence evidenceScore was invented.
- **Guardrails held in the content:** a biased source is not automatically false (`ev-17`/`ev-18`/`ev-19`),
  a bigger sample is not automatically better (`ev-22`), newer is not automatically better
  (`ev-20`/`ev-21`), prestige is not expertise (`ev-14`/`ev-15`), anecdote and self-report are weak for
  broad claims rather than useless (`ev-16`/`ev-26`). `ev-25` is design-oriented confounding, kept
  distinct from `ev-04`, `cw-14` and `rb-18`.

### Runtime, untouched

`skillSlug: "debate-evidence"`, `DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`recordDrillMasteryInTransaction`, replay protection, session expiry, first-answer-per-distinct-id and
the XP prohibition are all unchanged. No schema, migration, seed, route, validator or client change.

## Latest handoff — M14 Global G2 Slice 2: Debate CWI 9→30 (2026-08-12)

### Slice 2: content is human-reviewed and APPROVED — clear to push

`lib/debate-drills.ts` gained 21 claim-warrant-impact questions (`cw-10`…`cw-30`), taking CWI 9→30 and
the Debate bank 57→78. The items were AI-authored, and on **2026-08-11 the repository owner personally
read all 21 in the final packet and approved them** — answers, distractors, clarity, the
CWI/rebuttal/evidence-evaluation/weighing boundaries, causal-chain and chronology-vs-causation
accuracy, hidden-premise logic, warrant quality, evidence-to-claim bridging, intermediate-vs-final
impact handling, claim scope and specificity, overlap and Module 2 fit. **The approved content is
exactly implementation commit `45f3397`.** **The Slice 2 push gate is lifted.**

Slice 1 is deployed and human-reviewed (`e23e982`), so rebuttal was already approved and live.

Two things to keep straight, as for every slice so far:

- **The approval is the human reading, nothing else.** The Claude/AI pre-screen was the authoring
  model checking its own output; it constituted neither the review nor independent verification.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

Approved judgment calls, recorded so a later reader does not reopen them: `cw-10`'s "every arrow needs
support" means reasoning, not a citation per arrow; `cw-12`/`cw-15`, `cw-16`/`cw-17`, `cw-18`/`cw-19`,
`cw-23`/`cw-26`, `cw-26`/legacy `cw-03` and `cw-29`/`cw-30` are distinct learner decisions; the
`cw-20`/`cw-21`/`cw-22` identify-diagnose-build progression is useful rather than quantity theatre;
`cw-14` and `cw-15` remain argument analysis, distinct from `rb-18` and `rb-19`.

### Where G2 stands

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **78** | **cw 30** · **rb 30** · ev 9 · wg 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Deficit 126** (was 147): Debate ev/wg 2 × 21, DECA 4 × 21. Corpus 273 → **294** locally; target
**420**. **Slice 2 completes CWI depth and human review; global G2 remains OPEN because Debate
evidence-evaluation/weighing and all four DECA areas remain below the ≥30 target. Do not record G2 as
complete or closed.**

### What Slice 2 changed — do not undo any of it

- **Insertion point.** The 21 items sit INSIDE the CWI block, after `cw-09` and before
  `// --- Rebuttal ---`. `cw-09` already carried its comma. **`wg-09` is still the final array element
  and byte-identical — the terminal-comma append boundary is STILL not exercised.** It will be when
  `weighing` expands; leave `G0-C1b`/`G0-C1c` in place until then.
- **Two areas authorized.** `EXPANDED_AREAS = ["rebuttal", "claim-warrant-impact"]`, in slice order.
  `G0-C6` still proves `ev-10` and `wg-10` are `unauthorised`, and **`G0-C6b` moved 3 → 2** so the
  loop cannot go vacuous. `G0-C2b` now loops the AUTHORISED areas and proves each is accepted under
  DEFAULT authorisation, with its own `=== 2` companion. **Never pre-authorize an area.**
- **`G0-7b` is a 42-id exact set**, driven by a `SLICE_ADDITIONS` table (one entry per reviewed slice).
  It proves exactly 42 additions, the exact id set, each addition declaring its slice's area, zero
  `ev-*`/`wg-*` additions, and every addition passing the shared `judgeAddition`. **Each future slice
  adds one entry to that table — never relax it into "any recognised prefix above 09".**
- **No CWI fixture was re-based, because none needed it.** Unlike rebuttal, no CWI fixture depended on
  a 9-item pool. The bypass fixtures (raw 76 / evidence 20) slice a fixed head; `CWI[0]`, `CWI[5]`,
  `CWI.slice(0, 3)`, `CWI.slice(0, 5)`, `DRILL_BANK.slice(0, 8)`, `DRILL_BANK[0]`/`[1]` all still point
  at the same legacy items because additions go after `cw-09`. **Do not "tidy" them.**
- **Depth proofs added in BOTH suites** (the audit's Verification line names the mastery smokes):
  CWI 20 → 20 distinct, and 40 → exactly 30 distinct. Each is paired with a live counter-example from
  a still-9-item area (evidence-evaluation in the drills suite, weighing in the mastery suite) so the
  result cannot be mistaken for a builder property.

### What the next Debate slice must do

Pick `evidence-evaluation` or `weighing`; add its 21 items inside its own block; append that area to
`EXPANDED_AREAS`; raise its entry in BOTH `AREA_DEPTH` and `DEBATE_AREA_DEPTH`; add one row to
`SLICE_ADDITIONS` (making the expected set 63); move `G0-C6b` 2 → 1 and `G0-C2b2` 2 → 3.
**`weighing` is the slice that finally exercises the `wg-09` append boundary** — expect a one-character
comma change there and let `G0-C1b`/`G0-C1c` do their job.

### Runtime, untouched

`DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70, `recordDrillMasteryInTransaction`, replay
protection, session expiry, first-answer-per-distinct-id and the XP prohibition are all unchanged. No
schema, migration, seed, route, validator or client change.

## Latest handoff — M14 Global G2 Slice 1: Debate rebuttal 9→30 (2026-08-11)

### Slice 1: content is human-reviewed and APPROVED — clear to push

`lib/debate-drills.ts` gained 21 rebuttal questions (`rb-10`…`rb-30`), taking rebuttal 9→30 and the
Debate bank 36→57. The items were AI-authored, and on **2026-08-11 the repository owner personally
read all 21 and approved them** — answer defensibility, distractors, clarity, the
rebuttal/CWI/evidence-evaluation/weighing boundaries, strategic accuracy, causal reasoning, the
no-link vs link-turn vs impact-turn distinctions, double-turn logic, indict vs turn, offense/defense
framing, frontlining, counterexample scope, overlap and curriculum fit. **The approved content is the
final version, including refinement commit `fbeec2c`.** **The Slice 1 push gate is lifted.**

Slice 0 is deployed (`f1b5064`), so both banks were already protected before this content landed.

Two things to keep straight, exactly as for the HOSA slices:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently.** Approval changed the review status, not
  the provenance.

Approved judgment calls, recorded so a later reader does not reopen them: the `rb-13`/`rb-16` overlap
is reinforcement rather than duplication; `rb-13`/`rb-17`/`rb-30` test three distinct decisions;
`rb-11`'s "even if" phrasing does not duplicate legacy `rb-08`; `rb-24` and `rb-28` remain
rebuttal/frontlining rather than standalone weighing.

### Where G2 stands

| Bank | Total | Per-area |
|---|---|---|
| `lib/debate-drills.ts` | **57** | cw 9 · **rb 30** · ev 9 · wg 9 |
| `lib/deca-drills.ts` | 36 | four areas × 9 — untouched |
| `lib/hosa-medterm.ts` | 180 | six areas × 30 — untouched |

**Global M14 G2 remains OPEN.** Deficit **147** (was 168): Debate cw/ev/wg 3 × 21, DECA 4 × 21.
Corpus 252 → **273** locally; final target **420**. **The next G2 content slice is still outstanding
— do not record G2 as complete or closed.**

### What Slice 1 changed — do not undo any of it

- **Insertion point.** The 21 items sit INSIDE the rebuttal block, after `rb-09` and before
  `// --- Evidence evaluation ---`. `rb-09` already carried its comma. **`wg-09` is still the final
  array element and is byte-identical — the terminal-comma append boundary is NOT exercised yet.**
  It will be, whenever `weighing` is expanded. Leave `G0-C1b`/`G0-C1c` in place until then.
- **Only rebuttal is authorized.** `EXPANDED_AREAS = ["rebuttal"]`. `G0-C6` still proves `cw-10`,
  `ev-10` and `wg-10` are rejected as `unauthorised`, and `G0-C6b` asserts three areas remain
  unauthorised so that loop cannot go vacuous. **Never pre-authorize an area without its own
  reviewed slice.**
- **`G0-7b` is now a real additive guarantee**, not "zero additions exist": the additions must be
  exactly `rb-10`…`rb-30`, exactly 21 of them, each declaring the rebuttal area, each passing the
  shared `judgeAddition` predicate.
- **FOUR fixtures were re-based, not deleted.** Every one assumed a 9-item rebuttal pool:
  1. `debate-drills-smoke.ts` evidence fixture → `reb9 = …slice(0, 9)`
  2. `debate-mastery-smoke.ts` honest-padding fixture (`9`…`9g`) → `NINE = REB.slice(0, 9)`, and its
     `morePadding` control repeats the SAME nine rather than the wider pool
  3. `review-ladder-smoke.ts` `43` → `slice(0, 9)`, plus new `43a`/`43b` stating `uniqueTotal === 9`
     and `uniqueCorrect === 6` explicitly
  4. `debate-mastery-smoke.ts` precondition `24` hard-coded `=== 9` per area → now reads the
     module-scope `DEBATE_AREA_DEPTH`, so the precondition and the `29k` G2 block cannot disagree
  **67 still means "six of nine distinct".** It was not changed to a new magic number; its
  denominator was made explicit. `slice(0, 9)` is stable because additions append after `rb-09`.
- **Builder depth is proven separately from the evidence contract.** A 20-question focused rebuttal
  session now serves **20 distinct** items (no padding — the observable G2 effect), and the padding
  branch is still proven at **40 served / exactly 30 distinct**. Do not collapse these back together.

### What the next Debate slice must do

Pick ONE of `claim-warrant-impact`, `evidence-evaluation`, `weighing`; add its 21 items inside its own
block; add that area to `EXPANDED_AREAS`; raise its entry in BOTH `AREA_DEPTH`
(`debate-drills-smoke.ts`) and `DEBATE_AREA_DEPTH` (`debate-mastery-smoke.ts`); extend `G0-7b`'s
expected-id set. **`weighing` is the one that will finally exercise the `wg-09` append boundary** —
expect a one-character comma change there and let `G0-C1b`/`G0-C1c` do their job.

### Runtime, untouched

Debate legitimately writes `MasteryProgress`. `DEBATE_DRILL_REQUIRED_UNIQUE = 5`, pass threshold 70,
`recordDrillMasteryInTransaction`, completed-session replay protection, session expiry,
first-answer-per-distinct-id and the XP prohibition are all unchanged. No schema, migration, seed,
route, validator or client change.

## Latest handoff — M14 Global G2 Slice 0: Debate/DECA banks protected (2026-08-07)

**No question content was added or changed.** `lib/debate-drills.ts` and `lib/deca-drills.ts` have
**zero diff**. Slice 0 is groundwork so the eight remaining Global-G2 expansion slices are provably
additive before any of the 168 questions is authored. **There is no content-review gate on Slice 0**;
each of the eight content slices keeps one.

### Where G2 actually stands

| Bank | Total | Per-area | State |
|---|---|---|---|
| `lib/hosa-medterm.ts` | 180 | six areas × 30 | parity, human-reviewed, deployed |
| `lib/debate-drills.ts` | 36 | cw 9 · rb 9 · ev 9 · wg 9 | **G2 outstanding** |
| `lib/deca-drills.ts` | 36 | pi 9 · br 9 · cr 9 · mk 9 | **G2 outstanding** |

**Deficit 168 questions** (8 × 21). Debate 36→120, DECA 36→120, final corpus **420**. **Global M14 G2
remains OPEN.** Do not record it as closed.

### What Slice 0 established — do not undo any of it

- **Immutable baseline for both banks:** `PRE_G2_EXPANSION =
  "26149a3127c0bc7f3108c303f57d41a8dd9088c0"`. **Never make it HEAD-relative and never re-anchor it.**
  Every original item in each bank must stay byte-identical and ordered against that commit.
- **Three self-healing `HEAD` guards were REPLACED, not deleted.** `hosa-medterm-evidence-smoke.ts`
  (both banks), `review-ladder-smoke.ts` (both banks) and `debate-mastery-smoke.ts` (`lib/deca-drills.ts`)
  hashed a drill bank against `HEAD`. That fails while an authorized change is uncommitted and passes
  the instant it commits — it can never notice what a commit changed. Each site now asserts durably
  that the bank's real immutable-based protection exists (`32/33`, `68G`, `28G`).
- **Slice-by-slice authorization — this is the important one.** Each bank has an IMMUTABLE
  `PREFIX_AREA` registry (4 mappings) *separate from* `EXPANDED_AREAS`, the areas currently authorized
  to receive additions. **Both `EXPANDED_AREAS` are empty.** A structurally valid future item such as
  `rb-10` or `pi-10` is rejected TODAY with stage `unauthorised`. **Each later slice adds exactly ONE
  area, in the same commit that adds its 21 items, after that content passes human review. Never
  pre-authorize.**
- **One shared predicate, `judgeAddition`.** Real additions and every control run through it; its
  `authorised` parameter exists only so a control can probe structural recognition without
  authorizing a real area. Do not add a second regex implementing the same rule.
- **Exact per-area depth assertions** replaced `length >= 32` and per-area `>= 6`, and now also live in
  both mastery smokes (`29k`, `26k`) — what audit G2's Verification line asks for. `AREA_DEPTH` is the
  single source of truth, so one area can go 9 → 30 without weakening the others.
- **Append boundary prepared.** `wg-09` and `mk-09` terminate their arrays without trailing commas.
  The comparison normalizes **one terminal comma only** — not whitespace, not general punctuation,
  not property order — and `G0-C1b`/`G0-C1c` prove a comma-only difference normalizes identical while
  a one-word content edit still does not.

### What Slice 1 must do

**Debate rebuttal 9 → 30**, and it must **re-base, not delete, the two padding fixtures** that still
describe Production truth today (20 requested → 9 distinct):

- `debate-mastery-smoke.ts` — the "20-question focused session still serves 11 repeats of a 9-item
  pool" control.
- `review-ladder-smoke.ts:524-526` — the 20-slot padded rebuttal fixture asserting `evidenceScore === 67`.

Both break the moment `rebuttal` crosses 20. Re-base them on a request that exceeds a 30-item pool,
exactly as HOSA's `11g` was re-based at Phase 2f. Slice 1 also adds `"rebuttal"` to Debate's
`EXPANDED_AREAS` and raises its `AREA_DEPTH` entry to 30. **Human content review before push.**

### Runtime, untouched

Debate and DECA legitimately write `MasteryProgress` — they are **not** review-only like HOSA. The
mastery transaction path, the 5-distinct evidence floor per drill area, the 70 pass threshold, replay
protection, first-answer behaviour, the XP prohibition and session issuance/grading are all unchanged.
No schema, migration, seed, route, validator or client change.

## Latest handoff — M14 Phase 2f: HOSA pathophysiology 9→30, HOSA parity (2026-08-07)

### Phase 2f: content is human-reviewed and APPROVED — clear to push

`lib/hosa-medterm.ts` gained 21 pathophysiology questions (`pp-10`…`pp-30`), taking pathophysiology
9→30 and the bank 159→180. The items were AI-authored, and on **2026-08-07 the repository owner
personally read all 21 and approved them** — pathophysiological accuracy, the
anatomy/physiology/pathophysiology boundary, answer uniqueness, distractors, causal wording,
explanations, mechanism precision and legacy overlap. **The approved version is the final one**,
including the refinements in `d449434` and `bf311c8`. **The push gate is lifted.**

**All six HOSA areas are now 30 deep and human-reviewed. That finishes the HOSA portion of G2 — and
only that portion. Read the next block before writing anything about G2.**

Two things to keep straight, exactly as for Phases 2a–2e:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance. All six slices now carry one.

### ⚠ READ THIS BEFORE WRITING ANYTHING ABOUT G2

**All six HOSA Medical Terminology areas now hold 30. That is HOSA bank parity. It is NOT G2
closure, and G2 must not be recorded as complete, closed, or "all areas at depth".**

The audit's G2 finding (`docs/M14_LEARNING_QUALITY_AUDIT.md:573`) names **three** bank files and
sizes itself at ~14 areas. Phases 2a–2f covered only the six HOSA ones. Verified from source:

| Bank | Total | Per-area | State |
|---|---|---|---|
| `lib/hosa-medterm.ts` | 180 | six areas × 30 | **parity reached (locally)** |
| `lib/debate-drills.ts` | 36 | claim-warrant-impact 9 · rebuttal 9 · evidence-evaluation 9 · weighing 9 | **still 9 — G2 outstanding** |
| `lib/deca-drills.ts` | 36 | performance-indicators 9 · business-reasoning 9 · customer-relations 9 · marketing-fundamentals 9 | **still 9 — G2 outstanding** |

Those eight areas still pad a 20-question request to 20 slots over 9 distinct items — the original
P0 defect. (At the time of Phase 2f there were **no per-area depth assertions for either bank**;
Global-G2 Slice 0 has since added them — see the Slice 0 block at the top of this file.) Closing G2 needs either eight further slices (+168 items, corpus **252 → 420**) or an
explicit recorded decision to re-scope G2 and re-file the Debate/DECA depth gap as its own finding.
**That decision has not been made. Do not make it silently.**

What Phase 2f changed structurally, and what not to undo:

- **`pp-09` gained a trailing comma** — it stopped being the final array element. That is
  punctuation, not content. The integrity extractor now strips **one** trailing comma on **both**
  sides, and control `31f-C1c` proves the same normalisation still leaves a one-word content edit
  different, so it cannot mask one. **Do not remove that control.**
- **The padding fixture was RE-BASED, not deleted** (`11g`/`11g2`). No area holds 9 any more, so it
  requests **40 from a 30-item area** and asserts **40 served / exactly 30 distinct**.
  `buildMedTermSession` seeds its result with the entire shuffled pool before appending any repeat,
  so the distinct count is deterministic, not probabilistic. A paired control proves the branch only
  activates because the request exceeds the pool.
- **The allowlist controls were redesigned around ONE shared predicate,** `judgeAddition`. Real
  additions and every control go through it — a control with its own regex would prove nothing about
  the rule the bank is actually checked against. It proves: six legitimate prefix→area mappings
  accepted · five synthetic ids rejected (`xx-10`, `zz-10`, `medterm-10`, `p-10`, `phh-10`) ·
  prefix/area mismatch rejected **in both directions** (`pp-31` as physiology, `ph-31` as
  pathophysiology) · an original-range id (`pp-09`, `wr-09`) never treated as an addition.
- **Two dead branches were removed, not left as decoration.** The `expanded ? 30 : 9` ternary and
  `31f7`'s "unexpanded area stays byte-identical" else became unreachable at parity. Both were
  replaced with explicit final-parity assertions. **Never reintroduce a branch that cannot run.**
- `EXPANDED_AREAS` and `ADDITIVE_ALLOWLIST` now contain all six areas. The immutable baseline is
  still `398860f`. **Never reintroduce a HEAD-relative hash.**
- **A stale claim was corrected in the same pass.** The evidence-smoke summary still described the
  Phase 2e physiology additions as pending human review — untrue since 2026-08-07. It is a
  `console.log`, not an assertion, so nothing was failing; it was printing something false.

## Latest handoff — M14 Phase 2e: HOSA physiology bank 9→30 (2026-08-07)

### Phase 2e: content is human-reviewed and APPROVED — clear to push

`lib/hosa-medterm.ts` gained 21 physiology questions (`ph-10`…`ph-30`), taking physiology 9→30 and
the bank 138→159. The items were AI-authored, and on **2026-08-07 the repository owner personally
read all 21 and approved them** — physiological accuracy, the physiology/anatomy/pathophysiology
boundary, answer uniqueness, distractors, wording, explanations and mechanism precision — including
the ten refined items and the carried judgments that `ph-14` is physiology rather than anatomy and
that the `ph-17`/`ph-19` overlap is acceptable educational reinforcement. **The push gate is lifted.**

Two things to keep straight, exactly as for Phases 2a–2d:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

**Five of six G2 areas are now at depth. Pathophysiology (9) is the only one left.**

What Phase 2e changed structurally, and what not to undo:

- **The Phase 2d boundary now runs from the physiology side.** Every new item tests a normal
  function, mechanism, process or regulatory response. Nothing asks where a structure sits (anatomy),
  nothing asks about a disease or a disease mechanism (pathophysiology — **Phase 2f needs it**), and
  nothing is bare word-part or term-definition recall. `ph-01`…`ph-09` are untouched.
- **No third insulin/glucose item was added.** `ph-02` and `ph-08` already overlap, and `pp-03` is
  adjacent. Glucose survives in two new items only as a wrong distractor. Do not add another.
- **Coverage is spread across seven system domains** — cardiovascular 4, respiratory 3, digestive 3,
  renal 3, nervous/muscular 4, endocrine 2, blood/hemostasis 2 — so no single system dominates.
- **Padding survival moved physiology → pathophysiology** (`11g`). **Phase 2f cannot simply move it
  again** — it takes the last 9-item area to 30, so no area will be left to name. That fixture must
  be re-based on a request that exceeds a 30-item pool instead. Do not delete it; the padding path
  must stay proven.
- **`31f-C2` moved `ph-10` → `pp-10`; the positive control moved `an-10` → `ph-10`.** `ph-10` left
  the deliberately-rejected list. **Phase 2f faces the same wall:** once every real area is
  allowlisted, only a non-existent prefix such as `xx-10` remains rejectable.
- `EXPANDED_AREAS` and `ADDITIVE_ALLOWLIST` each gained one entry; everything else keys off them.
  The immutable baseline is still `398860f`. **Never reintroduce a HEAD-relative hash.**
- **A stale claim in the evidence-smoke summary was corrected in the same pass.** It still described
  the Phase 2d anatomy items as awaiting human review, which stopped being true on 2026-08-07. It is
  a `console.log`, not an assertion, so nothing was failing — it was printing something false. No
  assertion and no question content changed with it.

**G2 roadmap: after 2e, ONE slice remains — 2f pathophysiology. Full six-area parity occurs only
after Phase 2f.**

## Latest handoff — M14 Phase 2d: HOSA anatomy bank 9→30 (2026-08-07)

### Phase 2d: content is human-reviewed and APPROVED — clear to push

`lib/hosa-medterm.ts` gained 21 anatomy questions (`an-10`…`an-30`), taking anatomy 9→30 and the bank
117→138. The items were AI-authored, and on **2026-08-07 the repository owner personally read all 21
and approved them** — anatomical accuracy, the anatomy/physiology boundary, answer uniqueness,
distractors, wording, explanations and structural/location focus — including the refined `an-24`
(cerebellum inferior and posterior to the cerebrum, in anatomical position), `an-25` (`Carotid
artery`) and `an-30` (largest muscle **by mass**, sartorius distinguished as longest).
**The push gate is lifted.**

Two things to keep straight, exactly as for Phases 2a–2c:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

**Option A is the governing anatomy boundary and was approved as such:** anatomy = structures and
their locations/relationships. Phase 2e must not let physiology material drift back into anatomy —
and the four legacy function-flavoured items (`an-01`, `an-02`, `an-05`, `an-09`) stay unchanged.

**Production runs `b1f5e85aa81cfa0857c531fe7811dc7b515d215a`** (deployment `5797883135`,
`Production`, `success`) — Phase 2c, whose suffix content IS human-approved.

What Phase 2d changed, and what not to undo:

- **Option A boundary was chosen deliberately.** Anatomy is declared as "Structures and their
  locations", but four legacy items (`an-01`, `an-02`, `an-05`, `an-09`) answer with a *function*.
  New items hold the line: structure, location, region, cavity, plane, directional term or
  relationship only. **Do not let anatomy absorb physiology material — Phase 2e needs it.**
- **The `31f-C2` rejected fixture moved `an-10` → `ph-10`** (third move: pr → sf → an → ph) and the
  positive control moved `sf-10` → `an-10`. **Move both again every slice.**
- **Padding survival moved anatomy → physiology** (`11g`). Always name an area still holding 9.
- `EXPANDED_AREAS` and `ADDITIVE_ALLOWLIST` each gained one entry; everything else keyed off them.

**G2 roadmap: after 2d, TWO slices remain — 2e physiology and 2f pathophysiology. Full six-area
parity occurs after 2f.**

### Phase 2c: content is human-reviewed and APPROVED — deployed

`lib/hosa-medterm.ts` gained 21 suffix questions (`sf-10`…`sf-30`), taking suffixes 9→30 and the bank
96→117. The items were AI-authored, and on **2026-08-07 the repository owner personally read all 21
and approved them** — suffix classification, terminology meanings, answer uniqueness, distractors,
wording, explanations and examples — including the refined `sf-18` (claustrophobia, replacing
*photophobia*, which denotes light sensitivity rather than fear), `sf-27` (abnormal condition, generic
increase sense removed) and `sf-29` (scoped to `-cytosis`). **The push gate is lifted.**

Two things to keep straight, exactly as for Phases 2a and 2b:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

One recorded caution for future slices: the Phase 2c pre-screen COMMENTARY wrongly associated
"rupture" with `-rrhagia` (it is `-rrhexis`). The error never reached tracked content — the three
`-rrhagia` mentions in source and docs say only "too close to `-rrhea`", which is accurate — and
`sf-17` was correct and unchanged. **Treat pre-screen commentary as unverified until checked against
source, exactly as the human review does.**

`sf-04`'s `-ology` convention remains an open, deliberately-unresolved question — do not change it
without a decision.

**Production runs `8f6169f01a981f116dcf69dc3a5958fbe9067060`** (deployment `5796977130`, `Production`,
`success`) — Phase 2b, whose prefix content IS human-approved.

What Phase 2c changed, and what not to undo:

- **Four candidates were rejected on classification grounds**, not laziness: `-poiesis`, `-rrhagia`,
  `-stenosis` and **`-edema`** (a standalone term, not a clean suffix). Keep that filter — it is the
  same check that caught `olig/o` in 2b.
- **The `31f-C2` rejected fixture moved `sf-10` → `an-10`.** It has now moved twice (pr → sf → an).
  **Move it again every slice**, or the allowlist silently stops being protected.
- **Padding survival moved suffixes → anatomy** (`11g`). Always name an area still holding 9.
- **`11h` now loops over `EXPANDED_AREAS`**, so every expanded area is proven padding-free and still
  breadth-refused; the byte-identical branch is driven by `MEDTERM_AREAS`. Future slices need one
  `EXPANDED_AREAS` entry and one allowlist entry.
- **Open convention question for a human:** `sf-04` teaches `-ology` where the strict form is `-logy`
  plus a combining vowel; `sf-26` (`-logist`) shares it. `sf-04` was NOT rewritten — pre-existing
  content, outside scope — but decide the convention before it spreads further.

**G2 status: word roots, prefixes and suffixes at 30; anatomy, physiology and pathophysiology remain
at 9** — after Phase 2c there were THREE slices left: 2d anatomy, 2e physiology, 2f pathophysiology.

### Phase 2b: content is human-reviewed and APPROVED — deployed

`lib/hosa-medterm.ts` gained 21 prefix questions (`pr-10`…`pr-30`), taking prefixes 9→30 and the bank
75→96. The items were AI-authored, and on **2026-08-07 the repository owner personally read all 21
and approved them** — prefix meanings, answer uniqueness, distractors, wording, explanations and
suitability — including the revised `pr-20` (`hemi-` / hemithorax) and the replacement `pr-30`
(`pseudo-`, superseding an `olig-` item that mislabelled a combining form as a prefix).
**The push gate is lifted.**

Two things to keep straight, exactly as for Phase 2a:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md`). Approval changed the
  review status, not the provenance.

Worth carrying into the next slice: the pre-screen's most useful catch was a **combining form
mislabelled as a prefix** (`olig/o`). Check that class explicitly when expanding suffixes.

**Production runs `82cbee67070bee43f46c93ee9ff757e9bb821bd3`** (deployment `5788424169`, `Production`,
`success`) — Phase 2a plus the handoff cleanups. Phase 2a's word-root content is human-reviewed and
approved; Phase 2b's prefix content is not.

**Audit G2 status: word roots and prefixes are at 30; four areas remain at 9** and are the remaining
Phase 2 work, one area per slice: **suffixes, anatomy, physiology, pathophysiology**.

What Phase 2b changed, and what not to undo:

- **`31f*` gained an explicit per-area allowlist** (`wr-*` → word-roots, `pr-*` → prefixes), still
  anchored to the immutable `398860f`. **Extend it one entry per approved slice — never generalise
  it to "any id", and never re-anchor it or introduce a HEAD-relative pin.** Originals in an
  expanded area stay byte-identical and ordered; unexpanded areas stay byte-identical.
- **The control that proved `pr-10` was rejected inverted** when prefixes were approved, so it was
  replaced with `sf-10` plus four more unapproved fixtures. **Every future slice must move that
  control to a still-unapproved id**, or the allowlist silently stops being protected.
- **The padding-survival example moved from prefixes to suffixes** (`11g`). It must always name an
  area still holding 9 — move it again in the next slice.
- Unfiltered draws now skew ~31% word-roots / ~31% prefixes / ~9% each of the other four. Correctness
  is unaffected (breadth counts distinct areas, not proportions) and it self-corrects as slices land.

### Phase 2a: content is human-reviewed and APPROVED — shipped

`lib/hosa-medterm.ts` gained 21 word-root questions (`wr-10`…`wr-30`), taking that area 9→30 and the
bank 54→75, closing audit G2 for the first area. The items were AI-authored, and on **2026-08-06 the
repository owner personally read all 21 and approved them** for medical accuracy, clarity, distractor
quality, originality, explanations and CompeteReady terminology conventions — explicitly confirming
the dual/standard meanings of `pneum`, `myel` and `cyst`, and the `cerebr/o` / `enter/o` / `col/o`
refinements. **The push gate was lifted on that approval, and the commits shipped.**

Two things to keep straight if this ever comes up again:

- **The approval is the human reading, nothing else.** The AI pre-screen that preceded it was the
  authoring model checking its own output; it was not independent verification and formed no part of
  the approval basis. Do not cite it as review.
- **The AI-authoring label stays in the source permanently** (`CLAUDE.md` requires AI-generated
  material to be labelled). Approval changed the review status, not the provenance.

**Carried stylistic follow-up, not a blocker:** the bank mixes bare roots (`hist`, `arthr`, `cost`)
with combining forms (`cerebr/o`, `enter/o`, `col/o`). Standardising on combining forms across all 30
word-root items is wanted eventually and was explicitly excluded from Phase 2a scope.

What Phase 2a changed structurally, and what not to undo:

- **Content-only.** No schema, seed, route, session-protocol, validator, XP, mastery, review or
  client change. `buildMedTermSession` already sliced whatever the pool held; the session route
  already deduped to distinct item rows and padded the order.
- **A focused 20-question word-roots session now serves 20 DISTINCT items** — no padding. It clears
  the 10-distinct count floor and is still refused review on **breadth** (1 area < 3). Both evidence
  floors are unchanged; the skill stays review-only.
- **Two byte pins were narrowed, never removed.** `hosa-medterm-evidence:smoke` (31f*) is now the
  single home of bank content integrity: additive-only against the **immutable** `398860f`, with all
  54 pre-existing items byte-identical and ordered, the five other areas untouched, and only
  `wr-NN > 09` additions permitted. `review-ladder:smoke` dropped its **HEAD-relative** bank hash —
  which would have self-healed on commit — for behavioural inertness assertions (65M*): no XP or
  mastery symbol, no prisma/fetch/session/review reach, floors unchanged, neighbours don't import it.
  **If you expand another area, extend 31f's allowlist deliberately; never reintroduce a
  HEAD-relative hash.**
- The remaining five areas stay at 9 by design — one area per Phase 2 slice.

**Phase 2a was deployed at `5789e19b2c626b2a9b902c9e2af7018ff523b2b6`**, GitHub deployment
`5788268138`, `Production`, `success`, verified read-only at the time. **Production has advanced past
that SHA since; this subsection is a Phase 2a record and does not state what Production runs now — see
the `Repository state` block below for that.** Deployment history for the M14 work, for the record:

| Stack | Deployed SHA | GitHub deployment |
|---|---|---|
| M13E2 Phase C | `bb397350029975520e0b96c1c741e7f873f59086` | `5783679689` |
| M14 Phases A + 1a–1d | `a37959c1500c405d0302e769996d9f850020707e` | `5785864553` |
| M14 Phase 1e (G19 + G20 record) | `a217baa6bb5d2eae983662b231c82dc87580deb3` | `5787742198` |
| M14 Phase 2a (word roots 9→30) | `5789e19b2c626b2a9b902c9e2af7018ff523b2b6` | `5788268138` |

Each was verified read-only from commit-linked GitHub metadata plus public route checks (200/307 to
sign-in, zero 5xx; the live `/signup` no longer offers Public Speaking).
**Authenticated Production behavior remains untested**, and no database or Production operation
occurred in any M14 verification pass.

**M14 Phase 1 is COMPLETE and deployed** — G23, G18, G21, G24, G25, G19 and G20 are all closed, and
Phase 2a word roots is deployed on top. **G19 shipped in the `a217baa` stack; there is no pending
G19 push and nothing from Phase 1 or 2a is waiting to go out.** What G19 changed, for reference:

- `app/(app)/study-arcade/page.tsx` — the header's recording claim is scoped to the drills, and the
  record tile attributes its (always-honest) count to real drill sessions; both now state plainly
  that "decks and games aren't recorded". No functionality, layout or legitimate claim changed; the
  zero state was already truthful.
- `scripts/games-smoke.ts` — the `G19-*` block: bans on both former claims and a generic
  decks/games-feed-mastery pattern over comment-stripped, whitespace-normalized source; presence of
  the truthful copy; and a both-directions pairing that verifies every `components/study/` file
  makes no `fetch`/`prisma` call. **If decks or games ever start recording, that pairing fails on
  purpose — update the copy and the check together.** Five non-vacuous controls.

### G20 — DECA skill activation: authorized and executed 2026-08-06 — zero writes needed

OUTCOME: the owner authorized the activation in chat and `npm run deca:skills:activate -- --apply`
ran on 2026-08-06. It reported **0 created, 3 already present, 0 conflicts** — all three rows
already existed with exactly the approved fields (the classifier accepts nothing less), so the
authorized run performed reads and **zero writes**. Post-verification: a second `--apply` was
idempotent (3 already present), a read-only check confirmed all four `DECA_DRILL_SKILL_SLUGS`
resolve as DECA/DECA, and `deca-mastery:smoke` passes. **Every DECA drill area records mastery.**
Who created the rows, and when, cannot be established from this repository and is not attributed —
`prisma/seed.ts` still seeds only `deca-marketing`, so the audit's code-level finding was accurate.
No rollback is applicable; nothing was written. The plan that was authorized, for the record:

- **What changes:** exactly three `Skill` rows are CREATED (never updated):
  `deca-performance-indicators` (order 20), `deca-business-reasoning` (21),
  `deca-customer-relations` (22) — each with its name, description, `organization: "DECA"`,
  `track: "DECA"` as literals in the script.
- **Current state:** no rows with those slugs (drilling those areas returns `skill-missing`).
  **Intended state:** the three rows exist; passing drill sessions record mastery and schedule
  review, exactly as `deca-marketing` already does.
- **Command:** `npm run deca:skills:activate -- --apply` (the flagless default is a dry run that
  provably opens no database connection — the Prisma import sits below the dry-run return).
- **Why required:** the mastery/review loop is the product's core promise; three quarters of DECA
  drilling is inert without these rows (audit G20).
- **Safety properties, verified by reading the script:** touches `Skill` only; create-or-verify,
  never update; a field mismatch on an existing slug reports a CONFLICT (field names only, never
  values) and exits non-zero with nothing written; rows are independent, so re-running is safe and
  idempotent; nothing else is read or written; no credential is ever printed.
- **Rollback:** delete the three rows by slug (they are new, so nothing references them until a
  learner drills; any MasteryProgress/review rows created afterwards reference the skill and would
  need the same authorization discussion before removal).
- **Post-write verification:** re-run `--apply` (all three must report `already present`), then a
  read-only check that `DECA_DRILL_SKILL_SLUGS` all resolve; `deca-mastery:smoke` pins the
  slug/name correspondence statically.
- **Blast radius:** no other rows, tables, learner data, XP, or config. **Do not run it without the
  owner's explicit written authorization in chat — it writes to the database shared with
  Production.**

The five deployed commits, for reference:

1. **M14 Phase A** (`a054706`) — `docs/M14_LEARNING_QUALITY_AUDIT.md`, the read-only learning-quality
   audit. Its gap register (G1–G26) is the M14 roadmap; read it before any M14 work.
2. **M14 Phase 1a** (`66e7dd6`) — the learner's signup organization now resolves their track.
3. **M14 Phase 1b** (`8a7a74f`) — the generic debate paths enforce the M11R6 HOSA withdrawal
   (audit G23, the audit's most serious finding).
4. **M14 Phase 1c** (`a29e506`) — DECA judging fails closed instead of fabricating a ballot
   (audit G18).
5. **M14 Phase 1d** (this commit) — Debate ballots carry one speaker card per REAL participant
   (audit G21).

What Phase 1d changed, and what the next engineer must not undo:

- **`buildSpeakerScores` builds two cards, not four.** One per persisted side, labelled with the
  shared side labels, ranked 1–2, with a server-derived `role` ("student"/"opponent") from
  `studentSide`. Do not reintroduce split-speaker synthesis ("Government 2" never existed) and do
  not pad the array for layout reasons — the renderer's grid handles two cards.
- **The model still has no participant channel.** The Debate ballot is deterministic; the provider
  contributes prose through `mergeJudgeEnhancement`'s whitelist. `P1d-7*` in `judge:smoke` proves a
  hostile enhancement injecting four fabricated cards and a flipped winner changes nothing. If you
  ever widen the enhancement schema, extend that hostile test FIRST.
- **The result type moved deliberately** to `rank: 1 | 2` plus `role` (`lib/ai.ts`,
  `components/debate/debate-arena.tsx`). Old persisted ballots that carry four-card
  `speakerScores` in their stored feedback render as stored — history is not rewritten.
- The `P1d-*` block in `judge:smoke` is behavioural (real judge, real merge) plus comment-stripped
  source scans; the builder's own comment names the old fabricated labels in prose, which is the
  strip-proof control. No HEAD-relative byte pins were added.

What Phase 1c changed, and what the next engineer must not undo:

- **`judgeDecaRoleplay` deliberately passes NO fallback** to `jsonCompletion`, and uses the strict
  `isTrustworthyDecaJudge` validator (finite overall, finite category scores, on top of the shared
  shape check). Every failure mode — provider outage, malformed JSON, incomplete rubric, validation
  miss — **throws** `OpenAIUnavailableError`, which `apiError` maps to the retryable 503. Do not
  reintroduce a fallback here: the old one returned hardcoded scores and was then stamped with the
  official registry spec.
- **Attribution follows validation structurally.** The `rubricSource` stamp sits after the judge
  call; failures throw before it. `judge-shape:smoke` (`P1c-*`, 16 assertions + 5 controls) pins
  the ordering, the absent fallback, the strict validator, and the impossibility of a
  fallback-tagged DECA result — over comment-stripped source. Its live loop treats a throw as
  "providers unavailable" and keeps the documented warn-and-exit-0 skip path.
- **A failed DECA judging leaves the debate retryable**: every route write (XP, rank, wins, streak,
  `JUDGED`) sits after the judge call, and the dedicated `/api/ai/judge-deca` route persists
  nothing. The transcript and the debate row survive untouched.
- **`fallbackPerformanceJudge` still exists** for its HOSA consumer (unreachable from routes since
  Phase 1b) — deliberately unchanged, as is Model UN's own fallback and all Debate judging. Do not
  delete it in a "cleanup" without deciding those consumers' fate explicitly.
- The DECA scenario and objection generators keep their fallbacks — they produce practice prompts,
  not scores, and were outside G18's scope. The room's "Using backup AI response." banner remains
  for those surfaces; it can no longer appear on a DECA ballot.

What Phase 1b changed:

- `POST /api/debates` refuses `organization: "HOSA"` with the established 410 contract after auth
  and validation, **before any database read or write** — no Debate row, no downstream effects.
- The debate judge route refuses existing HOSA rows with the same 410 after auth, rate limiting and
  the ownership fetch — **before any judge call, fallback ballot, registry attribution, XP, rank,
  wins, streak or completion write**. `judgeHosaPerformance` is no longer imported or called by any
  route; the dispatch was removed from `runOrganizationJudge`.
- One shared helper, `hosaWithdrawn()` in `lib/api.ts`, carries the body and status. Its text is
  **deliberately identical** to the dedicated endpoints' literal and `hosa-practice-scope:smoke`
  pins the two together — do not let them drift, and do not weaken either 410.
- Existing HOSA Debate rows were **kept** — not deleted, not migrated. History and coach views keep
  honest labels; the rows are simply impossible to judge.
- Debate and DECA creation/judging, response shapes, XP amounts, rating, and the carried
  wins/streak behaviour (`practice-session:smoke` 144–144c) are unchanged and asserted.
- Known remaining G23 sibling, deliberately out of this phase's scope: `/api/ai/roleplay-turn`
  still accepts `organization: "HOSA"` (a turn generator, not a judge — it can score nothing).
  It is tracked in the audit and belongs to a later phase.

What Phase 1a changed and why it is safe:

- `lib/track-server.ts` — precedence is now `?track=` → **persisted organization** → cookie →
  fail-closed default, implemented as a pure `pickActiveTrack` core (exhaustively tested in
  `tracks:smoke` as `P1a-*`, every assertion with a non-vacuous control) plus a gatherer that reads
  the session through a per-request cache. Only DEBATE/DECA/HOSA resolve; PUBLIC_SPEAKING,
  MOCK_TRIAL, retired MODEL_UN, malformed and missing values are absent and fall through. The
  resolver still writes nothing.
- `getActiveTrack`/`resolveActiveTrack` became **async**; their twelve calling pages await them and
  the five that were sync server components became async. All routes remain dynamic (ƒ) — verified
  against the build output.
- `components/auth/sign-up-form.tsx` — **Public Speaking is no longer selectable at signup** (no
  track, no registered lesson; audit finding G25). Not remapped, simply removed.
- `scripts/education-migration-smoke.ts` and `scripts/skills-compat-smoke.ts` byte-pinned the two
  index pages the conversion touched. The pins were replaced by a diff against the **immutable
  pre-Phase-1a commit `a054706`** in which each added line must be its removed counterpart with
  exactly `async `/`await ` inserted — a hardcoded track, a dropped guard or any smuggled edit
  fails. Never replace an immutable-base pin with a HEAD-relative one.

M14 Phases A + 1a–1d ARE live. What is NOT live: the G19 copy fix (local commit, unpushed) and the
G20 activation (not run). What is NOT tested anywhere: authenticated Production behavior of any M14
change.

### The Phase C commit chain

| # | Commit | What it is for |
|---|---|---|
| 1 | `59dd52b` | Server-session core helpers: `lib/practice-session.ts`, transaction-native review/mastery cores in `lib/spaced-review.ts`, `awardXpInTransaction` in `lib/xp.ts`, additive schemas in `lib/validators.ts`, `scripts/practice-session-smoke.ts` |
| 2 | `dd11e69` | The nine Debate / DECA / HOSA MedTerm drill routes — session, check, submit — bound to server-issued sessions |
| 3 | `4f0c856` | Debate Writing session route and submit cutover, plus the `awardXpInTransaction` cutover for `tests/[testId]/grade` and `debates/[debateId]/judge` |
| 4 | `80dbf75` | Debate drills client |
| 5 | `be97024` | DECA drills client and HOSA MedTerm client; explicit `checkEndpoint` prop on the shared concept-drills component |
| 6 | `9103693` | Guided lesson practice client — the last legacy caller of the old drill contract |
| 7 | `f392ede` | Debate Writing client |
| 8 | `bb39735` | The documentation closeout — the deployed Production commit |

Eight commits, pushed as one clean fast-forward, no merges. Cumulative against `221e07f`:
**34 paths — 6 added, 28 modified, none deleted or renamed.** No schema change, no migration, no seed
change, no dependency, no lockfile change, no env or deployment-config change.

### What the protocol guarantees, in local code

- The **server** picks the questions or the writing scenario, shuffles each question's choices, mints
  an opaque per-session `crypto.randomUUID()` id per served choice, stores the answer key, and freezes
  it all into a versioned kind-discriminated `scenarioJson` snapshot.
- **Converted clients do not need an unanswered answer key.** An unanswered item ships its prompt and
  its shuffled choices and nothing else. `correctAnswer` and `explanation` appear only on items the
  learner has already answered — the resume path — and in the check response the server returns after
  it has recorded the answer.
- **Grading reads the persisted snapshot and the stored `isCorrect`, never the live bank**, so a
  question edited after issuance cannot change a grade already earned.
- **The first accepted answer to a distinct item is final.** A later different pick returns the stored
  first answer with `previouslyAnswered: true` rather than replacing it.
- **Repeated padded visual slots share one distinct-item answer state.** A focused twenty-question
  session stores nine distinct item rows plus a persisted twenty-slot order of repeated item ids, so
  the requested learner-facing count is preserved and the repeats add no evidence, mastery, review
  or XP.
- **Final drill submit carries only `{ sessionId }`.** Writing submit carries only
  `{ sessionId, response }`.
- **A completed session replays its stored result before any effect** — before the grader, before
  review and mastery, and before XP. One issued session awards XP at most once.
- **HOSA is review-only and no drill route awards XP.**
- **Writing, test-grade and judge XP/rank writes go through `awardXpInTransaction`** — an atomic
  increment with rank derived from the returned value. The old read-add-write could be erased by a
  concurrent writer, because a plain SELECT never blocks under MVCC.
- The **user row lock is the first statement** of every session-start and final-submit transaction.

### Things the next engineer must not undo

**`enforceRateLimit` is deliberately absent from both Debate Writing routes.** That surface has never
had rate limiting, redesign is deferred, and three suites assert the absence. Do not "fix" it.

**The three drill check routes are deliberately not rate-limited.** The light tier is 20/min and a
twenty-question drill needs 22 calls. Rate limiting the check route would break normal practice.

**Floors and thresholds are unchanged and pinned.** Debate 5, DECA 5, HOSA 10-across-3, threshold 70
with HOSA comparing the exact ratio, and the honest 6-of-9 result of 67. `PASS_THRESHOLD` is
module-private in `lib/hosa-medterm.ts`, so `app/api/hosa/medterm/submit/route.ts` restates `70` as
`MEDTERM_PASS_THRESHOLD`; `practice-session:smoke` control 112 pins the two together by regex. If you
ever export the library constant, delete the restatement.

**`wins` and `streak` in the judge route are untouched.** They still read-modify-write from a
pre-read; that staleness is carried work — the C2b exception covered XP and rank only.
`practice-session:smoke` controls 144–144c pin the existing behaviour so it cannot drift while it waits.

**The transaction-native cores are additive.** The public M13E1G helpers are untouched and are *not*
rewritten to call them. The public path keeps its seven review variants, its returned `write-failed`,
its missing-table degradation, its create-race classification, and the "a review mutation that
truthfully landed is preserved rather than rolled back" contract that `review-ladder-smoke.ts`
assertion 28c pins. The new cores deliberately have the opposite rollback semantics, because inside a
PostgreSQL transaction a caught statement error poisons everything after it — which is why they use
`INSERT … ON CONFLICT DO NOTHING` plus `SELECT … FOR UPDATE` and never catch-and-continue.

**PA7 was widened deliberately, never deleted.** It still asserts that nothing outside the approved
allowlist references the session tables, with non-vacuous controls proving the allowlist rejects an
unlisted route and component. Widen it one path at a time.

**Assertion repairs replaced byte pins with behaviour, and none was deleted.** Every HEAD-relative
byte pin on a file this milestone rewrote was replaced by targeted behavioural assertions plus
non-vacuous controls — a HEAD-relative pin turns green the moment the commit lands, so it proves
nothing before the commit. Suites also strip comments before scanning for banned symbols, because
several routes describe in prose exactly what they refrain from writing; control 102b exists to prove
that ban is not passing vacuously.

### Known loose end

`app/(app)/skills/[slug]/practice/page.tsx` still passes `initialScenario` to
`components/skills/debate-writing-practice.tsx`. The prop is **accepted for compatibility and never
read** — it is not destructured in the component, and the scenario a learner is graded against is the
one the server issues. Its caller was outside the approved Phase C boundary. Removing it from both
files is safe, separate follow-up work.

### What has NOT happened

- **No Phase C schema change and no Phase C database operation.** No `db push`, migration, seed,
  reset or activation; no learner data was read or written.
- **No Redis and no new secret.** PostgreSQL is the only store.
- **Authenticated Production behavior is not claimed.** No learner run, in any environment, has
  exercised issue → check → submit end to end.
- **`auth:smoke`, `team:smoke` and `assignment:smoke` write to the shared Production database. They
  were not run and must not be claimed as passing.**

## Earlier handoff — post-deployment verification (2026-08-01)

M11's independent review returned **NOT READY** and enumerated findings from BLOCKER down to LOW. Twelve
remediation passes (M11R1–M11R12) closed every one of them. **No confirmed M11 code finding remains
open.** The nine approved M11 commits (eight code, one documentation) were pushed in one normal
fast-forward (`700f40e..d7efcb5`) and deployed. No force, no rebase, no squash, no merge, no history
rewrite.

| # | Commit | Purpose |
|---|---|---|
| 1 | `2ec2bb5` | HOSA hub and lessons index stop promising practice and examples that do not exist; the lesson's absence claim is scoped to the approved research record; knowledge-test routing becomes registry-derived. |
| 2 | `2bd40ed` | Withdraws the unsupported generic HOSA patient/clinical role-play end to end. |
| 3 | `2c471e6` | Scopes DECA timing to the family our record sources it for; both browsing surfaces name their groupings as CompeteReady training groups. |
| 4 | `f4bba01` | Side Coach: two 4,000-character responses are a valid request; rubric IDs are canonicalised; invalid IDs are never reflected. |
| 5 | `f83c72b` | Navigator semantics: no `<p>` inside `<button>`, coherent heading outlines, nav-a11y no-op removed. |
| 6 | `f03db4e` | Exam sections render only from a family's own sourced exam facts; restored follow-up unlock requires the persisted explicit decision. |
| 7 | `b9c904d` | Project `focus-ring` on navigator result buttons; the shared response gate counts word-like tokens. |
| 8 | `e44fb6f` | Removes the dormant `HOSA_ROLE_PAIRS` configuration left behind by commit 2. |
| 9 | `d7efcb5` | Closes M11: rewrites both tracked documents and brings `docs/curriculum/` into git. |

M13E1D–M13E1F (drill evidence safety) and M13E1G (`95fdd4c`, due-gated spaced review) followed, each
pushed and deployed, then M13E2 Phase A (`221e07f`).

## Repository state

Read this as a **handoff snapshot taken at the start of the Phase 2e implementation pass**, not as a
live readout. Local SHAs and ahead/behind counts move the moment another commit lands — always
re-derive them with `git status` and `git log --oneline -5` before acting. The three levels below are
deliberately kept apart.

`docs/curriculum/` is tracked (committed in `d7efcb5`) and is the approved research record — treat it
as such, not as app source.

### Deployed / remote state — the only claim that survives new local commits

- **Branch:** `main`
- **origin/main and remote `refs/heads/main`:** `90ca112ecd037618b048a42bef300e6b65c1b909` — M14
  Phase 2d, and **this is the SHA Production runs** (deployment `5798740105`, `Production`,
  `success`, created automatically by `vercel[bot]`).
- **Deployed M14 work:** Phase 1 (G23, G18, G21, G24, G25, G19, G20) and Phase 2a (word roots 9→30),
  2b (prefixes 9→30), 2c (suffixes 9→30) and 2d (anatomy 9→30). All four shipped banks are
  human-reviewed and approved.

### Historical snapshot — the local state at the start of Phase 2e

At the start of the Phase 2e implementation pass, local `main` was **level with `origin/main`
(0 ahead, 0 behind)** on the SHA above, with a clean worktree. The whole Phase 2d stack — the anatomy
expansion, its wording refinement, its human-review approval record and two documentation
corrections — was pushed and deployed before this pass began.

**Phase 2e then added exactly one local commit,** `feat(hosa): expand physiology question bank`,
taking physiology 9→30 and the bank 138→159. Re-derive the live position with `git status` rather
than reading a SHA out of this paragraph.

- **Phase 2e state:** implementation is complete locally; **human content review is OUTSTANDING**.
  The AI-authoring label above `ph-10` stays in `lib/hosa-medterm.ts` permanently per `CLAUDE.md`,
  and the push gate stays closed until a human reads `ph-10`…`ph-30`.

### Bank composition after Phase 2f (local)

| Area | Items | Review status |
|---|---|---|
| word-roots | 30 | AI-authored, human-approved 2026-08-06 |
| prefixes | 30 | AI-authored, human-approved 2026-08-07 |
| suffixes | 30 | AI-authored, human-approved 2026-08-07 |
| anatomy | 30 | AI-authored, human-approved 2026-08-07 |
| physiology | 30 | AI-authored, human-approved 2026-08-07 |
| pathophysiology | 30 | AI-authored, human-approved 2026-08-07 |
| **`MEDTERM_BANK` total** | **180** | six HOSA areas at 30, all human-approved — HOSA parity, **not** G2 closure |

### Next intended action

1. **Push the Phase 2f stack** (`feat(hosa): expand pathophysiology question bank`, the two
   refinement commits and this approval record) and verify the Production deployment. Human review
   is complete, so nothing else is waiting on it.
2. **Address Debate and DECA depth — this is the next G2 work.** Phase 2f completes the HOSA portion
   of G2; **global G2 remains open for Debate and DECA depth expansion.** Either expand the four
   Debate and four DECA areas (+168 items, corpus 252 → 420) or record an explicit decision to
   re-scope G2. **Do not mark G2 closed on the strength of HOSA parity.**

## How to run everything

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm run build
```

Never build while a dev server holds `.next` — check first with `lsof -ti:3000`.

Enumerate the smoke scripts rather than trusting a hard-coded list:

```bash
node -e 'console.log(Object.keys(require("./package.json").scripts).filter(n=>n.endsWith(":smoke")).join("\n"))'
```

**32 registered `*:smoke` scripts** as of this handoff: `security`, `judge`, `judge-shape`,
`rubric-scoring`, `debate-drills`, `deca-drills`, `auth`, `audio-debate`, `team`, `assignment`,
`games`, `tracks`, `hosa-practice-scope`, `side-coach`, `debate-side-coach`, `deca-rubric`,
`hosa-navigator`, `deca-navigator`, `source-freshness`, `nav-a11y`, `lesson-progress`, `debate-replay`,
`learning-path`, `avatar`, `education-registry`, `education-migration`, `skills-compat`,
`deca-mastery`, `debate-mastery`, `hosa-medterm-evidence`, `review-ladder`, `practice-session`.

**Three of them write to the shared Production database: `auth:smoke`, `team:smoke` and
`assignment:smoke`.** They were excluded from this milestone's validation and are not claimed to pass.
The remaining **29 are safe/read-only, and all 29 pass.** Run only the safe set:

```bash
for s in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(n=>n.endsWith(":smoke")).filter(n=>!["auth:smoke","team:smoke","assignment:smoke"].includes(n)).join(" "))'); do printf "%-28s " "$s"; npm run "$s" >/dev/null 2>&1 && echo PASS || echo FAIL; done
```

**`judge-shape:smoke` makes a live Gemini call** and is unreliable in two ways: it has failed once and
passed on re-run, and `scripts/judge-shape-smoke.ts:78-82` **exits 0 with only a console warning** when
no provider responds after four attempts. A green result can therefore mean the live check was
*skipped*. **The bulk loop above discards stdout, so it will print PASS in exactly that case** — run this
one on its own and read its output before trusting it.

`practice-session:smoke` is the M13E2 suite: deterministic helper- and route-level controls with no
database access. Every negative assertion in it is paired with a control that proves the mutation or
interleaving it rejects is real, so a ban cannot pass vacuously.

The focused M8/M9/M10 and M11R2–M11R12 harnesses live in the session scratchpad, not the repository.
They are not required to reproduce a green build.

## Canonical route map

| Track | Hub | Navigator | Selector | Event HQ | Lesson |
|---|---|---|---|---|---|
| Debate | `/training/debate` | none (404 by design) | — | `/training/debate/event/public-forum` | Debate CWI lesson |
| DECA | `/training/deca` | `/training/deca/events` | `?family=` | `/training/deca/event/hotel-lodging-management` | `/lessons/how-deca-roleplay-works` |
| HOSA | `/training/hosa` | `/training/hosa/events` | `?event=` | `/training/hosa/event/medical-terminology` | `/lessons/how-hosa-scenario-interaction-works` |

The Debate hub's start action routes to `/debate` — there is no UI element literally labeled "Start
Debate"; the routing, not a label, is what the tests pin. `/training/debate/events` fails closed and must
stay that way. Both Navigators are reached only through `/training`, which is in both the desktop sidebar
and the mobile bottom bar.

### Practice session routes (M13E2, local only)

| Track | Session start | Check | Final submit |
|---|---|---|---|
| Debate drills | `/api/debate/drills/session` | `/api/debate/drills/check` | `/api/debate/drills/submit` |
| DECA drills | `/api/deca/drills/session` | `/api/deca/drills/check` | `/api/deca/drills/submit` |
| HOSA MedTerm | `/api/hosa/medterm/session` | `/api/hosa/medterm/check` | `/api/hosa/medterm/submit` |
| Debate Writing | `/api/skills/debate-writing/session` | — | `/api/skills/debate-writing` |

Guided lesson practice (`components/lessons/lesson-practice.tsx`) uses the Debate drill routes. The
shared `components/training/concept-drills.tsx` takes its check endpoint through an explicit
`checkEndpoint` prop — `app/(app)/study-arcade/page.tsx` passes `/api/deca/drills/check`. **Never
derive one endpoint from another by string replacement.**

## Final product truth

**Debate.** Role-play/practice active at `/debate`. CWI is one supported model, not the only one. No
universal 0–30 speaker-point scale is claimed.

**DECA.** Role-play practice active at `/training/deca/practice`; the room at `/training/deca/room`
serves DECA only. Timing is family-specific — Individual Series 10/10 and TDM 30/15 are sourced; PBA,
PFL and PSC have none and none is invented. TDM exam weighting is unresolved and absent. PSC is
unresolved and routes to the DECA hub, not the role-play lesson. The "Exam weighting" section renders
only where a family's own sourced facts establish an exam.

**HOSA.** The generic patient/clinical role-play is withdrawn. Medical Terminology practice is active
and records attempts, and it is **review-only** — it awards no XP. The communication lesson is
informational and communication-only, its interactive scenario is `temporarily-unavailable`, and it
neither teaches nor scores hands-on procedures.

### HOSA fail-closed routes and APIs — preserve these

- `/training/hosa/practice` mounts `HosaEventPrep` only. `HosaRoleplaySetup` is deleted; do not restore it.
- `/training/hosa/room` redirects to `/training/hosa/events` **before** `RoleplayRoom` mounts. The room
  component itself now mounts only for DECA.
- `/compete` offers HOSA event navigation; there is no generic HOSA role-play arena.
- `/api/ai/hosa-scenario` and `/api/ai/judge-hosa` return HTTP **410** with
  `{"unavailable":true,"error":"Generic HOSA role-play practice is unavailable."}` **after** `requireUser()`
  then `enforceRateLimit()`. They must reach no provider, parse no body, produce no score and write nothing.
- `/api/ai/roleplay-turn` is **shared and unchanged** — DECA still needs it. Do not disable it.
- Medical Terminology keeps its session, check and submit routes, its registry spec and provenance
  banner, and its Event HQ practice link.

## Fail-closed contracts to preserve

**Unknown input.** Each Navigator resolves only its own parameter through its own registry, by exact
match after trim + lowercase. Missing, empty, whitespace-only, repeated (array), path-like, unknown and
cross-track identifiers all select nothing. No first-record fallback, no silent redirect; the unknown
state offers list and hub recovery.

**HOSA family resolution.** Registry-derived. Exactly one routable member resolves to that named event;
zero or several return an **href-free** non-interactive state — the recovery link is `/training/hosa`,
never the events page the list is rendered on. Order-independent; production registry never mutated.

**Practice session lifecycle.** A session is bound to its owner, its kind and its expiry. An expired or
unknown session is a distinct learner-visible state, never a silent restart. A completed session
replays its stored result and runs no effect. Converted clients keep loading, expired, unavailable and
retryable-error as separate states, so status is never conveyed by colour alone.

**Device-local lesson progress.** Key
`compete-ready:authored-lesson-progress:v1:<sha256 digest>:<slug>`; the digest is
`sha256("authored-lesson-progress:" + userId).slice(0,16)` — no raw id, email or name in key or payload.
Stored fields are limited to phase, question index, both learner responses, the follow-up unlock flag and
a timestamp. AI feedback, scores, mastery, XP, completion, ratings and ballots are excluded and must stay
excluded.

**Authored follow-up unlock.** Earned by an explicit Continue click, which the UI enables only once the
first response passes the shared eight-word gate. Restore uses the **persisted decision** as the source of
truth and validates it against phase and gate — meaningful text alone never recreates it, and a stored
unlock whose response no longer clears the gate is withdrawn (`withdrewFollowUnlock`). The gate counts
word-like tokens (`/[\p{L}\p{N}]/u`), so punctuation-only and emoji-only input cannot satisfy it. One
helper, `countResponseWords`, serves both the live button and restore — do not add a second.

**Side Coach requests.** `latestStudentSpeech` is bounded at 2 × 4,000 learner characters plus framing
headroom; both per-response 4,000-character limits are unchanged. Rubric IDs must be exactly the authored
set, canonicalised from the lesson's own rubric; anything else fails at the route with a stable
`invalid-rubric-ids`, before any provider call, echoing nothing back.

**AI unavailability.** A provider failure returns `{ message: "", unavailable: true, reason }` with no
learner-specific content. Callers must never render it as coaching. Retry is manual and never loops.
Validation failure and provider unavailability must remain distinguishable.

**Evidence validation.** Authored DECA feedback must carry a two-entry `responseReview` plus one verdict
per authored criterion; every `met`/`partial` verdict needs an excerpt that actually appears in the
response it names; the coach's own example can never serve as evidence. Invalid payloads are discarded
whole, never partially rendered.

**HOSA safety boundary.** CompeteReady never teaches, scores or simulates hands-on clinical procedures,
and app practice does not create clinical readiness. The clinical-skill family links only to the
informational communication lesson.

**Source/freshness.** Official requires an organization and a source label; current requires a season or
document version; a verification date must be a real ISO calendar date; revalidation without a trigger
invents no date; partial and unverified never receive official wording or verified tone. Nothing is
back-filled from the calendar, a file timestamp, a URL path, or another organization's schedule. No source
URL is rendered.

**Grouping honesty.** CompeteReady's event families/scopes are **training-navigation groupings**, not
official DECA or HOSA taxonomy, and both browsing surfaces say so where the groups are browsed.

## Validation status and its limits

Local, at the Phase C closeout: `npm run db:generate`, TypeScript, lint (**0 errors**, one pre-existing
`<img>` warning), a production build, and **29/29 safe smoke suites**. Browser checks were done by
serving emitted SSR markup with the app's compiled CSS at 375×812, 390×844 and 1280×900, including real
keyboard Tab for focus rings.

**Not done, and not to be claimed:**

- the three database-writing suites (`auth`, `team`, `assignment`) — excluded, no result claimed;
- any authenticated run of the practice session flow, in any environment;
- live authenticated deployment verification;
- screen-reader certification, a full keyboard journey, end-to-end production coverage.

The browser-preview helper cannot launch from `~/Documents`, which is why the local-server approach is
used. **Do not treat an authentication redirect as verification of the page behind it.**

## Production deployment status

**Production runs `bb397350029975520e0b96c1c741e7f873f59086`** — the full M13E2 stack. The two M14
commits are local. M13E1G (`95fdd4c`), Phase A (`221e07f`) and the Phase C stack (`bb39735`) were
each pushed and their Production deployments verified in their own passes; the `bb39735` record is
deployment `5783679689` / commit status `51784302970`, alias `https://debate-arena-ai.vercel.app`.

The most recent full commit-linked deployment record on file is for
`d7efcb59ed94ca887f9d562ef21ea4723dde1175`, verified from unauthenticated GitHub metadata:

| Field | Value |
|---|---|
| GitHub deployment ID | `5700303276` |
| Commit status ID | `51469218987` |
| Environment | `Production` |
| State | `success` ("Deployment has completed") |
| Deployment-specific URL | `https://debate-arena-k697ureau-habibisters-projects.vercel.app` |
| Production alias | `https://debate-arena-ai.vercel.app` |

The **deployment-specific URL is behind Vercel Deployment Protection** — every route there redirects to
Vercel SSO, so it shows nothing about the app without provider authentication. The **production alias**
serves CompeteReady and `/` returns **200**.

**Public route results.** `/training/hosa`, `/training/hosa/events`, `/training/hosa/practice`,
`/training/hosa/room`, `/training/hosa/event/medical-terminology`, `/training/deca/events`, `/lessons`,
`/compete` and `/debate` each returned **307** to `/signin?callbackUrl=…`, then **200** on the sign-in
page — one redirect each, no loops.

**API boundary.** Unauthenticated `POST /api/ai/hosa-scenario` and `POST /api/ai/judge-hosa` both
returned **401** (`{"error":"You must be signed in to do that."}`).

### Keep these three levels of evidence distinct

1. **Deployment verification** — proven for the commits named above.
2. **Route existence and auth boundary** — proven: the routes exist and are auth-gated; the two HOSA-only
   AI endpoints authenticate first.
3. **Authenticated protected-page product behaviour** — **not verified in production.** No session was
   used. Everything behind sign-in is verified **locally only** — including every M13E2 guarantee.

A public alias cannot by itself prove which commit it serves; commit-linked deployment metadata is what
establishes a deployment.

## Remote incident — read before pushing

On 2026-07-31 at 16:22:41 local, `origin/main` moved from `a6f0e78` to `700f40e`: a push from this clone
that was not part of any approved step. **The source is unknown and is not attributed to anyone.**

Consequence: the remote can change outside this workflow. **Always re-verify immediately before pushing:**

```bash
git ls-remote origin refs/heads/main && git rev-parse origin/main && git rev-parse HEAD && git rev-list --left-right --count origin/main...HEAD
```

If `origin/main` is not what you expect, stop and reconcile before doing anything else.

## Recovery bundle (outside the repository — never commit it)

`$HOME/compete-ready-backups/m13e2-c1-59dd52bc/` holds a durable copy of the Phase C work: a git bundle,
the `origin/main..HEAD` patch, the legacy pre-closeout document backups, a `RECORD.txt`, and
`MANIFEST.sha256`. Verify it with:

```bash
cd "$HOME/compete-ready-backups/m13e2-c1-59dd52bc" && shasum -a 256 -c MANIFEST.sha256
```

All six entries must report `OK`. This replaced the earlier `/private/tmp` artifact set, most of which
the OS reaped. Never stage or commit any of it.

## The exact safe sequence for the next engineer

1. Re-verify the remote with the command above, then review the stack:
   `git log origin/main..HEAD` and `git diff origin/main..HEAD`.
2. **Push the Phase 1e G19 commit (and this docs commit) through GitHub Desktop** and verify the
   automatic deployment read-only. G20 is done — authorized, executed, verified.
3. Verify the automatic Vercel Production deployment read-only, from commit-linked public GitHub
   metadata. Do not bypass Deployment Protection and do not authenticate into Production.
4. Perform authenticated verification of the practice flow when a safe session is available: issue,
   check, refresh-and-resume, duplicate submit, and completed-session replay.
5. Remove the unused `initialScenario` prop from `app/(app)/skills/[slug]/practice/page.tsx` and the
   writing client's prop type.
6. Revisit the deferred items: rate limiting for the writing surface, `wins`/`streak` staleness in the
   judge route, and XP-farming policy for repeated writing sessions.
7. Begin the visual redesign, then stabilize the design system, then the games/progression work.

## Rules

- Never force-push. Never rebase, squash or amend approved commits without explicit approval.
- Never commit secrets, `.env` content, or anything under `/private/tmp` or the recovery bundle.
- Never run `db push`, a migration, a seed or a reset against the shared database without explicit
  human authorization — it is shared with production.
- Never run the three database-writing smoke suites casually, and never claim they passed when they
  were not run.
- Never treat an unverified deployment as successful.
- Never treat an authentication redirect as verification of the protected page behind it.
- Never run `npm run build` while a dev server holds `.next`.
- Never present unverified content as official; label AI-generated material as AI-generated.
- Never describe the practice session design as cheat-proof — describe what it actually enforces.
- Qualification does not equal attendance; no unauthorized copies or access-control circumvention.
