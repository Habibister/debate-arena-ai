/**
 * M15 S6 — COACHED PERFORMANCE LEARNING MODEL.
 *
 * Run with: npm run coached-performance:smoke
 *
 * NO DATABASE, NO PROVIDER, NO ENV. `lib/education/coaching.ts` is pure and is exercised directly;
 * the side coach's prompt builders are pure functions and are called with a fake input; the coach
 * ADAPTER's post-filter is exercised against fake model output. The Prisma-backed routes and the live
 * debate engine are asserted on SOURCE, never imported. The lesson renderer is rendered through
 * react-dom/server exactly as the other education suites do.
 *
 * WHAT IT PROTECTS. The canonical model for a productive Debate skill —
 *   EXPLAIN → MODEL → SCAFFOLDED TRY → GUIDED DEBATE → FEEDBACK → REQUIRED RETRY
 *   → ADD NEXT SKILL → CUMULATIVE GUIDED DEBATE → FADE SUPPORT → INDEPENDENT COMPETE
 * — and the three hard rules under it: never test before teaching (fail closed), starters are
 * scaffolds not answers, and nothing guided is durable. Each control below is lettered to the
 * owner's charter (A–W) so a missing letter is visible.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as { React?: unknown }).React = React;
/* eslint-disable @typescript-eslint/no-var-requires */
const coaching = require("../lib/education/coaching");
const { buildSideCoachSystemPrompt, buildSideCoachUserPrompt, guidedConstraint } = require("../lib/side-coach");
const { ConceptEducationLessonView } = require("../components/lessons/concept-education-lesson-view");
const { EDUCATION_REGISTRY } = require("../lib/education/registry");
const { HELD_DEBATE_CATALOG_SLUGS, MIGRATED_DEBATE_PROVENANCE } = require("../lib/education/tracks/debate");
const { learnerPathForTrack } = require("../lib/learner-path");
// The REAL Debate transcript producer, so the guided regression below runs against the shape the
// route actually passes rather than a hand-built fixture that outlived it.
const { buildTranscriptBasedDebateJudge } = require("../lib/debate-judge-analysis");
const { RETIRED_TRACKS } = require("../lib/training-tracks");
const { debateDiagnosisLesson } = require("../lib/education/diagnosis");
const { LEARNING_SKILL_CATALOG } = require("../lib/learning-content");
const guidedJudge = require("../lib/education/guided-judge");
const { validateEducationRegistry } = require("../lib/education/validate");

const {
  DEBATE_COMPETENCIES, COMPETENCY_LESSON, SUPPORT_LEVELS, SUPPORT_POLICY, defaultSupportLevel,
  GUIDED_APPLICATIONS, guidedApplicationFor, unlockedCompetenciesFor, guidedRubricFor, isUnlocked,
  STARTER_CATEGORIES, starterCategoriesFor, isIncompleteScaffold, contextualStarter, SLOT,
  validateGuidedRequest, GUIDED_COACH_SAFETY_RULES, buildGuidedCoachPrompt, constrainGuidedResponse,
  evaluateRefutationScaffold
} = coaching;

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const decode = (h: string) =>
  h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, "&");
const render = (el: unknown) => decode(renderToStaticMarkup(el as never));
const visible = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let checks = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    // Every failure line names its control, so a J-charter failure cannot be mistaken for an A-W one.
    if (error instanceof Error) {
      // Node prints `stack`, which was captured with the original message — patch both.
      const prefixed = `[${name.split(".")[0]}] ${error.message}`;
      if (error.stack) error.stack = error.stack.replace(error.message, prefixed);
      error.message = prefixed;
    }
    throw error;
  }
  checks += 1;
  console.log(`  ok  ${name}`);
}
function assertOrder(html: string, left: string, right: string, label: string) {
  const l = html.indexOf(left); const r = html.indexOf(right);
  assert.ok(l >= 0, `${label}: anchor missing — "${left}"`);
  assert.ok(r >= 0, `${label}: anchor missing — "${right}"`);
  assert.ok(l < r, `${label}: "${left}" must come before "${right}"`);
}

const PILOT = "debate-refutation";
type Req = Parameters<typeof validateGuidedRequest>[0];
const baseRequest = (over: Partial<Req> = {}): Req => ({
  taskType: "EVALUATE", lessonId: PILOT, topic: "Schools should require uniforms",
  targetCompetency: "refutation", unlockedCompetencies: ["refutation", "claim-warrant-impact"],
  supportLevel: "HIGH_SUPPORT", learnerAttempt: "They say uniforms cut bullying, but ...", ...over
});

