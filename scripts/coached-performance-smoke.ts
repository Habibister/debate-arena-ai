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
    assert.equal(DEBATE_DRILL_HELD_IDS.length, 22, "22 items still quarantined");
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
    assert.deepEqual(withFrames, ["debate-clash", PILOT], "exactly two lessons carry the coached model: Refutation and Clash");
    assert.equal(LEARNING_SKILL_CATALOG.filter((e: { lesson: { content: { scaffoldedTry?: unknown } } }) => e.lesson.content.scaffoldedTry).length, 2,
      "two lessons carry a scaffolded try: the Refutation pilot and Clash");
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
    assert.equal(JUDGE_CATEGORY_COMPETENCY.clash, "weighing", "control: the lexical 'clash' category IS weighing");
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
    assert.ok(/report\.guided \? \([\s\S]{0,300}Guided exercise completed/.test(arena), "a guided ballot is headed as a guided exercise, not a won round");
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
    assert.ok(/ratingChange: \{/.test(route), "the rating block is still built for full Compete");
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
    assert.ok(/_avg: \{ overallScore: true \},\s*where: \{ studentId: session\.user\.id, status: "JUDGED", overallScore: \{ not: null \}, \.\.\.INDEPENDENT_ROUND_WHERE \}/.test(dashboard), "Dashboard average is independent rounds only");
    const history = stripComments(read("lib/debate-history.ts"));
    assert.ok(/where: \{ studentId: userId, topic, status: "JUDGED", id: \{ not: excludeId \}, \.\.\.INDEPENDENT_ROUND_WHERE \}/.test(history), "same-motion attempt comparison is independent rounds only");
    const coach = stripComments(read("lib/coach-progress.ts"));
    assert.ok(/const averageDebateScore = average\(judgedDebates\.map/.test(coach), "coach average derives from the filtered list");
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
    assert.ok(clashContent.teachingSections.length >= 4 && clashContent.additionalExamples.length >= 1 && clashContent.revisionLadder.length >= 2);
    assert.ok(clashContent.misconception && clashContent.commonMistakes.length === 7, "seven owned mistakes, including the strawmanned restatement");
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
    assert.equal(evaluateScaffoldFor("debate-weighing", ["a", "b"]), null, "a lesson with no evaluator cannot be checked");
    const withTry = LEARNING_SKILL_CATALOG.filter((e: { lesson: { content: { scaffoldedTry?: unknown } } }) => e.lesson.content.scaffoldedTry).map((e: { slug: string }) => e.slug).sort();
    assert.deepEqual(withTry, Object.keys(SCAFFOLD_EVALUATORS).sort(), "every lesson with a scaffolded try has a registered evaluator, and no evaluator is orphaned");
    const tryComponent = stripComments(read("components/coaching/scaffolded-try.tsx"));
    assert.ok(/evaluateScaffoldFor\(\s*lessonId,\s*scaffoldedTry\.slots\.map\(\(_, i\) => values\[keyFor\(i\)\] \?\? ""\),\s*\{ motion: scaffoldedTry\.motion \}\s*\)/.test(tryComponent),
      "the live component dispatches by lesson id and passes the authored motion");
    assert.ok(!/evaluateRefutationScaffold|theySay/.test(tryComponent), "the component no longer hard-codes the pilot's slots");
    assert.ok(/\?\? UNCHECKABLE/.test(tryComponent), "no evaluator → cannot complete → guided round stays closed");
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
    assert.ok(text.includes("Find the real clash") && text.includes("Different is not the same as opposed"), "the rebuilt teaching renders");
    assert.ok(text.includes("Words you can use") && text.includes("Now try the move"), "frames and the constructed attempt render");
    assertOrder(clashHtml, 'id="language"', 'id="practice"', "frames are teaching and precede the checks");
    assertOrder(clashHtml, 'id="scaffolded-try"', 'id="practice-drill"', "the constructed attempt precedes the drill CTA");
    assertOrder(clashHtml, "Different is not the same as opposed", "Which of Side B", "teaching precedes the first check");
    for (const slot of ["1. side a", "2. side b", "3. the real clash"]) assert.ok(text.includes(slot), `slot rendered: ${slot}`);
    const firstSection = clashHtml.slice(clashHtml.indexOf("Different is not the same as opposed"), clashHtml.indexOf("Find the question both sides"));
    assert.ok((firstSection.match(/<p class="mt-2 break-words leading-7/g) ?? []).length >= 3, "a section body with blank-line breaks renders as several paragraphs, not a wall");
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
    assert.ok(/Keep the amount inside the question the two sides are answering/.test(teaching), "the degree move is bounded");
    assert.ok(/worth the cost[\s\S]{0,120}which is weighing/.test(teaching), "the cost-benefit look-alike is named as weighing and excluded");
    // NO-CLASH EXIT. Digging that finds nothing is an honest answer, and the alternative is named.
    assert.ok(/Sometimes the honest result of digging is that there is no shared question/.test(teaching), "the exit condition is taught");
    assert.ok(/Do not invent a dependency/.test(teaching), "and inventing a dependency is named as the failure");
    // FAIR RESTATEMENT. Taught, and carried by its own mistake and its own ladder rung.
    assert.ok(/Restate each side at the strength they gave it/.test(teaching), "fairness applies to the positions, not only the question");
    assert.ok(clashContent.commonMistakes.some((m: { mistake: string }) => /Restating the other side more weakly/.test(m.mistake)), "the strawman has its own mistake bullet");
    assert.ok(clashContent.revisionLadder.some((r: { diagnosis: string }) => /a position Side B never took/.test(r.diagnosis)), "and a ladder rung repairs one");
    // The two ladder rungs repair DIFFERENT failures.
    const [first, second] = clashContent.revisionLadder;
    assert.ok(/wrong one of|paired the wrong|the wrong one/.test(first.diagnosis) || /can be true on the same/.test(first.diagnosis), "rung 1 is the both-true failure");
    assert.ok(!/can be true on the same/.test(second.diagnosis), "rung 2 is a different failure, not the same repair twice");
    // The scaffold makes the learner choose which of two opposing arguments meets Side A.
    assert.ok(/Only ONE of Side B's arguments meets Side A/.test(clashContent.scaffoldedTry.prompt), "the constructed attempt exercises the choice, not a flat contradiction");
    // The irrelevant-dispute example is one a debater would actually raise.
    assert.ok(!/blue or green/.test(teaching), "the throwaway example is gone");
    assert.ok(/eleven million or nine/.test(teaching), "and is replaced by a dispute a real round would have");
  });

  check("LM. the guided round never claims to measure Clash IDENTIFICATION — it measures engagement, and says so", () => {
    const { COMPETENCY_ROUND_MEASURE } = guidedJudge;
    assert.equal(COMPETENCY_ROUND_MEASURE.clash.direct, false, "the round's only Clash-mapped category is an ADJACENT measure");
    assert.equal(COMPETENCY_ROUND_MEASURE.clash.label, "central-clash engagement");
    assert.ok(/constructed attempt in the lesson/.test(COMPETENCY_ROUND_MEASURE.clash.directEvidence), "the direct evidence is named: the scaffolded try");
    assert.equal(COMPETENCY_ROUND_MEASURE.refutation.direct, true, "control: refutation in a round IS refutation");
    // The Clash ballot carries the measure and names itself by it — never "Clash:" alone under a
    // "new skill" heading.
    const ballot = projectGuidedJudgeResult(FULL_RESULT, clashRubric, CLASH);
    assert.deepEqual(ballot.guidedFeedback.measure, COMPETENCY_ROUND_MEASURE.clash);
    assert.ok(/^Clash in the round \(central-clash engagement\)/.test(ballot.guidedFeedback.newSkill), `named by what was measured: ${ballot.guidedFeedback.newSkill}`);
    assert.ok(!/you can identify|proved you can|identified the clash/i.test(JSON.stringify(ballot)), "no identification claim anywhere on the ballot");
    const refutationBallot = projectGuidedJudgeResult(FULL_RESULT, rubric, PILOT);
    assert.ok(/^Refutation:/.test(refutationBallot.guidedFeedback.newSkill), "control: a direct measure keeps the plain skill name");
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
    // Weighing cannot re-enter through the Clash mapping.
    assert.equal(guidedJudge.JUDGE_CATEGORY_COMPETENCY.clash, "weighing", "control: the lexical 'clash' category is weighing");
    assert.ok(!allowedJudgeCategories(clashRubric).includes("clash"), "and it is not allowed in a Clash round");
  });

  console.log(`\ncoached-performance: ${checks} controls passed.`);
  console.log("  EXPLAIN -> MODEL -> SCAFFOLDED TRY -> GUIDED DEBATE -> FEEDBACK -> RETRY -> CUMULATIVE -> FADE -> INDEPENDENT COMPETE");
  console.log(`  Pilot: ${PILOT}. Unlocked: ${unlockedCompetenciesFor(PILOT).join(", ")}. Locked: ${guidedRubricFor(PILOT).locked.join(", ")}.`);
  console.log("  Learn-side coaching writes nothing; a guided round is stored as a round and moves no part of the record; debate-rebuttal mastery remains held; full Compete is INDEPENDENT.");
}

main();
