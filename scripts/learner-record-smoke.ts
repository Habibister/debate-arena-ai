/**
 * learner-record:smoke — record, recommendation and learner-state TRUTH on the track-scoped surfaces
 * (Owner QA Repair 3B: Round-2 findings #8 #9 #10 #11 #12 and the Dashboard's Debate-only content).
 *
 * Strict-safe: imports only pure helpers and reads source files. No .env, no database, no network.
 * Home and the Dashboard import Prisma, so their behaviour is proven at the source level (comment-
 * stripped), and the pure summarisers are proven by execution.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { flaggedTestForTrack, summarizePracticeTests, weakAreasForTrack } from "../lib/track-recommendations";
import { nextStepsForTrack } from "../lib/dashboard-actions";
import { trackById } from "../lib/training-tracks";

const results: string[] = [];
let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${name}\n     ${error instanceof Error ? error.message : String(error)}`);
  }
}
const read = (path: string) => readFileSync(path, "utf8");
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

const HOME = "app/(app)/home/page.tsx";
const DASH = "app/(app)/dashboard/page.tsx";
const SKILLS = "app/(app)/skills/page.tsx";
const RECORD = "lib/learner-record.ts";

// ---------------------------------------------------------------------------------------------
check("R1. absence is not zero: an average with nothing to average is null, never 0", () => {
  assert.deepEqual(summarizePracticeTests([]), { completed: 0, average: null }, "R1a no tests -> null");
  assert.deepEqual(summarizePracticeTests([{ score: null }, { score: null }]), { completed: 2, average: null }, "R1b completed tests without scores -> null");
  assert.deepEqual(summarizePracticeTests([{ score: 40 }, { score: 61 }]), { completed: 2, average: 51 }, "R1c a real mean is a real number");
  assert.deepEqual(summarizePracticeTests([{ score: 0 }]), { completed: 1, average: 0 }, "R1d a measured zero stays zero");
  // Control: the two are distinguishable — null and 0 must never be conflated by a caller.
  assert.notEqual(summarizePracticeTests([]).average, summarizePracticeTests([{ score: 0 }]).average, "R1-C null is not 0");
});

check("R2. the flagged test is the one whose areas are shown, and 'latest' is only claimed when true", () => {
  const tests = [
    { id: "t3", organization: "DECA" as const, weakAreas: [] },
    { id: "t2", organization: "DECA" as const, weakAreas: ["Pricing strategy", "Promotion metrics"] },
    { id: "t1", organization: "HOSA" as const, weakAreas: ["Anatomy and physiology"] }
  ];
  const deca = flaggedTestForTrack(tests, "DECA");
  assert.deepEqual(deca, { testId: "t2", weakAreas: ["Pricing strategy", "Promotion metrics"], isLatest: false }, "R2a the newest DECA test with areas — and it is NOT the latest, so isLatest is false");
  assert.deepEqual(weakAreasForTrack(tests, "DECA"), deca?.weakAreas, "R2b the names shown come from the same test");
  assert.deepEqual(flaggedTestForTrack(tests.slice(1), "DECA"), { testId: "t2", weakAreas: ["Pricing strategy", "Promotion metrics"], isLatest: true }, "R2c when it IS the latest, isLatest is true");
  assert.equal(flaggedTestForTrack(tests, "HOSA")?.testId, "t1", "R2d another track's test is never DECA evidence — and vice versa");
  assert.equal(flaggedTestForTrack(tests, undefined), null, "R2e no track -> no evidence (fail closed)");
  assert.equal(flaggedTestForTrack(tests, "DEBATE"), null, "R2f a track with no tests -> nothing");
});

// ---------------------------------------------------------------------------------------------
check("R3. Home: the record tile never attributes another track's activity to DECA or HOSA", () => {
  const home = stripComments(read(HOME));
  assert.match(home, /\{isDebateTrack \|\| !activeTrack \? \(/, "R3a the account-wide/Debate trio renders only for Debate (or no track)");
  assert.match(home, /<Fact label="Practice sessions" value=\{sessions\} description="Scored activities across all your tracks" \/>/, "R3b the account-wide counter says it is account-wide");
  assert.match(home, /<Fact label="Judged rounds" value=\{judgedDebateCount\} \/>/, "R3c judged rounds stay inside the Debate branch");
  // The non-Debate branch reads the track-scoped record, and only that.
  const tileStart = home.indexOf('label="Practice tests completed"');
  const nonDebate = home.slice(tileStart, home.indexOf("</section>", tileStart));
  assert.ok(nonDebate.length > 100, "R3-C the DECA/HOSA branch was located");
  assert.ok(!/judgedDebateCount|guidedExerciseCount|\bsessions\b/.test(nonDebate), "R3d no account-wide or Debate number appears in the DECA/HOSA tile");
  assert.match(nonDebate, /trackRecord\?\.testsCompleted/, "R3e tests completed is the track-scoped count");
  assert.match(nonDebate, /practiceAverage === null \? "—"/, "R3f the average renders — when there is nothing to average");
  assert.match(nonDebate, /No completed \$\{activeTrack\.short\} practice tests yet/, "R3g and says so in words");
  assert.match(nonDebate, /label="Skills with a recorded result"[\s\S]{0,80}trackRecord\?\.recordedSkills/, "R3h recorded skills is the scoped MasteryProgress count");
  assert.match(nonDebate, /"From DECA drills that record — role-plays aren't saved yet" : "From Medical Terminology practice that records"/, "R3i and each track's description names the writer that records it (DECA drills; HOSA Medical Terminology practice)");
  assert.match(nonDebate, /Medical Terminology practice isn't counted here/, "R3i2 HOSA's test count says what it does not count");
  assert.match(home, /const practiceAverage = trackRecord\?\.recentAverage \?\? null;/, "R3j the average comes from the shared helper");
  assert.ok(!/practiceAverage = completedScores\.length > 0 \? [\s\S]{0,120}: 0;/.test(home), "R3k the old 0-coercion is gone");
});

check("R4. the shared record helper is track-scoped in every query and mirrors the Study Arcade's record tile", () => {
  const rec = stripComments(read(RECORD));
  assert.match(rec, /prisma\.practiceTest\.count\(\{ where: \{ userId, status: "COMPLETED", organization, completedAt: \{ not: null \} \} \}\)/, "R4a tests completed is organization-scoped AND the same population as the recent window (dated completions only)");
  assert.match(rec, /prisma\.masteryProgress\.count\(\{ where: \{ userId, lastPracticedAt: \{ not: null \}, skill: \{ organization \} \} \}\)/, "R4b recorded skills is scoped through the skill's organization");
  assert.match(rec, /orderBy: \{ completedAt: "desc" as const \},\s*take: RECENT_TEST_WINDOW/, "R4c one window, ordered by completion");
  assert.match(rec, /where: \{ userId, status: "COMPLETED" as const, organization, completedAt: \{ not: null \} \}/, "R4c2 a row with no completion time is never 'recent' or 'latest' (PostgreSQL sorts NULLs first under DESC)");
  assert.match(rec, /recentAverage: summarizePracticeTests\(recent\)\.average/, "R4d the average is the null-safe summariser's");
  // The Study Arcade's own record tile uses the identical scope, so the two numbers cannot disagree.
  const arcade = stripComments(read("app/(app)/study-arcade/page.tsx"));
  assert.match(arcade, /lastPracticedAt: \{ not: null \}, skill: \{ organization: activeTrack\.organization \}/, "R4e the Arcade scopes its record tile the same way");
  for (const file of [HOME, DASH]) {
    const src = stripComments(read(file));
    assert.match(src, /\.\.\.recentCompletedTestsQuery\(session\.user\.id, activeOrg\),/, `R4f ${file} reads the same recent-test window`);
    assert.ok(!/orderBy: \{ createdAt: "desc" \}/.test(src), `R4g ${file} no longer orders the window by creation`);
    assert.match(src, /await trackPracticeRecord\(session\.user\.id, activeOrg\)/, `R4h ${file} reads the shared record`);
    assert.match(src, /organization: activeOrg, completedAt: \{ not: null \} \}/, `R4i ${file}'s own window also excludes undated rows`);
  }
});

check("R5. Home's recommendation links to the graded test that flagged it, and claims 'latest' only when true", () => {
  const home = stripComments(read(HOME));
  assert.match(home, /const flagged = flaggedTestForTrack\(practiceTests, activeOrg\);/, "R5a the evidence test is resolved");
  assert.match(home, /select: \{ id: true, score: true, weakAreas: true, organization: true \}/, "R5b its id is fetched with the window");
  // SUPERSEDED by QA-R2 #8/#13, not loosened. The sentence still names WHICH test and still says
  // "latest" only when it is; what changed is that it now offers the step proportionally — one graded
  // test is evidence for a suggestion, not a verdict on the learner's weakest skill.
  assert.match(home, /Based on \{flagged\.isLatest \? "your latest" : "a recent"\} completed \{activeTrack\?\.short\} practice test, which flagged \{weakAreas\[0\]\}/, "R5c the sentence says which test, truthfully, and names the track");
  assert.ok(!/biggest weakness|weakest skill|must fix/i.test(home), "R5c-1 and never escalates one test into a verdict");
  assert.match(home, /href=\{`\/tests\/\$\{flagged\.testId\}\/results` as Route\}/, "R5d the action opens THAT test's feedback");
  assert.match(home, /See that test&apos;s feedback/, "R5e and the label says so");
  assert.ok(!/Open skill practice/.test(home), "R5f the generic skills CTA is gone");
  assert.ok(!/href=\{`\/skills\?track=\$\{trackSlug\}` as Route\}/.test(home), "R5g nothing on Home routes a named weak area to /skills");
  assert.match(home, /\{isTestTrack \? \(\s*<Card>[\s\S]*?Suggested next step/, "R5h the card renders only on tracks with a test product — the only source of weak areas");
  assert.ok(!/complete a practice test or drill and your weak areas/.test(home), "R5i the empty state no longer claims drills produce weak areas");
});

check("R5J. Home ranks the evidence-backed step above generic practice, and speaks the recorded skill's name", () => {
  // QA-R2 #8: the generic "Start DECA practice" button and the recommendation card used to sit at the
  // same weight, so a beginner got two next steps that disagreed. QA-R2 #6: the card named the test's
  // own vocabulary ("Target market analysis"), which appears nowhere else in the product.
  const home = stripComments(read(HOME));
  assert.match(home, /const hasPersonalNextStep = Boolean\(flagged && weakAreas\.length > 0\);/, "R5J-a one value decides whether personalised evidence exists");
  assert.ok(
    home.indexOf("Suggested next step") < home.indexOf("Or start ${activeTrack.short} practice"),
    "R5J-b the suggestion is rendered before the generic action"
  );
  assert.match(home, /variant: hasPersonalNextStep \? "outline" : "default"/, "R5J-c and the generic action steps down to secondary when it exists");
  assert.match(home, /hasPersonalNextStep\s*\? `Or start \$\{activeTrack\.short\} practice`/, "R5J-d its label says it is the alternative");
  assert.match(home, /decaDiagnosticRoutesForLearner\(weakAreas\)/, "R5J-e the recorded skill comes from the one bridge");
  assert.match(home, /suggestion \? `Suggested: \$\{suggestion\.areaLabel\}` : `Suggested: \$\{weakAreas\[0\]\}`/, "R5J-f which names the skill, falling back to the raw area when unbridged");
  assert.match(home, /activeOrg === "DECA"/, "R5J-g and only DECA has a bridge — no other track is given an invented one");
});

check("R6. Home's COMPETE action is the track's own, in the track's own words", () => {
  const home = stripComments(read(HOME));
  assert.match(home, /activeTrack\?\.id === "DECA"\s*\? \{ href: `\/study-arcade\?track=\$\{trackSlug\}`, label: "Run the full DECA simulation"/, "R6a DECA: the full simulation, named as the Compete page names it, where the Compete page sends it");
  assert.match(home, /activeTrack\?\.id === "HOSA"\s*\? \{ href: "\/training\/hosa\/events", label: "Find your HOSA event"/, "R6b HOSA: the Event Navigator, where the Compete page sends it");
  assert.match(home, /: \{ href: `\/debate\?track=\$\{trackSlug\}`, label: "Debate Now", detail: "A full round with an AI opponent and judge"/, "R6c Debate keeps Debate Now, unchanged");
  const deca = home.slice(home.indexOf('activeTrack?.id === "DECA"\n      ? { href:'), home.indexOf('activeTrack?.id === "HOSA"'));
  assert.ok(deca.length > 40 && !/debate|opponent/i.test(deca), "R6d DECA's action carries no Debate wording");
  // Compete-page parity, word for word.
  const compete = stripComments(read("app/(app)/compete/page.tsx"));
  assert.ok(compete.includes("The timed end-to-end run: prep clock → pitch → objections → scored ballot. Results aren't saved yet."), "R6e the DECA detail is the Compete card's own sentence");
  assert.ok(compete.includes("HOSA events differ too much for one arena. Start from your exact event and train what it actually contains."), "R6f and so is HOSA's");
  assert.match(home, /const quickActions = \[\s*competeAction,/, "R6g it is the first quick action");
});

check("R7. an unstarted learner is announced as starting, not continuing", () => {
  const home = stripComments(read(HOME));
  assert.match(home, /<h2 className="sr-only">\{hasContinue \? "Continue training" : "Start training"\}<\/h2>/, "R7a the accessible heading follows the same evidence as the visible one");
  assert.match(home, /const hasContinue = unfinished\.length > 0;/, "R7b and that evidence is real unfinished sessions on this track");
  assert.match(home, /trackAllowsOrganization\(activeTrack, d\.organization\)/, "R7c filtered by track");
});

// ---------------------------------------------------------------------------------------------
check("R8. Dashboard: Debate-only concepts render only under Debate; DECA/HOSA get their own record", () => {
  const dash = stripComments(read(DASH));
  assert.match(dash, /const showDebateRecord = isDebateTrack \|\| !activeTrack;/, "R8a one gate");
  for (const gated of ["Recommended bot", "label=\"Judged rounds\"", "Debate record"]) {
    const at = dash.indexOf(gated);
    assert.ok(at > 0, `R8b ${gated} still exists for Debate`);
    const before = dash.slice(Math.max(0, at - 700), at);
    assert.ok(/showDebateRecord \?/.test(before), `R8c ${gated} sits inside the Debate gate`);
  }
  assert.match(dash, /<Badge variant="outline">\{activeTrack\.label\} record<\/Badge>/, "R8d the other tracks get a card in their own name");
  assert.match(dash, /DECA role-plays aren't saved yet, so they are not counted anywhere\./, "R8e and DECA's says what is not counted");
  assert.match(dash, /label="Practice tests completed"[\s\S]{0,120}trackRecord\?\.testsCompleted/, "R8f the stat card is the scoped count");
  assert.match(dash, /value=\{practiceAverage === null \? "—" : `\$\{practiceAverage\}%`\}/, "R8g the average renders — when null");
  assert.match(dash, /function practiceAverageFromTests\(tests: Array<\{ score: number \| null \}>\): number \| null/, "R8h and the helper is null-safe by signature");
  assert.ok(!/return 0;\s*\}\s*return Math\.round\(completedScores/.test(dash), "R8i the 0-coercion is gone");
  assert.match(dash, /trackHasPracticeTests\(activeTrack\?\.id\) && activeTrack \? \(\s*<StatCard\s*label="Practice average"/, "R8j the average card exists only where a test product exists");
  assert.match(dash, /"Scored activities across all your tracks, counted as they happen — not only this track\."/, "R8k the account-wide counter says so on DECA/HOSA");
  assert.match(dash, /\(showDebateRecord \? "Debater" : "Student"\)/, "R8l no 'Debater' fallback on a DECA/HOSA page");
  assert.match(dash, /demo && showDebateRecord \? demoSampleLessons/, "R8m Debate demo rows never render under DECA/HOSA");
  assert.match(dash, /demo && showDebateRecord \? demoSampleMastery : \[\]/, "R8m2 nor do the demo mastery percentages (Debate skill names)");
  assert.match(dash, /const hasActivity = showDebateRecord\s*\? \(xp \?\? 0\) > 0 \|\| recentTests\.length > 0 \|\| judgedDebateCount > 0 \|\| guidedExerciseCount > 0\s*: recentTests\.length > 0 \|\| \(trackRecord\?\.recordedSkills \?\? 0\) > 0;/, "R8r under DECA/HOSA the learning-path state comes from that track's activity only (tests, recorded drills) — never XP or Debate rounds");
  assert.match(dash, /trackHasPracticeTests\(activeTrack\?\.id\) && activeTrack \? \(trackRecord && trackRecord\.testsCompleted > 0 \? "None flagged in recent tests" : "No test taken yet"\) : "Not started yet"/, "R8s the weak-skill tile names tests only on a track that has them; Debate keeps its neutral copy");
  assert.match(dash, /actionHref=\{activeTrack \? `\/tests\?track=\$\{activeTrack\.slug\}` : "\/tests"\}/, "R8n the tests empty state keeps the track");
  assert.match(dash, /Generate a \$\{activeTrack\.short\} test to unlock/, "R8o and names only this track");
  // Drafts: the same accepted comparator Home uses.
  assert.match(dash, /\.filter\(\(debate\) => trackAllowsOrganization\(activeTrack, debate\.organization\)\)/, "R8p unfinished sessions are track-filtered");
  assert.match(dash, /\.filter\(\(debate\) => !isLegacyPracticeRecord\(debate\)\)/, "R8q and legacy rows excluded");
});

check("R9. Dashboard action cards under DECA are DECA's; the Debate set is unchanged", () => {
  const deca = nextStepsForTrack(trackById("DECA"));
  assert.deepEqual(deca.map((a) => a.key), ["practice", "tests", "skills", "study"], "R9a four DECA cards");
  for (const a of deca) assert.ok(!/debate/i.test(a.title + a.description + a.href), `R9b no Debate wording or route: ${a.title}`);
  assert.equal(deca.find((a) => a.key === "skills")?.title, "See DECA skills", "R9c the skills card names what /skills holds");
  assert.ok(!/mastery lessons/i.test(deca.map((a) => a.title).join(" ")), "R9d no 'mastery lessons' promise");
  const debate = nextStepsForTrack(trackById("GENERAL_DEBATE"));
  assert.deepEqual(debate.map((a) => a.title), ["Learn how a debate round works", "Start an AI debate round", "Drill a debate skill"], "R9e Debate cards unchanged");
  const hosa = nextStepsForTrack(trackById("HOSA"));
  for (const a of hosa) assert.ok(!/debate/i.test(a.title + a.description + a.href), `R9f HOSA: ${a.title}`);
});

check("R10. /skills no longer promises DECA a mastery-lesson product it does not hold", () => {
  const skills = stripComments(read(SKILLS));
  for (const gone of ["Mastery paths", "Lesson anatomy", "Mastery quiz", "mastery checks", "guided reps", "lessonStructure"]) {
    assert.ok(!skills.includes(gone), `R10a "${gone}" is gone`);
  }
  assert.match(skills, /activeTrack \? `\$\{activeTrack\.label\} skills` : "Skills"/, "R10b the non-Debate title names the track");
  // SUPERSEDED by the final DECA cleanup, not loosened. R10c used to pin the sentence that NAMED the
  // four skills, which was the whole repair at the time. The page then listed none of them, so a
  // beginner could not open any one, and could not tell which two are role-play skills and which two
  // are the cluster knowledge the exam tests. The copy now points at cards that carry that, and the
  // cards are derived from the canonical map rather than restated — so the control moves with it.
  assert.match(skills, /DECA records four skills\./, "R10c DECA's copy still states the number it records");
  assert.match(
    skills,
    /says which side of the event CompeteReady trains it for, links the lesson to start from, and opens its own drill/,
    "R10c-1 and now promises, per skill, an attributed grouping, a starting lesson and its own drill"
  );
  const path = stripComments(read("components/skills/skill-path.tsx"));
  assert.match(path, /DECA_DRILL_AREAS\.map/, "R10c-2 the four cards come from the canonical drill areas, never a hand-written list");
  assert.match(path, /decaPracticeMappingForArea\(area\.id\)/, "R10c-3 and their role-play/exam split from the canonical practice map");
  assert.match(path, /\/study-arcade\?track=deca&area=\$\{area\.id\}/, "R10c-4 each card opens ITS OWN drill, not the arcade in general");
  // The role-play/exam split is CompeteReady's training model, not DECA's taxonomy: every place it is
  // shown names it as ours, and no surface tells a learner what the official exam contains.
  assert.match(path, /CompeteReady grouping: role-play side/, "R10c-4a the split is attributed on the card itself");
  assert.match(path, /CompeteReady grouping: exam side/, "R10c-4b on both sides");
  assert.match(path, /how CompeteReady groups these\s*\n?\s*for training/, "R10c-4c and again in the note that governs the list");
  assert.ok(!/the cluster knowledge the exam tests/.test(skills), "R10c-4d and the page states nothing about what the official exam tests");
  assert.ok(
    !/mapping\?\.component === "roleplay" \? "Role-play skill" : "Cluster-exam knowledge"/.test(path),
    "R10c-5 an area with no mapping is left unclassified rather than defaulted into one half of the event"
  );
  // FAIL CLOSED on teaching. A card offers a lesson only when the map OWNS the construct and that
  // lesson is learner-visible; otherwise the area is still listed with its drill and simply carries no
  // teaching link. Verified behaviourally by holding the marketing gateway: the lesson link
  // disappeared, the area and its drill stayed.
  assert.match(path, /mapping\?\.coverage === "owned" \? mapping\.publishedTeachingOwner : null/, "R10c-6 only an OWNED construct gets a teaching link");
  assert.match(path, /owner\.visibility === "learner"/, "R10c-7 and only a lesson the learner can actually open");
  assert.match(skills, /The role-play practice room is where you rehearse the whole event; it records nothing\./, "R10d and says what the room records");
  assert.match(skills, /href=\{`\/lessons\?track=\$\{activeTrack\.slug\}` as Route\}/, "R10e it links the lessons");
  assert.match(skills, /Where \{activeTrack\.short\} skills are taught\{activeTrack\.id === "DECA" \? " and recorded" : ""\}/, "R10e2 'recorded' is claimed only where a recording destination is offered (DECA drills)");
  assert.match(skills, /activeTrack\.id === "DECA" \? \(\s*<Link href=\{`\/study-arcade\?track=\$\{activeTrack\.slug\}` as Route\}/, "R10f and, for DECA, the drills that record");
  assert.match(skills, /isDebate \? "Drill a debate skill"/, "R10g Debate's heading is unchanged");
  assert.match(skills, /Drills work one skill at a time and repeat it/, "R10h and so is Debate's description");
  // The room is still listed — it is real practice — and it is now the LAST of five, after the four
  // recorded skills, because it records nothing and they do.
  const tiles = stripComments(read("components/skills/skill-path.tsx"));
  assert.match(tiles, /title: "DECA role-play practice"/, "R10i the DECA room tile remains");
  const decaTiles = tiles.slice(tiles.indexOf('canonical === "DECA"'), tiles.indexOf('canonical === "HOSA"'));
  assert.ok(decaTiles.length > 50, "R10-C the DECA branch was located");
  assert.ok(
    decaTiles.includes("...decaAreaTiles()") &&
      decaTiles.indexOf("...decaAreaTiles()") < decaTiles.indexOf('title: "DECA role-play practice"'),
    "R10j the four recorded skills are composed into the DECA list, before the room that records nothing"
  );
});

check("R11. the XP card and the learning path stop attributing Debate to other tracks", () => {
  const xp = stripComments(read("components/app/xp-progress-card.tsx"));
  assert.match(xp, /completed across all your tracks — not only this one\./, "R11a account-wide wording exists");
  assert.match(xp, /completed — scored training in your track\./, "R11b Debate's wording is preserved");
  assert.match(xp, /const accountWide = trackId !== undefined && trackId !== "GENERAL_DEBATE";/, "R11c chosen by the effective track");
  assert.match(stripComments(read(DASH)), /<XpProgressCard xp=\{xp\} rank=\{rank\} streak=\{streak\} trackId=\{activeTrack\?\.id\} \/>/, "R11d the dashboard passes it");
  const lp = stripComments(read("components/onboarding/learning-path.tsx"));
  assert.match(lp, /\{showBeginner && effectiveTrack === "GENERAL_DEBATE" \? \(/, "R11e the Debate glossary renders only under Debate");
});

console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} learner-record controls passed`);
if (failures > 0) process.exit(1);