function main() {
  console.log("\ncoached-performance:smoke\n");

  const refutation = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === PILOT);
  assert.ok(refutation, "control: the pilot lesson is registered");
  const content = refutation.source.lesson.content;
  const html = render(React.createElement(ConceptEducationLessonView, {
    source: refutation.source, provenance: MIGRATED_DEBATE_PROVENANCE, moduleLabel: "Round strategy",
    next: null, practiceDrill: refutation.practiceDrill
  } as never));

  // ---- A-B. guided is a distinct mode; full Compete is independent ------------------------------
  check("A. guided mode is distinct from full Compete, and only a declared lesson can enter it", () => {
    assert.ok(guidedApplicationFor(PILOT), "the pilot declares a guided application");
    assert.equal(guidedApplicationFor("debate-weighing"), null, "an undeclared lesson has none");
    assert.equal(guidedRubricFor("not-a-lesson"), null, "an unknown id resolves to nothing");
    // The setup and arena pages resolve the same way, server-side, and pass nothing when it fails.
    const setup = stripComments(read("app/(app)/debate/page.tsx"));
    const arenaPage = stripComments(read("app/(app)/debate/[debateId]/page.tsx"));
    assert.ok(/guidedRubricFor\(guidedLessonId\)/.test(setup), "A2. the setup page resolves ?guided= against the curriculum");
    // A3. The arena page does NOT read the URL: it resolves the STORED round's lesson (practiceMode
    // LESSON + formatConfig.guidedLessonId) against the curriculum, fail-closed. See lib/guided-rounds.ts.
    assert.ok(/const rowLessonId = debate \? guidedLessonIdOf\(debate\) : null;/.test(arenaPage), "A3. the arena page reads guided-ness from the stored round");
    assert.ok(/rowLessonId && guidedRubricFor\(rowLessonId\)/.test(arenaPage), "A3b. and resolves that lesson against the curriculum, fail-closed");
    assert.ok(!/searchParams/.test(arenaPage), "A3c. the arena page reads no ?guided= parameter — the URL cannot make a round guided");
    assert.ok(/guided=\{guided\}/.test(arenaPage), "A4. and passes a typed config, or undefined");
    // No schema change: a guided round is marked on the row with the PRE-EXISTING PracticeMode value
    // LESSON (in the enum since the schema was written, set by no creator until now) plus the lesson
    // id in formatConfig. The enum is pinned exactly so a new value cannot slip in as "no migration".
    const practiceMode = /enum PracticeMode \{([\s\S]*?)\}/.exec(read("prisma/schema.prisma"));
    assert.ok(practiceMode, "A5a. control: the PracticeMode enum is locatable");
    assert.deepEqual(practiceMode![1].trim().split(/\s+/), ["DEBATE", "ROLEPLAY", "TEST", "LESSON"], "A5. PracticeMode is unchanged — LESSON pre-exists, nothing was added");
    const create = stripComments(read("app/api/debates/route.ts"));
    assert.ok(/practiceMode: guidedLessonId \? "LESSON" : input\.practiceMode/.test(create), "A5b. the create route marks a guided round LESSON server-side");
    assert.ok(/if \(!guidedRubricFor\(input\.guided\.lessonId\)\) \{\s*throw new HttpError\("That guided lesson is not recognised, so no round was created\.", 400\)/.test(create),
      "A5c. an unresolvable lesson creates NO round");
    assert.ok(/else if \(input\.practiceMode === "LESSON"\) \{\s*throw new HttpError\("A lesson round must name the lesson it belongs to\.", 400\)/.test(create),
      "A5d. a bare LESSON mode with no lesson is refused — every LESSON row names a recognised lesson");
    assert.ok(/\.\.\.\(guidedLessonId \? \{ guidedLessonId \} : \{\}\)/.test(create), "A5e. the lesson id is stored on the row's format config");
    const room = stripComments(read("components/debate/debate-room.tsx"));
    assert.ok(/practiceMode: guidedLessonId \? "LESSON" : "DEBATE"/.test(room) && /guided: \{ lessonId: guidedLessonId \}/.test(room), "A5f. the room creates a guided round as a LESSON round naming its lesson");
  });

  check("B. full Compete is INDEPENDENT — no starters, no unsolicited coaching, no retry prompt", () => {
    assert.equal(defaultSupportLevel("compete"), "INDEPENDENT");
    const policy = SUPPORT_POLICY.INDEPENDENT;
    assert.equal(policy.startersVisible, false); assert.equal(policy.startersOnRequest, false);
    assert.equal(policy.unsolicitedCoaching, false); assert.equal(policy.retryRequired, false);
    // A starter request at INDEPENDENT is refused before any prompt exists.
    const refused = validateGuidedRequest(baseRequest({ taskType: "STARTER", starterCategoryId: "refute", supportLevel: "INDEPENDENT" }));
    assert.deepEqual(refused, { ok: false, reason: "starters-disabled-at-level" });
    const coach = validateGuidedRequest(baseRequest({ taskType: "COACH", supportLevel: "INDEPENDENT" }));
    assert.deepEqual(coach, { ok: false, reason: "coaching-disabled-at-level" });
    // And an ordinary round carries no guided config at all: the arena branches on `guided` only.
    const arena = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(/const guidedRubric = guided \? guidedRubricFor\(guided\.lessonId\) : null;/.test(arena),
      "B2. the arena derives guided-ness from the prop alone, never from the debate record");
    assert.ok(/askOptionsOverride=\{guidedPolicy\?\.startersOnRequest \? guidedStarterOptions : undefined\}/.test(arena),
      "B3. starter categories are offered only when the level allows them");
  });

  // ---- C-D. the sequence: scaffolded try before guided debate; feedback before required retry --
  check("C. the scaffolded try renders after the teaching and the checks, and before the guided round", () => {
    assert.ok(content.scaffoldedTry, "control: the pilot authors a scaffolded try");
    assertOrder(html, 'id="common-mistakes"', 'id="practice"', "C1 teaching before checks");
    assertOrder(html, 'id="practice"', 'id="scaffolded-try"', "C2 checks before the constructed attempt");
    // The guided round is launched FROM the scaffolded try, and only after a complete attempt.
    const tryComponent = stripComments(read("components/coaching/scaffolded-try.tsx"));
    assert.ok(/\/debate\?track=debate&guided=\$\{encodeURIComponent\(lessonId\)\}/.test(tryComponent),
      "C3. the guided round link is built from the lesson id");
    assert.ok(/\{complete \? \(\s*<Link/.test(tryComponent), "C4. and is rendered only once the attempt is complete");
    assert.ok(/The guided round opens after a complete attempt here/.test(tryComponent), "C5. otherwise the learner is told why");
  });

  check("D. on an incomplete target move, feedback names one issue and a retry is REQUIRED", () => {
    const missingBecause = evaluateRefutationScaffold({
      theySay: "uniforms reduce bullying at school", but: "that is not what happens", because: "", therefore: "their argument fails on this"
    });
    assert.equal(missingBecause.complete, false); assert.equal(missingBecause.retryRequired, true);
    assert.equal(missingBecause.slot, "because");
    assert.ok(/because is where a refutation is won or lost/.test(missingBecause.coach), "the coaching names the move");
    // The delete test: a because that restates the but is not complete.
    const echo = evaluateRefutationScaffold({
      theySay: "uniforms reduce bullying at school", but: "the risk is overstated by them",
      because: "the risk is overstated and not as big as they claim", therefore: "their bullying harm is no longer established"
    });
    assert.equal(echo.complete, false); assert.equal(echo.slot, "because");
    assert.ok(/repeats the objection/.test(echo.coach));
    // Drifting home: a therefore about the learner's own case is not complete.
    const drift = evaluateRefutationScaffold({
      theySay: "uniforms reduce bullying at school", but: "the study they cite measured a different age group",
      because: "it surveyed primary pupils and this motion is about a secondary school", therefore: "our plan is better for the school"
    });
    assert.equal(drift.complete, false); assert.equal(drift.slot, "therefore");
    // A complete attempt passes and requires no retry.
    const good = evaluateRefutationScaffold({
      theySay: "uniforms reduce bullying at school", but: "the study they cite measured a different age group",
      because: "it surveyed primary pupils and this motion is about a secondary school",
      therefore: "their bullying claim is no longer established for the students this motion affects"
    });
    assert.equal(good.complete, true); assert.equal(good.retryRequired, false); assert.equal(good.coach, "");
    // The coach never writes the repaired sentence: no coaching string contains a full four-part answer.
    for (const e of [missingBecause, echo, drift]) {
      assert.ok(!/They say .* but .* because .* Therefore/.test(e.coach), "the coach does not supply the answer");
    }
    // And the component gates on it.
    const tryComponent = stripComments(read("components/coaching/scaffolded-try.tsx"));
    assert.ok(/const mustRetry = evaluation !== null && evaluation\.retryRequired;/.test(tryComponent), "D2. the component reads the retry flag");
    assert.ok(/Change that part and check again/.test(tryComponent), "D3. and tells the learner to retry the same move");
  });

  // ---- E-G. unlocked skills only; locked skills neither scored nor coached ---------------------
  check("E. a guided round unlocks exactly the lesson's declared skills and nothing else", () => {
    assert.deepEqual([...unlockedCompetenciesFor(PILOT)], ["refutation", "claim-warrant-impact"]);
    assert.deepEqual(unlockedCompetenciesFor("debate-weighing"), [], "an undeclared lesson unlocks nothing");
    assert.ok(isUnlocked(PILOT, "refutation") && isUnlocked(PILOT, "claim-warrant-impact"));
    for (const locked of ["clash", "signposting", "constructive-speech", "weighing"]) {
      assert.equal(isUnlocked(PILOT, locked), false, `${locked} is locked for the pilot`);
    }
  });

  check("F. locked skills are not scored: the rubric names them as excluded, and a request naming one is refused", () => {
    const rubric = guidedRubricFor(PILOT);
    assert.equal(rubric.primary, "refutation");
    assert.deepEqual([...rubric.reinforcement], ["claim-warrant-impact"]);
    assert.deepEqual([...rubric.locked].sort(), ["clash", "constructive-speech", "signposting", "weighing"]);
    assert.deepEqual(validateGuidedRequest(baseRequest({ targetCompetency: "weighing" })), { ok: false, reason: "target-not-unlocked" });
    assert.deepEqual(validateGuidedRequest(baseRequest({ unlockedCompetencies: ["refutation", "weighing"] })), { ok: false, reason: "claims-locked-competency" });
    assert.deepEqual(validateGuidedRequest(baseRequest({ lessonId: "debate-weighing" })), { ok: false, reason: "no-guided-application" });
    // A model response that scores a locked skill is REFUSED, not trimmed.
    const leaked = constrainGuidedResponse(baseRequest(), {
      newSkill: "Good refutation.", oneThingToFix: "Your weighing was missing — compare the impacts next time.", retryRequired: false
    });
    assert.equal((leaked as { unavailable?: boolean }).unavailable, true);
    assert.equal((leaked as { reason?: string }).reason, "feedback-names-locked-skill");
  });

  check("G. locked skills are not coached: the prompt forbids it and a reminder naming one is refused", () => {
    const { system } = buildGuidedCoachPrompt(baseRequest({ taskType: "COACH" }));
    assert.ok(/UNLOCKED SKILLS \(the only skills you may coach or evaluate\): Refutation, Claim, warrant and impact\./.test(system));
    for (const rule of GUIDED_COACH_SAFETY_RULES) assert.ok(system.includes(rule), `the prompt carries: ${rule}`);
    const bad = constrainGuidedResponse(baseRequest({ taskType: "COACH" }), { reminder: "Remember to signpost before you answer." });
    assert.equal((bad as { reason?: string }).reason, "reminder-names-locked-skill");
    const good = constrainGuidedResponse(baseRequest({ taskType: "COACH" }), { reminder: "Answer their reasoning, not only the conclusion." });
    assert.deepEqual(good, { taskType: "COACH", reminder: "Answer their reasoning, not only the conclusion." });
    // The side coach's own system prompt carries the same constraint in a guided round, and none otherwise.
    const guidedInput = { organization: "DEBATE", transcript: [], requestType: "turn-feedback", guided: { lessonId: PILOT, supportLevel: "HIGH_SUPPORT" } };
    const sys = buildSideCoachSystemPrompt(guidedInput);
    assert.ok(/LOCKED SKILLS \(never mention, score, or penalise\): Clash, Signposting, Constructive speech, Weighing\./.test(sys), "G2. the side coach is told what is locked");
    assert.ok(/CURRENT SKILL \(primary, coach this first\): Refutation\./.test(sys), "G3. and what is primary");
    assert.equal(guidedConstraint({ organization: "DEBATE", transcript: [], requestType: "ask" }), null, "G4. an ordinary round gets no constraint");
    assert.equal(guidedConstraint({ ...guidedInput, guided: { lessonId: "debate-weighing", supportLevel: "HIGH_SUPPORT" } }), null,
      "G5. an undeclared lesson gets no constraint — there is no half-guided state");
  });

  // ---- H-K. starters -----------------------------------------------------------------------------
  check("H. starter categories respect unlocked skills — a future skill's help never appears", () => {
    const ids = starterCategoriesFor(PILOT).map((c: { id: string }) => c.id);
    assert.deepEqual(ids, ["claim", "reason", "impact", "refute", "consequence"]);
    assert.ok(!ids.includes("transition") && !ids.includes("weigh"), "signposting and weighing help are hidden");
    assert.deepEqual(starterCategoriesFor("debate-weighing"), [], "an undeclared lesson shows no help");
    assert.ok(STARTER_CATEGORIES.some((c: { id: string }) => c.id === "weigh"), "control: weighing help exists and is simply locked");
    assert.deepEqual(validateGuidedRequest(baseRequest({ taskType: "STARTER", starterCategoryId: "weigh" })), { ok: false, reason: "starter-category-locked" });
  });

  check("I. a starter is an incomplete scaffold — every authored starter, and every model starter", () => {
    for (const frame of content.languageFrames) for (const starter of frame.starters) {
      assert.ok(isIncompleteScaffold(starter), `authored starter is a scaffold: ${starter}`);
      assert.ok(starter.includes(SLOT) || /(but|because|so|that)[,:]?$/i.test(starter), `it stops at a blank: ${starter}`);
    }
    assert.equal(isIncompleteScaffold("They argue that uniforms improve discipline, but research shows they do not change behaviour because students express themselves in other ways, so their argument fails."), false,
      "a finished rebuttal is not a scaffold");
    assert.equal(isIncompleteScaffold("They argue ___, but ___"), true);
    assert.equal(isIncompleteScaffold("The problem with that reasoning is"), false, "an unterminated fragment with no slot and no open connective is not a scaffold");
    assert.equal(isIncompleteScaffold("The problem with that reasoning is that"), true);
    const refused = constrainGuidedResponse(baseRequest({ taskType: "STARTER", starterCategoryId: "refute" }),
      { starter: "They argue uniforms cut bullying, but the study is small because it sampled one school, so it proves nothing." });
    assert.equal((refused as { reason?: string }).reason, "starter-is-not-a-scaffold");
    const ok = constrainGuidedResponse(baseRequest({ taskType: "STARTER", starterCategoryId: "refute" }), { starter: "They argue that uniforms cut bullying, but ___" });
    assert.deepEqual(ok, { taskType: "STARTER", starter: "They argue that uniforms cut bullying, but ___" });
  });

  // ---- I2. the LIVE path, not only the contract: the side coach's normaliser filters `example` ----
  check("I2. on the live side-coach path a guided example is a scaffold or is dropped, and a guided turn-feedback never rewrites the learner", () => {
    const src = stripComments(read("lib/side-coach.ts"));
    // The normaliser gates `example` through the scaffold rule in a guided round.
    assert.ok(/const rubric = resolvedGuidedRubric\(input\);\s*const guided = rubric !== null;/.test(src), "the normaliser resolves guided-ness once");
    assert.ok(/guided\s*\? \(rawExample && isIncompleteScaffold\(rawExample\) && !namesLockedSkill\(rawExample\) \? rawExample : undefined\)/.test(src),
      "a guided example survives only if it is a scaffold AND names no locked skill");
    // The filter is defined ABOVE the `ask` return, so both request types pass through it. An earlier
    // version filtered only turn-feedback, leaving the answer a learner reads in full unchecked.
    // Scoped to the normaliser: `if (input.requestType === "ask")` also appears in the prompt builder
    // earlier in the file, and a whole-file indexOf would compare against that one instead.
    const normalizeBody = src.slice(src.indexOf("function normalize("));
    assert.ok(normalizeBody.indexOf("const clean = (text: unknown)") < normalizeBody.indexOf('if (input.requestType === "ask")'),
      "every learner-facing field of BOTH request types is filtered");
    assert.ok(/const message = guided \? clean\(rawMessage\) \?\? "" : rawMessage;/.test(src), "the message a learner reads is filtered too");
    assert.ok(/return guided && example \? \{ message, example \} : \{ message \};/.test(src),
      "a guided starter ask returns its scaffold; an ordinary ask is unchanged");
    assert.ok(!/example: parsed\.example,/.test(src), "the turn-feedback return uses the FILTERED example, never the raw one");
    // The guided prompts forbid the rewrite that the ordinary prompt asks for.
    const g = { organization: "DEBATE", transcript: [], requestType: "turn-feedback", latestStudentSpeech: "x", guided: { lessonId: PILOT, supportLevel: "HIGH_SUPPORT" } };
    assert.ok(/"example": ""/.test(buildSideCoachSystemPrompt(g)), "guided turn-feedback JSON demands an empty example");
    assert.ok(/Leave `example` empty/.test(buildSideCoachUserPrompt(g)), "and the user prompt says not to rewrite");
    assert.ok(/improved rewrite/.test(buildSideCoachUserPrompt({ ...g, guided: undefined })), "control: the ordinary round still asks for one");
    // Debate-only: a DECA request carrying a guided block is an ordinary request.
    assert.equal(guidedConstraint({ ...g, organization: "DECA" }), null, "a non-Debate organisation gets no guided constraint");
  });

  check("J. topic context may be instantiated into a starter — and it still stops at the blank", () => {
    const starter = content.languageFrames[0].starters[0];
    assert.ok(starter.includes("{their claim}"), "control: the frame carries a topic placeholder");
    const t = contextualStarter(starter, { opponentClaim: "school uniforms improve discipline" });
    assert.equal(t, "They argue that school uniforms improve discipline, but ___");
    assert.ok(t.includes(SLOT), "the blank survives substitution");
    assert.equal(contextualStarter(starter, {}), "They argue that ___, but ___", "an unsubstituted placeholder becomes a blank, never a leaked token");
    assert.equal(contextualStarter("Their {their claim} argument fails because the data is old, so it proves nothing at all.", { opponentClaim: "x" }), null,
      "a starter that would read as an answer after substitution is not shown");
  });

  check("K. substantive reasoning stays learner-owned — the frame supplies structure, every slot is theirs", () => {
    const t = content.scaffoldedTry;
    assert.equal(t.frame, "They say ___, but ___ because ___. Therefore ___.");
    assert.deepEqual([...t.slots], ["they say", "but", "because", "therefore"]);
    assert.equal((t.frame.match(/___/g) ?? []).length, 4, "four blanks, four moves");
    // The prompt does NOT pre-fill the objection: it states the situation and tells the learner to pick.
    assert.ok(/fill every blank yourself/.test(t.prompt), "the learner is told the substance is theirs");
    assert.ok(!/They say [^_]{10,}, but [^_]{10,} because/.test(t.prompt), "no worked objection is smuggled into the prompt");
    // The evaluator never fills a slot, and the component never fetches a completion.
    const tryComponent = stripComments(read("components/coaching/scaffolded-try.tsx"));
    for (const banned of ["fetch(", "/api/", "localStorage", "sessionStorage", "document.cookie"]) {
      assert.ok(!tryComponent.includes(banned), `the scaffolded try is inert beyond the page (${banned})`);
    }
    assert.ok(/Nothing you write here is saved, scored, or recorded/.test(tryComponent), "and says so to the learner");
  });

  // ---- L-M. support levels ------------------------------------------------------------------------
  check("L. four support levels exist, with fading structurally ready and no faked adaptivity", () => {
    assert.deepEqual([...SUPPORT_LEVELS], ["HIGH_SUPPORT", "MEDIUM_SUPPORT", "LOW_SUPPORT", "INDEPENDENT"]);
    assert.equal(defaultSupportLevel("guided"), "HIGH_SUPPORT", "first use is high support");
    assert.equal(defaultSupportLevel("guided", 0), "HIGH_SUPPORT");
    assert.equal(defaultSupportLevel("guided", 1), "MEDIUM_SUPPORT");
    assert.equal(defaultSupportLevel("guided", 2), "LOW_SUPPORT");
    assert.equal(defaultSupportLevel("compete", 99), "INDEPENDENT", "compete is independent whatever the history");
    // The pilot passes NO history, so it gets the fixed level: nothing pretends to know prior uses.
    for (const file of ["app/(app)/debate/page.tsx", "app/(app)/debate/[debateId]/page.tsx"]) {
      assert.ok(/defaultSupportLevel\("guided"\)/.test(stripComments(read(file))), `${file} uses the deterministic pilot level`);
      assert.ok(!/defaultSupportLevel\("guided", /.test(stripComments(read(file))), `${file} passes no invented prior-use count`);
    }
  });

  check("M. INDEPENDENT gives no unsolicited help, and HIGH shows starters without being asked", () => {
    assert.equal(SUPPORT_POLICY.HIGH_SUPPORT.startersVisible, true);
    assert.equal(SUPPORT_POLICY.MEDIUM_SUPPORT.startersVisible, false);
    assert.equal(SUPPORT_POLICY.MEDIUM_SUPPORT.startersOnRequest, true);
    assert.equal(SUPPORT_POLICY.LOW_SUPPORT.unsolicitedCoaching, false);
    assert.equal(SUPPORT_POLICY.INDEPENDENT.startersOnRequest, false);
    const sys = buildSideCoachSystemPrompt({ organization: "DEBATE", transcript: [], requestType: "ask", guided: { lessonId: PILOT, supportLevel: "LOW_SUPPORT" } });
    assert.ok(/Do not volunteer reminders; answer only what is asked/.test(sys), "at LOW the coach is told not to volunteer");
  });

  // ---- N-O. cumulative and primary -----------------------------------------------------------------
  check("N. cumulative: prior unlocked skills are included as reinforcement", () => {
    const rubric = guidedRubricFor(PILOT);
    assert.ok(rubric.reinforcement.includes("claim-warrant-impact"), "CWI is reinforced in the Refutation round");
    const { system } = buildGuidedCoachPrompt(baseRequest());
    assert.ok(/Claim, warrant and impact/.test(system), "the prompt names the reinforcement skill");
    // A reinforcement note on a prior skill is accepted by the post-filter.
    const r = constrainGuidedResponse(baseRequest(), { newSkill: "You named the step.", priorSkill: "Your claim was clear.", oneThingToFix: "Give the reason it fails.", retryRequired: true });
    assert.equal((r as { priorSkill?: string }).priorSkill, "Your claim was clear.");
  });

  check("O. the current lesson's skill is marked primary, everywhere it is named", () => {
    assert.equal(guidedRubricFor(PILOT).primary, "refutation");
    assert.equal(COMPETENCY_LESSON.refutation, PILOT, "the competency maps back to the lesson that teaches it");
    const { system } = buildGuidedCoachPrompt(baseRequest());
    assert.ok(/CURRENT SKILL \(primary\): Refutation\./.test(system));
    const setup = read("app/(app)/debate/page.tsx");
    assert.ok(/This round is for <span className="font-semibold">\{COMPETENCY_LABELS\[guidedRubric\.primary\]\}<\/span>/.test(setup), "the learner is told which skill the round is for");
    // The feedback shape is small and ordered: new skill, prior skill, one thing to fix, next action.
    const r = constrainGuidedResponse(baseRequest(), { newSkill: "a", priorSkill: "b", oneThingToFix: "c", retryRequired: true }) as Record<string, unknown>;
    assert.deepEqual(Object.keys(r), ["taskType", "newSkill", "priorSkill", "oneThingToFix", "retryRequired", "nextAction"]);
    assert.equal(r.nextAction, "retry");
  });

  // ---- P-Q. non-durable, and the hold ---------------------------------------------------------------
  // The Learn-side halves write nothing at all. The GUIDED ROUND is the different case and is proved
  // separately in JH-JK: it is stored — a real round, a real transcript, a real ballot — but it moves
  // no part of the learner's record. The copy on both surfaces has to draw that line in the learner's
  // own words, which is what P3 checks. An earlier version of this control asserted the opposite
  // split (judge unconstrained, round earns XP); that was true when it was written and is false now.
  check("P. the scaffolded try and the coach write nothing durable, and the guided copy tells the truth", () => {
    const coachingSrc = stripComments(read("lib/education/coaching.ts"));
    for (const banned of ["prisma", "@prisma/client", "fetch(", "process.env", "masteryProgress", "recordDrillMastery", "recordPracticeOutcome", "spaced-review", "localStorage"]) {
      assert.ok(!coachingSrc.includes(banned), `lib/education/coaching.ts stays pure (${banned})`);
    }
    const tryComponent = stripComments(read("components/coaching/scaffolded-try.tsx"));
    for (const banned of ["masteryProgress", "recordDrillMastery", "spaced-review", "awardXp", "xpLog"]) {
      assert.ok(!tryComponent.includes(banned), `the scaffolded try writes nothing durable (${banned})`);
    }
    // XP as a WORD, not as a substring — "explain" and "expected" contain it and mean nothing here.
    assert.ok(!/\bXP\b|\bxp\b/.test(tryComponent), "the scaffolded try awards no XP");
    // The coach route's only write is the pre-existing assisted-practice flag; nothing about mastery.
    const route = stripComments(read("app/api/ai/side-coach/route.ts"));
    assert.ok(!/masteryProgress|recordDrillMastery|skillReviewSchedule/.test(route), "the coach route writes no mastery or review");
    // P3. Both guided surfaces say the same two things: the judge is limited to the taught skills,
    // and the round is SAVED while the record does not move. Asserted as flat text so a rewrite that
    // drops half the sentence fails here.
    for (const file of ["app/(app)/debate/page.tsx", "components/debate/debate-arena.tsx"]) {
      const flat = read(file).replace(/\n\s*/g, " ");
      assert.ok(/and so does the judge/.test(flat), `P3. ${file} tells the learner the judge is limited too`);
      assert.ok(/The round is saved to\s+your practice history/.test(flat), `P3. ${file} says the round is saved`);
      assert.ok(/earns\s+no XP, changes no rank, and does not count toward mastery\s+or your average score/.test(flat),
        `P3. ${file} says exactly what does not move`);
      // P4. No claim that a stored round is nothing, and no leftover promise of XP.
      assert.ok(!/nothing here is recorded|nothing from a guided round is recorded|non-durable/.test(flat),
        `P4. ${file} does not call a stored round "nothing"`);
      assert.ok(!/earns\s+XP like any other|counts as a completed practice round and earns/.test(flat),
        `P4. ${file} carries no leftover XP promise`);
    }
    // P5. The guided round writes no whole-round score column, because two aggregate readers average
    // that column across every judged round and a six-category ballot is not the same measurement.
    const judge = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    const guidedBranch = judge.slice(judge.indexOf("if (guidedRubric && guidedLessonId) {"), judge.indexOf("const result = fullResult;"));
    assert.ok(!/overallScore:/.test(guidedBranch), "P5. no overallScore column write in a guided round");
    assert.ok(/_avg: \{ overallScore: true \}/.test(read("app/(app)/dashboard/page.tsx")), "P5. control: the dashboard really does average that column");
    assert.ok(/\.map\(\(d\) => d\.overallScore\)/.test(read("lib/coach-progress.ts")), "P5. control: the coach view really does average that column");
    assert.ok(/overallScore \?\? report\.overallScore/.test(read("components/debate/debate-arena.tsx")),
      "P5. and the arena still shows the guided ballot score, from the report");
  });

  check("Q. debate-rebuttal mastery remains HELD, and the pilot does not touch the hold", () => {
    const { debateMasteryHeld, DEBATE_DRILL_HELD_IDS } = require("../lib/debate-drills");
    assert.equal(debateMasteryHeld("debate-rebuttal"), true);
    // 22 rebuttal + the 2 Signposting items contained on 2026-09-06. Split, so a later change to one
    // containment cannot be absorbed by the other.
    assert.equal(DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("rb-")).length, 22, "22 rebuttal items still quarantined");
    assert.equal(DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("sp-")).length, 2, "and the two untaught Signposting items");
    assert.ok(!/DEBATE_MASTERY_HELD_SKILLS|DEBATE_DRILL_HELD_IDS|debateMasteryHeld/.test(read("lib/education/coaching.ts")),
      "the coaching module neither reads nor edits the hold — it has no opinion on mastery");
  });

  // ---- R-T. architecture invariants preserved ---------------------------------------------------
  check("R. a held lesson cannot enter the unlock set", () => {
    const registered = new Set(EDUCATION_REGISTRY.lessons.map((e: { id: string }) => e.id));
    const learnerVisible = new Set(EDUCATION_REGISTRY.lessons.filter((e: { visibility: string }) => e.visibility === "learner").map((e: { id: string }) => e.id));
    for (const application of GUIDED_APPLICATIONS) {
      assert.ok(learnerVisible.has(application.lessonId), `${application.lessonId} is learner-visible`);
      for (const competency of [application.primary, ...application.reinforcement]) {
        const lesson = COMPETENCY_LESSON[competency];
        assert.ok(registered.has(lesson) && learnerVisible.has(lesson), `${competency} is taught by a published lesson (${lesson})`);
        assert.ok(!HELD_DEBATE_CATALOG_SLUGS.includes(lesson), `${lesson} is not a held lesson`);
      }
    }
    for (const held of HELD_DEBATE_CATALOG_SLUGS) {
      assert.equal(guidedApplicationFor(held), null, `held lesson ${held} declares no guided application`);
      assert.ok(!Object.values(COMPETENCY_LESSON).includes(held), `no competency is taught by held lesson ${held}`);
    }
    assert.ok(HELD_DEBATE_CATALOG_SLUGS.length >= 4, "control: the held set is real");
  });

  check("S. Learn + Compete primary architecture is unchanged", () => {
    const debate = learnerPathForTrack("GENERAL_DEBATE");
    assert.deepEqual(debate.map((s: { id: string }) => s.id), ["learn", "compete"]);
    assert.equal(debate[0].href, "/lessons?track=debate");
    assert.equal(debate[1].href, "/debate?track=debate");
    // The guided round is launched from Learn (the lesson), not from a new top-level category.
    const shell = read("components/app/app-shell.tsx");
    assert.ok(!/label: "Guided"|label: "Practice"|label: "Apply"/.test(shell), "no new top-level category");
  });

  check("T. full Compete diagnosis still returns to the canonical Learn lesson", () => {
    for (const slug of ["debate-refutation-lesson", "debate-weighing-lesson", "debate-constructive-speeches-lesson"]) {
      const d = debateDiagnosisLesson(slug);
      assert.ok(d && d.href.startsWith("/lessons/"), `${slug} still resolves to a lesson`);
    }
    const arena = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(/if \(guided\) return null;/.test(arena) && /debateDiagnosisLesson\(lesson\.lessonSlug\)/.test(arena),
      "the diagnosis return is kept for full Compete and replaced by the lesson retry in a guided round");
    assert.ok(/Retry the move in the lesson/.test(arena), "T2. a guided round returns to the lesson's own move");
    assert.ok(/#scaffolded-try/.test(arena), "T3. straight to the scaffolded try");
  });

  // ---- U-W. other tracks -------------------------------------------------------------------------
  check("U. DECA is unchanged by the coached model", () => {
    assert.deepEqual(learnerPathForTrack("DECA").map((s: { id: string }) => s.id), ["learn", "practice", "apply", "compete"]);
    for (const file of ["components/lessons/roleplay-lesson-view.tsx", "components/lessons/roleplay-lesson-practice.tsx", "lib/roleplay-lessons.ts", "lib/deca-drills.ts"]) {
      const src = read(file);
      assert.ok(!/lib\/education\/coaching|ScaffoldedTry|languageFrames|scaffoldedTry/.test(src), `${file} takes no dependency on the coached model`);
    }
    for (const c of DEBATE_COMPETENCIES) assert.ok(c.startsWith("claim") || /^(refutation|clash|signposting|constructive-speech|weighing)$/.test(c), "competencies are Debate's");
  });

  check("V. HOSA is unchanged by the coached model", () => {
    assert.deepEqual(learnerPathForTrack("HOSA").map((s: { id: string }) => s.id), ["learn", "practice", "apply", "compete"]);
    for (const file of ["lib/hosa-medterm.ts", "components/training/hosa-medterm-engine.tsx", "components/training/hosa-event-prep.tsx"]) {
      assert.ok(!/lib\/education\/coaching|ScaffoldedTry/.test(read(file)), `${file} takes no dependency on the coached model`);
    }
  });

  check("W. Model UN remains retired residue — no journey, no guided application, no starters", () => {
    assert.ok(RETIRED_TRACKS.includes("MODEL_UN"));
    assert.deepEqual(learnerPathForTrack("MODEL_UN"), []);
    assert.ok(!GUIDED_APPLICATIONS.some((a: { lessonId: string }) => /mun|model-un/i.test(a.lessonId)));
    assert.ok(!/MODEL_UN|Model UN/.test(read("lib/education/coaching.ts")), "the coaching module names no MUN concept");
  });

  // ---- pilot content: the model is present in the lesson itself -----------------------------------
  check("X. the Refutation pilot carries the full model: explain, model, frames, scaffolded try, guided link", () => {
    assert.ok(content.teachingSections.length >= 4 && content.misconception && content.commonMistakes.length >= 3, "EXPLAIN");
    assert.ok(content.workedExample && content.revisionLadder.length >= 2, "MODEL — weak, diagnosis, repair");
    assert.equal(content.languageFrames.length, 3, "three frame purposes");
    const questions = 1 + content.practiceQuestions.length + content.masteryCheck.length;
    assert.equal(questions, 3, "knowledge checks stay secondary: three, not five");
    const text = visible(html);
    assert.ok(text.includes("Words you can use") && text.includes("Now try the move"), "both new sections render");
    assertOrder(html, 'id="language"', 'id="practice"', "frames are teaching and precede the checks");
    assertOrder(html, 'id="scaffolded-try"', 'id="practice-drill"', "the constructed attempt precedes the drill CTA");
    // Lessons migrate one at a time: the pilot, then Clash. An exact set, so a third lesson adopting
    // the model is a reviewed decision recorded here, never absorbed silently.
    const withFrames = EDUCATION_REGISTRY.lessons.filter((e: { source?: { lesson?: { content?: { languageFrames?: unknown } } } }) =>
      e.source?.lesson?.content?.languageFrames).map((e: { id: string }) => e.id).sort();
    // Weighing joined 2026-09-07. Its frames were authored for one reason only: the round judge that
    // scored this competency counted comparison vocabulary, and was withdrawn for scoring the
    // lesson's own model answer at the floor. Frames here expose the SHAPE of a comparison and are
    // taught as optional, with the lesson stating that filling the blanks does not make what goes in
    // them true. A fourth lesson adopting the model is a reviewed decision recorded here.
    assert.deepEqual(withFrames, ["debate-clash", "debate-weighing", PILOT].sort(),
      "exactly three lessons carry the coached model: Refutation, Clash and Weighing");
    assert.equal(LEARNING_SKILL_CATALOG.filter((e: { lesson: { content: { scaffoldedTry?: unknown } } }) => e.lesson.content.scaffoldedTry).length, 9,
      "nine lessons carry a scaffolded try: the Refutation pilot, Clash, Round Orientation's tracking scenario, Evidence Evaluation's bounding scenario, Answer Types' classification scenario, Turn Mechanics' move scenario, Signposting's level-and-label scenario, and Constructive's case-planning scenario");
  });

  // ================================================================================================
  // GUIDED JUDGE — the second acceptance charter. Letters restart at A per the owner's §16 list; each
  // is prefixed "J" so the two charters cannot be confused in a failure line.
  // ================================================================================================
  const { JUDGE_CATEGORY_COMPETENCY, allowedJudgeCategories, projectGuidedJudgeResult, guidedFeedbackFrom,
          guidedJudgeProseInstruction, GUIDED_RETRY_THRESHOLD } = guidedJudge;
  const rubric = guidedRubricFor(PILOT);
  /** A FULL lexical judge result — every category the local judge emits, all six rating skills, the works. */
  const FULL_RESULT = {
    overallScore: 71,
    categoryScores: [
      { key: "argument", label: "Argument", score: 80, reason: "A clear claim was stated." },
      { key: "warrant", label: "Warrant", score: 74, reason: "The warrant connected claim to conclusion." },
      { key: "mechanism", label: "Mechanism", score: 70, reason: "A mechanism was named." },
      { key: "impact", label: "Impact", score: 66, reason: "The impact was stated." },
      { key: "refutation", label: "Refutation", score: 58, reason: "The answer named the step but the because restated the objection." },
      { key: "responsiveness", label: "Responsiveness", score: 64, reason: "The response engaged their reasoning directly." },
      { key: "centralClashResponse", label: "Central clash", score: 40, reason: "The central point of disagreement was not engaged." },
      { key: "clash", label: "Weighing", score: 20, reason: "Weighing was missing or only verbal." },
      { key: "contentEvidence", label: "Evidence", score: 55, reason: "Little evidence was offered." },
      { key: "collapse", label: "Collapse", score: 30, reason: "No collapse onto the winning issue." },
      { key: "organization", label: "Organization", score: 35, reason: "Signposting was absent." },
      { key: "delivery", label: "Style", score: 60, reason: "Delivery was steady." },
      { key: "motionConnection", label: "Motion", score: 80, reason: "Stayed on the motion." },
      { key: "sideFidelity", label: "Side", score: 90, reason: "Argued the assigned side." },
      { key: "emptyJargon", label: "Jargon", score: 70, reason: "Little empty jargon." },
      { key: "ruleCompliance", label: "Rules", score: 85, reason: "Rules followed." }
    ],
    strengths: ["[Refutation] You named the step their argument rests on.", "[Weighing] Good attempt to outweigh."],
    weaknesses: ["[Refutation] Your because repeated the objection.", "You dropped their second argument and never weighed the impacts."],
    improvementAdvice: ["Explain why the step fails, not that it fails.", "Signpost each response and compare the impacts on magnitude."],
    recommendedLessons: [
      { lessonSlug: "debate-refutation-lesson", reason: "Build direct refutation.", priority: "high" },
      { lessonSlug: "debate-weighing-lesson", reason: "Practice comparing impacts.", priority: "medium" },
      { lessonSlug: "debate-signposting-lesson", reason: "Strengthen organization.", priority: "high" },
      { lessonSlug: "debate-claim-warrant-impact-lesson", reason: "Connect claims, warrants, and impacts.", priority: "medium" }
    ],
    teamWinner: "OPPOSITION", readinessForNextLevel: { ready: false, rationale: "x", nextMilestone: "y" },
    judgeFairnessReport: { weighingCheck: "Weighing was missing.", droppedArguments: "You dropped an argument.", centralClash: "x", motionConnection: "x", mechanismCheck: "x", betterVersion: "x", fairWinnerLogic: "x", emptyPhraseWarning: null },
    ratingChange: { overall: 12, weighing: -6 },
    aiProvider: "fallback"
  };
  const projected = projectGuidedJudgeResult(FULL_RESULT, rubric, PILOT);
  // Everything the learner can READ — the marker block is excluded on purpose: it is the one place a
  // locked competency's NAME must appear, because every consumer branches on it, and JB below pins
  // that it is the only place.
  const { guided: projectedMarker, ...projectedBallot } = projected;
  const projectedText = JSON.stringify(projectedBallot).toLowerCase();

  check("JA. the guided Refutation judge accepts only Refutation + CWI categories", () => {
    assert.deepEqual([...allowedJudgeCategories(rubric)].sort(),
      ["argument", "impact", "mechanism", "refutation", "responsiveness", "warrant"]);
    assert.deepEqual(projected.categoryScores.map((c: { key: string }) => c.key).sort(),
      ["argument", "impact", "mechanism", "refutation", "responsiveness", "warrant"]);
    assert.deepEqual(projected.guided, { lessonId: PILOT, primary: "refutation", reinforcement: ["claim-warrant-impact"], locked: ["clash", "signposting", "constructive-speech", "weighing"] });
  });

  check("JB. Weighing cannot enter the guided rubric — the category, the card, the prose, the delta", () => {
    // Was: the lexical 'clash' category IS weighing. That MAPPING was withdrawn on 2026-09-07 along
    // with the category itself — it scored the Weighing lesson's own model answer at the floor and
    // lens words at the ceiling. So the control inverts: nothing maps to weighing at all now, which
    // is a stronger guarantee that a locked skill cannot reach a guided ballot through it.
    assert.equal(JUDGE_CATEGORY_COMPETENCY.clash, undefined, "control: no judge category maps to weighing any more");
    assert.equal(Object.values(JUDGE_CATEGORY_COMPETENCY).includes("weighing"), false,
      "and no other key quietly took its place");
    assert.ok(!projected.categoryScores.some((c: { key: string }) => c.key === "clash"), "the weighing category is removed");
    assert.ok(!("judgeFairnessReport" in projected) && !("ratingChange" in projected), "no fairness report, no rating block");
    assert.ok(!/weigh|outweigh/.test(projectedText), "no surviving text names weighing anywhere in the readable ballot");
    assert.deepEqual(projectedMarker.locked, ["clash", "signposting", "constructive-speech", "weighing"],
      "the marker is the only carrier of locked names, and it names them so consumers can gate");
  });

  check("JC. dropped arguments cannot enter the guided rubric", () => {
    assert.ok(!/dropped/.test(projectedText), "no dropped-argument prose survives");
    assert.ok(!projected.categoryScores.some((c: { key: string }) => c.key === "collapse"), "speech-strategy categories are removed");
  });

  check("JD. a locked skill cannot create a ballot card — the projected report has no fields to render one from", () => {
    for (const field of ["judgeFairnessReport", "ratingChange", "readinessForNextLevel", "teamWinner", "transcriptFeedback", "roundDecidingClash", "speakerScores"]) {
      assert.ok(!(field in projected), `${field} is absent from a projected guided ballot`);
    }
    // And the modal branches on the marker for every full-round section, so even a stray field could not render.
    const arena = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(/\{showFullRubric && !report\.guided \? \(/.test(arena), "the full-rubric section is gated on !guided");
    assert.ok(/\{report\.ratingChange && !report\.guided \? \(/.test(arena), "the rating block is gated on !guided");
    assert.ok(/\{report\.readinessForNextLevel && !report\.guided \? \(/.test(arena), "the readiness card is gated on presence AND !guided");
    // The heading is now "Guided practice complete" — it leads with what the learner DID rather than
    // with what the judge could not do. Guided work was never independent performance evidence, so
    // the no-score status is explained underneath instead of becoming the headline.
    assert.ok(/report\.guided \? \([\s\S]{0,300}Guided practice complete/.test(arena),
      "a guided ballot is headed as guided practice, not a won round");
    assert.ok(/This coached round was recorded for review\. No performance score or winner was produced\./.test(arena),
      "and an unscored guided round says so under the heading");
    assert.ok(!/Guided exercise completed/.test(arena), "the superseded heading is gone rather than duplicated");
  });

  check("JD2. a guided round consumes the REAL producer shape, which is unscored", () => {
    // THE FIXTURE GAP THIS CLOSES. Every guided assertion above runs on a hand-built FULL_RESULT that
    // still carries categoryScores. The Debate transcript producer stopped supplying them on
    // 2026-09-07, so those assertions were exercising a shape that no longer exists — and both
    // reachable guided rounds threw a TypeError at judging while the suite stayed green. This check
    // builds the ballot from the ACTUAL producer and projects it, so the guided path is regressed
    // against reality rather than against a fiction.
    const real = buildTranscriptBasedDebateJudge({
      organization: "DEBATE", eventType: "PARLIAMENTARY_DEBATE", level: "INTERMEDIATE",
      topic: "Schools should require AI literacy.", studentSide: "GOVERNMENT",
      transcript: [
        { role: "AFFIRMATIVE", round: 1, content: "Schools should require AI literacy, because a student taught to check a machine answer against its source stops treating it as settled." },
        { role: "NEGATIVE", round: 1, content: "It takes class time from subjects that already have too little." }
      ]
    }) as Record<string, unknown>;
    assert.equal(real.semanticScoring, "unavailable", "JD2. the real producer reports semantic scoring unavailable");
    assert.equal(real.categoryScores, undefined, "JD2b. and supplies no categoryScores — the shape the old fixture faked");
    assert.equal(real.overallScore, undefined, "JD2c. and no overall");

    for (const app of GUIDED_APPLICATIONS) {
      const rubric = { primary: app.primary, reinforcement: app.reinforcement ?? [], locked: app.locked ?? [] };
      // Must not throw. This is the exact call that produced a 500 for every guided learner.
      const ballot = projectGuidedJudgeResult(real as never, rubric as never, app.lessonId) as Record<string, unknown>;
      assert.equal(ballot.semanticScoring, "unavailable", `JD2d. ${app.lessonId} projects an unscored guided result`);
      for (const field of ["overallScore", "categoryScores", "teamWinner", "losingSide", "readinessForNextLevel", "ratingChange"]) {
        assert.equal(ballot[field], undefined, `JD2e. ${app.lessonId}: ${field} is absent, not synthesised`);
      }
      const feedback = ballot.guidedFeedback as { newSkill: string; oneThingToFix: string; retryRequired: boolean };
      assert.ok(feedback && feedback.newSkill.length > 0, `JD2f. ${app.lessonId} still gives lesson-owned coaching`);
      assert.equal(feedback.retryRequired, false, `JD2g. ${app.lessonId} demands no retry — a demand would be a verdict`);
      assert.ok(!/scored \d|ballot score|you (?:failed|did not)/i.test(JSON.stringify(ballot)),
        `JD2h. ${app.lessonId} claims no score and no failure anywhere on the ballot`);
    }
  });

  check("JD3. the unscored guided branch cannot be removed silently", () => {
    // MUTATION KILL. Each of these fails if someone reintroduces the assumption that a guided round
    // always has a ballot, or synthesises one to make the crash go away.
    const guardSrc = stripComments(read("lib/education/guided-judge.ts"));
    assert.ok(/if \(full\.semanticScoring === "unavailable"\) \{/.test(guardSrc),
      "JD3. the projection still branches on the unscored discriminant before touching categories");
    assert.ok(!/full\.categoryScores\s*\n?\s*\.filter/.test(guardSrc.slice(0, guardSrc.indexOf('if (full.semanticScoring === "unavailable")'))),
      "JD3b. and nothing reads categoryScores before that branch");
    assert.ok(!/categoryScores:\s*\[\]/.test(guardSrc), "JD3c. no empty scored ballot is synthesised");
    assert.ok(!/categoryScores \?\? \[\]/.test(guardSrc), "JD3d. and absence is not papered over with a default");
    assert.ok(/semanticScoring: "unavailable"/.test(guardSrc), "JD3e. the unscored result declares itself");
    const routeSrc = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    assert.ok(!/\)\) as JudgeResult;/.test(routeSrc),
      "JD3f. the route no longer asserts the producer into a scored shape");
    assert.ok(/fullResult\.semanticScoring === "unavailable"/.test(routeSrc),
      "JD3g. and narrows before projecting");
  });

  check("JE. a locked skill cannot create a recommendation", () => {
    assert.deepEqual(projected.recommendedLessons.map((r: { lessonSlug: string }) => r.lessonSlug).sort(),
      ["debate-claim-warrant-impact-lesson", "debate-refutation-lesson"]);
    assert.ok(!projected.recommendedLessons.some((r: { lessonSlug: string }) => /weighing|signposting/.test(r.lessonSlug)));
    // And the route does not run the whole-round recommender in a guided round.
    const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    const guidedBlock = route.slice(route.indexOf("if (guidedRubric && guidedLessonId) {"), route.indexOf("const result = fullResult;"));
    assert.ok(guidedBlock.length > 200, "control: the guided branch is locatable");
    assert.ok(!/debateSkillRecommendations\(/.test(guidedBlock), "the guided branch never calls the whole-round recommender");
  });

  check("JF. a locked skill cannot reduce the guided result — the score is recomputed from surviving categories only", () => {
    const expected = Math.round((80 + 74 + 70 + 66 + 58 + 64) / 6);
    assert.equal(projected.overallScore, expected, "overall = mean of the six unlocked categories");
    assert.notEqual(projected.overallScore, FULL_RESULT.overallScore, "control: the full-round score (dragged down by weighing 20, organization 35) is NOT what the learner sees");
    // Zero out every locked category and the guided score does not move.
    const zeroed = { ...FULL_RESULT, categoryScores: FULL_RESULT.categoryScores.map((c) => allowedJudgeCategories(rubric).includes(c.key) ? c : { ...c, score: 0 }) };
    assert.equal(projectGuidedJudgeResult(zeroed, rubric, PILOT).overallScore, projected.overallScore, "locked categories have zero weight");
  });

  check("JG. a guided round produces zero rating change", () => {
    assert.ok(!("ratingChange" in projected), "no rating block in the ballot");
    const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    const guidedBlock = route.slice(route.indexOf("if (guidedRubric && guidedLessonId) {"), route.indexOf("const result = fullResult;"));
    for (const banned of ["ratingChange", "overallRatingDelta", "skillDelta(", "calculateDebateRating"]) {
      assert.ok(!guidedBlock.includes(banned), `the guided branch never computes a rating (${banned})`);
    }
  });

  check("JH-JK. a guided round writes no XP, no XPLog, no streak, no mastery, no review, no readiness — operational storage only", () => {
    const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    const guidedBlock = route.slice(route.indexOf("if (guidedRubric && guidedLessonId) {"), route.indexOf("const result = fullResult;"));
    for (const banned of ["awardXpInTransaction", "xPLog", "streak", "lockUserRow", "rewardAmountForCompletion", "readiness:",
                          "masteryProgress", "recordDrillMastery", "skillReviewSchedule", "logicScore", "rebuttalScore", "evidenceScore", "persuasionScore"]) {
      assert.ok(!guidedBlock.includes(banned), `JH-JK. the guided branch performs no educational progression write (${banned})`);
    }
    // What it DOES write is exactly the operational record: the JUDGED claim and the projected ballot.
    assert.ok(/tx\.debate\.updateMany\(/.test(guidedBlock) && /status: "JUDGED"/.test(guidedBlock), "the round is claimed JUDGED (operational)");
    assert.ok(/judgeReport: projected as never/.test(guidedBlock), "the PROJECTED ballot is what is stored");
    assert.ok(/xpEarned: 0/.test(guidedBlock) && /guided: true/.test(guidedBlock), "the response reports zero XP and marks itself guided");
    // The full-Compete transaction still does all of it — this is a branch, not a global weakening.
    const fullBlock = route.slice(route.indexOf("const result = fullResult;"));
    for (const kept of ["awardXpInTransaction", "tx.xPLog.create", "streak: { increment: 1 }", "readiness: result.readinessForNextLevel"]) {
      assert.ok(fullBlock.includes(kept), `control: full Compete still performs ${kept}`);
    }
  });

  check("JL. full Compete still uses the full judge, unchanged", () => {
    const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    assert.ok(/const result = fullResult;[\s\S]*debateSkillRecommendations\(result\)/.test(route), "the whole-round recommender still runs for full Compete");
    // The rating block is still built for full Compete, but it is now CONDITIONED on the round having
    // been semantically scored. Debate's transcript producer withdrew semantic scoring on 2026-09-07,
    // so a Debate round supplies no overall and no winner and the block is omitted; a DECA or HOSA
    // round, which a provider genuinely scores, still gets it. What this control exists to prove is
    // that the guided branch did not globally weaken full Compete — and that still holds.
    assert.ok(/const ratingChange =\n?[\s\S]{0,400}?ratingDelta === undefined/.test(route),
      "the rating block is still built for full Compete, gated on a real score");
    assert.ok(/\.\.\.\(ratingChange === undefined \? \{\} : \{ ratingChange \}\)/.test(route),
      "and it is omitted entirely rather than emitted empty when the round was not scored");
    assert.equal(defaultSupportLevel("compete"), "INDEPENDENT");
    const ai = stripComments(read("lib/ai.ts"));
    assert.ok(/const guidedPreamble = guided \?/.test(ai) && /: "";/.test(ai),
      "the judge prose limit is applied only when a rubric is present — an ordinary round gets an empty preamble");
    assert.ok(/\$\{guidedPreamble\}Motion: /.test(ai), "and the preamble leads the prose prompt");
  });

  check("JM. the server validates the guided lesson from curriculum truth and trusts no client unlock list", () => {
    const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    assert.ok(/parseJson\(request, guidedJudgeRequestSchema\)/.test(route), "the body is parsed through the schema");
    assert.ok(/const rowLessonId = guidedLessonIdOf\(debate\);/.test(route), "guided-ness is read from the STORED round");
    assert.ok(/guidedRubric = guidedRubricFor\(rowLessonId\)/.test(route), "the rubric is resolved server-side from the ROW's lesson id");
    assert.ok(!/guidedRubricFor\(body\./.test(route), "the body's lesson id never selects the rubric");
    assert.ok(/body\.guided\.lessonId !== rowLessonId/.test(route), "a body naming a different lesson than the row is refused");
    assert.ok(/else if \(body\.guided\) \{\s*throw new HttpError\("This round was not started as a guided round/.test(route),
      "a guided body on a non-lesson row is refused — the row, not the client, decides");
    assert.ok(!/body\.guided\.(unlocked|competencies|rubric|skills)/.test(route), "no client-supplied unlock set is read");
    const validators = stripComments(read("lib/validators.ts"));
    assert.ok(/guidedJudgeRequestSchema = z\.object\(\{\s*guided: z\.object\(\{ lessonId: z\.string\(\)\.min\(1\)\.max\(80\) \}\)\.optional\(\)\s*\}\)/.test(validators),
      "the schema accepts a lesson id and nothing else");
    const arena = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(/body: JSON\.stringify\(guided \? \{ guided: \{ lessonId: guided\.lessonId \} \} : \{\}\)/.test(arena), "the arena sends only the lesson id");
  });

  check("JN. an invalid guided target fails closed — refused, never scored against the full curriculum", () => {
    const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    assert.ok(/if \(!guidedRubric\) \{\s*throw new HttpError\("That guided lesson is not recognised, so this round was not scored\.", 400\);/.test(route),
      "an unresolvable lesson is a 400 before any judging");
    assert.ok(/if \(debate\.organization !== "DEBATE"\) \{\s*throw new HttpError\("Guided rounds are a Debate lesson feature\.", 400\);/.test(route),
      "a non-Debate round carrying guided is refused");
    assert.equal(guidedRubricFor("debate-weighing"), null, "control: an undeclared lesson has no rubric");
    // The check sits BEFORE the judge is called.
    assert.ok(route.indexOf("That guided lesson is not recognised") < route.indexOf("await runOrganizationJudge(debate, guidedRubric"), "refusal precedes evaluation");
  });

  check("JO. the live starter caller supplies the topic — the learner receives a contextual starter", () => {
    const t = content.scaffoldedTry;
    assert.ok(typeof t.opponentClaim === "string" && t.opponentClaim.length > 0, "the pilot authors the opponent's claim");
    const tryComponent = stripComments(read("components/coaching/scaffolded-try.tsx"));
    assert.ok(/contextualStarter\(raw, \{ topic, opponentClaim: scaffoldedTry\.opponentClaim \}\)/.test(tryComponent), "the live caller passes the claim");
    const starter = content.languageFrames[0].starters[0];
    const live = contextualStarter(starter, { opponentClaim: t.opponentClaim });
    assert.equal(live, `They argue that ${t.opponentClaim}, but ___`, "the learner's starter opens in their actual situation");
  });

  check("JP. the contextual starter remains an incomplete scaffold", () => {
    const t = content.scaffoldedTry;
    const live = contextualStarter(content.languageFrames[0].starters[0], { opponentClaim: t.opponentClaim });
    assert.ok(live.includes(SLOT) && isIncompleteScaffold(live), "it stops at a blank");
    assert.ok(!/because|therefore/i.test(t.opponentClaim), "the authored claim carries no reasoning");
    // The validator refuses a claim that smuggles in the reason.
    const target = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === PILOT);
    const broken = { ...EDUCATION_REGISTRY, lessons: EDUCATION_REGISTRY.lessons.map((e: { id: string }) => e.id === PILOT
      ? { ...target, source: { ...target.source, lesson: { ...target.source.lesson, content: { ...content, scaffoldedTry: { ...t, opponentClaim: "uniforms cut bullying because students cannot flaunt clothes" } } } } }
      : e) };
    assert.ok(validateEducationRegistry(broken).some((i: { message: string }) => /carries reasoning, not a claim/.test(i.message)),
      "a claim with a because is refused by the validator");
    assert.deepEqual(validateEducationRegistry(EDUCATION_REGISTRY), [], "control: the real registry validates clean");
  });

  check("JQ. the Refutation retry is still required, and only the target skill can block advancement", () => {
    const missing = evaluateRefutationScaffold({ theySay: "coverage will improve online", but: "that does not follow", because: "", therefore: "their coverage claim is unproven" });
    assert.equal(missing.retryRequired, true);
    const fb = guidedFeedbackFrom(projected.categoryScores, rubric);
    assert.equal(fb.retryRequired, projected.guidedFeedback.retryRequired);
    // Refutation categories average (58+64)/2 = 61 >= threshold -> continue; drop refutation to 40 -> retry.
    assert.equal(fb.nextAction, "continue");
    const weak = projected.categoryScores.map((c: { key: string; score: number }) => c.key === "refutation" ? { ...c, score: 40 } : c.key === "responsiveness" ? { ...c, score: 45 } : c);
    assert.equal(guidedFeedbackFrom(weak, rubric).nextAction, "retry", "a weak target skill asks for a retry");
    // A locked skill at zero never asks for a retry: it is not in the surviving categories at all.
    assert.equal(GUIDED_RETRY_THRESHOLD, 60);
    assert.ok(!projected.categoryScores.some((c: { key: string }) => ["clash", "organization", "collapse"].includes(c.key)), "locked categories cannot influence the retry decision");
  });

  check("JR. the rebuttal hold is still active", () => {
    const { debateMasteryHeld } = require("../lib/debate-drills");
    assert.equal(debateMasteryHeld("debate-rebuttal"), true);
    assert.ok(!/debateMasteryHeld|DEBATE_DRILL_HELD_IDS/.test(read("lib/education/guided-judge.ts")), "the guided judge has no opinion on the hold");
  });

  check("JS. the evaluation CONTRACT is limited, not only the display: the provider is told what it may write about", () => {
    const instruction = guidedJudgeProseInstruction(rubric);
    assert.ok(/Write ONLY about these skills: Refutation, Claim, warrant and impact\./.test(instruction));
    assert.ok(/Do NOT evaluate, mention, or penalise: Clash, Signposting, Constructive speech, Weighing\./.test(instruction));
    assert.ok(/Do not declare a winner/.test(instruction) && /Do not rewrite/.test(instruction));
    const ai = stripComments(read("lib/ai.ts"));
    assert.ok(/guided\?: GuidedRubric;/.test(ai), "judgeDebate accepts the rubric");
    assert.ok(/judgeProsePrompt\(input, base, input\.guided\)/.test(ai), "and threads it into the prose prompt");
    const route = stripComments(read("app/api/debates/[debateId]/judge/route.ts"));
    assert.ok(/aiPersona: debate\.aiPersona,\s*guided\s*\}\);/.test(route), "the route passes the rubric to the judge");
  });

  // ================================================================================================
  // ROW MARKER + CONSUMER TRUTH — the final pre-checkpoint charter (§8 A–G). A guided round is a
  // stored round (learning history, preserved and labelled) and never an independent completion.
  // ================================================================================================
  const guidedRounds = require("../lib/guided-rounds");
  const { INDEPENDENT_ROUND_WHERE, isIndependentRound, guidedLessonIdOf, GUIDED_ROUND_LABEL } = guidedRounds;

  check("KH. the row marker is fail-closed: LESSON mode AND a stored lesson id, or it is not a guided round", () => {
    assert.deepEqual(INDEPENDENT_ROUND_WHERE, { practiceMode: { not: "LESSON" } });
    assert.equal(guidedLessonIdOf({ practiceMode: "LESSON", formatConfig: { format: "PARLIAMENTARY", speeches: [], guidedLessonId: PILOT } }), PILOT);
    assert.equal(guidedLessonIdOf({ practiceMode: "DEBATE", formatConfig: { guidedLessonId: PILOT } }), null, "an ordinary round cannot be made guided by a config key alone");
    assert.equal(guidedLessonIdOf({ practiceMode: "LESSON", formatConfig: null }), null, "a LESSON row with no lesson is not a guided round");
    assert.equal(guidedLessonIdOf({ practiceMode: "LESSON", formatConfig: { guidedLessonId: "  " } }), null);
    assert.equal(guidedLessonIdOf({ practiceMode: "LESSON", formatConfig: [PILOT] }), null);
    assert.equal(isIndependentRound({ practiceMode: "LESSON" }), false);
    for (const mode of ["DEBATE", "ROLEPLAY", "TEST"]) assert.equal(isIndependentRound({ practiceMode: mode }), true, `${mode} rounds are unchanged`);
    assert.ok(!/@prisma\/client|lib\/education|from "@\/lib\/prisma"/.test(stripComments(read("lib/guided-rounds.ts"))), "the marker module is pure and importable by any page");
  });

  check("KA. guided rows cannot enter independent completed-round totals (Home, Dashboard, coach view, assignment credit)", () => {
    const home = stripComments(read("app/(app)/home/page.tsx"));
    assert.ok(/prisma\.debate\.count\(\{ where: \{ studentId: session\.user\.id, status: "JUDGED", \.\.\.INDEPENDENT_ROUND_WHERE \} \}\)/.test(home), "Home 'Judged rounds' counts independent rounds only");
    const dashboard = stripComments(read("app/(app)/dashboard/page.tsx"));
    assert.ok(/status: "JUDGED",\s*\.\.\.INDEPENDENT_ROUND_WHERE\s*\}\s*\}\)/.test(dashboard), "Dashboard 'Judged rounds' counts independent rounds only");
    assert.ok(/calculateDebateRating\(\{ xp, wins, judgedDebates: judgedDebateCount \}\)/.test(dashboard), "control: the bot heuristic reads that filtered count");
    const coach = stripComments(read("lib/coach-progress.ts"));
    assert.ok(/where: \{ studentId, status: "JUDGED", \.\.\.INDEPENDENT_ROUND_WHERE \}/.test(coach), "coach judged-round performance is independent rounds only");
    assert.ok(/const judgedRounds = judgedDebates\.length;/.test(coach) && /const latest = judgedDebates\[0\]/.test(coach), "control: count and latest feedback derive from that filtered list");
    const assignments = stripComments(read("lib/assignments.ts"));
    assert.equal((assignments.match(/\.\.\.INDEPENDENT_ROUND_WHERE/g) ?? []).length, 2, "assignment evidence (submit + options) excludes guided rounds");
    for (const file of ["app/(app)/home/page.tsx", "app/(app)/dashboard/page.tsx", "lib/coach-progress.ts", "lib/assignments.ts", "lib/debate-history.ts"]) {
      assert.ok(/from "@\/lib\/guided-rounds"/.test(read(file)), `${file} uses the shared predicate, not a private copy`);
    }
  });

  check("KB. guided rows cannot enter competitive-performance aggregates (average score, same-motion comparison)", () => {
    const dashboard = stripComments(read("app/(app)/dashboard/page.tsx"));
    // The where-clause gained the scoring-era scope on 2026-09-07, so this asserts the two conditions
    // it must carry rather than one exact literal: guided rounds still excluded, AND the era scope
    // applied. Both are load-bearing and neither may be dropped by a later edit.
    assert.ok(/_avg: \{ overallScore: true \}/.test(dashboard) && /\.\.\.INDEPENDENT_ROUND_WHERE/.test(dashboard),
      "Dashboard average is independent rounds only");
    assert.ok(/\.\.\.scoringEra\.where/.test(dashboard), "and is scoped to the current scoring era");
    const history = stripComments(read("lib/debate-history.ts"));
    assert.ok(/where: \{ studentId: userId, topic, status: "JUDGED", id: \{ not: excludeId \}, \.\.\.INDEPENDENT_ROUND_WHERE \}/.test(history), "same-motion attempt comparison is independent rounds only");
    const coach = stripComments(read("lib/coach-progress.ts"));
    assert.ok(/const averageDebateScore = average\(\s*judgedDebates/.test(coach), "coach average derives from the filtered list");
    assert.ok(/isCurrentScoringEra\(d\.completedAt\)/.test(coach),
      "and is scoped to the same scoring era, matched on the ballot's completedAt rather than createdAt");
  });

  check("KC. guided rows REMAIN in learning history — nothing hides them", () => {
    const history = stripComments(read("lib/debate-history.ts"));
    assert.ok(/where: \{ studentId: userId \},\s*orderBy: \{ createdAt: "desc" \},\s*select: \{[^}]*practiceMode: true/.test(history), "getStudentDebates lists every round and carries the marker");
    const profile = stripComments(read("app/(app)/profile/page.tsx"));
    assert.ok(/studentDebates: \{\s*orderBy: \{ createdAt: "desc" \},\s*take: 3,\s*select: \{ id: true, topic: true, status: true, overallScore: true, practiceMode: true, createdAt: true \}/.test(profile), "profile recent debates list every round and carry the marker");
    const coach = stripComments(read("lib/coach-progress.ts"));
    assert.ok(/where: \{ studentId \},\s*orderBy: \{ createdAt: "desc" \},\s*take: 5,\s*select: \{ id: true, topic: true, status: true, overallScore: true, practiceMode: true, createdAt: true \}/.test(coach), "coach recent rounds list every round and carry the marker");
    for (const file of ["app/(app)/home/page.tsx", "app/(app)/dashboard/page.tsx"]) {
      assert.ok(/status: "JUDGED", practiceMode: "LESSON" \}/.test(stripComments(read(file))), `${file} counts guided exercises on their own line`);
    }
    assert.ok(/hasActivity = [^;]*guidedExerciseCount > 0/.test(stripComments(read("app/(app)/dashboard/page.tsx"))), "a guided round still counts as activity");
  });

  check("KD. wherever rounds are listed, a guided round is visibly a guided exercise", () => {
    assert.equal(GUIDED_ROUND_LABEL, "Guided exercise");
    const surfaces: Array<[string, RegExp]> = [
      ["app/(app)/debates/history/page.tsx", /debate\.practiceMode === "LESSON" \? \(\s*<Badge[^>]*>\{GUIDED_ROUND_LABEL\}<\/Badge>/],
      ["app/(app)/profile/page.tsx", /debate\.practiceMode === "LESSON" \? `\$\{GUIDED_ROUND_LABEL\} · ` : ""/],
      ["app/(app)/coach/students/[studentId]/page.tsx", /round\.practiceMode === "LESSON" \? ` · \$\{GUIDED_ROUND_LABEL\.toLowerCase\(\)\}` : ""/],
      ["app/(app)/debates/[debateId]/replay/page.tsx", /debate\.practiceMode === "LESSON" \? <Badge>\{GUIDED_ROUND_LABEL\}<\/Badge> : null/]
    ];
    for (const [file, pattern] of surfaces) {
      assert.ok(pattern.test(stripComments(read(file))), `${file} labels a guided round`);
      assert.ok(/from "@\/lib\/guided-rounds"/.test(read(file)), `${file} uses the shared label`);
    }
    // And the full-round score line never invents a number for a guided round (overallScore is NULL).
    assert.ok(/typeof debate\.overallScore === "number"/.test(read("app/(app)/debates/history/page.tsx")));
    // Unfinished guided rounds on the resume cards are named too, and Continue reopens them as guided
    // because the arena reads the row (A3) — the URL no longer carries the lesson.
    for (const [file, v] of [["app/(app)/home/page.tsx", "d"], ["app/(app)/dashboard/page.tsx", "debate"]] as const) {
      assert.ok(new RegExp(`typeLabel: ${v}\\.practiceMode === "LESSON" \\? \`\\$\\{GUIDED_ROUND_LABEL\\} · \\$\\{practiceTypeLabel\\(${v}\\)\\}\` : practiceTypeLabel\\(${v}\\)`).test(stripComments(read(file))), `${file} names an unfinished guided round on the resume card`);
    }
    // The arena's compact ballot never renders a decision fallback for a guided report.
    const arenaSrc = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(/\{report\.guided \? \([\s\S]{0,600}Skills checked/.test(arenaSrc), "guided: the short-reason box is replaced by the skills that were checked");
    assert.ok(/whyBullets\.length > 0 && !report\.guided \?/.test(arenaSrc), "guided: no 'why you won / lost'");
    assert.ok(/\{!report\.guided \? \(\s*<div className="grid gap-3 md:grid-cols-3">\s*<InsightCard title="Biggest fix"/.test(arenaSrc), "guided: no generic 'biggest fix' fallback");
    assert.ok(/\{!report\.guided \? \(\s*<button[\s\S]{0,900}Show full rubric breakdown/.test(arenaSrc), "guided: no full-rubric toggle");
  });

  check("KE. the actual motion reaches the coach in the arena; the lesson page has none and passes none", () => {
    const arena = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(/<SideCoachPanel[\s\S]{0,400}topic=\{debate\.topic\}/.test(arena), "the arena passes the round's motion to the side coach");
    const panel = stripComments(read("components/debate/side-coach-panel.tsx"));
    assert.ok(/topic\?: string;/.test(panel) && /scenario,\s*topic,\s*goals,/.test(panel), "the panel forwards it in the request body");
    assert.ok(/topic: z\.string\(\)\.max\(400\)\.optional\(\)/.test(stripComments(read("lib/validators.ts"))), "the schema accepts a bounded motion");
    const prompt = buildSideCoachUserPrompt({ organization: "DEBATE", topic: "Schools should require uniforms", transcript: [{ role: "NEGATIVE", content: "Uniforms improve discipline." }], requestType: "ask", askKind: "refute", guided: { lessonId: PILOT, supportLevel: "HIGH_SUPPORT" } });
    assert.ok(/THE MOTION being debated: Schools should require uniforms/.test(prompt), "the motion is in the prompt the provider reads");
    assert.ok(/Uniforms improve discipline\./.test(prompt), "KF. and so is the opponent's actual argument (transcript)");
    assert.ok(/stop at a blank written as ___/.test(prompt), "the starter instruction still stops at a blank");
    // TRUTH PIN for the lesson page: there is no motion there. The exercise is set against an
    // ARGUMENT, so the view passes no topic and the starter is argument-grounded. Not invented.
    const view = stripComments(read("components/lessons/concept-education-lesson-view.tsx"));
    const tryCall = /<ScaffoldedTry[\s\S]*?\/>/.exec(view);
    assert.ok(tryCall && !/topic=/.test(tryCall[0]), "the lesson view passes no topic — TOPIC AVAILABLE on the lesson page: NO");
    assert.ok(!/topic:/.test(JSON.stringify(content.scaffoldedTry)), "control: the authored exercise has no topic field to pass");
  });

  check("KG. a starter grounded in motion and/or argument still stops at a blank; one that would not is refused", () => {
    const both = contextualStarter("On {topic}, they argue that {their claim}, but ___", { topic: "school uniforms", opponentClaim: "uniforms improve discipline" });
    assert.equal(both, "On school uniforms, they argue that uniforms improve discipline, but ___");
    assert.ok(both && isIncompleteScaffold(both));
    assert.equal(contextualStarter("They argue that {their claim}, but ___", { topic: "school uniforms" }), "They argue that ___, but ___", "a missing claim becomes a blank, never a template token");
    assert.equal(contextualStarter("{their claim} is wrong because the data is old, so it fails.", { opponentClaim: "uniforms improve discipline" }), null, "a starter that would complete the reasoning is not returned");
    assert.ok(!/topicAwareStarter/.test(read("lib/education/coaching.ts")), "the misleading name is gone");
  });

  // ================================================================================================
  // CLASH — the first lesson after the pilot. Cumulative: Clash targeted, CWI + Refutation reinforced.
  // ================================================================================================
  const CLASH = "debate-clash";
  const clashEntry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === CLASH);
  assert.ok(clashEntry, "control: the Clash lesson is registered");
  const clashContent = clashEntry.source.lesson.content;
  const clashChecks = [clashContent.guidedQuestion, ...clashContent.practiceQuestions, ...clashContent.masteryCheck] as Array<{ prompt: string; choices: string[]; correctAnswer: string; explanation: string }>;
  const clashRubric = guidedRubricFor(CLASH);
  const { evaluateClashScaffold, evaluateScaffoldFor, SCAFFOLD_EVALUATORS } = coaching;

  check("LA. the Clash guided rubric is exact: Clash targeted, CWI + Refutation reinforced, everything later locked", () => {
    assert.deepEqual(clashRubric, { primary: "clash", reinforcement: ["claim-warrant-impact", "refutation"], locked: ["signposting", "constructive-speech", "weighing"] });
    assert.deepEqual([...allowedJudgeCategories(clashRubric)].sort(),
      ["argument", "centralClashResponse", "impact", "mechanism", "refutation", "responsiveness", "warrant"]);
  });

  check("LB. a Clash guided ballot keeps central-clash engagement and drops weighing, organisation and every locked card", () => {
    const projectedClash = projectGuidedJudgeResult(FULL_RESULT, clashRubric, CLASH);
    const keys = projectedClash.categoryScores.map((c: { key: string }) => c.key);
    assert.ok(keys.includes("centralClashResponse") && keys.includes("refutation") && keys.includes("argument"));
    assert.ok(!keys.includes("clash") && !keys.includes("organization") && !keys.includes("collapse"), "weighing (lexical 'clash'), signposting and strategy categories are removed");
    assert.equal(projectedClash.overallScore, Math.round((80 + 74 + 70 + 66 + 58 + 64 + 40) / 7), "overall = mean of the seven permitted categories only");
    assert.ok(!("ratingChange" in projectedClash) && !("judgeFairnessReport" in projectedClash) && !("teamWinner" in projectedClash));
    assert.ok(projectedClash.guidedFeedback.newSkill.startsWith("Clash"), "the new-skill line is about Clash");
    assert.equal(projectedClash.guidedFeedback.nextAction, "retry", "central-clash 40 < 60 asks for a retry");
    assert.equal(projectedClash.guidedFeedback.oneThingToFix, guidedJudge.COMPETENCY_FIX.clash, "on a retry the fix is the Clash move in the lesson's own terms, not the lexical judge's engagement advice");
    assert.ok(!/name their best point and beat it/i.test(projectedClash.guidedFeedback.oneThingToFix), "no refutation-shaped fix line for a Clash round");
    const rewrites = projectGuidedJudgeResult({ ...FULL_RESULT, improvementAdvice: ["Better sentence to add: \"Uniforms cut pressure.\"", "Model rewrite: their claim. Uniforms cut pressure.", "Explain why the step fails, not that it fails."] }, clashRubric, CLASH).improvementAdvice;
    assert.deepEqual(rewrites, ["Explain why the step fails, not that it fails."], "a guided ballot never carries the judge's model rewrite of the learner's sentence");
    const strong = { ...FULL_RESULT, categoryScores: FULL_RESULT.categoryScores.map((c) => c.key === "centralClashResponse" ? { ...c, score: 72 } : c) };
    assert.equal(projectGuidedJudgeResult(strong, clashRubric, CLASH).guidedFeedback.nextAction, "continue", "central-clash 72 continues; locked categories cannot change that");
    const { guided: _m, ...readable } = projectedClash;
    assert.ok(!/outweigh|dropped|signpost/i.test(JSON.stringify(readable)), "no locked-skill prose survives in a Clash ballot");
    const recs = projectGuidedJudgeResult({ ...FULL_RESULT, recommendedLessons: [
      { lessonSlug: "debate-clash-lesson", reason: "Find the disputed question.", priority: "high" },
      { lessonSlug: "debate-weighing-lesson", reason: "Practice comparing impacts.", priority: "medium" },
      { lessonSlug: "debate-refutation-lesson", reason: "Build direct refutation.", priority: "high" }
    ] }, clashRubric, CLASH).recommendedLessons.map((r: { lessonSlug: string }) => r.lessonSlug);
    assert.deepEqual(recs, ["debate-clash-lesson", "debate-refutation-lesson"], "a Clash recommendation survives; a Weighing one cannot");
  });

  check("LC. the rebuilt Clash lesson has the reference shape and exactly three checks; the old questions are gone", () => {
    assert.equal(clashEntry.source.lesson.title, "Find the real clash");
    assert.equal(1 + clashContent.practiceQuestions.length + clashContent.masteryCheck.length, 3, "three checks: guided + 1 practice + 1 final");
    // Beginner pass (2026-09-08, owner ruling): the depth structures the frozen manifest classed "after the beginner path" render BEFORE the first check, so their minimums were forcing Class-C material into required reading. Sections and the three frame purposes stay; additionalExamples is no longer required; one ladder rung suffices.
    assert.ok(clashContent.teachingSections.length >= 4 && clashContent.additionalExamples === undefined && clashContent.revisionLadder.length >= 1);
    assert.ok(clashContent.misconception && clashContent.commonMistakes.length >= 4, "the manifest's three mistake carriers plus the strawmanned restatement — no box may restate a section");
    assert.deepEqual(clashContent.languageFrames.map((f: { purpose: string }) => f.purpose), ["Identify the disagreement", "State the clash neutrally", "Connect the two sides"]);
    assert.equal(clashContent.scaffoldedTry.frame.split(SLOT).length - 1, clashContent.scaffoldedTry.slots.length, "three blanks, three slots");
    assert.ok(!("opponentClaim" in clashContent.scaffoldedTry), "a two-sided exercise carries no single opponent claim");
    const everything = JSON.stringify(clashContent);
    for (const gone of ["Which response creates clash?", "Which is weakest?", "ballot color", "Our first contention is still true."]) {
      assert.ok(!everything.includes(gone), `old thin-lesson item removed: ${gone}`);
    }
    assert.ok(/both.true/i.test(everything) && /either side could/i.test(everything), "the both-true test and the neutral-question rule are taught");
    assert.deepEqual(validateEducationRegistry(EDUCATION_REGISTRY), [], "the registry validates clean with the rebuilt lesson");
  });

  check("LD. Clash starters are scaffolds, and the help categories for the Clash lesson are Clash + CWI + Refutation only", () => {
    for (const frame of clashContent.languageFrames) for (const starter of frame.starters) assert.ok(isIncompleteScaffold(starter.replace(/\{topic\}|\{their claim\}/g, SLOT)), starter);
    const ids = starterCategoriesFor(CLASH).map((c: { id: string }) => c.id).sort();
    assert.deepEqual(ids, ["claim", "connect", "consequence", "disagreement", "impact", "neutral", "reason", "refute"]);
    assert.ok(!ids.includes("transition") && !ids.includes("weigh"), "no locked-skill help category");
    for (const category of starterCategoriesFor(CLASH).filter((c: { competency: string }) => c.competency === "clash")) {
      assert.ok(clashContent.languageFrames.some((f: { purpose: string }) => f.purpose === category.purpose), `category ${category.id} has a frame to draw from`);
    }
    const live = contextualStarter("On {topic}, the two cases only meet at ___", { topic: "free bus fares" });
    assert.equal(live, "On free bus fares, the two cases only meet at ___");
  });

  check("LE. the Clash scaffold evaluator checks SHAPE exactly, and every case four review rounds raised behaves", () => {
    const MOTION = { motion: clashContent.scaffoldedTry.motion as string };
    assert.equal(MOTION.motion, "this school should move to a four-day week", "the exercise authors the motion it is set on");
    const good = { sideA: "a four-day week improves attendance because appointments move to the free weekday", sideB: "longer days mean younger students lose focus by the seventh hour", clash: "students learn more in four long days than in five shorter ones" };
    // Each row is a case an independent reviewer raised across the four rounds. `true` = the attempt
    // must reach the guided round; `false` = it must be sent back for a retry.
    const CASES: Array<[string, { sideA: string; sideB: string; clash: string }, { motion?: string }, boolean]> = [
      ["a correct answer passes", good, MOTION, true],
      ["a verbatim copy of one side is refused", { ...good, clash: good.sideA }, MOTION, false],
      ["and is still refused when Side B is written as the negation of Side A, sharing every word",
        { sideA: "uniforms reduce the pressure students feel about clothing", sideB: "uniforms do not reduce the pressure students feel about clothing", clash: "uniforms reduce the pressure students feel about clothing" }, {}, false],
      ["the motion restated is refused, judged against the AUTHORED motion", { ...good, clash: "this school should move to a four-day week" }, MOTION, false],
      ["a principle-level clash the lesson itself teaches is NOT refused as the motion",
        { sideA: "a school may set rules about appearance", sideB: "students own their own presentation", clash: "whether a school should be able to decide what its students wear" }, { motion: "schools should require uniforms" }, true],
      ["in a fairness round the disputed word itself is not treated as a loaded verdict",
        { sideA: "the policy treats poorer families unfairly", sideB: "the policy applies the same rule to everyone", clash: "the policy unfairly burdens families without a car" }, {}, true],
      ["a question opening \u201cwhy\u201d has decided its own answer", { ...good, clash: "why the four-day week improves attendance" }, MOTION, false],
      ["a short correct question built from one side's words is not mistaken for a copy",
        { sideA: "uniforms reduce the pressure to wear the right clothes", sideB: "students signal status with shoes and bags", clash: "uniforms reduce clothing pressure" }, {}, true],
      ["an empty slot is refused", { ...good, clash: "" }, MOTION, false],
      ["a two-word slot is refused", { ...good, sideB: "they disagree" }, MOTION, false]
    ];
    for (const [name, slots, context, shouldPass] of CASES) {
      const result = evaluateClashScaffold(slots, context);
      assert.equal(result.complete, shouldPass, name);
      assert.equal(result.retryRequired, !shouldPass, `${name} (retry follows the verdict)`);
      if (!shouldPass) {
        assert.ok(result.coach.trim().length > 0, "a refusal always names the fault");
        if (slots.clash.trim()) assert.ok(!result.coach.includes(slots.clash), "and never writes the clash for the learner");
      }
    }
    // The evaluator judges SHAPE and says so: it does not attempt the judgments that need the argument.
    const src = stripComments(read("lib/education/coaching.ts"));
    const body = src.slice(src.indexOf("export function evaluateClashScaffold"), src.indexOf("export type ScaffoldContext"));
    assert.ok(!/overlap\(/.test(body), "no word-overlap heuristic — it refused correct answers in both tunings");
    assert.ok(!/obviously|unfairly|we are right/.test(body), "no loaded-word list — it refused the disputed proposition in a fairness round");
    assert.ok(/essentiallyTheSame\(clash, context\.motion\)/.test(body), "the motion check compares against the authored motion");
    assert.ok(/essentiallyTheSame\(clash, slots\.sideA\) \|\| essentiallyTheSame\(clash, slots\.sideB\)/.test(body), "the copy check compares whole text, not word counts");
    // Dispatch: the live component reads the lesson's slot order and its motion through one function.
    assert.equal(evaluateScaffoldFor(CLASH, [good.sideA, good.sideB, good.clash], MOTION).complete, true);
    // Weighing held this role until 2026-09-07, when its repair gave it a scaffold and an evaluator.
    // Every lesson that authors a scaffoldedTry now has one, so the negative case uses a lesson that
    // authors NO scaffold at all — which is the honest form of "nothing here can be checked".
    assert.equal(evaluateScaffoldFor("debate-claim-warrant-impact", ["a", "b"]), null,
      "a lesson with no evaluator cannot be checked");
    const withTry = LEARNING_SKILL_CATALOG.filter((e: { lesson: { content: { scaffoldedTry?: unknown } } }) => e.lesson.content.scaffoldedTry).map((e: { slug: string }) => e.slug).sort();
    assert.deepEqual(withTry, Object.keys(SCAFFOLD_EVALUATORS).sort(), "every lesson with a scaffolded try has a registered evaluator, and no evaluator is orphaned");
    const tryComponent = stripComments(read("components/coaching/scaffolded-try.tsx"));
    assert.ok(/evaluateScaffoldFor\(\s*lessonId,\s*scaffoldedTry\.slots\.map\(\(_, i\) => values\[keyFor\(i\)\] \?\? ""\),\s*\{ motion: scaffoldedTry\.motion \}\s*\)/.test(tryComponent),
      "the live component dispatches by lesson id and passes the authored motion");
    assert.ok(!/evaluateRefutationScaffold|theySay/.test(tryComponent), "the component no longer hard-codes the pilot's slots");
    assert.ok(/\?\? UNCHECKABLE/.test(tryComponent), "no evaluator → cannot complete → guided round stays closed");
    // A lesson with no guided application (Orientation, Evidence) must never be told a guided round
    // judges its attempt or that a "next step" opens: every guided-round sentence is conditional on
    // `application`, and the no-evaluator copy names no round at all.
    assert.ok(
      tryComponent.includes('matters{application ? " — that is what the guided round is for." : ". Compare it with the worked example above."}'),
      "pass copy names the guided round only where the lesson has one"
    );
    assert.ok(
      tryComponent.includes('Change that part and check again.{application ? " The next step opens once the move is complete." : ""}'),
      "retry copy promises a next step only where the lesson has one"
    );
    assert.ok(!/UNCHECKABLE[\s\S]{0,200}guided round/.test(tryComponent), "no-evaluator copy names no guided round");
    {
      const lines = tryComponent.split("\n");
      const guardOpen = lines.findIndex((line) => line.includes("{application ? ("));
      const guardClose = lines.findIndex((line, index) => index > guardOpen && line.trim() === ") : null}");
      assert.ok(guardOpen > 0 && guardClose > guardOpen, "guided-round launch block is guarded by application");
      const visible = lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /guided round/.test(line) && !/^\s*(\*|\{\/\*|\/\/)/.test(line));
      assert.strictEqual(visible.length, 3, "exactly three learner-visible guided-round strings");
      for (const { line, index } of visible) {
        assert.ok(/application \?/.test(line) || (index > guardOpen && index < guardClose), `guided-round copy guarded: ${line.trim()}`);
      }
    }
  });

  check("LF. Clash owns identification only: no weighing moves are taught, refutation is named as a different job", () => {
    const teaching = [
      clashContent.objective, clashContent.explanation, clashContent.whyMatters, ...clashContent.steps,
      ...clashContent.teachingSections.map((s: { body: string }) => s.body),
      ...clashContent.commonMistakes.flatMap((m: { mistake: string; whyItFails: string; fix: string }) => [m.mistake, m.whyItFails, m.fix]),
      ...clashContent.languageFrames.flatMap((f: { starters: string[] }) => f.starters),
      clashContent.scaffoldedTry.prompt
    ].join("\n");
    for (const move of ["outweigh", "compare the impacts", "magnitude", "probability", "bigger harm", "matters more than"]) {
      assert.ok(!new RegExp(move, "i").test(teaching), `no weighing move is taught (${move})`);
    }
    assert.ok(/Refutation answers a different one/.test(teaching) && /Weighing answers a third/.test(teaching), "the boundary section separates the three jobs");
    assert.ok(!/\bbecause ___\. Therefore/.test(clashContent.scaffoldedTry.frame), "the scaffold is not the Refutation frame");
    assert.ok(!/refute|answer their|say what changed/i.test(clashContent.objective), "the objective asks for identification, not for the answer");
    for (const frame of clashContent.languageFrames) assert.ok(!/therefore|because their|fails because/i.test(frame.starters.join(" ")), "no Refutation chain in a Clash frame");
  });

  check("LG. never test before teaching holds for Clash: nothing later than Clash is scored, coached, or recommended", () => {
    const prose = guidedJudgeProseInstruction(clashRubric);
    assert.ok(/Write ONLY about these skills: Clash, Claim, warrant and impact, Refutation\./.test(prose));
    assert.ok(/Do NOT evaluate, mention, or penalise: Signposting, Constructive speech, Weighing\./.test(prose));
    const system = buildSideCoachSystemPrompt({ organization: "DEBATE", transcript: [], requestType: "ask", guided: { lessonId: CLASH, supportLevel: "HIGH_SUPPORT" } });
    assert.ok(/CURRENT SKILL \(primary, coach this first\): Clash\./.test(system), "the live coach is told the current skill is Clash");
    assert.ok(/UNLOCKED SKILLS \(the only skills you may coach or evaluate\): Clash, Claim, warrant and impact, Refutation\./.test(system), "and exactly which skills it may coach");
    assert.ok(/LOCKED SKILLS \(never mention, score, or penalise\): Signposting, Constructive speech, Weighing\./.test(system), "and which skills are locked");
    const refused = validateGuidedRequest(baseRequest({ lessonId: CLASH, targetCompetency: "weighing", unlockedCompetencies: ["clash", "claim-warrant-impact", "refutation"] }));
    assert.equal(refused.ok, false, "a request to target a locked skill in the Clash round is refused");
  });

  check("LH. the Clash lesson renders teach-first: frames before the checks, the constructed attempt before the drill CTA, three slots", () => {
    const clashHtml = render(React.createElement(ConceptEducationLessonView, {
      source: clashEntry.source, provenance: MIGRATED_DEBATE_PROVENANCE, moduleLabel: "Round strategy",
      next: null, practiceDrill: clashEntry.practiceDrill
    } as never));
    const text = visible(clashHtml);
    assert.ok(text.includes("Find the real clash") && text.includes("Job 1: Say what each side is trying to prove"), "the rebuilt teaching renders");
    assert.ok(text.includes("Words you can use") && text.includes("Now try the move"), "frames and the constructed attempt render");
    assertOrder(clashHtml, 'id="language"', 'id="practice"', "frames are teaching and precede the checks");
    assertOrder(clashHtml, 'id="scaffolded-try"', 'id="practice-drill"', "the constructed attempt precedes the drill CTA");
    assertOrder(clashHtml, "Job 1: Say what each side is trying to prove", "Which of Side B", "teaching precedes the first check");
    for (const slot of ["1. side a", "2. side b", "3. the real clash"]) assert.ok(text.includes(slot), `slot rendered: ${slot}`);
    const firstSection = clashHtml.slice(clashHtml.indexOf("Job 2: Ask whether both can be true at once"), clashHtml.indexOf("Job 3: Find the question both sides depend on"));
    assert.ok(firstSection.length > 0 && (firstSection.match(/<p class="mt-2 break-words leading-7/g) ?? []).length >= 3, "a section body with blank-line breaks renders as several paragraphs, not a wall");
    assert.ok(clashContent.teachingSections.every((s: { body: string }) => s.body.includes("\n\n")), "every Clash section is paragraphed");
    assert.ok(text.includes("The guided round opens after a complete attempt here."), "the guided round is closed until the move is produced");
    assert.ok(!text.includes("Use it in a guided round"), "no guided link before a complete attempt");
    assert.ok(!/because ___|therefore ___/i.test(text), "no Refutation slots leak into the Clash page");
  });

  check("LI. the live coach's guided post-filter drops any field that names a locked skill, and the generic framing steps aside", () => {
    const { generateSideCoachResponse: _g, ...sc } = require("../lib/side-coach");
    const normalizeSrc = stripComments(read("lib/side-coach.ts"));
    assert.ok(/const namesLockedSkill = \(text: string\) => Boolean\(rubric\) && rubric!\.locked\.some\(\(c\) => mentionsCompetency\(text, c\)\);/.test(normalizeSrc),
      "the post-filter checks every locked competency stem");
    for (const field of ["strength", "improvement", "nextMove"]) {
      assert.ok(new RegExp(`const ${field} = guided \\? clean\\(parsed\\.${field}\\) : parsed\\.${field};`).test(normalizeSrc),
        `${field} is filtered in a guided round and passes through untouched in an ordinary one`);
    }
    assert.ok(/const message = guided \? clean\(rawMessage\) \?\? "" : rawMessage;/.test(normalizeSrc), "and so does the message");
    assert.ok(/return guided && namesLockedSkill\(text\) \? undefined : text;/.test(normalizeSrc), "an ordinary round is untouched by the filter");
    assert.ok(/resolvedGuidedRubric\(input\) \? "This is competitive debate practice inside a lesson\." : trackFraming\(input\.organization\)/.test(normalizeSrc), "the generic 'coach … weighing' framing is replaced in a guided round");
    const guidedSystem = sc.buildSideCoachSystemPrompt({ organization: "DEBATE", transcript: [], requestType: "turn-feedback", guided: { lessonId: CLASH, supportLevel: "HIGH_SUPPORT" } });
    assert.ok(!/Coach claim, warrant, evidence, rebuttal, impact, and weighing\./.test(guidedSystem), "no generic instruction to coach weighing in a Clash round");
    const ordinarySystem = sc.buildSideCoachSystemPrompt({ organization: "DEBATE", transcript: [], requestType: "turn-feedback" });
    assert.ok(/Coach claim, warrant, evidence, rebuttal, impact, and weighing\./.test(ordinarySystem), "control: an ordinary round keeps its framing");
  });

  check("LJ. a locked skill cannot reach a guided ballot through a category's own reason line", () => {
    const leaky = { ...FULL_RESULT, categoryScores: FULL_RESULT.categoryScores.map((c) =>
      c.key === "refutation" ? { ...c, reason: "Good engagement, but you never compare the impacts or say which outweighs the other." } : c) };
    const out = projectGuidedJudgeResult(leaky, clashRubric, CLASH);
    const refutation = out.categoryScores.find((c: { key: string }) => c.key === "refutation");
    assert.ok(refutation, "the unlocked category survives");
    assert.equal(refutation.reason, undefined, "its reason is dropped because it names a locked skill");
    assert.ok(!/outweigh|compare the impacts/i.test(JSON.stringify(out)), "and no locked-skill prose reaches the ballot by any route");
    const clean = projectGuidedJudgeResult(FULL_RESULT, clashRubric, CLASH).categoryScores.find((c: { key: string }) => c.key === "refutation");
    assert.ok(clean.reason, "control: an ordinary reason is kept");
  });

  check("LK. the live coach path takes guided-ness from the ROW, and its glossary stops naming a locked skill", () => {
    const route = stripComments(read("app/api/ai/side-coach/route.ts"));
    assert.ok(/const truth: RowGuidedTruth = input\.debateId \? await guidedTruthFromRow\(input\.debateId, user\.id\) : \{ kind: "ordinary" \};/.test(route),
      "the row is consulted first, and its answer is a three-way truth: guided, ordinary, or unavailable");
    // FAIL CLOSED. An unavailable row refuses the request outright; nothing is taken from the caller.
    assert.ok(/if \(truth\.kind === "unavailable"\) \{\s*return NextResponse\.json\(sideCoachUnavailable\("round-unverified"\)\);\s*\}/.test(route),
      "an unresolvable row REFUSES the request with an honest unavailable response");
    assert.ok(route.indexOf('sideCoachUnavailable("round-unverified")') < route.indexOf("generateSideCoachResponse("), "and it refuses BEFORE any provider call");
    // The caller's claim never becomes guided truth: not as a fallback, not on an ordinary round.
    assert.ok(/const guided = truth\.kind === "guided"\s*\? \{ lessonId: truth\.lessonId, supportLevel: input\.guided\?\.supportLevel \?\? defaultSupportLevel\("guided"\) \}\s*: undefined;/.test(route),
      "guided config comes ONLY from a guided row; on an ordinary row the caller's guided block is discarded");
    assert.ok(!/\?\? input\.guided/.test(route) && !/: input\.guided;/.test(route), "no code path falls back to the caller's guided claim");
    // Inside the helper: a missing or foreign row, a read error, and a LESSON row whose lesson no
    // longer resolves are all UNAVAILABLE — none of them is quietly downgraded to ordinary coaching.
    const helper = route.slice(route.indexOf("async function guidedTruthFromRow"), route.indexOf("export async function POST"));
    assert.ok(/if \(!debate\) return \{ kind: "unavailable" \};/.test(helper), "a missing or foreign row is unavailable");
    assert.ok(/catch \{\s*return \{ kind: "unavailable" \};/.test(helper), "a read error is unavailable");
    assert.ok(/if \(!guidedRubricFor\(lessonId\)\) return \{ kind: "unavailable" \};/.test(helper), "a lesson row whose lesson no longer resolves is unavailable, not ordinary");
    assert.ok(/if \(!lessonId\) return \{ kind: "ordinary" \};/.test(helper), "a real, non-lesson row is ordinary");
    // The unavailable reason is a declared, distinct reason the panel renders as not-evaluated.
    assert.ok(/"round-unverified"/.test(read("lib/side-coach.ts")), "the reason is part of the declared contract");
    // The ORGANIZATION comes from the row too: the coach resolves a rubric only for a Debate request,
    // so a caller sending organization "DECA" on a Debate lesson round would otherwise drop the
    // constraint through the side door — closing the `guided`-omission vector alone left that open.
    assert.ok(/const organization = truth\.kind === "guided" \? truth\.organization : input\.organization;/.test(route),
      "a lesson round is coached as Debate whatever organisation the request claims");
    assert.ok(/return \{ kind: "guided", lessonId, organization: "DEBATE" \};/.test(route), "and that organisation comes from the row's own value");
    // The support level is never RAISED by the override: the row's default is the most permissive.
    assert.ok(/supportLevel: input\.guided\?\.supportLevel \?\? defaultSupportLevel\("guided"\)/.test(route),
      "the caller's support level is kept when they sent one, so the row cannot hand out more help");
    assert.ok(/guidedLessonIdOf\(debate\)/.test(route) && /guidedRubricFor\(lessonId\)/.test(route), "resolved from the row marker against curriculum truth");
    assert.ok(/where: \{ id: debateId, studentId: userId \}/.test(route), "scoped to the owning student");
    assert.ok(/generateSideCoachResponse\(\{\s*\.\.\.input,\s*organization,\s*guided,/.test(route), "and the resolved values are what the coach receives");
    // A guided claim must name the round it is about: without a `debateId` there is no row to check
    // the claim against, so the request is refused rather than coached on the caller's word.
    const validators = require("../lib/validators");
    const noRound = validators.sideCoachRequestSchema.safeParse({ organization: "DEBATE", transcript: [], guided: { lessonId: CLASH, supportLevel: "HIGH_SUPPORT" } });
    assert.equal(noRound.success, false, "a guided coaching request with no round is refused");
    const withRound = validators.sideCoachRequestSchema.safeParse({ organization: "DEBATE", debateId: "abc", transcript: [], guided: { lessonId: CLASH, supportLevel: "HIGH_SUPPORT" } });
    assert.equal(withRound.success, true, "and is accepted when it names one");
    assert.equal(validators.sideCoachRequestSchema.safeParse({ organization: "DECA", transcript: [] }).success, true, "control: an ordinary request needs no round");
    // Auth before rate-limit before body parse is unchanged.
    assert.ok(route.indexOf("requireUser()") < route.indexOf("enforceRateLimit({") && route.indexOf("enforceRateLimit({") < route.indexOf("parseJson(request"), "security ordering preserved: auth, then rate limit, then body parse");
    const coach = stripComments(read("lib/side-coach.ts"));
    assert.ok(/resolvedGuidedRubric\(input\)\s*\?\s*"Explain debate terms in plain words when you use them \(warrant = why your claim is true; impact = why it matters\)\."/.test(coach),
      "the guided glossary drops the weighing definition");
    const guidedSystem = require("../lib/side-coach").buildSideCoachSystemPrompt({ organization: "DEBATE", transcript: [], requestType: "turn-feedback", guided: { lessonId: CLASH, supportLevel: "HIGH_SUPPORT" } });
    const beforeConstraint = guidedSystem.slice(0, guidedSystem.indexOf("GUIDED ROUND for a lesson"));
    assert.ok(!/weighing/i.test(beforeConstraint), "nothing before the constraint names a locked skill");
    const ordinary = require("../lib/side-coach").buildSideCoachSystemPrompt({ organization: "DEBATE", transcript: [], requestType: "turn-feedback" });
    assert.ok(/weighing = why your impact matters more/.test(ordinary), "control: an ordinary round keeps the full glossary");
  });

  check("LL. the teaching additions the review panel required are present and cannot be dropped silently", () => {
    const teaching = [clashContent.explanation, ...clashContent.teachingSections.map((s: { body: string }) => s.body),
      ...clashContent.commonMistakes.flatMap((m: { mistake: string; whyItFails: string; fix: string }) => [m.mistake, m.whyItFails, m.fix]),
      ...clashContent.revisionLadder.flatMap((r: { attempt: string; diagnosis: string; revision: string }) => [r.attempt, r.diagnosis, r.revision]),
      clashContent.scaffoldedTry.prompt].join("\n");
    // DEGREE. The both-true test is taught for the "how much" case, not only for flat contradiction.
    assert.ok(/meaningfully, mostly, or enough/.test(teaching) && /Most real disagreements are about how much/.test(teaching),
      "the both-true test is taught for degree claims, with the threshold words the model answers use");
    // And the degree move stays inside Clash: the cost-benefit look-alike is named as WEIGHING and
    // excluded, rather than modelled as a clash question the way an earlier draft did.
    assert.ok(/Put the amount inside the question/.test(teaching), "the degree move is bounded (B01, one example)");
    // B02 is GUARD-ONLY in the beginner manifest: the cost-benefit look-alike is never presented as a clash question, and the lesson no longer has to say so.
    assert.ok(!/worth (?:the cost|it)/i.test(teaching), "no cost-benefit question anywhere in the teaching (B02, guard-only)");
    // NO-CLASH EXIT. Digging that finds nothing is an honest answer, and the alternative is named.
    assert.ok(/Sometimes the honest result of digging is that there is no shared question/.test(teaching), "the exit condition is taught");
    assert.ok(/Do not invent a link the other side never made/.test(teaching), "and inventing a link is named as the failure");
    // FAIR RESTATEMENT. Taught, and carried by its own mistake and its own ladder rung.
    assert.ok(/Restate each side at the strength they gave it/.test(teaching), "fairness applies to the positions, not only the question");
    assert.ok(clashContent.commonMistakes.some((m: { mistake: string }) => /Restating the other side more weakly/.test(m.mistake)), "the strawman has its own mistake bullet");
    assert.ok(clashContent.revisionLadder.some((r: { diagnosis: string }) => /a position Side B never took/.test(r.diagnosis)), "and a ladder rung repairs one");
    // One rung: the strawman repair, which the worked example does not already teach. The wrong-pairing
    // rung was the worked example re-skinned and was removed in the beginner pass.
    assert.equal(clashContent.revisionLadder.length, 1, "one rung that earns its place");
    assert.ok(!/can be true on the same/.test(clashContent.revisionLadder[0].diagnosis), "the surviving rung is not a second both-true repair");
    // The scaffold makes the learner choose which of two opposing arguments meets Side A.
    assert.ok(/Only ONE of Side B's arguments clashes with Side A/.test(clashContent.scaffoldedTry.prompt), "the constructed attempt exercises the choice, not a flat contradiction");
    // RULE-07b (a real dispute the round does not turn on) is Class C in the frozen manifest: the
    // irrelevant-dispute teaching left the required path with its example. The throwaway stays banned.
    assert.ok(!/blue or green/.test(teaching), "the throwaway example is gone");
  });

  check("LM. the guided round never claims to measure Clash IDENTIFICATION — it measures engagement, and says so", () => {
    const { COMPETENCY_ROUND_MEASURE } = guidedJudge;
    assert.equal(COMPETENCY_ROUND_MEASURE.clash.direct, false, "the round's only Clash-mapped category is an ADJACENT measure");
    assert.equal(COMPETENCY_ROUND_MEASURE.clash.label, "central-clash engagement");
    assert.ok(/constructed attempt in the lesson/.test(COMPETENCY_ROUND_MEASURE.clash.directEvidence), "the direct evidence is named: the scaffolded try");
    // This control read "refutation in a round IS refutation" — a contrast that made the Clash
    // withdrawal meaningful by pointing at a competency a round still measured directly. The final
    // Debate audit withdrew that one too: refutation mapped to the `refutation` and `responsiveness`
    // categories, both marker counts, and length-matched nonsense scored 73 on refutation against a
    // strong speech's 53. So the contrast is gone, and the control now asserts the state that
    // replaced it — no Debate competency claims a direct round measure at all.
    assert.equal(COMPETENCY_ROUND_MEASURE.refutation.direct, false,
      "refutation's round measure was withdrawn with the marker counts behind it");
    assert.ok(/constructed attempt/.test(COMPETENCY_ROUND_MEASURE.refutation.directEvidence ?? ""),
      "and its direct evidence names the lesson's own exercise instead");
    assert.equal(
      Object.values(COMPETENCY_ROUND_MEASURE).filter((measure) => (measure as { direct: boolean }).direct).length, 0,
      "no Debate competency claims a direct round measure while the transcript judge cannot score");
    // The Clash ballot carries the measure and names itself by it — never "Clash:" alone under a
    // "new skill" heading.
    const ballot = projectGuidedJudgeResult(FULL_RESULT, clashRubric, CLASH);
    assert.deepEqual(ballot.guidedFeedback.measure, COMPETENCY_ROUND_MEASURE.clash);
    assert.ok(/^Clash in the round \(central-clash engagement\)/.test(ballot.guidedFeedback.newSkill), `named by what was measured: ${ballot.guidedFeedback.newSkill}`);
    assert.ok(!/you can identify|proved you can|identified the clash/i.test(JSON.stringify(ballot)), "no identification claim anywhere on the ballot");
    const refutationBallot = projectGuidedJudgeResult(FULL_RESULT, rubric, PILOT);
    // Was "control: a direct measure keeps the plain skill name". Refutation's direct claim was
    // withdrawn with the marker counts behind it, so its ballot now takes the SAME adjacent form the
    // Clash ballot takes — headed by what the round actually showed rather than by the skill name.
    // That is the withdrawal reaching the learner-facing ballot, which is the point of it.
    assert.ok(/^Refutation in the round \(/.test(refutationBallot.guidedFeedback.newSkill),
      `an adjacent measure is named by what was measured: ${refutationBallot.guidedFeedback.newSkill}`);
    assert.ok(!/^Refutation:/.test(refutationBallot.guidedFeedback.newSkill),
      "and no longer claims the plain skill name a direct measure would have earned");
    // The provider is told the same truth, for Clash only.
    assert.ok(/this round shows central-clash engagement only[\s\S]*do not say the student can or cannot identify the clash/.test(guidedJudgeProseInstruction(clashRubric)), "the prose contract forbids an identification verdict");
    assert.ok(!/central-clash engagement/.test(guidedJudgeProseInstruction(rubric)), "control: the Refutation contract carries no such clause");
    // The arena renders the adjacent card by what it measured and points at the direct check.
    const arena = stripComments(read("components/debate/debate-arena.tsx"));
    assert.ok(/report\.guidedFeedback\.measure && !report\.guidedFeedback\.measure\.direct \? \([\s\S]{0,200}title="How you applied it in the round"/.test(arena), "an adjacent measure is headed as application, not as a new skill");
    assert.ok(/This round measured \{report\.guidedFeedback\.measure\.label\}, not whether you can identify the clash\./.test(arena), "and the learner is told exactly what was and was not measured");
    assert.ok(/<InsightCard title="Your new skill" value=\{report\.guidedFeedback\.newSkill\} \/>/.test(arena), "control: a direct measure keeps the new-skill card");
    // The required retry stays tied to the DIRECT task: the round's retry link reopens the scaffold.
    assert.ok(/#scaffolded-try/.test(arena), "the retry link reopens the constructed attempt");
    assert.ok(/retry the move in the lesson, then come back/.test(arena), "and the copy says the move is retried in the lesson");
    // Weighing cannot re-enter through the Clash mapping — and as of 2026-09-07 there is no mapping
    // left to re-enter through: the category it pointed at was a marker count and was withdrawn, so
    // `clash` maps to nothing. The Clash round still excludes the key, which is what this guards.
    assert.equal(guidedJudge.JUDGE_CATEGORY_COMPETENCY.clash, undefined, "control: no category maps to weighing");
    assert.ok(!allowedJudgeCategories(clashRubric).includes("clash"), "and it is not allowed in a Clash round");
  });

  check("LN. Clash for beginners: the four frozen A-rules and the charter's regression routes are pinned in the learner's words", () => {
    const sec = clashContent.teachingSections as Array<{ heading: string; body: string }>;
    const [j1, j2, j3, j4] = sec.map((s) => s.body);
    const required: string[] = [clashContent.objective, clashContent.explanation, ...sec.map((s) => s.heading + "\n\n" + s.body), clashContent.whyMatters, ...clashContent.steps,
      ...Object.values(clashContent.workedExample as Record<string, string>),
      ...clashContent.revisionLadder.flatMap((r: Record<string, string>) => Object.values(r)), ...Object.values(clashContent.misconception as Record<string, string>),
      ...clashContent.commonMistakes.flatMap((m: Record<string, string>) => Object.values(m)), ...clashContent.languageFrames.flatMap((g: { purpose: string; starters: string[] }) => [g.purpose, ...g.starters])];
    const all = [...required, clashContent.scaffoldedTry.prompt, clashContent.scaffoldedTry.frame, ...clashChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation]), clashEntry.source.description, clashEntry.source.lesson.summary].join("\n");
    assert.deepEqual(sec.map((s) => s.heading), ["Job 1: Say what each side is trying to prove", "Job 2: Ask whether both can be true at once", "Job 3: Find the question both sides depend on", "What clash is not"], "three jobs and the boundary");
    // RULE-01 — the both-true test, on OPPOSITE-side arguments, with the paradigm pair and the reversal.
    assert.ok(/Sounding opposed is not the test; the test is whether both can be true at the same time\./.test(j2), "RULE-01 stated");
    assert.ok(/Both can be true, so no clash yet\./.test(j2) && /Now both cannot be true\. That is a clash\./.test(j2), "and shown on one pair, both ways");
    assert.ok(/Opposite sides tell you where to look for a clash\. They do not make one\./.test(clashContent.commonMistakes[0].whyItFails) && /can both be true at once/.test(clashContent.misconception.whyItFails), "opposite-side scope is where you look, never the test; the misconception card carries the both-true reason once");
    // RULE-02 + B06.
    assert.ok(/One sentence per side, in words they would accept\./.test(j1) && /Restate each side at the strength they gave it\./.test(j1), "RULE-02 and fair restatement");
    // RULE-04 — one level down, opposite ways, different words.
    assert.ok(/Ask what each argument needs to be true to work\./.test(j3) && /The thing both need, going opposite ways, is the clash\./.test(j3), "RULE-04 stated");
    assert.ok(/if this were false, would the argument still stand\? What would break it is what it needs\./.test(j3), "and the needs move is explained as a how-to, not only shown");
    assert.ok(/It usually sits one level below what either speaker said, in different words on each side\./.test(j3));
    // RULE-05 — a question either side could still win, narrower than the motion, no loaded word.
    assert.ok(/State it as a question either side could still win, narrower than the motion\./.test(j3) && /that word is doing your arguing for you\. Take it out\./.test(j3), "RULE-05 stated");
    // Motion ≠ clash, taught once in the boundary section.
    assert.ok(/Not the motion\. “The clash is whether the cafeteria should go meat-free” tells the judge nothing; every argument fits under it\./.test(j4), "motion is not the clash");
    // The first complete clash (pair → both true → what each needs → the question) lands inside the explanation's first 100 words.
    const expl = clashContent.explanation; const at = (re: RegExp) => expl.slice(0, expl.search(re)).trim().split(/\s+/).length;
    assert.ok(expl.search(/That is the real disagreement: will students actually eat/) > 0 && at(/That is the real disagreement/) <= 100, "a real clash is shown before any definition");
    // REGRESSION ROUTES the charter names. Each is a sentence a simplifier could write; none may appear.
    for (const route of [/automatically (?:clash|disagree|in clash)/i, /opposite sides?,? (?:so|therefore|which means) they clash/i, /both (?:can|could) be true,? (?:so|then) one (?:of them )?(?:must be|is) wrong/i, /(?:if|when) both (?:can|could) be true,? there (?:can never be|is never|cannot be) a clash/i, /the motion is the clash/i, /agree(?:ing)? (?:on|about) (?:the )?direction[^.]{0,40}no clash/i, /(?:weighing|refutation) (?:is|and clash are) the same/i, /worth (?:the cost|it)/i]) {
      assert.ok(!route.test(all), `regression route absent: ${route}`);
    }
    // Frames give shape only: no starter names a winner or a verdict.
    for (const g of clashContent.languageFrames) for (const st of g.starters) assert.ok(/___/.test(st) && !/\b(wins?|right|wrong|should win|fails?|better)\b/i.test(st), `starter supplies shape only: ${st}`);
    assert.ok(/^Side A argues ___\. Side B argues ___\. The real clash is whether ___\.$/.test(clashContent.scaffoldedTry.frame), "the one-sentence clash frame");
    // Beginner ceilings (floors retired in f0e17f7). The required path here is dominated by 52 pinned depth fields.
    const wc = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    for (const field of required) {
      for (const para of field.split(/\n\n+/)) assert.ok(wc(para) <= 65, `no paragraph above 65 words: ${para.slice(0, 60)}`);
      for (const sentence of field.replace(/\n+/g, " ").split(/(?<=[.?!][)”"]?)\s+(?=[A-Z“"(])/)) assert.ok(wc(sentence) <= 40, `no sentence above 40 words: ${sentence.slice(0, 60)}`);
    }
    assert.ok(required.map(wc).reduce((a, b) => a + b, 0) <= 1100, `required path ceiling: ${required.map(wc).reduce((a, b) => a + b, 0)}`);
    // Length lattice and lone-cue rules on the three checks, as for the other beginner lessons.
    const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "it", "is", "are", "that", "this", "them", "they", "you", "your", "both", "for", "with", "not", "no", "so", "at", "as", "by", "one", "two", "their", "its", "what", "which", "when", "than", "then", "does", "do", "up"]);
    const words = (t: string) => (t.toLowerCase().match(/[a-z’'-]+/g) ?? []);
    const MODALS = /\b(can|could|may|might|would|should|must|whichever|whatever|whoever|any)\b/i;
    clashChecks.forEach((q, i) => {
      const lens = q.choices.map(wc), chars = q.choices.map((o) => o.length); const k = q.choices.indexOf(q.correctAnswer);
      const mw = Math.max(...lens), nw = Math.min(...lens), mc = Math.max(...chars), nc = Math.min(...chars);
      assert.ok(!(lens.filter((x) => x === mw).length === 1 && lens[k] === mw) && !(lens.filter((x) => x === nw).length === 1 && lens[k] === nw), `Q${i + 1}: key not uniquely longest or shortest by words`);
      assert.ok(!(chars.filter((x) => x === mc).length === 1 && chars[k] === mc) && !(chars.filter((x) => x === nc).length === 1 && chars[k] === nc), `Q${i + 1}: nor by characters`);
      assert.ok(mw - nw <= 5 && mc - nc <= 16, `Q${i + 1}: options are length-matched (${lens.join("/")} words, ${chars.join("/")} chars)`);
      const stem = new Set(words(q.prompt)); const echoes = q.choices.map((o) => { const w = words(o); const last = w[w.length - 1]; return Boolean(last) && !STOP.has(last) && stem.has(last); });
      assert.ok(!(echoes[k] && echoes.filter(Boolean).length === 1), `Q${i + 1}: the key is not the only option whose final word echoes the stem`);
      const modal = q.choices.map((o) => MODALS.test(o)); assert.ok(!(modal[k] && modal.filter(Boolean).length === 1), `Q${i + 1}: the key is not the only option with a modal`);
    });
    assert.deepEqual(clashChecks.map((q) => "ABCD"[q.choices.indexOf(q.correctAnswer)]), ["C", "B", "D"], "keys as authored and reviewed");
  });


  // ================================================================================================
  // ROUND ORIENTATION — a CONCEPTUAL lesson repaired after an audit, not rebuilt. It proves the
  // model is applied per lesson: no guided round, no frames, no ladder; a small tracking scenario.
  // ================================================================================================
  const ORIENT = "debate-round-orientation";
  const orientEntry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === ORIENT);
  const orient = orientEntry.source.lesson.content;
  const { evaluateRoundTrackingScaffold } = coaching;

  check("MA. Round Orientation is conceptual: no guided application, no frames, no ladder, one small scenario, three checks", () => {
    assert.equal(guidedApplicationFor(ORIENT), null, "no guided round is declared — and none is added for consistency's sake");
    assert.equal(guidedRubricFor(ORIENT), null);
    assert.equal(orient.languageFrames, undefined, "no language frames: there is no speaking move to scaffold");
    assert.equal(orient.revisionLadder, undefined, "no revision ladder: no authored performance is rewritten");
    assert.equal(orient.additionalExamples, undefined, "the scenario is the second example");
    assert.equal(orient.teachingSections.length, 3); assert.ok(orient.misconception); assert.equal(orient.commonMistakes.length, 4);
    assert.equal(1 + orient.practiceQuestions.length + orient.masteryCheck.length, 3, "five checks became three");
    assert.ok(orient.scaffoldedTry && orient.scaffoldedTry.slots.length === 3, "one small round-tracking scenario");
    assert.ok(!("skillSlug" in orientEntry) || !orientEntry.skillSlug, "still no skillSlug (formative only, by design)");
    assert.ok(!orientEntry.practiceDrill, "still no practice drill");
    const words = (t: string) => (t.match(/[A-Za-z\u2019'-]+/g) ?? []).length;
    // Sized for orientation, not for Clash. Two bounds, stated separately because they answer
    // different questions: the teaching PROSE (objective, explanation, why it matters, steps,
    // sections) is what a beginner reads to get the map; the example, misconception, mistakes and
    // scenario are the parts that put the map to work. Neither may inflate toward Clash's 3,500.
    const prose = [orient.objective, orient.explanation, orient.whyMatters, ...orient.steps, ...orient.teachingSections.map((s: { heading: string; body: string }) => s.heading + " " + s.body)]
      .map(words).reduce((a: number, b: number) => a + b, 0);
    const applied = [orient.workedExample.prompt, orient.workedExample.weakAnswer, orient.workedExample.strongAnswer, orient.workedExample.whyItWorks,
      orient.misconception.wrongModel, orient.misconception.whyItFails, orient.misconception.betterModel,
      ...orient.commonMistakes.flatMap((m: { mistake: string; whyItFails: string; fix: string }) => [m.mistake, m.whyItFails, m.fix]),
      orient.scaffoldedTry.prompt, orient.scaffoldedTry.frame].map(words).reduce((a: number, b: number) => a + b, 0);
    // FLOOR RETIRED (beginner-simplification milestone 1). The lower bound was an anti-thin
    // proxy — "more words = safer lesson" — and it blocked the beginner standard. Thinness is now
    // guarded by the reviewed doctrine manifest (scripts/debate-beginner-manifests.json,
    // debate-manifest-gate-smoke) plus human REMOVE-QUESTIONS / beginner-comprehension review.
    // The CEILING stays: it protects against the opposite failure, which is still real.
    assert.ok(prose <= 1300, `teaching prose is orientation-sized: ${prose} words`);
    assert.ok(prose + applied <= 1800, `whole lesson stays far from Clash's size: ${prose + applied} words`);
  });

  check("MB. the two semantic corrections are taught as written, and the absolute dropped-argument rule is not", () => {
    const text = [orient.explanation, ...orient.teachingSections.map((s: { body: string }) => s.body), orient.workedExample.whyItWorks,
      orient.misconception.whyItFails, ...orient.commonMistakes.map((m: { whyItFails: string }) => m.whyItFails)].join("\n");
    assert.ok(/they have given the judge less reason to reject it/.test(text), "silence is taught as LESS REASON TO REJECT, not as an automatic point");
    assert.ok(!/judge (will )?counts? it|treats? it as (still )?true|automatically (wins|true)/i.test(text), "no absolute dropped-argument doctrine");
    assert.ok(/two separate questions/.test(text) && /Was it answered: yes or no/.test(text) && /what state is it in now/.test(text), "answered? and current state? are taught as two separate questions");
    assert.ok(/An argument that was answered can still be very much alive/.test(text), "answered and still standing is explicitly possible — the statuses are not one bucket");
    assert.ok(/still unresolved/.test(text) && /no response at all/.test(text), "the teaching uses the scenario's own words for argument state");
    assert.deepEqual(orient.scaffoldedTry.slots, ["answered", "still unresolved", "no response"], "the scenario asks three separate questions, not one status per argument");
  });

  check("MC. the worked example MOVES and is accurate: answered, defended, and one argument left alone", () => {
    const { strongAnswer, weakAnswer, whyItWorks } = orient.workedExample;
    assert.ok(/On concentration:/.test(strongAnswer) && /On that:/.test(strongAnswer), "Side B answers Side A's REASON and Side A defends it — the reply is aimed at the argument, not a separate concern");
    assert.ok(/Nothing was said about the money/.test(strongAnswer), "one argument is visibly left without a response");
    assert.ok(/nobody answers anything/.test(whyItWorks), "the weak version is a round where nothing changes, not a rude one");
    assert.ok(!/outweigh|magnitude|probability|matters more/i.test(strongAnswer + whyItWorks), "no weighing criterion is named");
    assert.ok(!/because .* therefore/i.test(strongAnswer), "no refutation chain is modelled");
    assert.ok(weakAnswer.split("Also,").length >= 3, "control: the weak version really is a list");
  });

  check("MD. style neutrality and ownership: no procedural claims, no later-skill method", () => {
    const all = JSON.stringify(orient);
    for (const procedural of ["first speaker", "second speaker", "cross-examination", "cross examination", "minutes", "affirmative must", "negative must", "government must", "opposition must", "new arguments are not allowed", "rebuttal speech"]) {
      assert.ok(!all.toLowerCase().includes(procedural), `no format-specific procedure: ${procedural}`);
    }
    assert.ok(/Formats differ in speech names, order and timing/.test(orient.explanation), "the format disclaimer stays");
    assert.ok(/mostly constructive/.test(orient.explanation) && /mostly responsive/.test(orient.explanation), "the phase claim stays hedged");
    for (const method of ["they say ___", "because ___. Therefore", "outweigh", "compare the impacts", "the real clash is whether", "signpost", "warrant test", "delete test"]) {
      assert.ok(!all.toLowerCase().includes(method.toLowerCase()), `no later-skill method: ${method}`);
    }
    assert.ok(/the Claim, Warrant, Impact lesson teaches how to build one/.test(orient.explanation), "argument-building is deferred, not taught");
    assert.ok(/a skill with its own lesson later/.test(orient.teachingSections[2].body), "weighing is pointed at, not taught");
  });

  check("ME. the tracking-scenario evaluator is shape-only, exact, and never writes the answer", () => {
    const good = { answered: "projects show understanding", unresolved: "whether projects show the student or the home", noResponse: "exam week costs two weeks of lessons" };
    assert.deepEqual(evaluateRoundTrackingScaffold(good), { complete: true, coach: "", retryRequired: false });
    for (const k of ["answered", "unresolved", "noResponse"] as const) {
      const r = evaluateRoundTrackingScaffold({ ...good, [k]: "" });
      assert.equal(r.retryRequired, true, `${k} missing → retry`); assert.ok(!r.coach.includes(good[k]), "the coach never supplies the answer");
    }
    const same = evaluateRoundTrackingScaffold({ ...good, noResponse: good.answered });
    assert.ok(same.retryRequired && /cannot be the same one/.test(same.coach), "the same argument under answered and no-response is sent back");
    const src = stripComments(read("lib/education/coaching.ts"));
    const body = src.slice(src.indexOf("export function evaluateRoundTrackingScaffold"), src.indexOf("export type ScaffoldContext"));
    assert.ok(!/overlap\(|containedIn|obviously|should\b/.test(body), "no word-overlap or loaded-word heuristics");
    assert.equal(evaluateScaffoldFor(ORIENT, [good.answered, good.unresolved, good.noResponse]).complete, true, "dispatched by lesson id");
  });

  check("MF. the orientation page renders teach-first, ends at the scenario, and offers NO guided round", () => {
    const html = render(React.createElement(ConceptEducationLessonView, {
      source: orientEntry.source, provenance: MIGRATED_DEBATE_PROVENANCE, moduleLabel: "Argument construction", next: null, practiceDrill: undefined
    } as never));
    const text = visible(html);
    assert.ok(text.includes("A round is a set of arguments that change") && text.includes("Now try the move"), "sections and the scenario render");
    assertOrder(html, "A round is a set of arguments that change", "What are they choosing between", "teaching precedes the first check");
    assert.ok(!text.includes("Words you can use"), "no frames section");
    assert.ok(!text.includes("Use it in a guided round") && !text.includes("The guided round opens after"), "no guided-round link or promise of one");
    for (const slot of ["1. answered", "2. still unresolved", "3. no response"]) assert.ok(text.includes(slot), `slot rendered: ${slot}`);
    assert.ok(!/practice-drill/.test(html) || !text.includes("Practice this skill"), "no drill CTA for a lesson with no drill");
  });

  // ================================================================================================
  // EVIDENCE EVALUATION — MIXED lesson repaired after an audit: a bounding scenario, no guided round.
  // ================================================================================================
  const EVID = "debate-evidence-evaluation";
  const evidEntry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === EVID);
  const evid = evidEntry.source.lesson.content;
  const { evaluateEvidenceScaffold } = coaching;

  check("NA. Evidence Evaluation is MIXED: a bounding scenario, no guided round, no frames, no ladder; the durable drill stays", () => {
    assert.equal(guidedApplicationFor(EVID), null, "no guided round is declared");
    assert.equal(evid.languageFrames, undefined, "no language frames: judgment, not sentence production");
    assert.equal(evid.revisionLadder, undefined); assert.equal(evid.additionalExamples, undefined);
    assert.equal(evid.teachingSections.length, 3); assert.ok(evid.misconception); assert.equal(evid.commonMistakes.length, 5);
    assert.equal(1 + evid.practiceQuestions.length + evid.masteryCheck.length, 4, "five checks became four distinct judgments");
    assert.deepEqual(evid.scaffoldedTry.slots, ["shows", "does not yet establish", "would need"]);
    assert.equal(evidEntry.skillSlug, "debate-evidence", "the durable drill's skill is untouched");
    assert.deepEqual(evidEntry.practiceDrill, { track: "debate", area: "evidence-evaluation" }, "and so is its drill");
    const words = (t: string) => (t.match(/[A-Za-z\u2019'-]+/g) ?? []).length;
    const prose = [evid.objective, evid.explanation, evid.whyMatters, ...evid.steps, ...evid.teachingSections.map((s: { heading: string; body: string }) => s.heading + " " + s.body)].map(words).reduce((a: number, b: number) => a + b, 0);
    // FLOOR RETIRED (beginner-simplification milestone 1). The lower bound was an anti-thin
    // proxy — "more words = safer lesson" — and it blocked the beginner standard. Thinness is now
    // guarded by the reviewed doctrine manifest (scripts/debate-beginner-manifests.json,
    // debate-manifest-gate-smoke) plus human REMOVE-QUESTIONS / beginner-comprehension review.
    // The CEILING stays: it protects against the opposite failure, which is still real.
    assert.ok(prose <= 1500, `teaching prose inside the guard: ${prose} words`);
  });

  check("NB. the owner's four precision rulings are taught as written, and the crude versions are not", () => {
    const text = [evid.explanation, ...evid.teachingSections.map((s: { body: string }) => s.body), ...evid.commonMistakes.flatMap((m: { whyItFails: string; fix: string }) => [m.whyItFails, m.fix])].join("\n");
    assert.ok(/supports a claim about that case\. On its own it usually cannot prove a claim about many\./.test(text), "generalisation: one case supports a claim about that case; not by itself a broad claim");
    assert.ok(!/one case proves one case/.test(text), "the crude 'one case proves one case' is not taught");
    // B08 (repeated source ≠ corroboration) is GUARD-ONLY in the beginner manifest: no learner prose; the crude form stays banned below.
    // B08 is GUARD-ONLY in the beginner manifest: the several-findings nuance leaves the prose; the crude form stays banned below.
    assert.ok(!/counts once|count once|counts as one\b/.test(text), "the crude 'counts once' is not taught");
    assert.ok(/it earns less confidence than a result you can check/.test(text), "undescribed method: limited confidence, never rejection");
    assert.ok(!/counts as (an )?assertion|= assertion|becomes an assertion/.test(text), "no 'undisclosed method = assertion'");
    assert.ok(/not a reason to throw the result away/.test(text), "conflict of interest: scrutiny, not rejection");
    assert.ok(/Take the evidence as true\. You do not have to disprove it, or look anything up\./.test(evid.explanation), "in-round: take it as true, show how far it reaches (B03)");
    assert.equal(evid.scaffoldedTry.motion, undefined, "the claim under evaluation is NOT smuggled into the motion field");
    assert.equal(evid.scaffoldedTry.opponentClaim, undefined, "nor into opponentClaim — no field is made to lie");
  });

  check("NC. the worked example bounds the WINNING evidence: shows / does not show / still needed, with no weighing", () => {
    const { strongAnswer, weakAnswer, whyItWorks } = evid.workedExample;
    for (const beat of ["What it shows:", "What it does not show:", "What is still needed:"]) assert.ok(strongAnswer.includes(beat), `beat present: ${beat}`);
    assert.ok(/still bigger than its evidence/.test(strongAnswer), "the claim as stated is sized against the evidence");
    assert.ok(/The claim is proved\./.test(weakAnswer), "the first impression stops at 'real data with a comparison'");
    // RULE-08 (comparing competing evidence) is Class C in the beginner manifest: the comparison beat left the worked example.
    assert.ok(/grants that; and names what is left\./.test(whyItWorks), "the evaluation grants, then names the gap");
    assert.ok(!/outweigh|impact matters more|magnitude|probability/i.test(strongAnswer + whyItWorks), "no weighing vocabulary");
    assert.ok(!/deserves more weight/.test(evid.objective), "the objective no longer headlines 'deserves more weight'");
    assert.ok(/what it leaves unproven/.test(evid.objective), "it headlines bounding");
  });

  check("ND. the bounding-scenario evaluator is shape-only, exact, and dispatched by lesson id", () => {
    const good = { shows: "on one street, on one Saturday, traffic was a third lighter than the week before", notYet: "that the whole city's car traffic fell, or that it stays down", need: "traffic on several streets over months, compared with a similar city" };
    assert.deepEqual(evaluateEvidenceScaffold(good), { complete: true, coach: "", retryRequired: false });
    for (const k of ["shows", "notYet", "need"] as const) {
      const r = evaluateEvidenceScaffold({ ...good, [k]: "" }); assert.equal(r.retryRequired, true, `${k} missing → retry`); assert.ok(!r.coach.includes(good[k]));
    }
    const same = evaluateEvidenceScaffold({ ...good, notYet: good.shows });
    assert.ok(same.retryRequired && /cannot be the same thing/.test(same.coach), "shows and does-not-yet-establish must differ");
    const src = stripComments(read("lib/education/coaching.ts"));
    const body = src.slice(src.indexOf("export function evaluateEvidenceScaffold"), src.indexOf("export type ScaffoldContext"));
    assert.ok(!/overlap\(|containedIn|obviously|\bshould\b/.test(body), "no word-overlap or loaded-word heuristics");
    assert.equal(evaluateScaffoldFor(EVID, [good.shows, good.notYet, good.need]).complete, true, "dispatched by lesson id");
    const withTry = LEARNING_SKILL_CATALOG.filter((e: { lesson: { content: { scaffoldedTry?: unknown } } }) => e.lesson.content.scaffoldedTry).map((e: { slug: string }) => e.slug).sort();
    assert.deepEqual(withTry, Object.keys(SCAFFOLD_EVALUATORS).sort(), "every scaffolded lesson has an evaluator, none orphaned");
  });

  check("NE. the evidence page renders teach-first, ends at the scenario, offers no guided round, and keeps its drill CTA", () => {
    const html = render(React.createElement(ConceptEducationLessonView, {
      source: evidEntry.source, provenance: MIGRATED_DEBATE_PROVENANCE, moduleLabel: "Argument construction", next: null, practiceDrill: evidEntry.practiceDrill
    } as never));
    const text = visible(html);
    assert.ok(text.includes("Job 1: Say what the evidence actually shows") && text.includes("Now try the move"), "sections and the scenario render");
    assertOrder(html, "Job 1: Say what the evidence actually shows", "What is the problem with this evidence", "teaching precedes the first check");
    assertOrder(html, 'id="scaffolded-try"', 'id="practice-drill"', "the constructed attempt precedes the drill CTA");
    assert.ok(!text.includes("Words you can use"), "no frames section");
    assert.ok(!text.includes("Use it in a guided round") && !text.includes("The guided round opens after"), "no guided-round link or promise");
    for (const slot of ["1. shows", "2. does not yet establish", "3. would need"]) assert.ok(text.includes(slot), `slot rendered: ${slot}`);
  });

  check("NF. ownership: the warrant is pointed at, not retaught; no research-method or weighing teaching", () => {
    const all = JSON.stringify(evid);
    assert.ok(/Claim, Warrant, Impact lesson[’']s job/.test(evid.explanation), "the reasoning link is deferred to CWI");
    // Exactly twice: once naming the connection ("That connection is the warrant, the reasoning that
    // says why…") so evidence and reasoning stay distinct, once in the pointer to CWI. Never a third
    // time — a third use would be teaching how to build one, which is CWI's job.
    assert.equal((all.match(/\bwarrant\b/gi) ?? []).length, 2, "the noun 'warrant' appears twice: the one-line distinction and the CWI pointer (the verb 'warrants caution' is ordinary English)");
    assert.ok(/Debaters call the link between evidence and claim the warrant; building one is the Claim, Warrant, Impact lesson[’']s job\./.test(all), "the noun is named once and pointed at CWI, never built");
    for (const banned of ["p-value", "statistical significance", "confidence interval", "sample size of", "peer review", "peer-review", "outweigh", "impact matters more", "fallacy", "ad hominem", "indict", "corroborat", "external validity", "correlation"]) {
      assert.ok(!all.toLowerCase().includes(banned), `no out-of-scope teaching: ${banned}`);
    }
    assert.ok(/You do not have to disprove it, or look anything up\./.test(evid.explanation), "the in-round scope is stated");
  });

  check("NG. Evidence for beginners: the seven frozen A-rules in the learner's words, the charter's regression routes banned, ceilings and check lattice", () => {
    const sec = evid.teachingSections as Array<{ heading: string; body: string }>;
    const [e1, e2, e3] = sec.map((x) => x.body);
    const required: string[] = [evid.objective, evid.explanation, ...sec.map((x) => x.heading + "\n\n" + x.body), evid.whyMatters, ...evid.steps,
      ...Object.values(evid.workedExample as Record<string, string>), ...Object.values(evid.misconception as Record<string, string>),
      ...evid.commonMistakes.flatMap((m: Record<string, string>) => Object.values(m))];
    const evidChecks = [evid.guidedQuestion, ...evid.practiceQuestions, ...evid.masteryCheck] as Array<{ prompt: string; choices: string[]; correctAnswer: string; explanation: string }>;
    const all = [...required, evid.scaffoldedTry.prompt, evid.scaffoldedTry.frame, ...evidChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation]), evidEntry.source.description, evidEntry.source.lesson.summary].join("\n");
    assert.deepEqual(sec.map((x) => x.heading), ["Job 1: Say what the evidence actually shows", "Job 2: Does it match the claim?", "Job 3: Name the gap, and the problem"], "three jobs");
    // RULE-01 / RULE-02 / RULE-03.
    assert.ok(/Evidence gives the judge a reason to believe a claim; it does not prove the claim by itself\./.test(evid.explanation), "RULE-01");
    assert.ok(/Start from the claim: say in one sentence what would have to be shown for it to hold\./.test(e1), "RULE-02");
    assert.ok(/what was measured or observed, in whom, over what period, compared with what/.test(e1), "RULE-03");
    // RULE-04 fit, RULE-05 size (+ B04), RULE-06 cause (+ B05), RULE-07 grant and gap.
    assert.ok(/Fit: evidence about something nearby is not evidence about the claim\./.test(e2) && /A real, expert, trustworthy source can still be answering the wrong question\./.test(e2), "RULE-04");
    assert.ok(/Size: evidence from one case, one place, or one group supports a claim about that case\./.test(e2) && /leaves the rest still a claim/.test(e2), "RULE-05");
    assert.ok(/is not one causing the other until the other explanations are dealt with\./.test(e2) && /rules out only the explanations both groups share\./.test(e2), "RULE-06 + B05");
    assert.ok(/Take the evidence as true, say what it does establish, name what is still unproven, and shrink the claim to fit what is left\./.test(e3), "RULE-07");
    assert.ok(/which the evidence supports\./.test(e3) && !/carries/.test(evid.workedExample.strongAnswer), "the sized claim is one the evidence SUPPORTS (recorded residual), never carries");
    // Plain-English evidence attack: a specific problem and its consequence, never source trash-talk or the word indict.
    assert.ok(/“That source is bad” tells the judge nothing\./.test(e3) && /names the problem and what follows from it\./.test(e3), "specific problem → consequence");
    // The mismatch is shown before any definition: inside the explanation's first 60 words.
    const at = evid.explanation.search(/The claim goes further than the evidence\./); assert.ok(at > 0 && evid.explanation.slice(0, at).trim().split(/\s+/).length <= 60, "the learner sees the gap first");
    // Regression routes the charter names.
    for (const route of [/naming (?:a|the) (?:study|source) is enough/i, /(?:a )?real source (?:automatically )?(?:proves|is enough)/i, /(?:credible|trustworthy|expert) (?:source|study)[^.]{0,30}(?:so|therefore) the (?:claim|argument) (?:is|stands|holds)/i, /(?:proves|supports) the (?:larger|bigger|whole|full) claim/i, /so throw (?:it|the result) (?:out|away)/i, /(?:are|is) the same question/i, /(?:the )?(?:study|source) (?:is|was) (?:from|by) (?:harvard|oxford|a university)[^.]{0,20},? so/i]) {
      assert.ok(!route.test(all), `regression route absent: ${route}`);
    }
    // Ceilings (floors retired in f0e17f7).
    const wc = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    for (const field of required) {
      for (const para of field.split(/\n\n+/)) assert.ok(wc(para) <= 65, `no paragraph above 65 words: ${para.slice(0, 60)}`);
      for (const sentence of field.replace(/\n+/g, " ").split(/(?<=[.?!][)”"]?)\s+(?=[A-Z“"(])/)) assert.ok(wc(sentence) <= 40, `no sentence above 40 words: ${sentence.slice(0, 60)}`);
    }
    assert.ok(required.map(wc).reduce((a, b) => a + b, 0) <= 1000, `required path ceiling: ${required.map(wc).reduce((a, b) => a + b, 0)}`);
    // Check lattice and lone-cue rules.
    const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "it", "is", "are", "that", "this", "them", "they", "you", "your", "both", "for", "with", "not", "no", "so", "at", "as", "by", "one", "two", "their", "its", "what", "which", "when", "than", "then", "does", "do", "up"]);
    const words = (t: string) => (t.toLowerCase().match(/[a-z’'-]+/g) ?? []); const MODALS = /\b(can|could|may|might|would|should|must|whichever|whatever|whoever|any)\b/i;
    evidChecks.forEach((q, i) => {
      const lens = q.choices.map(wc), chars = q.choices.map((o) => o.length); const k = q.choices.indexOf(q.correctAnswer);
      const mw = Math.max(...lens), nw = Math.min(...lens), mc = Math.max(...chars), nc = Math.min(...chars);
      assert.ok(!(lens.filter((x) => x === mw).length === 1 && lens[k] === mw) && !(lens.filter((x) => x === nw).length === 1 && lens[k] === nw), `Q${i + 1}: key not uniquely longest or shortest by words`);
      assert.ok(!(chars.filter((x) => x === mc).length === 1 && chars[k] === mc) && !(chars.filter((x) => x === nc).length === 1 && chars[k] === nc), `Q${i + 1}: nor by characters`);
      assert.ok(mw - nw <= 5 && mc - nc <= 16, `Q${i + 1}: options are length-matched (${lens.join("/")} words, ${chars.join("/")} chars)`);
      const stem = new Set(words(q.prompt)); const echoes = q.choices.map((o) => { const w = words(o); const last = w[w.length - 1]; return Boolean(last) && !STOP.has(last) && stem.has(last); });
      assert.ok(!(echoes[k] && echoes.filter(Boolean).length === 1), `Q${i + 1}: the key is not the only option whose final word echoes the stem`);
      const modal = q.choices.map((o) => MODALS.test(o)); assert.ok(!(modal[k] && modal.filter(Boolean).length === 1), `Q${i + 1}: the key is not the only option with a modal`);
    });
    assert.deepEqual(evidChecks.map((q) => "ABCD"[q.choices.indexOf(q.correctAnswer)]), ["D", "A", "C", "B"], "keys as authored and reviewed");
  });


  // ================================================================================================
  // P. ANSWER TYPES — the perfection repair (2026-09-06). The audit found 421 words of teaching
  // against 1,099 words of quiz, five ideas taught ONLY inside question explanations, two questions
  // testing speech-level strategy the curriculum never teaches, and — measured, not asserted — the
  // key as the uniquely longest option in all 7 items. What follows pins the repair: the settled
  // taxonomy, the vocabulary that may not come back, the four rebuilt checks, and a scenario whose
  // reasoning is shape-only while its label is exact.
  // ================================================================================================
  const AT = "debate-answer-types";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const atEntry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === AT) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const at = atEntry.source.lesson.content as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const atChecks = [at.guidedQuestion, ...at.practiceQuestions, ...at.masteryCheck] as Array<{ prompt: string; choices: string[]; correctAnswer: string; explanation: string }>;
  // EVERY learner-visible string and nothing else: the schema's own field names (masteryCheck,
  // practiceQuestions) are not lesson text, and a JSON dump would let them answer these controls.
  const atAll = [at.objective, at.explanation, at.whyMatters, ...at.steps,
    ...at.teachingSections.map((x: { heading: string; body: string }) => x.heading + " " + x.body),
    ...Object.values(at.workedExample as Record<string, string>),
    ...Object.values(at.misconception as Record<string, string>),
    ...at.commonMistakes.flatMap((m: Record<string, string>) => Object.values(m)),
    at.scaffoldedTry.prompt, at.scaffoldedTry.frame, ...at.scaffoldedTry.slots,
    ...atChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation])].join("\n");

  check("PA. Answer Types is MIXED: a classification scenario, four checks, no guided round, no frames, no ladder", () => {
    assert.equal(guidedApplicationFor(AT), null, "no guided round is declared: no competency and no judge category measures answer-type classification");
    assert.equal(at.languageFrames, undefined, "no language frames: this lesson classifies, it does not teach phrasing");
    assert.equal(at.revisionLadder, undefined); assert.equal(at.additionalExamples, undefined);
    assert.equal(at.teachingSections.length, 3); assert.ok(at.misconception); assert.equal(at.commonMistakes.length, 5);
    assert.equal(1 + at.practiceQuestions.length + at.masteryCheck.length, 4, "seven checks became four distinct judgments");
    assert.deepEqual(at.scaffoldedTry.slots, ["what is now true", "which direction that is", "the answer type, in one word"]);
    assert.equal(atEntry.skillSlug, undefined, "still no skill claim: Refutation remains the module's teaching home for debate-rebuttal");
    assert.deepEqual(atEntry.practiceDrill, { track: "debate", area: "rebuttal" }, "the drill CTA is unchanged");
    const words = (t: string) => (t.match(/[A-Za-z\u2019'-]+/g) ?? []).length;
    const prose = [at.objective, at.explanation, at.whyMatters, ...at.steps, ...at.teachingSections.map((x: { heading: string; body: string }) => x.heading + " " + x.body)].map(words).reduce((a: number, b: number) => a + b, 0);
    // FLOOR RETIRED (beginner-simplification milestone 1). The lower bound was an anti-thin
    // proxy — "more words = safer lesson" — and it blocked the beginner standard. Thinness is now
    // guarded by the reviewed doctrine manifest (scripts/debate-beginner-manifests.json,
    // debate-manifest-gate-smoke) plus human REMOVE-QUESTIONS / beginner-comprehension review.
    // The CEILING stays: it protects against the opposite failure, which is still real.
    assert.ok(prose <= 1300, `teaching prose inside the guard: ${prose} words`);
    // RATIO RETIRED with the floors above: its only purpose was the same anti-thin proxy, and as a
    // universal rule it is wrong twice over — it is satisfiable by shortening both sides, and a
    // productive question legitimately needs scenario text. Answer Types has no quiz ceiling; the manifest gate carries the load.

  });

  check("PB. the taxonomy is stated as two directions with one named move inside each, consistently", () => {
    assert.ok(/an INDICT is a kind of defense, a TURN is a kind of offense/.test(at.explanation), "the hierarchy is stated in the explanation");
    // The binary is a CLASSIFICATION rule, not a claim that an answer has one effect: a reversal
    // usually neutralises their argument as well as creating a reason, and is classed by the reason.
    assert.ok(/Every answer is classed one of two ways, by what it creates/.test(at.explanation), "the binary is framed as classification");
    assert.ok(/One answer can do more than one thing at once [\s\S]{0,140}classed by the reason it creates/.test(at.explanation), "and multiple effects are acknowledged");
    assert.ok(/Two directions, and the named move inside each/.test(at.teachingSections[0].heading), "and in the heading of the section that exemplifies it");
    assert.ok(/defense if only for less \(an indict if you went after their evidence\), offense if something counts for you \(a turn if their own argument is what supplies it\)/.test(at.steps.join(" ")),
      "and in the naming step, which pairs each direction with the move inside it");
    // Membership is ABSOLUTE. A hedge ("an indict is usually defense") turns indict back into a
    // fourth peer, which is the collision this repair exists to remove; the reversing evidence
    // attack is a turn, and the lesson says so rather than leaving the case unnamed.
    assert.ok(!/indict is usually|usually a kind of defense|usually defense/i.test(atAll), "the category is never hedged");
    assert.ok(/what you have is a turn, not an indict/.test(at.teachingSections[1].body), "and the reversing evidence attack is named");
    // The residuals are named as themselves rather than left unnamed — the audited genus/species collision.
    assert.ok(/That is DEFENSE, and among these four names it has no second one/.test(at.teachingSections[0].body), "plain defense is shown and named");
    assert.ok(/That is OFFENSE, and among these four it too has no second name: a reason of your own/.test(at.teachingSections[0].body), "independent offense is shown and named");
    for (const type of ["DEFENSE", "INDICT", "OFFENSE", "TURN"]) {
      assert.ok(at.teachingSections[0].body.includes(`That is ${type === "INDICT" ? "an INDICT" : type === "TURN" ? "a TURN" : type}`), `${type} has a worked instance in the teaching, not only in a check`);
    }
  });

  check("PC. the two audited factual overstatements are gone and the indict boundary is settled", () => {
    assert.ok(!/never reverses/i.test(atAll), "the false absolute 'an indict weakens; it never reverses' is gone");
    assert.ok(!/defense explains why they lose an argument/i.test(atAll), "and so is 'defense explains why they lose an argument'");
    assert.ok(/if what you show about it makes their own argument point your way/.test(at.teachingSections[1].body), "an evidence attack that reverses is taught");
    assert.ok(/Indict is narrower \u2014 the defensive answer aimed at the evidence itself/.test(at.teachingSections[1].body),
      "indict is settled as the DEFENSIVE evidence-aimed answer: aim alone is not sufficient, since the reversing evidence attack is a turn");
    assert.ok(/refutation calls every load-bearing part of an argument a support/.test(at.teachingSections[1].body), "and reconciled with Refutation's broader 'support'");
  });

  check("PD. the ideas that used to live only in quiz explanations are now taught", () => {
    const teaching = [at.objective, at.explanation, at.whyMatters, ...at.steps, ...at.teachingSections.map((x: { heading: string; body: string }) => x.heading + " " + x.body),
      at.workedExample.strongAnswer, at.workedExample.whyItWorks, at.misconception.whyItFails, at.misconception.betterModel].join("\n");
    assert.ok(/an answer can work completely[\s\S]{0,120}still be defense/.test(teaching), "success is not direction");
    assert.ok(/direction is set by what the finding does, not by how good it is/.test(teaching), "evidence quality is not direction");
    assert.ok(/a reason of your own, standing beside their argument/.test(teaching), "independent offense exists and is illustrated");
    assert.ok(/More than one direction is often available on the same argument/.test(teaching), "several directions may be available");
    assert.ok(/Classifying correctly is not refuting/.test(teaching), "naming is not refuting");
    assert.ok(/ask what needs to change about it/.test(teaching), "the model is taught in reverse, as a direction choice");
  });

  check("PE. no speech-level strategy is taught or tested: the owner's forbidden vocabulary is absent", () => {
    for (const banned of ["four minutes", "extend", "extended", "collapse", "collapsing", "frontlin", "weigh", "prioriti", "spend time", "speech time", "time left", "dropped argument"]) {
      assert.ok(!new RegExp(banned, "i").test(atAll), `no speech-level vocabulary: ${banned}`);
    }
    assert.ok(!/final speech|last speech|first speech/i.test(atAll), "no speech-position framing");
  });

  check("PF. the four checks test four distinct judgments and none is decidable by option form", () => {
    const wc = (t: string) => t.trim().split(/\s+/).length;
    atChecks.forEach((q, i) => {
      const lens = q.choices.map(wc); const chars = q.choices.map((o) => o.length);
      const k = q.choices.indexOf(q.correctAnswer);
      const longW = Math.max(...lens), shortW = Math.min(...lens), longC = Math.max(...chars), shortC = Math.min(...chars);
      assert.ok(!(lens.filter((x) => x === longW).length === 1 && lens[k] === longW), `Q${i + 1}: key is not the uniquely longest option by words`);
      assert.ok(!(lens.filter((x) => x === shortW).length === 1 && lens[k] === shortW), `Q${i + 1}: nor the uniquely shortest`);
      assert.ok(!(chars.filter((x) => x === longC).length === 1 && chars[k] === longC), `Q${i + 1}: nor the uniquely longest by characters`);
      assert.ok(!(chars.filter((x) => x === shortC).length === 1 && chars[k] === shortC), `Q${i + 1}: nor the uniquely shortest by characters`);
      assert.ok(longW - shortW <= 2 && longC - shortC <= 12, `Q${i + 1}: options are length-matched (${lens.join("/")} words, ${chars.join("/")} chars)`);
      const commas = q.choices.map((o) => (o.match(/,/g) ?? []).length);
      assert.ok(!(commas[k] > 0 && commas.filter((x) => x > 0).length === 1), `Q${i + 1}: the key is not the only option carrying a comma`);
      assert.equal(new Set(q.choices).size, 4, `Q${i + 1}: four distinct options`);
    });
    // Absolutes may not cluster in the distractors, which would make elimination alone decide it.
    atChecks.forEach((q, i) => {
      const abs = q.choices.map((o) => /\b(never|always|any|every|all|guarantees|whenever)\b/i.test(o));
      assert.ok(!(abs.filter(Boolean).length === 3 && !abs[q.choices.indexOf(q.correctAnswer)]), `Q${i + 1}: the key is not the lone option without an absolute`);
    });
    assert.deepEqual(atChecks.map((q) => "ABCD"[q.choices.indexOf(q.correctAnswer)]), ["A", "A", "A", "C"], "keys as authored and reviewed");
  });

  check("PG. the classification scenario reasons first and labels second; reasoning shape-only, label exact", () => {
    const { evaluateAnswerTypesScaffold, namedAnswerTypes, ANSWER_TYPE_TERMS } = coaching;
    assert.deepEqual([...ANSWER_TYPE_TERMS], ["defense", "indict", "turn", "offense"], "the closed vocabulary is the taxonomy");
    // The key lives in coaching.ts; this pins the authored response it was keyed against, so the two cannot drift.
    assert.ok(/the market takes more on a Sunday, not less/.test(at.scaffoldedTry.prompt), "the authored response the 'turn' key belongs to");
    assert.equal(at.scaffoldedTry.motion, undefined, "no field is made to lie: the argument lives in the prompt");
    assert.equal(at.scaffoldedTry.opponentClaim, undefined);
    const good = ["the market takes more money on a Sunday than it does on a Saturday", "something now counts for our side", "a turn"];
    assert.equal(evaluateScaffoldFor(AT, good).complete, true, "dispatched by lesson id");
    assert.ok(/The two sentences above were checked only for being there and being different/.test(evaluateScaffoldFor(AT, good).exactCheck ?? ""),
      "and says exactly what was and was not judged");
    assert.equal(evaluateScaffoldFor(AT, [good[0], good[1], "defense"]).complete, false, "a wrong label is refused");
    // The label slot takes ONE term, normalised — not a sentence containing one, and not the
    // vocabulary enumerated in one box, which would otherwise pass a contains-a-term check.
    for (const spelling of ["Turn", " turn ", "a turn", "turns"]) {
      assert.equal(evaluateScaffoldFor(AT, [good[0], good[1], spelling]).complete, true, `normalised to the term: "${spelling}"`);
    }
    for (const notATerm of ["turn or offense", "defense indict turn offense", "turn blah blah", "this is a turn", "reversal", ""]) {
      assert.equal(evaluateScaffoldFor(AT, [good[0], good[1], notATerm]).complete, false, `refused, not one term: "${notATerm}"`);
    }
    assert.equal(coaching.soleAnswerTypeTerm("a Turn."), "turn");
    assert.equal(coaching.soleAnswerTypeTerm("defense indict turn offense"), null);
    assert.equal(evaluateScaffoldFor(AT, ["it is a turn", good[1], "turn"]).complete, false, "the label cannot stand in for the outcome sentence");
    assert.equal(evaluateScaffoldFor(AT, [good[0], good[0], "turn"]).complete, false, "the direction slot is not a repeat of the outcome slot");
    assert.deepEqual(namedAnswerTypes("So this answer is an indict."), ["indict"]);
    assert.deepEqual(namedAnswerTypes("defensive"), ["defense"]);
    assert.deepEqual(namedAnswerTypes("nothing here"), []);
    const body = String(evaluateAnswerTypesScaffold);
    assert.ok(!/overlap\(|containedIn|includes\(".{6,}"\)/.test(body), "no word-overlap or loaded-word heuristics in the reasoning slots");
    const withTry = LEARNING_SKILL_CATALOG.filter((e: { lesson: { content: { scaffoldedTry?: unknown } } }) => e.lesson.content.scaffoldedTry).map((e: { slug: string }) => e.slug).sort();
    assert.deepEqual(withTry, Object.keys(SCAFFOLD_EVALUATORS).sort(), "every scaffolded lesson has an evaluator, none orphaned");
  });

  check("PH. the answer-types page renders teach-first, ends at the scenario, offers no guided round, keeps its drill CTA", () => {
    const html = render(React.createElement(ConceptEducationLessonView, {
      source: atEntry.source, provenance: MIGRATED_DEBATE_PROVENANCE, moduleLabel: "Round strategy", next: null, practiceDrill: atEntry.practiceDrill
    } as never));
    const text = visible(html);
    const order = ["Know what your answer does", at.teachingSections[0].heading, at.teachingSections[2].heading, "Now try the move", "Practice this skill"];
    let at_ = -1;
    for (const marker of order) { const idx = text.indexOf(marker); assert.ok(idx > at_, `render order: ${marker}`); at_ = idx; }
    assert.ok(!text.includes("Use it in a guided round") && !text.includes("The guided round opens after"), "no guided-round link or promise");
    for (const slot of ["1. what is now true", "2. which direction that is", "3. the answer type, in one word"]) assert.ok(text.includes(slot), `slot rendered: ${slot}`);
    assert.ok(text.includes("Practice this skill in the Rebuttal drill"), "the rebuttal drill CTA is unchanged");
  });

  check("PI. the drill bank, its containment and the rebuttal mastery hold are untouched by this repair", () => {
    const drills = require("../lib/debate-drills");
    assert.equal(drills.debateMasteryHeld("debate-rebuttal"), true, "durable rebuttal mastery stays held");
    assert.equal(drills.DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("rb-")).length, 22, "22 rebuttal items remain withheld");
    for (const id of ["rb-30", "rb-04", "rb-05", "rb-09", "rb-10", "rb-20", "rb-21", "rb-22", "rb-23", "rb-24", "rb-27", "rb-29"]) {
      assert.ok(drills.DEBATE_DRILL_HELD_IDS.includes(id), `${id} is still held`);
    }
    // Diagnostic only: these four servable items are the ones this lesson's teaching actually covers.
    for (const id of ["rb-02", "rb-13", "rb-16", "rb-17"]) {
      assert.ok(!drills.DEBATE_DRILL_HELD_IDS.includes(id), `${id} was already servable and stays so`);
    }
    assert.ok(!/mastery|mastered/i.test(atAll), "the lesson claims no durable mastery");
  });


  // ================================================================================================
  // R. TURN MECHANICS — the perfection repair (2026-09-06). The audit found teaching that already
  // worked (both website-only readers 9/9, everything TAUGHT) wrapped in 2,450 words of quiz across
  // nine checks, eight of which an adjudicator ruled structurally exploitable — while the aggregate
  // form guard read HEALTHY, because keys were uniquely shortest in three items and uniquely longest
  // in four and the two signatures cancelled. It also found the governing doctrine partly wrong.
  // What follows pins the corrected doctrine, the quiz reduction, and the move scenario.
  // ================================================================================================
  const TM = "debate-turn-mechanics";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tmEntry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === TM) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tm = tmEntry.source.lesson.content as any;
  const tmChecks = [tm.guidedQuestion, ...tm.practiceQuestions, ...tm.masteryCheck] as Array<{ prompt: string; choices: string[]; correctAnswer: string; explanation: string }>;
  const tmAll = [tm.objective, tm.explanation, tm.whyMatters, ...tm.steps,
    ...tm.teachingSections.map((x: { heading: string; body: string }) => x.heading + " " + x.body),
    ...Object.values(tm.workedExample as Record<string, string>),
    ...Object.values(tm.misconception as Record<string, string>),
    ...tm.commonMistakes.flatMap((m: Record<string, string>) => Object.values(m)),
    tm.scaffoldedTry.prompt, tm.scaffoldedTry.frame, ...tm.scaffoldedTry.slots,
    ...tmChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation]),
    // The summary is learner-visible and was outside every assertion below — the same field-class
    // miss already recorded once for the catalog description. The Signposting block guards its own
    // summary; this one now does too, so a paraphrase cannot hide there.
    tmEntry.source.lesson.summary].join("\n");

  check("RA. Turn Mechanics is MIXED: a move scenario, six checks, no guided round, no frames, no ladder", () => {
    assert.equal(guidedApplicationFor(TM), null, "no guided round: no competency and no judge category measures this mechanic");
    assert.equal(tm.languageFrames, undefined); assert.equal(tm.revisionLadder, undefined); assert.equal(tm.additionalExamples, undefined);
    assert.equal(tm.teachingSections.length, 3); assert.ok(tm.misconception); assert.equal(tm.commonMistakes.length, 5);
    assert.equal(1 + tm.practiceQuestions.length + tm.masteryCheck.length, 6, "nine checks became six distinct judgments");
    assert.deepEqual(tm.scaffoldedTry.slots, ["which part, and what it does to it", "what becomes true", "the move, in the lesson's words"]);
    assert.equal(tmEntry.skillSlug, undefined, "still no skill claim");
    assert.deepEqual(tmEntry.practiceDrill, { track: "debate", area: "rebuttal" }, "the drill CTA is unchanged");
    const words = (t: string) => (t.match(/[A-Za-z\u2019'-]+/g) ?? []).length;
    const qWords = tmChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation]).map(words).reduce((a: number, b: number) => a + b, 0);
    assert.ok(qWords < 1300, `the quiz layer shrank from 2,450 words: ${qWords}`);
    // BEGINNER CEILINGS (the floors were retired in f0e17f7; these are the other direction). The
    // required path is everything rendered before the first check. 1,100 is the owner's block line
    // for this lesson; the fixed structure (six steps, a four-field worked example, a three-field
    // misconception card, five three-field mistake boxes) is roughly half of it.
    const required = [tm.objective, tm.explanation, ...tm.teachingSections.map((x: { heading: string; body: string }) => x.heading + " " + x.body),
      tm.whyMatters, ...tm.steps, ...Object.values(tm.workedExample as Record<string, string>),
      ...Object.values(tm.misconception as Record<string, string>), ...tm.commonMistakes.flatMap((m: Record<string, string>) => Object.values(m))];
    const wc = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
    assert.ok(required.map(wc).reduce((a: number, b: number) => a + b, 0) <= 1100, `required path within the beginner ceiling: ${required.map(wc).reduce((a: number, b: number) => a + b, 0)}`);
    for (const field of required) {
      for (const para of field.split(/\n\n+/)) assert.ok(wc(para) <= 70, `no paragraph above 70 words: ${para.slice(0, 60)}`);
      for (const sentence of field.replace(/\n+/g, " ").split(/(?<=[.?!][)\u201d"]?)\s+(?=[A-Z\u201c"(])/)) assert.ok(wc(sentence) <= 40, `no sentence above 40 words: ${sentence.slice(0, 60)}`);
    }
    // RATIO RETIRED with the floors above: its only purpose was the same anti-thin proxy, and as a
    // universal rule it is wrong twice over — it is satisfiable by shortening both sides, and a
    // productive question legitimately needs scenario text. The quiz CEILING below stays.

  });

  check("RB. the double turn is taught as a collision about one outcome, not as a count of reversals", () => {
    const collision = tm.teachingSections[1].body;
    const pairCheck = tm.teachingSections[2].body;
    const sentences = (t: string) => t.split(/(?<=[.?!][)”"]?)\s+|\n/).map((s) => s.trim()).filter(Boolean);
    // The heading is learner-facing doctrine too: it must not say the claims cannot both be true.
    assert.equal(tm.teachingSections[1].heading, "When two answers add up against you");
    // The old governing rule keyed on "the same chain" and was provably not general: two answers on
    // two different arguments can collide, and two reversals on one chain can be compatible. B05 is
    // GUARD-ONLY in the beginner manifest: the lesson never confines the collision to one chain, and
    // no longer has to say the general case out loud.
    assert.ok(!/never reverse both parts of the same chain/i.test(tmAll), "the old absolute rule is gone");
    assert.ok(!/the contradiction lives inside a single chain/i.test(tmAll), "and so is 'nowhere else'");
    assert.ok(!/(?:only|never) (?:collide|add up)[^.]{0,40}(?:same|one|single) (?:chain|argument)/i.test(tmAll),
      "no single-chain confinement in new words either");
    // RULE-07: the problem is what the pair adds up to, never how many reversals.
    assert.ok(/The problem is what the two answers add up to, not how many reversals you made\./.test(collision),
      "the doctrine is stated as a sum, not a count");
    assert.ok(/Two answers collide when, granted together about the same outcome, they add up to a reason against your own side\./.test(collision),
      "keyed on the outcome, and on what the pair adds up to");
    // A double turn is NOT a contradiction: both claims usually can be true, which is exactly why the
    // opponent can agree with both. Saying "cannot both be true" acquits the paradigm case.
    assert.ok(!/cannot both be true/i.test(tmAll), "the doctrine never says the two claims cannot both be true");
    // B02 SINGLETON. The co-truth idea appears exactly once, in the sentence that says it does not
    // decide anything. The counter is wider than the old one so a paraphrase cannot slip a second
    // (criterion-shaped) occurrence past it.
    const coTruth = () => /\bboth (?:can |could |may )?(?:even |usually |still )?be true\b|\bbe true (?:together|at once|at the same time)\b/gi;
    assert.equal((tmAll.match(coTruth()) ?? []).length, 1, "the co-truth idea appears exactly once");
    const coTruthSentences = sentences(tmAll).filter((s) => coTruth().test(s));
    assert.equal(coTruthSentences.length, 1, "control: in one sentence");
    assert.ok(/does not make them safe together/.test(coTruthSentences[0]), "and that sentence rejects it as the test");
    assert.ok(/Both can even be true at the same time — and that does not make them safe together\./.test(collision),
      "phrased so it cannot be read as either convicting or acquitting the pair");
    // GRANT is defined in ordinary English at its first appearance in the learner's reading order.
    const learnerOrder = [tm.objective, tm.explanation, ...tm.teachingSections.map((x: { heading: string; body: string }) => x.heading + " " + x.body),
      tm.whyMatters, ...tm.steps, ...Object.values(tm.workedExample as Record<string, string>),
      ...Object.values(tm.misconception as Record<string, string>), ...tm.commonMistakes.flatMap((m: Record<string, string>) => Object.values(m))].join("\n");
    const defined = learnerOrder.search(/To grant an answer means to treat it as true for a moment, so you can see what follows\./);
    assert.ok(defined >= 0, "grant is defined in plain English");
    assert.equal(learnerOrder.slice(0, defined).search(/\bgrant/i), -1, "and nothing before the definition uses it");
    assert.ok(!/\bgrant/i.test(tmEntry.source.description), "the catalog line, read before the lesson, does not use it");
    // Sameness of outcome is the SCREEN, never the verdict: no sentence may end there.
    assert.ok(!/fail the test because it is the same outcome/i.test(tmAll), "sameness is never given as the reason a pair fails");
    assert.ok(/Same outcome only means the two answers can be compared\. This question is what decides it\./.test(pairCheck),
      "stated explicitly, so 'same outcome' cannot become the new oversimplification");
    // THE FOUR COUNTS. Enumerated ONCE, in the pair check, conjunctively, and never re-enumerated in
    // different words: any sentence that names two or more of the counts must BE the canonical list.
    // This replaces the old "exactly three identical enumerations" pin, which protected wording
    // consistency by counting repetition; the invariant is the consistency, not the count.
    const FOUR = /\(1\) the same thing being measured; \(2\) the same who or what, in the same place; \(3\) the same stretch of time; \(4\) the same conditions/;
    assert.equal((pairCheck.match(new RegExp(FOUR.source, "g")) ?? []).length, 1, "the four counts are enumerated once, in the pair check");
    assert.equal((tmAll.match(new RegExp(FOUR.source, "g")) ?? []).length, 1, "and nowhere else");
    // Every count-word in the lesson lives inside that one enumeration, so no variant can be spread
    // across sentences either ("same measure ... same people" in two clauses).
    const span = FOUR.exec(tmAll)!; const lo = span.index, hi = lo + span[0].length;
    for (const dim of [/measur/gi, /who or what/gi, /stretch of time/gi, /\bconditions\b/gi]) {
      for (const m of tmAll.matchAll(dim)) assert.ok(m.index! >= lo && m.index! < hi, `a count-word outside the one enumeration: "${tmAll.slice(Math.max(0, m.index! - 40), m.index! + 40).replace(/\n/g, " ")}"`);
    }
    // CONJUNCTIVE, not disjunctive; WHO OR WHAT, not people (the collision drill is about dogs).
    assert.ok(!/people or place/i.test(tmAll + tmEntry.source.description), "the second count is never a disjunction");
    assert.ok(!/same people in the same place/.test(tmAll), "no people-shaped count the dog collision cannot satisfy");
    for (const [label, text] of [["steps", tm.steps.slice(4).join(" ")], ["misconception", tm.misconception.betterModel]] as const) {
      assert.ok(/all four ways/.test(text), `${label}: the standalone views point at the one list (four ways)`);
    }
    // Partial overlap has one road, not two.
    assert.ok(/Share none of them\? They cannot collide\. Share only part — one answer about all teenagers, the other only about skaters\? Run the grant question below on the part they share: the skaters\./.test(pairCheck),
      "partial overlap is scoped inside the screen rather than sent down a second road");
    assert.ok(/part they share/.test(tm.steps.slice(4).join(" ")), "and the steps carry the branch");
    // The safe pairing is licensed by being about different outcomes, never by consistency.
    assert.ok(!/consistent branches/i.test(tmAll), "the safe pairing is not licensed on consistency");
    assert.ok(/not the same outcome, so they cannot collide/.test(tm.workedExample.strongAnswer), "compatible reversals are taught, as the worked example");
    assert.ok(/Only a pair about the same outcome can add up against you\./.test(tm.workedExample.whyItWorks), "and acquitted for the right reason");
    // THE DECIDING QUESTION is self-defeat. It no longer uses "stand" at all, so the shortest
    // compression a simplifier reaches for ("can they both stand?") has nothing to compress.
    assert.ok(/Take the good thing, or the harm, that one answer names\. Grant both\. Does your other answer now make your own side the thing that removes that good, or causes that harm\?/.test(pairCheck),
      "the deciding question is self-defeat, not mere strategic tension");
    assert.ok(/our park removes something we just called good/.test(collision), "the concrete pair is convicted by self-defeat, before the rule is named");
    // SELF-DEFEAT IS NEVER DROPPED FROM A GRANT. Every "grant both" carries the consequence in the
    // same or the next sentence, so no compression can stop at "grant both and see".
    const SELF_DEFEAT = /against (?:your|our) own side|(?:your|our) (?:own )?side (?:now |is now )?(?:removes?|becomes?|is the thing)|make your own side the thing that removes|removes? (?:the good|that good|something|nothing|the very)|takes? away (?:the good|nothing)|causes? the harm|adds? up against/i;
    const all = sentences(tmAll);
    all.forEach((s, i) => {
      if (/\bgrant(?:ed|ing)? (?:them )?both\b/i.test(s)) assert.ok(SELF_DEFEAT.test(s) || SELF_DEFEAT.test(all[i + 1] ?? ""), `a grant is always followed by the self-defeat question: ${s.slice(0, 100)}`);
    });
    // The compressed statements (step list, misconception card) run the same procedure in the same
    // order: name, four counts, grant, decide — so a learner who only sees one of them runs the test.
    const tail = tm.steps.slice(4).join(" ");
    for (const [label, text] of [["steps 5-6", tail], ["misconception.betterModel", tm.misconception.betterModel]] as const) {
      assert.ok(/[Nn]ame each outcome/.test(text) && /all four ways/.test(text) && /[Gg]rant both/.test(text) && /removes? the good, or causes? the harm/.test(text),
        `${label} carries name, four counts, grant, decide`);
    }
    assert.ok(/keep the reversal you can win/.test(tail) && /plain defense or silence/.test(tail), "and the steps carry the repair");
    assert.ok(/Keep the reversal you can win;/.test(tm.commonMistakes[3].fix) && /plain defense or silence/.test(tm.commonMistakes[3].fix), "the repair mistake fixes it the doctrine's way");
    // "hold together" reads as a consistency word on its own; the doctrine is about self-defeat.
    assert.ok(!/hold together/i.test(tmAll), "no residue of the consistency framing");
    assert.ok(/check that answers you use together do not add up to a reason against your own side/.test(tm.objective),
      "the objective states the corrected rule, not truth-compatibility");
    assert.ok(/taken together, do not add up to a reason against your own side/.test(tmEntry.source.description),
      "the catalog description states the corrected test");
    assert.ok(/do not add up against your own side/.test(tmEntry.source.lesson.summary), "and so does the summary");

    // PARAPHRASE ROUTES BACK TO THE WITHDRAWN CO-TRUTH TEST (G1/G2 from 91a0e0e, kept and widened).
    //
    // Clash teaches "can both be true", "cannot both be right" and "cannot both stand" as synonyms,
    // so a beginner arrives with "stand" and "right" already meaning "cannot both be true". "stand"
    // may appear alongside "both" only inside a self-defeat question; "both (be) right" has no
    // legitimate use here; and the routes the owner named are banned outright. The guard is then
    // run against its own known mutants, so its coverage is proven inside the suite rather than
    // assumed — an ordinary "stands alone" must not trip it.
    const coTruthRoutes = (text: string) => {
      const hits: string[] = [];
      for (const s of sentences(text)) if (/\bstands?\b/i.test(s) && /\bboth\b/i.test(s) && !/without making your own side/i.test(s)) hits.push(s);
      for (const re of [/both\s+(?:be\s+)?right\b/i, /cannot both be true/i, /comfortable together/i, /fits? together/i, /consistent branches/i, /hold together/i]) if (re.test(text)) hits.push(String(re));
      return hits;
    };
    assert.deepEqual(coTruthRoutes(tmAll), [], "no co-truth paraphrase route anywhere in the lesson");
    for (const mutant of ["can they both stand?", "the two answers cannot both stand", "they cannot both be right", "ask whether the two are comfortable together", "the pair fits together"]) {
      assert.ok(coTruthRoutes(tmAll + "\n" + mutant).length > 0, `the guard fires on the historical route: ${mutant}`);
    }
    assert.deepEqual(coTruthRoutes("Withdraw one so the stronger one stands alone. Both answers are strong on their own."), [], "ordinary uses of stand and both do not trip it");
  });

  check("RC. a reversal counts as offense only when the result depends on the learner's side", () => {
    const moves = tm.teachingSections[0].body;
    // RULE-05 in the learner's words, and the failed case named as not a turn — so Answer Types'
    // rule that a turn is always offense survives (B07) without a sentence about it.
    assert.ok(/A reversal only counts if the result happens because of your side\./.test(moves), "the condition is stated");
    assert.ok(/you have not turned anything\./.test(moves), "a failed reversal is not a turn");
    assert.ok(/Count a reversal as a turn only if the result happens because of your side\./.test(tm.steps[3]), "and the step list carries it");
    // B06 GUARD-ONLY: classification is success-conditional. The classifying question is
    // what-is-true-if-it-succeeds, and no sentence conditions a move on the judge believing it.
    assert.ok(/if my answer completely succeeds, what is true\?/.test(moves), "the classifying question is what-if-it-succeeds");
    assert.ok(!/(?:if|when|whether|once) the judge (?:believes|buys|accepts|agrees|is convinced)/i.test(tmAll), "no move is classified by persuasion");
    // B07 GUARD-ONLY: a turn is never called defense.
    assert.ok(!/\bturn (?:that|which) (?:is|counts as) (?:defense|nothing)|a turn (?:can|may|might) be defense|\bturns? (?:is|are) defense/i.test(tmAll),
      "Answer Types' absolute membership survives");
    // Format-neutral language: no policy-debate jargon, and none of the words this lesson cannot
    // define for a beginner ("indict" belongs to Answer Types, "establish" to the retired vocabulary).
    for (const jargon of ["uniqueness", "non-unique", "fiat", "solvency", "inherency", "permutation", "indict", "establish"]) {
      assert.ok(!new RegExp(jargon, "i").test(tmAll), `no imported jargon: ${jargon}`);
    }
    // B09 example: independent offense is not a turn. B10 GUARD-ONLY: an evidence answer is never a turn.
    assert.ok(/A turn takes their outcome and makes it yours\./.test(tmAll), "turn is excluded from independent offense");
    assert.ok(!/evidence[^.]{0,80}\b(?:is|counts as|makes it) (?:a |an )?(?:link |impact )?turn\b/i.test(tmAll), "an evidence answer is never called a turn");
    // B08 handoff.
    assert.ok(/is the Refutation lesson’s job/.test(tm.whyMatters), "and the Refutation handoff is present");
    // RULE-06 (say what reverses and why) is Class C in the frozen manifest: not in the required
    // path, and not re-imported through a mistake box.
    assert.ok(!/why the reversed result follows|saying why/i.test(tmAll), "the Class-C duty is not smuggled back");
  });

  check("RD. shrinking is split into less-of-the-outcome and matters-less, without teaching weighing", () => {
    const four = tm.teachingSections[0].body;
    assert.ok(/The outcome arrives but matters less than they say\./.test(four), "impact defense: it matters less");
    assert.ok(/\(Saying “fewer teenagers will come” shrinks the link instead\. Defense too\.\)/.test(four), "the other shrink is a link claim (B01, one example)");
    for (const weighing of ["outweigh", "magnitude", "probability", "timeframe", "net benefit", "more important than"]) {
      assert.ok(!new RegExp(weighing, "i").test(tmAll), `no weighing vocabulary: ${weighing}`);
    }
    assert.ok(!/internal link/i.test(tmAll), "the untested jargon stays dropped");
    // R04 (chains with more than one middle step) is Class C in the frozen manifest; its pin retired.
    assert.ok(/Split it with three questions/.test(tm.explanation), "a compressed argument can be split");
    // RULE-03: four named moves, each with its side, defined once on the one chain.
    for (const move of ["NO-LINK denies the link", "LINK TURN reverses the link", "IMPACT DEFENSE shrinks the impact", "IMPACT TURN reverses the impact"]) {
      assert.equal((four.match(new RegExp(move, "g")) ?? []).length, 1, `${move}: defined once`);
    }
    assert.ok(/Two parts, three moves each: six\. Four have names below; the other two are plain defense, meaning defense with no turn in it\./.test(four), "as four moves, not four strengths — the unnamed two are placed and plain defense is defined");
    assert.ok(/reverse it \(a TURN\)/.test(four) && /that is defense\./.test(four) && /that is offense/.test(four), "turn, defense and offense are each defined at first use");
  });

  check("RE. the six checks are length-balanced: no key is extremal on any metric", () => {
    const wc = (t: string) => t.trim().split(/\s+/).length;
    tmChecks.forEach((q, i) => {
      const lens = q.choices.map(wc), chars = q.choices.map((o) => o.length);
      const k = q.choices.indexOf(q.correctAnswer);
      const mw = Math.max(...lens), nw = Math.min(...lens), mc = Math.max(...chars), nc = Math.min(...chars);
      assert.ok(!(lens.filter((x) => x === mw).length === 1 && lens[k] === mw), `Q${i + 1}: key not uniquely longest by words`);
      assert.ok(!(lens.filter((x) => x === nw).length === 1 && lens[k] === nw), `Q${i + 1}: nor uniquely shortest by words`);
      assert.ok(!(chars.filter((x) => x === mc).length === 1 && chars[k] === mc), `Q${i + 1}: nor uniquely longest by characters`);
      assert.ok(!(chars.filter((x) => x === nc).length === 1 && chars[k] === nc), `Q${i + 1}: nor uniquely shortest by characters`);
      assert.ok(mw - nw <= 5 && mc - nc <= 16, `Q${i + 1}: options are length-matched (${lens.join("/")} words, ${chars.join("/")} chars)`);
      assert.equal(new Set(q.choices).size, 4, `Q${i + 1}: four distinct options`);
    });
    assert.deepEqual(tmChecks.map((q) => "ABCD"[q.choices.indexOf(q.correctAnswer)]), ["B", "B", "B", "C", "B", "A"], "keys as authored and reviewed");
    // The lesson must teach acquittal as well as conviction: one check's key is the COMPATIBLE case.
    const acquit = tmChecks.find((q) => /Do these two answers add up against your side\?/.test(q.prompt));
    assert.ok(acquit && /^No, because the first answer names drifters, the second the shoppers a market brings/.test(acquit.correctAnswer),
      "a learner who memorised 'two reversals = double turn' fails at least one check");
    // The repair check must not assume a later speech exists: the audit happens before delivery.
    const repair = tmChecks.find((q) => /What should you do\?/.test(q.prompt));
    assert.ok(repair && /You check the pair before you speak\./.test(repair.prompt), "the repair is a pre-delivery check");
    assert.ok(!/cheerfully agrees with both|next speech|in your next/i.test(tmAll), "no later-speech assumption anywhere");
  });

  check("RF. the move scenario reasons first and names second; reasoning shape-only, move exact", () => {
    const { evaluateTurnMechanicsScaffold, soleTurnMoveTerm, TURN_MOVE_TERMS } = coaching;
    assert.deepEqual([...TURN_MOVE_TERMS], ["no-link", "link turn", "impact defense", "impact turn"], "the closed vocabulary is the lesson's four moves");
    assert.ok(/the market takes|families on that pavement|slows the traffic down/i.test(tm.scaffoldedTry.prompt), "the authored response the key belongs to");
    assert.equal(tm.scaffoldedTry.motion, undefined, "no field is made to lie");
    assert.equal(tm.scaffoldedTry.opponentClaim, undefined);
    const good = ["the answer works on the endpoint where they called the crowd a hazard", "the families still arrive and their arrival is what makes the street safer"];
    for (const spelling of ["impact turn", "Impact Turn", " impact turn ", "an impact turn", "impact turns"]) {
      assert.equal(evaluateScaffoldFor(TM, [good[0], good[1], spelling]).complete, true, `normalised to the term: "${spelling}"`);
    }
    // Whole-answer equality, not containment: enumerating the vocabulary or wrapping it in a sentence fails.
    for (const notATerm of ["turn", "link turn impact turn", "this is an impact turn", "impact", "reversal", ""]) {
      assert.equal(evaluateScaffoldFor(TM, [good[0], good[1], notATerm]).complete, false, `refused, not one move name: "${notATerm}"`);
    }
    for (const wrong of ["no-link", "link turn", "impact defense"]) {
      assert.equal(evaluateScaffoldFor(TM, [good[0], good[1], wrong]).complete, false, `wrong move refused: "${wrong}"`);
    }
    assert.equal(soleTurnMoveTerm("an Impact Turn."), "impact turn");
    assert.equal(soleTurnMoveTerm("link turn impact turn"), null);
    assert.ok(/nothing read whether your account of the reversal is correct/.test(evaluateScaffoldFor(TM, [good[0], good[1], "impact turn"]).exactCheck ?? ""),
      "and the completion copy says what was and was not judged");
    assert.equal(evaluateScaffoldFor(TM, [good[0], good[0], "impact turn"]).complete, false, "the two reasoning slots must differ");
    // The move name may not stand in for either account, and the guard applies to BOTH slots.
    for (const filler of ["impact turn impact turn impact turn", "an impact turn", "link turn"]) {
      assert.equal(evaluateScaffoldFor(TM, [filler, good[1], "impact turn"]).complete, false, `slot 1 refuses the move name: "${filler}"`);
      assert.equal(evaluateScaffoldFor(TM, [good[0], filler, "impact turn"]).complete, false, `slot 2 refuses the move name: "${filler}"`);
    }
    // One message for every wrong move: naming the axis would halve the space on the next guess.
    const wrongCoaches = new Set(["no-link", "link turn", "impact defense"].map((m) => evaluateScaffoldFor(TM, [good[0], good[1], m]).coach));
    assert.equal(wrongCoaches.size, 1, "the wrong-move coaching discloses nothing about which axis was wrong");
    const body = String(evaluateTurnMechanicsScaffold);
    assert.ok(!/overlap\(|containedIn/.test(body), "no word-overlap heuristics in the reasoning slots");
    const withTry = LEARNING_SKILL_CATALOG.filter((e: { lesson: { content: { scaffoldedTry?: unknown } } }) => e.lesson.content.scaffoldedTry).map((e: { slug: string }) => e.slug).sort();
    assert.deepEqual(withTry, Object.keys(SCAFFOLD_EVALUATORS).sort(), "every scaffolded lesson has an evaluator, none orphaned");
  });

  check("RG. no speech-level strategy, and the drill containment is untouched", () => {
    for (const banned of ["four minutes", "\\bextend\\b", "collapse", "frontlin", "prioriti", "time allocation", "final focus"]) {
      assert.ok(!new RegExp(banned, "i").test(tmAll), `no speech-level vocabulary: ${banned}`);
    }
    const drills = require("../lib/debate-drills");
    assert.equal(drills.debateMasteryHeld("debate-rebuttal"), true, "durable rebuttal mastery stays held");
    assert.equal(drills.DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("rb-")).length, 22, "22 rebuttal items remain withheld");
    for (const id of ["rb-14", "rb-15"]) assert.ok(!drills.DEBATE_DRILL_HELD_IDS.includes(id), `${id} keeps its existing servable state`);
    assert.ok(!/mastery|mastered/i.test(tmAll), "the lesson claims no durable mastery");
  });

  check("RH. no key is isolated by a terminal stem echo or by a lone modal", () => {
    // Two tells the blind panels found and this pins shut. Q3's key was the only option ENDING on the
    // stem's proposal noun ("lighting"); Q6's key was the only option carrying a modal and a
    // free-choice determiner ("whichever ... you can win"). Both let a test-wise reader pick without
    // the lesson. Every isolating property must be shared with at least one distractor.
    const words = (t: string) => (t.toLowerCase().match(/[a-z\u2019'-]+/g) ?? []);
    const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "it", "is", "are", "that", "this", "them", "they", "you", "your", "both", "for", "with", "not", "no", "so", "at", "as", "by", "one", "two", "their", "its", "what", "which", "when", "than", "then", "does", "do", "up"]);
    const MODALS = /\b(can|could|may|might|would|should|must|whichever|whatever|whoever|any)\b/i;
    tmChecks.forEach((q, i) => {
      const k = q.choices.indexOf(q.correctAnswer);
      const stem = new Set(words(q.prompt));
      const echoes = q.choices.map((o) => { const w = words(o); const last = w[w.length - 1]; return Boolean(last) && !STOP.has(last) && stem.has(last); });
      assert.ok(!(echoes[k] && echoes.filter(Boolean).length === 1),
        `Q${i + 1}: the key must not be the only option whose final word echoes the stem`);
      const modal = q.choices.map((o) => MODALS.test(o));
      assert.ok(!(modal[k] && modal.filter(Boolean).length === 1),
        `Q${i + 1}: the key must not be the only option carrying a modal or free-choice determiner`);
    });
  });

  // ================================================================================================
  // WG. WEIGHING — beginner rewrite (2026-09-08). Until this block the lesson's six frozen A-rules had
  // no prose guard at all (manifest: guarded=false on every one), and the doctrine most worth guarding
  // is the one the withdrawn round judge got backwards: it scored this competency by COUNTING lens
  // words, and scored the lesson's own model answer at the floor. These pins keep the beginner prose
  // teaching a comparison built on a real difference, compared on both sides, never a vocabulary.
  // ================================================================================================
  const WG = "debate-weighing";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wgEntry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === WG) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wg = wgEntry.source.lesson.content as any;
  const wgChecks = [wg.guidedQuestion, ...wg.practiceQuestions, ...wg.masteryCheck] as Array<{ prompt: string; choices: string[]; correctAnswer: string; explanation: string }>;
  const wgSections = (wg.teachingSections as Array<{ heading: string; body: string }>);
  const wgRequired: string[] = [wg.objective, wg.explanation, ...wgSections.map((x) => x.heading + "\n\n" + x.body), wg.whyMatters, ...wg.steps,
    ...Object.values(wg.workedExample as Record<string, string>), ...(wg.revisionLadder as Array<Record<string, string>>).flatMap((r) => Object.values(r)),
    ...(wg.languageFrames as Array<{ purpose: string; starters: string[] }>).flatMap((g) => [g.purpose, ...g.starters])];
  const wgAll = [...wgRequired, wg.scaffoldedTry.prompt, wg.scaffoldedTry.frame, ...wg.scaffoldedTry.slots,
    ...wgChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation]), wgEntry.source.description, wgEntry.source.lesson.summary].join("\n");
  const [wg1, wg2, wg3] = wgSections.map((x) => x.body);

  check("WA. weighing is taught as a comparison, never as lens vocabulary (B01, B04)", () => {
    // No lens word is learner vocabulary anywhere — required path, scaffold, checks, catalog copy.
    for (const lens of ["magnitude", "probability", "timeframe", "reversib", "impact calculus", "terminal", "\\blens", "comparative framework", "evaluative mechanism"]) {
      assert.ok(!new RegExp(lens, "i").test(wgAll), `no lens vocabulary: ${lens}`);
    }
    assert.ok(/Debaters have names for some; you never need them\. You need a difference the round — the whole debate — actually shows\./.test(wg1), "the names are named as names, once, and dismissed; the round is defined at first use");
    assert.ok(/What separates the two sides is the fact, not the name for it\./.test(wg1), "the fact makes the comparison, not the name");
    // The two names the released drill item wg-08 uses survive, defined as a rule for choosing.
    assert.ok(/Give the judge a rule for choosing\. Debaters call it a WEIGHING STANDARD, or a WEIGHING FRAMEWORK \(two names, one thing\)\./.test(wg2), "standard and framework are defined, plainly, as one thing");
    // Frames are optional structure (B04): one group, and it says what filling a blank does not do.
    assert.equal(wg.languageFrames.length, 1, "one frame group; groups 2 and 3 were Class C");
    assert.ok(/Naming a kind of comparison is not making one; the words after “because” are the whole argument\./.test(wg.languageFrames[0].purpose));
    assert.ok(/Filling in the blanks does not make what you put in them true/.test(wg.scaffoldedTry.frame), "the other half of B04 lives in the scaffold frame, once");
    for (const starter of wg.languageFrames[0].starters) assert.ok(/___/.test(starter) && !/(?:more|fewer|larger|likely|sooner|permanent)/i.test(starter), `a starter supplies shape only: ${starter}`);
  });

  check("WB. a real difference is required (RULE-03), the rule is usable on either side (RULE-02) and given early (RULE-04)", () => {
    assert.ok(/If both harms are equally likely, “ours is more likely” does not tell them apart; if both start together, neither does “ours comes first”\. The judge applies it and still cannot choose\./.test(wg1),
      "a level comparison decides nothing — taught by example, once");
    assert.ok(/A difference with no reason behind it is just a fact; say why it should decide\./.test(wg2), "a difference needs a reason");
    assert.ok(/Word it so it could be used on their result too: “A harm that cannot be undone should count for more\.” “Our harm is huge” is not a rule; nothing in it measures their result\./.test(wg2),
      "usable on either side, with the counter-example");
    assert.ok(/Say it early, while the other side still has speeches to answer it, and expect them to argue for a rule of their own\./.test(wg2), "early, and contestable");
    assert.ok(/Judges often think both sides have a point; with no rule from you, they use whatever rule they prefer\./.test(wg.whyMatters), "R19 is the one-line why, nothing more");
  });

  check("WC. both sides are compared out loud (RULE-05); a difference that runs their way is named, then outranked (RULE-06, B02); RULE-01's boundary is in the teaching", () => {
    assert.ok(/Stating the rule is not the comparison\. Run both results through it and say what it decides: “A minute of delay can be made up\. An injury cannot\. Under that rule, the crossing wins\.”/.test(wg3));
    assert.ok(/Do not pretend every comparison favours you; a judge who sees the difference you skipped trusts the rest less\./.test(wg3), "B02");
    assert.ok(/Name what they win \(debaters say you grant it\), then say why yours should still decide, and give the reason\. Naming both and stopping leaves the judge no way to choose\./.test(wg3), "RULE-06, with grant defined where it is first needed");
    // The evidence-vs-harm boundary used to be taught ONLY in a question (recorded in the manifest as unfixed exposure).
    assert.ok(/Weighing is not describing your own harm louder, and not comparing whose evidence is better — that compares sources, not results\./.test(wg.explanation), "RULE-01's boundary, in the teaching");
    // The first COMPLETE comparison (both results, a difference, a reason, a decision) arrives inside the first 60 words.
    const better = wg.explanation.indexOf("Better: ");
    assert.ok(better > 0 && wg.explanation.slice(0, better).trim().split(/\s+/).length <= 60, "the learner sees weighing before any definition of it");
    assert.ok(/because a minute can be made up and an injury cannot/.test(wg.explanation), "and that comparison carries its reason");
    // The step list is the procedure, in order, short enough to carry into a speech.
    assert.equal(wg.steps.length, 5);
    assert.ok(/^Name both results\.$/.test(wg.steps[0]) && /difference the round actually shows/.test(wg.steps[1]) && /rule usable on either side/.test(wg.steps[2]) && /say it early/.test(wg.steps[2])
      && /Run both results through the rule and say which side wins/.test(wg.steps[3]) && /favours them, name it, then say why yours should still decide/.test(wg.steps[4]), "steps carry name / difference / rule+why+early / both / tradeoff");
  });

  check("WD. the ladder is WEAK → BETTER → STRONG on one case; no rung asserts a shared start time; the climax concedes the timing difference (B03 lives in the worked example)", () => {
    const ladder = wg.revisionLadder as Array<{ attempt: string; diagnosis: string; revision: string }>;
    assert.equal(ladder.length, 2, "two rungs, three states");
    assert.equal(ladder[1].attempt, "Same line as above.", "the rungs chain without re-printing the line");
    assert.ok(/^\[A library must cut its help desk or its evening hours\. You defend the desk\.\]/.test(ladder[0].attempt), "the case is stated before the first line");
    assert.ok(/This describes one result and stops\./.test(ladder[0].diagnosis) && /WHAT THE REVISION ADDS: both results, a rule usable on either side, and a reason\./.test(ladder[0].diagnosis));
    assert.ok(/not yet applied/.test(ladder[1].diagnosis) && /skips the difference the other side wins/.test(ladder[1].diagnosis));
    // Commit a6f1aed: an adjudicator BLOCKED a rung diagnosis that asserted both harms start at the same time while the climax conceded a timing difference. No diagnosis may say it again.
    for (const r of ladder) assert.ok(!/(?:same time|at once|start together|neither arrives before|both begin)/i.test(r.diagnosis), `no shared-start claim in a diagnosis: ${r.diagnosis.slice(0, 60)}`);
    assert.ok(/On when the harms start they are ahead, and we grant it/.test(ladder[1].revision) && /On that rule the desk stays\./.test(ladder[1].revision), "the climax names the difference that runs their way and still decides");
    // B03: same words, different speech.
    assert.ok(/^\[Final speech only\]/.test(wg.workedExample.weakAnswer) && /^\[First speech\]/.test(wg.workedExample.strongAnswer) && /\[Final speech\]/.test(wg.workedExample.strongAnswer), "timing is the only variable");
    assert.ok(/Same words; what changed is when the rule arrived\./.test(wg.workedExample.whyItWorks) && /Fix: give the rule earlier\./.test(wg.workedExample.whyItWorks), "the fix is an earlier speech, not a reordered one");
  });

  check("WE. structure, scaffold, checks and the drill alignment are intact; beginner ceilings hold", () => {
    assert.deepEqual(wgSections.map((x) => x.heading), ["Job 1: Find a real difference", "Job 2: Turn it into a rule, and say why", "Job 3: Compare both sides out loud"], "the three jobs");
    assert.equal(wg.misconception, undefined); assert.equal(wg.commonMistakes, undefined); assert.equal(wg.additionalExamples, undefined);
    assert.deepEqual(wg.scaffoldedTry.slots, ["THE COMPARISON I AM ASKING THE JUDGE TO DECIDE ON", "THE DIFFERENCE IN THESE FACTS THAT MAKES THE TWO SIDES COME OUT DIFFERENTLY ON IT", "THE COMPARISON THEY WIN", "MY COMPARATIVE STATEMENT — both harms under my rule, ending in what the judge should do"], "the evaluator's four slots");
    assert.ok(/THE ROUND: a university is deciding whether to require all first-year students to live on campus\./.test(wg.scaffoldedTry.prompt) && /THE FIVE COMPARISONS AVAILABLE TO YOU/.test(wg.scaffoldedTry.prompt) && /Ours is certain:/.test(wg.scaffoldedTry.prompt) && /there is no exception\./.test(wg.scaffoldedTry.prompt) && /Their harm would reach several hundred students; ours would reach a few dozen\./.test(wg.scaffoldedTry.prompt), "the case packet keeps its six established facts (three words plainer)");
    assert.equal(wg.scaffoldedTry.motion, undefined); assert.equal(wg.scaffoldedTry.opponentClaim, undefined);
    assert.equal(1 + wg.practiceQuestions.length + wg.masteryCheck.length, 7, "seven checks");
    assert.deepEqual(wgChecks.map((q) => "ABCD"[q.choices.indexOf(q.correctAnswer)]), ["C", "B", "D", "C", "B", "B", "D"], "keys as authored and reviewed");
    assert.deepEqual(wgEntry.practiceDrill, { track: "debate", area: "weighing" }); assert.equal(wgEntry.skillSlug, WG);
    // Length lattice and lone-cue rules, as for Turn Mechanics.
    const wc = (t: string) => t.trim().split(/\s+/).length;
    const STOP = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on", "it", "is", "are", "that", "this", "them", "they", "you", "your", "both", "for", "with", "not", "no", "so", "at", "as", "by", "one", "two", "their", "its", "what", "which", "when", "than", "then", "does", "do", "up"]);
    const words = (t: string) => (t.toLowerCase().match(/[a-z’'-]+/g) ?? []);
    const MODALS = /\b(can|could|may|might|would|should|must|whichever|whatever|whoever|any)\b/i;
    wgChecks.forEach((q, i) => {
      const lens = q.choices.map(wc), chars = q.choices.map((o) => o.length); const k = q.choices.indexOf(q.correctAnswer);
      const mw = Math.max(...lens), nw = Math.min(...lens), mc = Math.max(...chars), nc = Math.min(...chars);
      assert.ok(!(lens.filter((x) => x === mw).length === 1 && lens[k] === mw), `Q${i + 1}: key not uniquely longest by words`);
      assert.ok(!(lens.filter((x) => x === nw).length === 1 && lens[k] === nw), `Q${i + 1}: nor uniquely shortest by words`);
      assert.ok(!(chars.filter((x) => x === mc).length === 1 && chars[k] === mc), `Q${i + 1}: nor uniquely longest by characters`);
      assert.ok(!(chars.filter((x) => x === nc).length === 1 && chars[k] === nc), `Q${i + 1}: nor uniquely shortest by characters`);
      assert.ok(mw - nw <= 5 && mc - nc <= 16, `Q${i + 1}: options are length-matched (${lens.join("/")} words, ${chars.join("/")} chars)`);
      assert.equal(new Set(q.choices).size, 4, `Q${i + 1}: four distinct options`);
      const stem = new Set(words(q.prompt));
      const echoes = q.choices.map((o) => { const w = words(o); const last = w[w.length - 1]; return Boolean(last) && !STOP.has(last) && stem.has(last); });
      assert.ok(!(echoes[k] && echoes.filter(Boolean).length === 1), `Q${i + 1}: the key must not be the only option whose final word echoes the stem`);
      const modal = q.choices.map((o) => MODALS.test(o));
      assert.ok(!(modal[k] && modal.filter(Boolean).length === 1), `Q${i + 1}: the key must not be the only option carrying a modal`);
    });
    // Ceilings (the floors were retired in f0e17f7): the required path is everything rendered before the first check.
    const required = wgRequired.map(wc).reduce((a, b) => a + b, 0);
    assert.ok(required <= 950, `required path within the beginner allowance: ${required}`);
    for (const field of wgRequired) {
      for (const para of field.split(/\n\n+/)) assert.ok(wc(para) <= 60, `no paragraph above 60 words: ${para.slice(0, 60)}`);
      for (const sentence of field.replace(/\[(?:First|Final) speech(?: only)?\]/g, "").replace(/\n+/g, " ").split(/(?<=[.?!][)”"]?)\s+(?=[A-Z“"(])/)) assert.ok(wc(sentence) <= 40, `no sentence above 40 words: ${sentence.slice(0, 60)}`);
    }
    const qWords = wgChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation]).map(wc).reduce((a, b) => a + b, 0);
    assert.ok(qWords < 1500, `the quiz layer keeps its ceiling (1,591 before the rewrite): ${qWords}`);
  });

  // ================================================================================================
  // S. SIGNPOSTING — the perfection repair (2026-09-06). The audit found the opposite of Answer
  // Types: teaching already strong (method STRONG, structure-vs-substance PASS, 22 of its own 30
  // drill items answerable from stated sentences), wrapped in an assessment that measured nothing.
  // Five independent no-lesson panels — a beginner, an adult reasoner, a test-wise exploiter and two
  // structure-only hunters with the STEMS WITHHELD — returned identical 11/11 sheets, because
  // "strike any option with a vague quantifier, then take the shortest" scored 8/11 while the
  // aggregate read healthy (H_LONG 0%, R_MED 0.84: the inverse of the Answer Types signature, which
  // is why H_LONG alone never catches it). One check was keyed AGAINST the lesson's own transition
  // rule. What follows pins the corrected teaching, the reduced bank, and the scaffold's honesty.
  // ================================================================================================
  const SP = "debate-signposting";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spEntry = EDUCATION_REGISTRY.lessons.find((e: { id: string }) => e.id === SP) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sp = spEntry.source.lesson.content as any;
  const spChecks = [sp.guidedQuestion, ...sp.practiceQuestions, ...sp.masteryCheck] as Array<{ prompt: string; choices: string[]; correctAnswer: string; explanation: string }>;
  const spTeaching = [sp.objective, sp.explanation, sp.whyMatters, ...sp.steps,
    ...Object.values(sp.workedExample as Record<string, string>),
    sp.scaffoldedTry.prompt, sp.scaffoldedTry.frame, ...sp.scaffoldedTry.slots].join("\n");
  const spAll = [spTeaching, spEntry.source.name, spEntry.source.description, spEntry.source.lesson.title,
    spEntry.source.lesson.summary, ...spChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation])].join("\n");

  check("SA. Signposting is teach-and-produce: 11 checks became 6, and only a scaffold was added", () => {
    assert.equal(1 + sp.practiceQuestions.length + sp.masteryCheck.length, 6, "eleven checks became six distinct judgments");
    assert.ok(sp.scaffoldedTry, "the productive obligation now has a surface");
    // Everything else was REFUSED as padding: the audit rated the teaching strong at ~1,264 words.
    for (const field of ["teachingSections", "additionalExamples", "revisionLadder", "misconception", "commonMistakes", "languageFrames"]) {
      assert.equal(sp[field], undefined, `no ${field} — the repair is subtraction plus one production surface`);
    }
    assert.equal(guidedApplicationFor(SP), null, "no guided round: the round's only signposting measure contradicts the lesson");
    assert.equal(spEntry.skillSlug, undefined, "still no skill claim");
    assert.equal(spEntry.practiceDrill, undefined, "and no drill CTA: the sp- skill row is activation-pending");
    const spWords = (t: string) => (t.match(/[A-Za-z’'-]+/g) ?? []).length;
    const qWords = spChecks.flatMap((q) => [q.prompt, ...q.choices, q.explanation]).map(spWords).reduce((a: number, b: number) => a + b, 0);
    assert.ok(qWords < 900, `the quiz layer shrank from 1,207 words: ${qWords}`);
  });

  check("SB. the explanation renders as paragraphs, and the four honesty fixes hold", () => {
    // The renderer splits on blank lines; before the repair this lesson was ONE 1,043-word block.
    const spWords = (t: string) => (t.match(/[A-Za-z’'-]+/g) ?? []).length;
    const paragraphs = sp.explanation.split(/\n{2,}/);
    // Beginner standard (740ef26 lineage): many short paragraphs, none over four sentences' worth.
    assert.ok(paragraphs.length >= 4, `the explanation is ${paragraphs.length} paragraphs`);
    assert.ok(paragraphs.every((p: string) => spWords(p) < 60), "no paragraph is a wall of its own");
    // (a) note-taking is a convention, not a fact about every judge.
    assert.ok(!/Judges take notes in columns/.test(spAll), "the column premise is no longer asserted of all judges");
    assert.ok(/most keep separate notes for each one/.test(sp.explanation), "and is stated as what most do");
    // (b) the roadmap is scoped to the speech that HAS answers to count.
    assert.ok(/In a speech that answers the other side, you usually start with a ROADMAP/.test(sp.explanation),
      "the roadmap is scoped by speech function and hedged, not made universal");
    // The column model is a convention the whole lesson leans on, so the dependency is stated once
    // in the mechanics rather than hedged into invisibility sentence by sentence.
    assert.ok(/A judge who keeps no notes still has to work out which argument you mean/.test(sp.explanation),
      "and the lesson says what holds when the judge keeps no notes");
    assert.ok(!/judges often do not/.test(sp.explanation), "no unsourced claim about how often judges number things");
    assert.ok(/^In a speech that answers the other side, open with a roadmap/.test(sp.steps[0]), "and the step agrees");
    // B01 is GUARD-ONLY in the frozen manifest (281f042): the learner never reads the count-only
    // caveat, but no step may demand a count AND names — that inconsistency is what the guard exists for.
    assert.ok(!/\b(count|number)\b[^.]{0,40}\band\b[^.]{0,40}\bnames?\b/i.test(sp.steps.join(" ")),
      "B01 guard-only: no step demands both a count and names");
    // B03/B04 are GUARD-ONLY: promise management left first-pass prose. The lesson may not license
    // the contradiction — silently reordering or silently dropping a promised answer.
    assert.ok(!/\b(skip|drop|leave out|reorder|change the order)\b[^.]{0,60}\b(quietly|silently|without saying|without telling)\b/i.test(spAll),
      "B03/B04 guard-only: the lesson never licenses silently departing from a roadmap");
    // (c) the card no longer tells the learner to number what the body says never to number.
    assert.ok(!/\bnumbers\b/i.test(spEntry.source.lesson.summary), "the summary drops the numbers instruction");
    assert.ok(/Name the argument itself, not its number and not the speaker/.test(sp.explanation), "which the body contradicted");
    // (d) format-specific vocabulary survives only where the lesson glosses it.
    assert.equal((spAll.match(/contention/gi) ?? []).length, 1, "\"contention\" appears once, in its gloss");
    assert.ok(/often call a contention/.test(sp.explanation), "and that one is the AREA/CONTENTION bridge");
  });

  check("SC. the teaching that used to live only inside deleted questions is in the lesson now", () => {
    const body = sp.explanation + "\n" + Object.values(sp.workedExample as Record<string, string>).join("\n");
    // A spoken transition, and its empty counterpart, both outside the quiz layer.
    // RULE-06 (transitions) is class C in the frozen manifest: a larger-move transition is still
    // MODELLED in the opening example, but no longer taught as a rule in first-pass prose.
    assert.ok(/Now back to our own attendance point/.test(body), "a real transition is modelled on a larger move");
    assert.ok(!/now, on their enforcement argument/.test(body), "never between two of their arguments, which the lesson says needs no transition");
    assert.ok(/"Moving on" or "another thing"/.test(body), "and the empty kind is shown, not just named");
    // "Label the moves, not the sentences" (over-signposting cost) is class C in the frozen manifest
    // and left first-pass prose; nothing pins it. The negative below still holds.
    // Placement is not quality, in the teaching rather than in a check.
    assert.ok(/Signposting is not the argument/.test(body), "structure is not substance (B06, carried by the worked example)");
    assert.ok(/where the answer lands, not whether it was any good/.test(body), "B07: a label locates and nothing more");
    // The three verified gaps.
    assert.ok(/keep using the same name for it every time/.test(body), "stable argument identity is taught (RULE-03)");
    assert.ok(/Any words will do/.test(body), "the wording is explicitly free (RULE-03)");
    // The cut-promise rule (B04) is guard-only; its negative invariant lives in SB.
    // And the worked example now cashes out the roadmap, not only the labels.
    assert.ok(/Notice what the labels do not do/.test(sp.workedExample.whyItWorks), "the example says what a label omits");
  });

  check("SD. no key is isolated by a surface property, and the measured exploit is dead", () => {
    const wc = (t: string) => t.trim().split(/\s+/).length;
    const VAGUE = /\b(most|several|some|roughly|everything|overall|as many as|whole|entire|anything)\b/i;
    const MODAL = /\b(can|could|may|might|would|should|must|whichever|whatever|any)\b/i;
    const ABSOLUTE = /\b(never|always|nothing|every|all|none|entirely|completely)\b/i;
    let exploit = 0;
    spChecks.forEach((q, i) => {
      const k = q.choices.indexOf(q.correctAnswer);
      const lens = q.choices.map(wc), chars = q.choices.map((o) => o.length);
      const uniqueAt = (a: number[], v: number) => a.filter((x) => x === v).length === 1 && a[k] === v;
      assert.ok(!uniqueAt(lens, Math.max(...lens)), `Q${i + 1}: key not uniquely longest by words`);
      assert.ok(!uniqueAt(lens, Math.min(...lens)), `Q${i + 1}: nor uniquely shortest by words`);
      assert.ok(!uniqueAt(chars, Math.max(...chars)), `Q${i + 1}: nor uniquely longest by characters`);
      assert.ok(!uniqueAt(chars, Math.min(...chars)), `Q${i + 1}: nor uniquely shortest by characters`);
      // Single-option lexical properties: allowed on a distractor, never only on the key.
      for (const [label, re] of [["a vague quantifier", VAGUE], ["a modal", MODAL], ["an absolute", ABSOLUTE]] as const) {
        const hit = q.choices.map((o) => re.test(o));
        assert.ok(!(hit[k] && hit.filter(Boolean).length === 1), `Q${i + 1}: the key is not the only option with ${label}`);
        const clear = q.choices.map((o) => !re.test(o));
        assert.ok(!(clear[k] && clear.filter(Boolean).length === 1), `Q${i + 1}: nor the only option without ${label}`);
      }
      const comma = q.choices.map((o) => o.includes(","));
      assert.ok(!(comma[k] && comma.filter(Boolean).length === 1) && !(!comma[k] && comma.filter((x) => !x).length === 1),
        `Q${i + 1}: comma use does not single out the key`);
      assert.equal(new Set(q.choices).size, 4, `Q${i + 1}: four distinct options`);
      // THE MEASURED EXPLOIT, run as a control: strike the vague options, take the shortest survivor.
      const pool = q.choices.map((o, j) => (VAGUE.test(o) ? -1 : j)).filter((j) => j >= 0);
      const live = pool.length ? pool : q.choices.map((_, j) => j);
      const shortest = Math.min(...live.map((j) => q.choices[j].length));
      const picks = live.filter((j) => q.choices[j].length === shortest);
      exploit += picks.includes(k) ? 1 / picks.length : 0;
    });
    assert.ok(exploit <= 1, `the 8/11 exploit is dead: it now scores ${exploit.toFixed(2)}/6`);
    assert.deepEqual(spChecks.map((q) => "ABCD"[q.choices.indexOf(q.correctAnswer)]), ["B", "D", "C", "B", "A", "C"], "keys as authored and reviewed");
  });

  check("SE. the six checks test six distinct judgments, and none contradicts the lesson", () => {
    // RULE-06 (separate-transition taxonomy) is class C in the frozen manifest (281f042) and left
    // first-pass prose, so it may not be assessed. practiceQuestions[1] was repurposed to RULE-02's
    // second half: when you move, NAME the argument you are moving to.
    assert.ok(!spChecks.some((q) => /earns a separate transition/.test(q.prompt)), "RULE-06 (class C) is no longer assessed");
    const moving = spChecks.find((q) => /best tells the judge where you are moving to/.test(q.prompt));
    assert.ok(moving, "the move check asks which line NAMES the destination");
    assert.ok(/on their parking argument/.test(moving!.correctAnswer), "and keys the option that names the argument");
    assert.ok(moving!.choices.filter((o) => /moving on|secondly|another thing|the rest of what/i.test(o)).length >= 3,
      "against three empty or destination-less transitions");
    assert.ok(!spChecks.some((q) => /closes one argument and opens another\?/.test(q.prompt)),
      "the old check, keyed against the lesson's own rule, is gone");
    // One judgment per item, named by the phrase only that item's stem carries.
    const judgments = ["Which opening tells the judge where the answer belongs", "is not a roadmap at all",
      "best tells the judge where you are moving to", "What have the labels achieved", "What is the result", "What follows"];
    for (const j of judgments) {
      assert.equal(spChecks.filter((q) => q.prompt.includes(j)).length, 1, `exactly one check asks: ${j}`);
    }
    // The failure the lesson calls the one to watch for is now judged.
    const misfiled = spChecks.find((q) => /never touches/.test(q.correctAnswer));
    assert.ok(misfiled && /keeps none/.test(misfiled.correctAnswer), "a precise label pointed at the wrong argument is tested");
    assert.ok(spChecks.some((q) => /both names are one argument/.test(q.correctAnswer)), "and so is stable argument identity");
    // The two outcome items ran one four-family template in the same order, and "anyway" marked the
    // rescue option in both, so calibrating on one gave the other away. Neither may return.
    assert.equal((spAll.match(/\banyway\b/g) ?? []).length, 0, "no shared rescue-family marker across the outcome items");
    assert.ok(spChecks.some((q) => q.choices.some((o) => /You lose the seconds it takes/.test(o))),
      "a distractor names a real cost, so naming a cost no longer means naming the key");
    // THE SURVIVING CROSS-ITEM ROUTE, pinned at its measured ceiling. Where a stem stipulates an
    // error, a test-wise reader takes the option that leaves the speaker uncompensated. On the three
    // outcome items that route must never isolate the key: at least two options have to carry the
    // concession, so splitting them needs the taught judgment. Measured 2.25/6 with 0 items isolated.
    const concedes = /\b(unsupported|wasted|keeps none|left to work out|lose|nothing|never)\b/i;
    let isolated = 0;
    for (const q of spChecks) {
      const k = q.choices.indexOf(q.correctAnswer);
      const bearing = q.choices.filter((o) => concedes.test(o));
      if (bearing.length === 1 && concedes.test(q.choices[k])) isolated += 1;
    }
    assert.equal(isolated, 0, "no item lets the concession route isolate the key on its own");
  });

  check("SF. the scaffold grades the level exactly and refuses to imply more", () => {
    const { evaluateSignpostingScaffold, soleSignpostLevelTerm, SIGNPOST_LEVEL_TERMS } = coaching;
    assert.deepEqual([...SIGNPOST_LEVEL_TERMS], ["area", "argument", "inner claim"], "the closed vocabulary is the lesson's own stack");
    assert.ok(/At the top is an AREA/.test(sp.explanation) && /INNER CLAIMS/.test(sp.explanation), "which the lesson defines in capitals");
    assert.deepEqual(sp.scaffoldedTry.slots, ["the level your answer is aimed at", "the label you would say"]);
    assert.ok(/half of them are broken/.test(sp.scaffoldedTry.prompt), "the authored case the key was set against");
    assert.equal(sp.scaffoldedTry.motion, undefined, "no field is made to lie");
    // WHOLE-ANSWER equality, never "contains a level".
    assert.equal(soleSignpostLevelTerm("inner claim"), "inner claim");
    assert.equal(soleSignpostLevelTerm("an inner claim"), "inner claim");
    assert.equal(soleSignpostLevelTerm("contention"), "area", "the lesson's own gloss for an area");
    assert.equal(soleSignpostLevelTerm("argument level"), "argument");
    assert.equal(soleSignpostLevelTerm("inner claim or argument"), null, "an enumeration is not an answer");
    assert.equal(soleSignpostLevelTerm("the claim about the lamps"), null, "nor is a sentence containing the word");
    const run = (level: string, signpost: string) => evaluateSignpostingScaffold({ level, signpost }, "inner claim");
    assert.equal(run("argument", "on their lighting argument").complete, false, "the wrong level fails");
    assert.equal(run("area", "on safety").complete, false, "in both directions");
    // FORM ONLY on the written signpost: what it refuses is exactly what the lesson rules out.
    assert.equal(run("inner claim", "on their second point").complete, false, "an ordinal names no column");
    assert.equal(run("inner claim", "responding to their first speaker").complete, false, "nor does a speaker");
    assert.equal(run("inner claim", "on it").complete, false, "nor two words");
    const ok = run("inner claim", "on their claim that half the lamps are broken");
    assert.equal(ok.complete, true);
    // The honesty the audit demanded: the completion copy must not imply the signpost was read.
    assert.ok(/Your label was checked only for shape/.test(ok.exactCheck ?? ""), "the copy says the label was shape-checked");
    assert.ok(/Nothing read whether it names the thing you meant/.test(ok.exactCheck ?? ""),
      "and refuses the semantic claim outright");
    assert.ok(/a sentence with nothing to do with the lamps would have passed too/.test(ok.exactCheck ?? ""),
      "in the blunt form, so the learner cannot mistake a shape check for a reading");
    assert.ok(/nothing here asked why/.test(ok.exactCheck ?? ""),
      "and the level check discloses its own limit too, rather than only the label's");
    assert.ok(/the ___ level/.test(sp.scaffoldedTry.frame), "the frame asks for the level name, not the target");
    // And the disclosed limit is real, not a claim: invented content passes the shape check.
    assert.equal(run("inner claim", "on their zxqv argument").complete, true,
      "a shape guard cannot tell a real label from an invented one — which is why the copy claims nothing about it");
  });

  check("SG. the Signposting repair leaves the drill bank, the judge and the containment alone", () => {
    const drills = require("../lib/debate-drills");
    // 30 sp- items serve today and NONE is held. This repair does not release, rewrite or credit any
    // of them: sp-16 and sp-24 remain untaught-but-servable, and that stays recorded as OPEN debt.
    assert.equal(drills.DRILL_BANK.filter((q: { area: string }) => q.area === "signposting").length, 30, "the signposting bank is untouched");
    assert.equal(drills.DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("rb-")).length, 22, "22 rebuttal items remain withheld");
    assert.equal(drills.DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("sp-")).length, 2, "and the Signposting containment is the two untaught items, which this repair did not touch");
    // The LESSON repair held nothing. The two sp- holds arrived later, in the Signposting INTEGRATION
    // milestone, which adjudicated them against this lesson's accepted text — so this control now
    // pins that the lesson repair itself neither released nor rewrote a drill item.
    assert.equal(drills.DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("sp-")).length, 2,
      "the Signposting containment is exactly the two integration-adjudicated items");
    assert.deepEqual(drills.DEBATE_DRILL_HELD_IDS.filter((id: string) => id.startsWith("sp-")).sort(), ["sp-16", "sp-24"],
      "and no other Signposting item was ever held");
    assert.equal(drills.debateMasteryHeld("debate-rebuttal"), true, "durable rebuttal mastery stays held");
    // The lesson claims no mastery and no guided competency, so nothing it says is scored anywhere.
    assert.ok(!/mastery|mastered/i.test(spTeaching), "the lesson claims no durable mastery");
    assert.deepEqual(guidedRubricFor(PILOT).locked.includes("signposting") ? "locked" : "unlocked", "locked",
      "signposting stays locked in the pilot rubric: the judge's organization measure rewards the labels this lesson calls wrong");
  });

  console.log(`\ncoached-performance: ${checks} controls passed.`);
  console.log("  EXPLAIN -> MODEL -> SCAFFOLDED TRY -> GUIDED DEBATE -> FEEDBACK -> RETRY -> CUMULATIVE -> FADE -> INDEPENDENT COMPETE");
  console.log(`  Pilot: ${PILOT}. Unlocked: ${unlockedCompetenciesFor(PILOT).join(", ")}. Locked: ${guidedRubricFor(PILOT).locked.join(", ")}.`);
  console.log("  Learn-side coaching writes nothing; a guided round is stored as a round and moves no part of the record; debate-rebuttal mastery remains held; full Compete is INDEPENDENT.");
}

main();
