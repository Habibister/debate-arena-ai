import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
// THE PRODUCTION VALIDATOR — the same function the practice component calls. There is deliberately
// NO mirrored copy in this file: a mirror can drift while its tests keep passing (M7A, issue 1).
import {
  orderByAuthoredRubric,
  responseReviewLabel,
  rubricStatusLabel,
  validateAuthoredRubricFeedback
} from "../lib/authored-rubric-feedback";

const INITIAL = "I recommend we hold a small buffer of loyalty-tier suites so an overbooking cannot take the room a member reserved.";
const FOLLOW_UP = "I would track the repeat-booking rate for loyalty members quarter over quarter, and brief the front desk on Monday.";
// A follow-up that is a real, meaningful answer but demonstrates no rubric criterion (M7B test 14).
const IRRELEVANT_FOLLOW_UP = "Honestly the lobby music could be better and the downtown parking situation is difficult for guests arriving late.";
// The coach's own model revision. Never a source for criterion evidence OR for proof of review.
const EXAMPLE_TEXT = "I recommend a tiered protection policy with a quarterly service-recovery audit.";

function main() {
  const deca = getRoleplayLesson("how-deca-roleplay-works");
  const hosa = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.ok(deca && hosa, "both authored lessons exist");
  assert.equal(deca!.practiceStatus, "available", "DECA lesson is still explicitly available");
  assert.equal(deca!.slug, "how-deca-roleplay-works", "DECA lesson slug preserved");
  if (deca!.practiceStatus !== "available") return;

  const rubric = deca!.practice.write.rubric;
  const ctx = { rubric, initialResponse: INITIAL, followUpResponse: FOLLOW_UP };
  const lessonText = JSON.stringify(deca).toLowerCase();
  const labels = rubric.map((r) => r.label).join(" ").toLowerCase();

  // ---- rubric shape, stable IDs, learner-facing labels -----------------------------------------
  assert.equal(rubric.length, 4, "the DECA rubric has exactly four items");
  assert.ok(rubric[0].label.includes("specific recommendation"), "the first item is still the specific-recommendation criterion");
  assert.equal(rubric[0].id, "specific-recommendation", "the first item's stable ID is specific-recommendation");
  assert.deepEqual(
    rubric.map((r) => r.id),
    ["specific-recommendation", "scenario-reasoning-pi", "practical-implementation", "effectiveness-measurement"],
    "stable rubric IDs, in authored order"
  );
  assert.equal(new Set(rubric.map((r) => r.id)).size, 4, "rubric IDs are unique");
  for (const r of rubric) {
    assert.ok(/^[a-z][a-z0-9-]*$/.test(r.id), `ID is a stable slug, not a sentence: "${r.id}"`);
    assert.ok(r.label.trim().length > 20 && r.label.length <= 300, "label is substantive and within the goals cap");
    assert.notEqual(r.id, r.label, "the machine ID is never the full label");
  }
  assert.ok(/recommendation/.test(labels) && /performance indicator/.test(labels), "labels cover recommendation + PI demonstration");
  assert.ok(/implementation/.test(labels) && /result is expected|checked/.test(labels), "labels cover implementation + effectiveness");
  for (const r of rubric) {
    assert.ok(!/\b\d+\s*(points?|pts|%)\b/i.test(r.label), "no point value in a label");
    assert.ok(!/guarantee|will score|higher score|advance|cut line|weight/i.test(r.label), "no outcome promise in a label");
    assert.ok(!/d-e-c-a/i.test(r.label), "no D-E-C-A mnemonic");
    assert.ok(!/announce|say the performance indicator/i.test(r.label), "no spoken-PI requirement");
    assert.ok(!/tone|body language|appearance|visual aid/i.test(r.label), "nothing judged that text cannot show");
  }
  assert.ok(/not going to promise/.test(lessonText), "the lesson still declines to promise a higher score");
  assert.ok(!/\b\d{1,3}\s*%/.test(lessonText), "the lesson states no percentage weighting (TDM weighting stays omitted)");

  // ---- payload builders ------------------------------------------------------------------------
  // The validator now takes the WHOLE coach response, so `example` is structurally excluded as a
  // source for both criterion evidence and proof of review.
  const review = () => [
    { response: "initial", excerpt: "hold a small buffer of loyalty-tier suites", note: "Names a concrete action and ties it to the member's reservation." },
    { response: "follow-up", excerpt: "brief the front desk on Monday", note: "Adds a metric and one implementation step, but no cost or tradeoff." }
  ];
  const complete = () => [
    { rubricId: "specific-recommendation", status: "met", evidence: [{ response: "initial", excerpt: "hold a small buffer of loyalty-tier suites" }], comment: "You named a concrete action." },
    { rubricId: "scenario-reasoning-pi", status: "met", evidence: [{ response: "initial", excerpt: "cannot take the room a member reserved" }], comment: "You tied it to the guest's loss." },
    { rubricId: "practical-implementation", status: "partial", evidence: [{ response: "follow-up", excerpt: "brief the front desk on Monday" }], comment: "Who acts is clear; cost is not." },
    { rubricId: "effectiveness-measurement", status: "met", evidence: [{ response: "follow-up", excerpt: "repeat-booking rate for loyalty members" }], comment: "You named a metric." }
  ];
  const envelope = (over: Record<string, unknown> = {}) => ({
    strength: "You named a concrete action.",
    improvement: "Add the cost.",
    example: EXAMPLE_TEXT,
    responseReview: review(),
    rubricFeedback: complete(),
    ...over
  });

  const failsWith = (payload: unknown, reason: string, label: string, context = ctx) => {
    const r = validateAuthoredRubricFeedback(payload, context);
    assert.equal(r.ok, false, `${label} must fail`);
    if (!r.ok) assert.equal(r.reason, reason, `${label} fails with reason "${reason}"`);
  };
  const passes = (payload: unknown, label: string, context = ctx) => {
    const r = validateAuthoredRubricFeedback(payload, context);
    assert.equal(r.ok, true, `${label} must pass`);
    return r;
  };

  // ============ M7B: responseReview — proof BOTH submissions were examined ============

  // ---- 1. complete review + complete rubric feedback passes --------------------------------------
  const okResult = passes(envelope(), "a complete review + complete rubric payload");
  if (okResult.ok) {
    assert.equal(okResult.items.length, 4, "all four verdicts are returned");
    assert.equal(okResult.review.length, 2, "both response reviews are returned");
  }

  // ---- 2/3/4. both entries are required ------------------------------------------------------------
  failsWith(envelope({ responseReview: [review()[0]] }), "missing-review-response", "a review with no follow-up entry");
  failsWith(envelope({ responseReview: [review()[1]] }), "missing-review-response", "a review with no initial entry");
  failsWith(envelope({ responseReview: [] }), "missing-review-response", "an empty review array");

  // ---- 5/6. duplicate and unknown response labels ---------------------------------------------------
  failsWith(envelope({ responseReview: [review()[0], review()[0]] }), "duplicate-review-response", "a duplicated response label");
  failsWith(
    envelope({ responseReview: [review()[0], { ...review()[1], response: "rebuttal" }] }),
    "unknown-review-response",
    "an unknown response label"
  );

  // ---- 7/8. empty excerpt, empty note ---------------------------------------------------------------
  failsWith(envelope({ responseReview: [{ ...review()[0], excerpt: "   " }, review()[1]] }), "empty-review-excerpt", "an empty review excerpt");
  failsWith(envelope({ responseReview: [review()[0], { ...review()[1], note: "  " }] }), "empty-review-note", "an empty review note");
  // A note too short to describe anything is rejected on effort — never judged for quality, which no
  // string check can do.
  failsWith(envelope({ responseReview: [review()[0], { ...review()[1], note: "ok" }] }), "uninformative-review-note", "a one-word review note");
  // A note that merely echoes a criterion is not a review OF THE RESPONSE.
  failsWith(
    envelope({ responseReview: [review()[0], { ...review()[1], note: rubric[0].label }] }),
    "uninformative-review-note",
    "a note that just repeats a rubric criterion"
  );

  // ---- 9. fabricated review excerpt -------------------------------------------------------------------
  failsWith(
    envelope({ responseReview: [{ ...review()[0], excerpt: "I would fire the entire front desk team" }, review()[1]] }),
    "review-fabricated-excerpt",
    "a review quotation found in neither response"
  );

  // ---- 10/11. wrong response attribution in the review --------------------------------------------------
  failsWith(
    envelope({ responseReview: [{ response: "initial", excerpt: "brief the front desk on Monday", note: "Reads as an implementation step." }, review()[1]] }),
    "review-wrong-response-attribution",
    "a follow-up excerpt labeled initial"
  );
  failsWith(
    envelope({ responseReview: [review()[0], { response: "follow-up", excerpt: "hold a small buffer of loyalty-tier suites", note: "Reads as the core recommendation." }] }),
    "review-wrong-response-attribution",
    "an initial excerpt labeled follow-up"
  );

  // ---- 12. reordered review entries normalize to initial-then-follow-up ----------------------------------
  const reorderedReview = passes(envelope({ responseReview: [review()[1], review()[0]] }), "a reordered but valid review");
  if (reorderedReview.ok) {
    assert.deepEqual(
      reorderedReview.review.map((r) => r.response),
      ["initial", "follow-up"],
      "review entries are normalized to initial-then-follow-up for display"
    );
    assert.equal(reorderedReview.review[0].excerpt, review()[0].excerpt, "the initial entry keeps its own excerpt after normalization");
    assert.equal(reorderedReview.review[1].note, review()[1].note, "the follow-up entry keeps its own note after normalization");
  }
  assert.equal(responseReviewLabel("initial"), "First response");
  assert.equal(responseReviewLabel("follow-up"), "Follow-up response");

  // ---- 19a. the model revision cannot satisfy proof of review ---------------------------------------------
  failsWith(
    envelope({ responseReview: [{ ...review()[0], excerpt: EXAMPLE_TEXT }, review()[1]] }),
    "review-fabricated-excerpt",
    "the coach's own example quoted as proof of review"
  );

  // ---- 20. missing or malformed responseReview ---------------------------------------------------------
  failsWith(envelope({ responseReview: undefined }), "review-not-an-array", "an absent responseReview");
  failsWith(envelope({ responseReview: "reviewed both" }), "review-not-an-array", "a string responseReview");
  failsWith(envelope({ responseReview: [null, review()[1]] }), "malformed-review", "a null review entry");
  failsWith(undefined, "not-an-object", "an undefined payload");
  failsWith("nope", "not-an-object", "a string payload");
  failsWith(complete(), "not-an-object", "a bare rubric array with no envelope");
  // Defensive: an unavailable result carries no evaluation and can never be validated into one.
  failsWith(envelope({ unavailable: true }), "unavailable-result", "an unavailable result");

  // ============ the alignment itself: honest feedback that used to be rejected ============

  // ---- 13. every criterion missing, both responses honestly reviewed --------------------------------
  const allMissing = rubric.map((r) => ({ rubricId: r.id, status: "missing", comment: `Not demonstrated: ${r.label.slice(0, 30)}.` }));
  const allMissingResult = passes(
    envelope({ rubricFeedback: allMissing }),
    "an all-missing rubric when both responses are honestly reviewed"
  );
  if (allMissingResult.ok) {
    assert.ok(allMissingResult.items.every((i) => i.status === "missing" && !i.evidence), "no evidence is synthesized for missing criteria");
    assert.equal(allMissingResult.review.length, 2, "proof of review still stands on its own");
  }

  // ---- 14. a valid but rubric-irrelevant follow-up ----------------------------------------------------
  const irrelevantCtx = { rubric, initialResponse: INITIAL, followUpResponse: IRRELEVANT_FOLLOW_UP };
  const irrelevantReview = [
    review()[0],
    { response: "follow-up", excerpt: "the downtown parking situation is difficult", note: "A real answer, but it does not address the recommendation or its results." }
  ];
  const initialOnlyEvidence = [
    { rubricId: "specific-recommendation", status: "met", evidence: [{ response: "initial", excerpt: "hold a small buffer of loyalty-tier suites" }], comment: "You named a concrete action." },
    { rubricId: "scenario-reasoning-pi", status: "met", evidence: [{ response: "initial", excerpt: "cannot take the room a member reserved" }], comment: "You tied it to the guest's loss." },
    { rubricId: "practical-implementation", status: "missing", comment: "No implementation detail appears in either response." },
    { rubricId: "effectiveness-measurement", status: "missing", comment: "No expected result or check appears in either response." }
  ];
  passes(
    { responseReview: irrelevantReview, rubricFeedback: initialOnlyEvidence },
    "an off-topic but honestly reviewed follow-up",
    irrelevantCtx
  );

  // ---- 18. criterion evidence from ONE response only ---------------------------------------------------
  passes(
    envelope({ rubricFeedback: initialOnlyEvidence }),
    "criterion evidence drawn only from the initial response, with both responses reviewed"
  );
  // The removed rule, stated as a negative: this must NOT fail merely for citing one response.
  const followOnly = complete().map((e) => ({ ...e, status: "partial", evidence: [{ response: "follow-up", excerpt: "brief the front desk on Monday" }] }));
  passes(envelope({ rubricFeedback: followOnly }), "criterion evidence drawn only from the follow-up response");

  // ============ rubric evidence rules — preserved from M7A ============

  // ---- 21. missing, duplicate, unknown rubric IDs -------------------------------------------------------
  failsWith(envelope({ rubricFeedback: complete().slice(0, 3) }), "wrong-item-count", "a missing rubric item");
  const dup = complete(); dup[3] = { ...dup[0] };
  failsWith(envelope({ rubricFeedback: dup }), "duplicate-rubric-id", "a duplicated rubric ID");
  const unknown = complete(); unknown[3] = { ...unknown[3], rubricId: "invented-criterion" };
  failsWith(envelope({ rubricFeedback: unknown }), "unknown-rubric-id", "an unknown rubric ID");
  const emptyComment = complete(); emptyComment[2] = { ...emptyComment[2], comment: "   " };
  failsWith(envelope({ rubricFeedback: emptyComment }), "empty-comment", "an empty comment");
  const badStatus = complete(); badStatus[2] = { ...badStatus[2], status: "excellent" };
  failsWith(envelope({ rubricFeedback: badStatus }), "invalid-status", "an unrecognized status");
  failsWith(envelope({ rubricFeedback: "nope" }), "rubric-not-an-array", "a non-array rubricFeedback");
  failsWith(envelope({ rubricFeedback: [] }), "wrong-item-count", "an empty rubric array");
  const badEvidenceShape = complete();
  badEvidenceShape[0] = { ...badEvidenceShape[0], evidence: [{ response: "sideways", excerpt: "x" }] } as never;
  failsWith(envelope({ rubricFeedback: badEvidenceShape }), "malformed-evidence", "an unknown evidence source");

  // ---- 15/16/17. met/partial need criterion evidence; missing does not -----------------------------------
  const metNoEvidence = complete();
  metNoEvidence[0] = { rubricId: "specific-recommendation", status: "met", evidence: [], comment: "Good." };
  failsWith(envelope({ rubricFeedback: metNoEvidence }), "missing-evidence", '"met" with no criterion evidence');
  const partialNoEvidence = complete();
  partialNoEvidence[2] = { rubricId: "practical-implementation", status: "partial", comment: "Some of it." } as never;
  failsWith(envelope({ rubricFeedback: partialNoEvidence }), "missing-evidence", '"partial" with no criterion evidence');
  const withMissing = complete();
  withMissing[2] = { rubricId: "practical-implementation", status: "missing", comment: "No implementation steps appear." } as never;
  passes(envelope({ rubricFeedback: withMissing }), '"missing" with no criterion evidence');

  // ---- fabricated / misattributed criterion evidence -------------------------------------------------------
  const fabricated = complete();
  fabricated[0] = { ...fabricated[0], evidence: [{ response: "initial", excerpt: "I would fire the entire front desk team" }] };
  failsWith(envelope({ rubricFeedback: fabricated }), "fabricated-excerpt", "a quotation found in neither response");
  const initialAsFollowUp = complete();
  initialAsFollowUp[0] = { ...initialAsFollowUp[0], evidence: [{ response: "follow-up", excerpt: "hold a small buffer of loyalty-tier suites" }] };
  failsWith(envelope({ rubricFeedback: initialAsFollowUp }), "wrong-response-attribution", "an initial-response excerpt labeled follow-up");
  const followUpAsInitial = complete();
  followUpAsInitial[3] = { ...followUpAsInitial[3], evidence: [{ response: "initial", excerpt: "repeat-booking rate for loyalty members" }] };
  failsWith(envelope({ rubricFeedback: followUpAsInitial }), "wrong-response-attribution", "a follow-up excerpt labeled initial");

  // ---- 19b. the model revision cannot satisfy criterion evidence ---------------------------------------------
  const exampleAsEvidence = complete();
  exampleAsEvidence[1] = { ...exampleAsEvidence[1], evidence: [{ response: "initial", excerpt: EXAMPLE_TEXT }] };
  failsWith(envelope({ rubricFeedback: exampleAsEvidence }), "fabricated-excerpt", "the coach's own example quoted as learner evidence");

  // ---- reordered valid feedback renders in AUTHORED order -------------------------------------------------
  const reordered = [complete()[3], complete()[1], complete()[0], complete()[2]];
  const reorderedResult = passes(envelope({ rubricFeedback: reordered }), "a reordered but valid rubric payload");
  if (reorderedResult.ok) {
    const rendered = orderByAuthoredRubric(reorderedResult.items, rubric);
    assert.deepEqual(rendered.map((r) => r.item.id), rubric.map((r) => r.id), "rendering follows the AUTHORED rubric order, not the payload order");
    assert.deepEqual(rendered.map((r) => r.item.label), rubric.map((r) => r.label), "each row carries the learner-facing label");
  }
  assert.equal(rubricStatusLabel("met"), "Covered");
  assert.equal(rubricStatusLabel("partial"), "Partly covered");
  assert.equal(rubricStatusLabel("missing"), "Not covered yet");

  // ============ production wiring ============
  const practice = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
  const coach = readFileSync("lib/side-coach.ts", "utf8");
  const validator = readFileSync("lib/authored-rubric-feedback.ts", "utf8");

  // The component uses the SAME validator this test imports — no second implementation anywhere.
  assert.ok(practice.includes("validateAuthoredRubricFeedback(data, {"), "the component passes the WHOLE coach response to the shared validator");
  assert.ok(!practice.includes("function rubricCoverageIsComplete"), "no mirrored validator remains in the component");
  assert.ok(!coach.includes("sanitizeRubricFeedback"), "no second partial validator remains on the server");
  assert.ok(!practice.includes("responseReview.filter") && !practice.includes("responseReview.find"), "the component does not re-derive or repair the review client-side");
  // The validator is pure: no React, browser, network, AI, DB, storage, mastery or progress import.
  for (const banned of ["react", "next/", "fetch(", "localStorage", "@/lib/prisma", "@/lib/ai-providers", "recordDrillMastery", "@/lib/spaced-review"]) {
    assert.ok(!validator.includes(banned), `the validator does not import or use ${banned}`);
  }
  const runtimeImports = validator.split("\n").filter((l) => /^\s*import\s+(?!type\b)/.test(l));
  assert.equal(runtimeImports.length, 0, "the validator has no runtime imports at all (type-only)");
  // The removed rule must not creep back in.
  assert.ok(
    !validator.includes('"initial-response-not-cited"') && !validator.includes('"follow-up-response-not-cited"'),
    "rubric evidence no longer has to cite both responses"
  );

  // ---- 20b. malformed review routes to the existing honest retry, never a partial render ---------------
  assert.ok(practice.includes("The coach's feedback didn't check out against what you wrote."), "invalid feedback produces an honest, retryable message");
  assert.ok(practice.includes("if (data.unavailable) throw"), "unavailable: true is still rejected before rendering");
  assert.ok(coach.includes("rubricFeedback?: unknown") && coach.includes("responseReview?: unknown"), "the server passes both structured fields through opaquely");
  // A failed retry must not leave a stale coaching card beside the error.
  const getFeedbackFn = practice.slice(practice.indexOf("const getFeedback = async"), practice.indexOf("// ---- Identify phase"));
  for (const cleared of ["setFeedback(null)", "setRubricVerdicts(null)", "setResponseReview(null)"]) {
    assert.ok(getFeedbackFn.includes(cleared), `a new attempt clears the previous result: ${cleared}`);
  }
  assert.ok(!/setRubricVerdicts\((?!null)/.test(getFeedbackFn.split("if (!verdict.ok)")[0]), "verdicts are never set before validation succeeds");
  assert.ok(practice.includes("setResponseReview(verdict.review)"), "the review shown is the validator's normalized output, not the raw payload");

  // ---- learner-facing rendering ------------------------------------------------------------------------
  assert.ok(practice.includes("Both responses reviewed"), "the review section is labeled for the learner");
  assert.ok(practice.includes("responseReviewLabel(r.response)"), "each reviewed response gets a learner-facing name, not a machine label");
  assert.ok(practice.includes("Example revision") && practice.includes("not your words"), "the model revision is labeled an example, never the learner's words");
  // The review must not be dressed up as criterion evidence.
  const reviewBlock = practice.slice(practice.indexOf("Both responses reviewed"), practice.indexOf("Every authored rubric item"));
  for (const banned of ["rubricStatusLabel", "Covered", "rubricId", "item.label"]) {
    assert.ok(!reviewBlock.includes(banned), `the review section shows no criterion verdict (${banned})`);
  }

  // ---- 22/23. Debate and role-play rooms are unaffected --------------------------------------------------
  assert.ok(coach.includes("if (input.rubricIds && input.rubricIds.length > 0)"), "the structured contract is gated on rubricIds, not on goals");
  const gated = coach.slice(coach.indexOf("if (input.rubricIds && input.rubricIds.length > 0)"));
  assert.ok(gated.includes("RESPONSE REVIEW:") && gated.includes("PER-ITEM VERDICTS:"), "both structured instructions sit INSIDE the authored-lesson gate");
  assert.equal(coach.split("RESPONSE REVIEW:").length - 1, 1, "the review instruction exists once, and only in the gated block");
  const arena = readFileSync("components/debate/debate-arena.tsx", "utf8");
  const room = readFileSync("components/rooms/roleplay-room.tsx", "utf8");
  for (const [name, src] of [["the Debate arena", arena], ["role-play rooms", room]] as const) {
    assert.ok(!src.includes("rubricIds"), `${name} sends no rubricIds — its contract is unchanged`);
    assert.ok(!src.includes("responseReview"), `${name} neither sends nor reads responseReview`);
  }
  const panel = readFileSync("components/debate/side-coach-panel.tsx", "utf8");
  assert.ok(!panel.includes("rubricFeedback") && !panel.includes("responseReview"), "the generic Side Coach panel is untouched by the structured contract");
  assert.ok(practice.includes("rubricIds: p.write.rubric.map((r) => r.id)"), "only the authored lesson opts in");

  // ---- 24/25/26. HOSA, M5 resume, M6 unavailable ----------------------------------------------------------
  assert.equal(hosa!.practiceStatus, "temporarily-unavailable", "HOSA practice remains withdrawn");
  assert.equal(hosa!.practice, undefined, "HOSA still has no practice or rubric");
  const unavailableFn = practice.slice(practice.indexOf("function PracticeUnavailable"), practice.indexOf("function PracticeStatusBar"));
  for (const banned of ["useState", "useEffect", "localStorage", "validateAuthoredRubricFeedback", "fetch("]) {
    assert.ok(!unavailableFn.includes(banned), `the HOSA unavailable branch mounts no ${banned}`);
  }
  const progress = readFileSync("lib/authored-lesson-progress.ts", "utf8");
  assert.ok(!progress.includes("rubricFeedback") && !progress.includes("responseReview"), "M5 local resume stores no AI feedback");
  assert.ok(!/^\s*feedback\s*:/m.test(progress), "M5 stored payload has no feedback field");
  assert.ok(!/^\s*rubric\w*\s*:/m.test(progress), "M5 stored payload has no rubric field");
  assert.ok(practice.includes("MIN_RESPONSE_WORDS = MIN_MEANINGFUL_RESPONSE_WORDS"), "the shared eight-word gate is unchanged");
  assert.ok(practice.includes("INITIAL RESPONSE:") && practice.includes("RESPONSE TO FOLLOW-UP:"), "both learner responses remain in the payload");
  // M6: an outage still yields an explicit, content-free unavailable result.
  assert.ok(coach.includes('return { message: "", unavailable: true, reason };'), "an unavailable result still carries no fabricated content");
  assert.ok(!coach.includes("sideCoachFallback"), "no fabricated fallback coaching has returned");
  assert.ok(panel.includes("isRenderableCoaching"), "the Debate panel still refuses to render a non-coaching result");

  // ---- write safety ------------------------------------------------------------------------------------
  for (const banned of ["recordDrillMastery", "@/lib/prisma", "@/lib/spaced-review", "completedAt", "MasteryProgress", "ballot"]) {
    assert.ok(!practice.includes(banned), `guided practice performs no ${banned} write`);
  }

  // ---- track isolation ----------------------------------------------------------------------------------
  assert.ok(!lessonText.includes("patient"), "the DECA lesson uses no HOSA vocabulary");
  assert.ok(!JSON.stringify(hosa).toLowerCase().includes("performance indicator"), "the HOSA lesson uses no DECA vocabulary");

  console.log(
    "DECA rubric smoke passed: the SAME production validator the component uses (no mirror) now checks BOTH a two-entry responseReview and the four stable-ID rubric verdicts. Proof that both submissions were read comes from responseReview alone — so an all-missing rubric, an off-topic follow-up, and criterion evidence drawn from one response all pass honestly, with no invented quotation. The review requires one exact, correctly attributed excerpt and one substantive note per response, and rejects missing/duplicate/unknown labels, empty excerpts or notes, criterion-echoing notes, fabricated or misattributed quotes, and the coach's own example; entries normalize to initial-then-follow-up. Rubric rules are unchanged: met/partial need criterion evidence, missing may not invent it, every ID appears exactly once, statuses and comments are checked, and rendering follows authored order. Any malformed payload routes to honest retry with the previous result cleared. Debate, role-play rooms, HOSA, M5 resume and M6 unavailable handling are all unaffected; no mastery, completion, score or weighting anywhere."
  );
}

main();
