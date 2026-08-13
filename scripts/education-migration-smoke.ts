import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
// THE PRODUCTION MODULES — never a mirrored copy of their data or logic.
import { LEARNING_SKILL_CATALOG } from "../lib/learning-content";
import { EDUCATION_COURSES, EDUCATION_LESSONS, EDUCATION_MODULES, EDUCATION_REGISTRY, educationLessonsForTrack, getEducationLesson, getEducationModule } from "../lib/education/registry";
import { DEBATE_MIGRATED_LESSONS, HELD_DEBATE_CATALOG_SLUGS, MIGRATED_DEBATE_PROVENANCE } from "../lib/education/tracks/debate";
import { EDUCATION_GENERIC_FILLER_SIGNATURES, validateEducationRegistry } from "../lib/education/validate";
// M13E1C: the compatibility-alias rule validates its target against the seeded manifest.
import { SEEDED_LESSON_SLUGS, SEEDED_SKILL_SLUGS } from "../lib/education/skills-compat";
import { isConceptEducationLessonEntry } from "../lib/education/types";
import { getLesson } from "../lib/lessons";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
import { presentSourceFreshness } from "../lib/source-freshness";

// ---- M13E2 Phase A: additive practice-session schema control ----------------------------------------
// prisma/schema.prisma was byte-pinned to a MOVING `HEAD` here until M13E2 Phase A. A HEAD-relative pin
// turns green the moment the schema commit lands, so it proved nothing at the only time it mattered:
// before the commit. It is replaced by an immutable control at the pre-M13E2 commit plus structural
// assertions -- every historical model and enum survives byte-for-byte, `User` gains exactly one virtual
// back-relation, and the two new models arrive with exactly the approved fields, constraints and indexes.
const PRE_M13E2 = "95fdd4c812328728766de2f518b38da618bab3cb";
const M13E2_NEW_BLOCKS = ["model PracticeSession", "model PracticeSessionItem",
                          "enum PracticeSessionKind", "enum PracticeSessionStatus"];
const M13E2_USER_FIELD = "practiceSessions PracticeSession[]";
// name -> normalized body lines (comments stripped, runs of whitespace collapsed) so a rename, retype,
// nullability flip, default change or attribute change all surface as a body mismatch.
const schemaBlocks = (src: string) => {
  const out = new Map<string, string[]>();
  for (const m of src.matchAll(/^(model|enum)[ \t]+(\w+)[ \t]*\{([\s\S]*?)^\}/gm)) {
    out.set(`${m[1]} ${m[2]}`,
      m[3].split("\n").map((l) => l.replace(/\/\/.*$/, "").replace(/\s+/g, " ").trim()).filter(Boolean));
  }
  return out;
};
// THROWS on any non-additive change. It never returns a boolean, so the same function backs both the
// real check and the in-memory failing controls below -- a silent `false` would be a vacuous assertion.
function assertAdditiveSchema(now: string, parent: string) {
  const was = schemaBlocks(parent);
  const is = schemaBlocks(now);
  for (const name of M13E2_NEW_BLOCKS) {
    if (was.has(name)) throw new Error(`the parent schema already defined ${name}`);
    if (!is.has(name)) throw new Error(`the working schema is missing ${name}`);
  }
  if (parent.includes(M13E2_USER_FIELD)) throw new Error("the parent schema already had the User back-relation");
  for (const [name, body] of was) {
    const next = is.get(name);
    if (!next) throw new Error(`${name} was removed`);
    if (name === "model User") {
      const gained = next.filter((l) => !body.includes(l));
      const lost = body.filter((l) => !next.includes(l));
      if (lost.length > 0) throw new Error(`User lost ${lost.join(" | ")}`);
      if (gained.length !== 1 || gained[0] !== M13E2_USER_FIELD) {
        throw new Error(`User gained ${gained.join(" | ") || "nothing"} instead of exactly the back-relation`);
      }
    } else if (next.join("\n") !== body.join("\n")) {
      throw new Error(`${name} is not structurally identical to the parent`);
    }
  }
  const session = is.get("model PracticeSession")!.join("\n");
  const item = is.get("model PracticeSessionItem")!.join("\n");
  for (const required of ["userId String", "kind PracticeSessionKind", "track SkillTrack", "skillSlug String?",
                          "status PracticeSessionStatus @default(ISSUED)", "issuedAt DateTime @default(now())",
                          "expiresAt DateTime", "completedAt DateTime?", "purgeAfter DateTime",
                          "resultJson Json?", "scenarioJson Json?", "requestedAreas String[] @default([])",
                          "updatedAt DateTime @updatedAt", "items PracticeSessionItem[]",
                          "user User @relation(fields: [userId], references: [id], onDelete: Cascade)",
                          "@@index([userId, kind, status, expiresAt])", "@@index([userId, purgeAfter])"]) {
    if (!session.includes(required)) throw new Error(`PracticeSession is missing ${required}`);
  }
  for (const required of ["sessionId String", "bankQuestionId String", "displayOrder Int",
                          "promptSnapshot String @db.Text", "choicesJson Json", "correctOptionId String",
                          "explanationSnapshot String @db.Text", "area String", "skillSlug String",
                          "selectedOptionId String?", "isCorrect Boolean?", "answeredAt DateTime?",
                          "updatedAt DateTime @updatedAt",
                          "session PracticeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)",
                          "@@unique([sessionId, bankQuestionId])", "@@unique([sessionId, displayOrder])"]) {
    if (!item.includes(required)) throw new Error(`PracticeSessionItem is missing ${required}`);
  }
  const added = [session, item, is.get("enum PracticeSessionKind")!.join("\n"),
                 is.get("enum PracticeSessionStatus")!.join("\n")].join("\n");
  for (const banned of ["PROCESSING", "FAILED", "ABANDONED", "claimedAt", "activeKey", "token", "nonce",
                        "@@index([status, expiresAt])", "@@index([sessionId])"]) {
    if (added.includes(banned)) throw new Error(`the new definitions carry an unapproved ${banned}`);
  }
  if (is.get("enum PracticeSessionStatus")!.join(",") !== "ISSUED,COMPLETED") {
    throw new Error("PracticeSessionStatus is not exactly ISSUED,COMPLETED");
  }
  if (is.get("enum PracticeSessionKind")!.join(",") !== "DEBATE_DRILL,DECA_DRILL,HOSA_MEDTERM,DEBATE_WRITING") {
    throw new Error("PracticeSessionKind is not exactly the four approved kinds");
  }
}

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
const sha = (p: string) => execSync(`git show HEAD:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
const shaNow = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];

const MIGRATED = ["debate-signposting", "debate-clash", "debate-refutation", "debate-constructive-speeches"] as const;

function walkTree(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkTree(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/** Every string reachable from a value — used for the text-preservation and filler scans. */
function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 12) return;
  if (typeof value === "string") { out.push(value); return; }
  if (Array.isArray(value)) { for (const v of value) collectStrings(v, out, depth + 1); return; }
  if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  }
}

async function main() {
  const view = read("components/lessons/concept-education-lesson-view.tsx");
  const practice = read("components/lessons/concept-education-lesson-practice.tsx");
  const trackFile = read("lib/education/tracks/debate.ts");
  const slugRoute = read("app/(app)/lessons/[slug]/page.tsx");
  const indexRoute = read("app/(app)/lessons/page.tsx");

  // ---- 1-3. exactly four migrated lessons, exact ids, strict source identity ---------------------
  assert.equal(DEBATE_MIGRATED_LESSONS.length, 4, "1. exactly four Debate catalog lessons are migrated");
  assert.deepEqual(DEBATE_MIGRATED_LESSONS.map((e) => e.id), [...MIGRATED], "2. exact migrated ids, in teaching order");
  for (const id of MIGRATED) {
    const entry = getEducationLesson(id);
    const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
    assert.ok(entry && original, `3a. "${id}" resolves in the registry and the catalog`);
    assert.ok(entry.source === original, `3b. "${id}" source IS the catalog object (strict ===)`);
    // Non-vacuity: a structurally identical clone must FAIL the same check.
    assert.ok(entry.source !== JSON.parse(JSON.stringify(original)), `3c. control: a clone of "${id}" is not identity-equal`);
    assert.ok(entry.provenance === MIGRATED_DEBATE_PROVENANCE, `3d. "${id}" uses the shared provenance object`);
  }

  // ---- 4. the migration source files are untouched -------------------------------------------------
  //
  // `lib/spaced-review.ts` was in this list until M13E1D, which intentionally adds a DETAILED
  // persistence result beside the existing boolean export. A blanket snapshot cannot distinguish
  // "the education migration leaked into the mastery writer" from "an approved milestone extended
  // it", so it is replaced at 4b by assertions on the property that actually matters: the education
  // surface still does not touch mastery, and the existing contract is extended, never replaced.
  //
  // The canonical lesson ROUTES are added here — M13E1B's renderers were pinned but the two routes
  // that mount them were not, so a change there would have gone unnoticed.
  // M15 S1B-1 — lib/lessons.ts and lib/roleplay-lessons.ts are deliberately absent from here onward.
  // Both were HEAD-RELATIVE byte freezes: they failed only while a change sat uncommitted and passed
  // again the moment HEAD advanced onto that same change, so neither could protect anything across a
  // commit. Each property is retained by an executable control that imports the module and asserts
  // its runtime values, and each was proven to FIRE by scratch mutation in S1B-1:
  //   - lib/lessons.ts          -> 31a here (the CWI lesson still resolves through its legacy lookup)
  //     and tracks-smoke (getLesson("claim-warrant-impact").skillSlug === "debate-claim-building").
  //     Mutating that slug fails education-migration, education-registry, skills-compat and tracks.
  //   - lib/roleplay-lessons.ts -> tracks-smoke 17/18 (each roleplay lesson's organization, no HOSA
  //     vocabulary in the DECA lesson and no DECA vocabulary in the HOSA one) and hosa-practice-scope.
  //     Flipping the HOSA practiceStatus value fails ten suites.
  //
  // lib/learning-content.ts DELIBERATELY REMAINS PINNED. S1B-1 classified it as retirable on the
  // strength of 3b/17b, and that was wrong: because 3b asserts the registry entry IS the catalog
  // object (strict ===), 17b then compares that object's strings against themselves, so it is a
  // tautology that cannot fail on an authored-content change. Three scratch mutations — a changed
  // lesson title, a renamed authored field and a wholesale prose replacement — each survived ALL 29
  // safe suites. Nothing in the corpus asserts this file's authored CONTENT. The hash is a poor
  // guard (it self-heals on commit), but it is the only reference that exists, so it stays until
  // S1B-2 writes a real content control for the authored catalog.
  for (const file of ["lib/learning-content.ts",
                      "components/lessons/lesson-view.tsx",
                      "components/lessons/roleplay-lesson-view.tsx", "components/lessons/roleplay-lesson-practice.tsx",
                      "components/lessons/concept-education-lesson-view.tsx",
                      "components/lessons/concept-education-lesson-practice.tsx",
                      // app/(app)/lessons/page.tsx is deliberately absent from M14 Phase 1a onward:
                      // that milestone makes track resolution async, so the page becomes an async
                      // server component. What the hash protected is asserted at 4P below.
                      "app/(app)/lessons/[slug]/page.tsx",
                      // lib/debate-drills.ts is deliberately absent from M13E1E onward: that milestone
                      // gives Debate the duplicate-resistant evidence contract. What this suite needs
                      // to protect is the LESSON path, which is asserted at 4b9 below.
                      // lib/authored-lesson-progress.ts is deliberately absent from M15 S1B-1 onward —
                      // the same HEAD-RELATIVE flaw called out above. The guided-lesson progress
                      // contract is retained EXECUTABLY by scripts/lesson-progress-smoke.ts, which
                      // imports the module and asserts its runtime behaviour: the storage key is
                      // versioned with AUTHORED_LESSON_PROGRESS_VERSION, countResponseWords gates on
                      // MIN_MEANINGFUL_RESPONSE_WORDS, and normalizeRestoredProgress clamps an
                      // out-of-range identifyIndex. That suite is part of the safe validation set.
                      // app/(app)/skills/[slug]/page.tsx is deliberately absent: M13E1C rewrites that
                      // route. The compatibility contract that replaced its body is owned by
                      // scripts/skills-compat-smoke.ts. Its INDEX page was pinned here until M14
                      // Phase 1a made track resolution async — asserted at 4P below instead.
                      // app/api/skills/debate-writing/route.ts is deliberately absent from M13E1G
                      // onward: that milestone reorders its review/mastery writes so a due window has
                      // one winner. What this suite protects is asserted at 4b13 below.
                      // lib/assignments.ts is deliberately absent from M15 S1A A3b-3 onward. That entry
                      // was a HEAD-RELATIVE byte freeze, so it only ever failed while a change to the
                      // file was uncommitted and passed again the moment HEAD advanced onto that same
                      // change — it could not protect anything across commits. A3b-3 relabels the
                      // Debate evidence PICKER there. What this suite actually needs from assignments
                      // is that the education migration did not disturb how a LESSON assignment
                      // accepts evidence; that is asserted directly at 4A below.
                      "prisma/seed.ts"]) {
    assert.equal(shaNow(file), sha(file), `4. ${file} is byte-identical to HEAD`);
  }

  // ---- 4A. what the retired lib/assignments.ts pin protected FOR THIS SUITE ------------------------
  // This suite's domain is the education/lesson migration. The only thing it needs from the assignment
  // engine is that a LESSON assignment still accepts exactly one kind of evidence — a COMPLETED
  // PracticeAttempt owned by the submitting learner, optionally narrowed to the assignment's target
  // lesson slug — because the migration moved lessons around. Bound to the real branch, not a hash.
  const assignmentsSrc = read("lib/assignments.ts");
  assert.ok(/const attempt = await prisma\.practiceAttempt\.findFirst\(\{/.test(assignmentsSrc),
    "4A. LESSON evidence still resolves against a PracticeAttempt");
  assert.ok(/id: input\.evidenceId,\s*userId,\s*status: "COMPLETED",/.test(assignmentsSrc),
    "4A2. and still requires the attempt to be COMPLETED and owned by the submitting learner");
  assert.ok(/lesson: \{ slug: assignment\.targetId \}/.test(assignmentsSrc),
    "4A3. and still narrows to the assignment's target lesson slug when one is set");
  assert.ok(/evidenceType: "LESSON_ATTEMPT"/.test(assignmentsSrc),
    "4A4. and records it as LESSON_ATTEMPT evidence");


// ---- M14 Phase 1a: the two pages this suite pinned are now ASYNC ---------------------------------
// Phase 1a made track resolution async (the learner's signup organization now resolves their track),
// so `getActiveTrack` must be awaited and its callers become async server components. A blanket hash
// on those pages would forbid an approved change rather than protect anything — the same reasoning
// already applied to lib/spaced-review.ts above.
//
// The protection is PRESERVED, not dropped: the diff is taken against the IMMUTABLE pre-Phase-1a
// commit (never HEAD, which would turn this green the moment the change lands and prove nothing) and
// every changed line must be exactly the async/await conversion. Any other edit to these pages fails.
const PHASE_1A_BASE = "a05470637b4ca00a2370577efcc853691d838829";
// Airtight rule: pair the diff lines and require each ADDED line to be its REMOVED counterpart with
// exactly `async `/`await ` inserted — nothing else. A loose pattern would have let a hardcoded track
// (`getActiveTrack("debate")`) through; this cannot.
function phase1aConversionOf(minus: string): string[] {
  const body = minus.slice(1);
  return [
    "+" + body.replace("export default function ", "export default async function "),
    "+" + body.replace(/= (getActiveTrack|resolveActiveTrack)\(/, "= await $1(")
  ];
}
function assertOnlyPhase1aAsyncDelta(file: string, label: string) {
  const changed = execSync(`git diff ${PHASE_1A_BASE} -- '${file}'`, { encoding: "utf8" })
    .split("\n")
    .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
  assert.ok(changed.length > 0, `${label}. control: ${file} really does differ from the pre-Phase-1a commit`);
  const removed = changed.filter((l) => l.startsWith("-"));
  const added = changed.filter((l) => l.startsWith("+"));
  assert.equal(added.length, removed.length, `${label}. ${file} changed line-for-line, adding nothing extra`);
  for (let i = 0; i < removed.length; i += 1) {
    assert.ok(phase1aConversionOf(removed[i]).includes(added[i]),
      `${label}. ${file} changed ONLY by inserting async/await — got: ${added[i].trim()}`);
  }
  assert.ok(added.some((l) => /\bawait (getActiveTrack|resolveActiveTrack)\(/.test(l)),
    `${label}. ${file} awaits the resolver after the conversion`);
}

  assertOnlyPhase1aAsyncDelta("app/(app)/lessons/page.tsx", "4P");
  assertOnlyPhase1aAsyncDelta("app/(app)/skills/page.tsx", "4P");
  // And what those pages are FOR is unchanged: both still resolve a track and scope their content.
  const lessonsIdx = read("app/(app)/lessons/page.tsx");
  assert.ok(/await getActiveTrack\(searchParams\.track\)/.test(lessonsIdx), "4P1. the lessons index still scopes by the resolved track");
  assert.ok(lessonsIdx.includes("educationLessonsForTrack") && lessonsIdx.includes("lessonsForTrack"),
    "4P2. and still draws from both the education registry and the legacy lesson modules");
  const skillsIdx = read("app/(app)/skills/page.tsx");
  assert.ok(/await getActiveTrack\(searchParams\.track\)/.test(skillsIdx), "4P3. the skills index still scopes by the resolved track");
  assert.ok(skillsIdx.includes("SkillPath"), "4P4. and still renders the shared skill path");

  // ---- 4L. what the lesson-practice hash was protecting, asserted exactly -----------------------
  // C3b-i converts this component to the server-issued session protocol, so a blanket hash would
  // forbid an approved change rather than protect anything.
  const lessonUi = stripComments(read("components/lessons/lesson-practice.tsx"));
  assert.ok(/fetch\("\/api\/debate\/drills\/session"/.test(lessonUi), "4L. it still starts a Debate drill session");
  assert.ok(/areas: \[drillArea\]/.test(lessonUi), "4L2. scoped to the lesson's own drill area — track isolation intact");
  assert.ok(/fetch\("\/api\/debate\/drills\/check"/.test(lessonUi), "4L3. answers go through the Debate check route");
  assert.ok(/JSON\.stringify\(\{ sessionId: session\.sessionId \}\)/.test(lessonUi),
    "4L4. and the final submit carries only the session id");
  assert.ok(!/JSON\.stringify\(\{ answers/.test(lessonUi), "4L5. the legacy answers body is gone");
  for (const banned of ["correctOptionId", "DRILL_BANK", "buildDrillSession", "gradeDrillAnswers"]) {
    assert.ok(!lessonUi.includes(banned), `4L6. no client answer authority or live-bank grading ({banned})`);
  }
  assert.ok(/answers\[current\.itemId\]/.test(lessonUi), "4L7. answer state is keyed by distinct item id");
  assert.ok(/\$\{slot\}:\$\{current\.itemId\}/.test(lessonUi), "4L8. and rendered slots are keyed by slot AND item");
  assert.ok(/checking \|\| answers\[current\.itemId\]/.test(lessonUi),
    "4L9. a repeated slot cannot send a second check, and neither can a duplicate in-flight one");
  assert.ok(/answeredCount === distinctTotal/.test(lessonUi), "4L10. completion counts DISTINCT items, not slots");
  assert.ok(/wroteSkills\.includes\(skillSlug\)/.test(lessonUi),
    "4L11. and mastery is still claimed only when the server confirms the write");
  assert.ok(/setExpired\(true\)/.test(lessonUi) && /is not available/.test(lessonUi),
    "4L12. expired and unavailable sessions have their own states");
  assert.ok(/aria-pressed=\{isSel\}/.test(lessonUi) && /min-h-11/.test(lessonUi),
    "4L13. accessibility and touch-target behaviour are preserved");

  // ---- PA1-PA16. M13E2 Phase A: prisma/schema.prisma changed only by ADDING -----------------------------
  const schemaAtM13E2Parent = execSync(`git show ${PRE_M13E2}:prisma/schema.prisma`, { encoding: "utf8" });
  const schemaNow = readFileSync("prisma/schema.prisma", "utf8");
  for (const name of M13E2_NEW_BLOCKS) {
    assert.ok(!schemaAtM13E2Parent.includes(`${name} {`), `PA1. at ${PRE_M13E2.slice(0, 8)} the schema had no ${name}`);
    assert.ok(schemaNow.includes(`${name} {`), `PA2. the working schema defines ${name}`);
  }
  assert.ok(!schemaAtM13E2Parent.includes(M13E2_USER_FIELD), "PA3. and no User.practiceSessions back-relation");
  assertAdditiveSchema(schemaNow, schemaAtM13E2Parent); // PA4. additive practice-session definitions only
  assert.equal(schemaBlocks(schemaNow).size, schemaBlocks(schemaAtM13E2Parent).size + 4,
    "PA5. exactly four new schema blocks (2 models + 2 enums) and nothing else");
  assert.ok(!existsSync("prisma/migrations"), "PA6. Phase A introduces no migration directory");
  assert.ok(existsSync("prisma/schema.prisma"), "PA6b. control: existsSync does report a path that exists");
  // M13E2 C1 adds approved shared helpers under lib/. They are wired to NO route yet, so this check
  // narrows from "nothing references the new models" to "only these four helpers may". The property
  // that actually matters before the C2 cutover is unchanged and now asserted directly: no route and
  // no component touches the practice-session tables.
  // C2a cuts the nine DRILL routes over to server-issued sessions, so they legitimately reference the
  // new models now. The allowlist widens by exactly those nine plus the four C1 helpers. The property
  // that still matters is asserted separately below and is UNCHANGED: no component touches the tables,
  // and the writing/XP routes stay out until C2b.
  const M13E2_C1_ALLOWED = [
    "lib/practice-session.ts", "lib/spaced-review.ts", "lib/xp.ts", "lib/validators.ts",
    "app/api/debate/drills/session/route.ts", "app/api/debate/drills/check/route.ts",
    "app/api/debate/drills/submit/route.ts",
    "app/api/deca/drills/session/route.ts", "app/api/deca/drills/check/route.ts",
    "app/api/deca/drills/submit/route.ts",
    "app/api/hosa/medterm/session/route.ts", "app/api/hosa/medterm/check/route.ts",
    "app/api/hosa/medterm/submit/route.ts",
    // C2b: Debate writing is now session-backed too.
    "app/api/skills/debate-writing/session/route.ts", "app/api/skills/debate-writing/route.ts"
  ];
  let m13e2RuntimeRefs: string[] = [];
  try {
    m13e2RuntimeRefs = execSync('grep -rli "practicesession" app lib components', { encoding: "utf8" })
      .trim().split("\n").filter(Boolean);
  } catch {
    m13e2RuntimeRefs = []; // grep exits non-zero when nothing matches, which is also a passing case
  }
  assert.deepEqual(m13e2RuntimeRefs.filter((f) => !M13E2_C1_ALLOWED.includes(f)), [],
    "PA7. only the approved C1 helpers and C2a drill routes reference the new models");
  for (const f of m13e2RuntimeRefs) {
    assert.ok(!f.startsWith("components/"),
      `PA7a. no component references the session tables before the C3 cutover (${f})`);
  }
  // C2b cut the writing routes over. tests/grade and judge take only the atomic XP helper — they
  // never touch the session tables — so they must still never appear here.
  for (const neverSessionBacked of ["app/api/tests/[testId]/grade/route.ts",
                                    "app/api/debates/[debateId]/judge/route.ts"]) {
    assert.ok(!m13e2RuntimeRefs.includes(neverSessionBacked),
      `PA7d. ${neverSessionBacked} uses only the XP helper, never the session tables`);
  }
  assert.ok(/practicesession/i.test("await prisma.practiceSession.findFirst()"),
    "PA7b. control: that scan does match a real runtime usage");
  assert.deepEqual(
    ["app/api/tests/[testId]/grade/route.ts", "components/training/concept-drills.tsx", "lib/practice-session.ts"]
      .filter((f) => !M13E2_C1_ALLOWED.includes(f)),
    ["app/api/tests/[testId]/grade/route.ts", "components/training/concept-drills.tsx"],
    "PA7c. control: the allowlist still rejects an out-of-scope route and any component");
  const m13e2Sha = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];
  assert.notEqual(m13e2Sha("prisma/seed.ts"), m13e2Sha("prisma/schema.prisma"),
    "PA8. control: the surviving seed byte pin's hash does vary with file content");

  // Non-vacuous controls: every one mutates the schema IN MEMORY and proves the checker rejects it.
  const m13e2Rejects = (label: string, mutate: (s: string) => string) => {
    const mutated = mutate(schemaNow);
    assert.notEqual(mutated, schemaNow, `PA. the ${label} control actually changed the schema text`);
    assert.throws(() => assertAdditiveSchema(mutated, schemaAtM13E2Parent), `PA. the check rejects ${label}`);
  };
  m13e2Rejects("a changed existing field type", (s) => s.replace(/reviewCount(\s+)Int/, "reviewCount$1String"));
  m13e2Rejects("a removed existing field", (s) => s.replace(/\n[ \t]+lastOutcome[^\n]*/, ""));
  m13e2Rejects("an unapproved field on an existing model",
    (s) => s.replace("model SkillReviewSchedule {", "model SkillReviewSchedule {\n  sneaky String?"));
  m13e2Rejects("a removed User back-relation", (s) => s.replace(/\n[ \t]+practiceSessions[ \t]+PracticeSession\[\]/, ""));
  m13e2Rejects("an extra unapproved User field",
    (s) => s.replace(/([ \t]+practiceSessions[ \t]+PracticeSession\[\])/, "$1\n  sneaky String?"));
  m13e2Rejects("an omitted [userId, kind, status, expiresAt] index",
    (s) => s.replace("@@index([userId, kind, status, expiresAt])", ""));
  m13e2Rejects("an omitted [userId, purgeAfter] index", (s) => s.replace("@@index([userId, purgeAfter])", ""));
  m13e2Rejects("an unapproved global [status, expiresAt] index",
    (s) => s.replace("@@index([userId, purgeAfter])", "@@index([userId, purgeAfter])\n  @@index([status, expiresAt])"));
  m13e2Rejects("a redundant standalone [sessionId] index",
    (s) => s.replace("@@unique([sessionId, displayOrder])", "@@unique([sessionId, displayOrder])\n  @@index([sessionId])"));
  m13e2Rejects("a removed unique constraint", (s) => s.replace("@@unique([sessionId, bankQuestionId])", ""));
  m13e2Rejects("a PROCESSING status", (s) => s.replace(/(enum PracticeSessionStatus \{\n[ \t]+ISSUED)/, "$1\n  PROCESSING"));
  m13e2Rejects("a claimedAt column", (s) => s.replace(/([ \t]+purgeAfter[ \t]+DateTime\n)/, "$1  claimedAt DateTime?\n"));

  // ---- 4b. what the lib/spaced-review snapshot was really protecting ---------------------------------
  // (i) The education surface still writes no mastery. Proven by import graph, not by a file hash:
  //     no canonical lesson route, renderer or registry module may reach the mastery writer at all.
  for (const file of ["app/(app)/lessons/page.tsx", "app/(app)/lessons/[slug]/page.tsx",
                      "components/lessons/concept-education-lesson-view.tsx",
                      "components/lessons/concept-education-lesson-practice.tsx",
                      "lib/education/registry.ts", "lib/education/tracks/debate.ts",
                      "lib/education/skills-compat.ts"]) {
    const code = stripComments(read(file));
    for (const banned of ["@/lib/spaced-review", "recordDrillMastery", "recordDrillMasteryDetailed",
                          "recordPracticeOutcome", "@/lib/prisma", "MasteryProgress"]) {
      assert.ok(!code.includes(banned), `4b. ${file} still performs no ${banned}`);
    }
  }
  // (ii) The existing boolean export is EXTENDED, not replaced. Both symbols are exported, and the
  //      boolean one is still a function with the same name every existing caller imports.
  const spacedReview = read("lib/spaced-review.ts");
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReview),
    "4b2. the original boolean recordDrillMastery export still exists");
  assert.ok(/export async function recordDrillMasteryDetailed\(/.test(spacedReview),
    "4b3. and the detailed result is an ADDITION beside it, not a rename");
  assert.ok(/Promise<boolean>/.test(spacedReview), "4b4. the boolean return type is unchanged");
  // The Debate caller — the reason the contract must stay backward-compatible — still consumes the
  // boolean form. It is no longer byte-pinned: M13E1E rewrites its persistence GATING while keeping
  // the same call, so the assertion that matters is the call shape, not the file hash.
  // 4b5/4b6 INVERTED at M13E1G. The Debate route used the boolean helper, which cannot distinguish a
  // deliberate concurrency no-op from a write failure — so it told learners "progress could not be
  // saved" when nothing had failed. It now consumes the detailed outcome. The guarantee that still
  // matters is that the BOOLEAN EXPORT survives unchanged for anything else that reads it.
  const debateRoute = read("app/api/debate/drills/submit/route.ts");
  assert.ok(/recordDrillMasteryInTransaction\(/.test(debateRoute),
    "4b5. the Debate drill submit route persists through the transaction-native mastery core");
  assert.ok(!/recordDrillMastery\(/.test(stripComments(debateRoute)),
    "4b5b. and no longer calls the boolean form, which could not express a concurrency no-op");
  assert.ok(/export async function recordDrillMastery\(/.test(spacedReview),
    "4b6. the boolean export still exists for every other caller");
  assert.ok(/Promise<boolean>/.test(spacedReview), "4b6b. and still returns a boolean");
  const debateCode = stripComments(debateRoute);
  assert.ok(/if \(mastery\.status === "updated"\) wroteSkills\.push/.test(debateCode),
    "4b6c. with only an actual mastery update entering wroteSkills");
  for (const line of debateCode.split("\n").filter((l) => l.includes("wroteSkills.push"))) {
    assert.ok(/if \(mastery\.status === "updated"\)/.test(line),
      `4b6c2. every wroteSkills.push is gated on an actual mastery update (${line.trim()})`);
  }
  assert.ok(!/if \(mastery\.status === "updated"\)/.test("wroteSkills.push(area.skillSlug);"),
    "4b6c2b. control: an ungated push would fail that check");
  assert.equal((debateCode.match(/wroteSkills\.push/g) ?? []).length, 1,
    "4b6c3. and exactly one push site to reason about");
  assert.ok(/persistenceStatus = "skill-missing"/.test(debateCode),
    "4b6d. an unseeded skill reports skill-missing");
  assert.ok(/if \(qualifies && area\.skillSlug\) \{/.test(debateCode),
    "4b6e. and a valid skill slug is required before persistence is attempted");
  assert.ok(debateCode.indexOf("parseStoredResult(") < debateCode.indexOf("recordDrillMasteryInTransaction("),
    "4b6f. a completed retry returns before mastery is touched");
  // 4b13. Debate WRITING is FORMATIVE (M15 S1A A1): it still grades and coaches, but awards no XP
  // and writes no mastery/evidence — the migration surface it protects is unchanged by that removal.
  const writing = stripComments(read("app/api/skills/debate-writing/route.ts"));
  assert.ok(!/xPLog\.create/.test(writing) && !/XP_REWARDS\.lessonCompleted/.test(writing),
    "4b13. formative Debate writing awards no XP");
  assert.ok(/gradeDebateWritingResponse\(/.test(writing), "4b13b. and still grades the same way");
  assert.ok(/formative: true/.test(writing), "4b13c. and its result is declared formative");
  assert.ok(!/isReviewDue\(/.test(writing), "4b13d. and no independent due-check remains");
  // 4b9. The LESSON practice path is what this suite protects, and it is untouched by M13E1E: the one
  // authored lesson using LessonPractice reuses the Debate drill endpoints.
  // lesson-practice.tsx is deliberately absent from M13E2 C3b-i onward — see 4L above.
  //
  // M15 S1B-1 — the lib/lessons.ts byte freeze that stood here is retired. It was this suite's SECOND
  // pin on that same file (the first sat in the 4. list above) and both were HEAD-RELATIVE, so
  // neither could survive a commit. The two protected DIFFERENT facts, and both are retained
  // executably: the 4. entry stood for "the authored lesson still resolves", retained at 31a below
  // (getLesson("claim-warrant-impact") resolves) and in tracks-smoke (its skillSlug is still
  // debate-claim-building); this 4b9 entry stood for "the drill-bank expansion did not reach the
  // LESSON path", retained at 4b6* above, which asserts the Debate drill route's own contract
  // directly rather than freezing the lesson module's bytes as a proxy for it.
  // The Debate bank's ORIGINAL question data is unchanged. This pinned 36 through M13E1E, when the
  // only change was the evidence layer. M14 Global G2 Slice 1 deliberately APPENDS rebuttal items
  // (audit G2), so a flat 36 would forbid an approved change rather than protect this suite. What
  // this suite actually needs is that the migration did not disturb the bank's SHAPE: the original
  // 36 ids all survive, the area set is still four, and ids stay unique. Bank CONTENT integrity is
  // owned by scripts/debate-drills-smoke.ts, which diffs against the IMMUTABLE commit 26149a3.
  const { DRILL_BANK, DRILL_AREAS } = await import("../lib/debate-drills");
  const ORIGINAL_DEBATE_IDS = ["cw", "rb", "ev", "wg"]
    .flatMap((p) => Array.from({ length: 9 }, (_, i) => `${p}-0${i + 1}`));
  assert.equal(ORIGINAL_DEBATE_IDS.length, 36, "4b10. control: the original Debate bank was 36 items");
  const presentIds = new Set(DRILL_BANK.map((q) => q.id));
  for (const id of ORIGINAL_DEBATE_IDS) {
    assert.ok(presentIds.has(id), `4b10b. original Debate question ${id} is still present`);
  }
  assert.ok(DRILL_BANK.length >= 36, "4b10c. and the bank never shrank below its original 36");
  assert.equal(DRILL_AREAS.length, 4, "4b11. across exactly four areas");
  assert.equal(presentIds.size, DRILL_BANK.length, "4b12. with no duplicate ids");
  // (iii) M13E1D introduces no second lesson or mastery renderer. The lesson component set is fixed,
  //       and the one component M13E1D touched reaches no lesson or education module.
  const lessonComponents = readdirSync("components/lessons").filter((f) => /\.tsx?$/.test(f)).sort();
  assert.deepEqual(lessonComponents,
    ["concept-education-lesson-practice.tsx", "concept-education-lesson-view.tsx", "lesson-practice.tsx",
     "lesson-view.tsx", "roleplay-lesson-practice.tsx", "roleplay-lesson-view.tsx"],
    "4b7. no new lesson renderer was introduced");
  const drills = stripComments(read("components/training/concept-drills.tsx"));
  for (const banned of ["lib/education", "lib/lessons", "lib/learning-content", "LessonView", "LessonPractice"]) {
    assert.ok(!drills.includes(banned), `4b8. the drill runner is not a second lesson renderer (${banned})`);
  }

  // ---- 5-8. registry and discovery inventory -----------------------------------------------------
  assert.equal(EDUCATION_LESSONS.length, 7, "5. seven canonical registry entries");
  const learnerVisible = EDUCATION_LESSONS.filter((e) => e.visibility === "learner");
  assert.equal(learnerVisible.length, 7, "6a. all seven are learner-visible");
  const debate = educationLessonsForTrack("GENERAL_DEBATE");
  assert.equal(debate.length, 5, "7. exactly five Debate lessons");
  assert.deepEqual(debate.map((e) => e.id),
    ["claim-warrant-impact", ...MIGRATED], "7b. CWI first, then the migrated four in teaching order");
  assert.equal(educationLessonsForTrack("DECA").length, 1, "6b. one DECA lesson");
  assert.equal(educationLessonsForTrack("HOSA").length, 1, "6c. one HOSA lesson");
  assert.equal(EDUCATION_LESSONS.filter((e) => e.id === "claim-warrant-impact").length, 1, "8. CWI appears exactly once");

  // ---- 9-13. held content is nowhere near a learner ----------------------------------------------
  const registeredIds = new Set(EDUCATION_LESSONS.map((e) => e.id));
  for (const held of HELD_DEBATE_CATALOG_SLUGS) {
    assert.ok(!registeredIds.has(held), `9-13. held catalog slug "${held}" is not registered`);
  }
  const heldTitles = HELD_DEBATE_CATALOG_SLUGS
    .map((slug) => LEARNING_SKILL_CATALOG.find((c) => c.slug === slug)?.lesson.title)
    .filter((t): t is string => typeof t === "string");
  assert.equal(heldTitles.length, 5, "9b. control: all five held lessons really exist in the catalog");
  const registryText = JSON.stringify(EDUCATION_LESSONS);
  for (const title of heldTitles) {
    assert.ok(!registryText.includes(title), `10. held lesson title "${title}" appears nowhere in the registry`);
  }
  // Parliamentary content specifically must not reach the registry.
  assert.ok(!/parliamentary/i.test(registryText), "12. no parliamentary content in the canonical registry");

  // ---- 14. provenance ----------------------------------------------------------------------------
  assert.equal(MIGRATED_DEBATE_PROVENANCE.authority, "tier-2", "14a. tier-2 authority");
  assert.equal(MIGRATED_DEBATE_PROVENANCE.organization, "CompeteReady", "14b. attributed to CompeteReady");
  assert.equal(MIGRATED_DEBATE_PROVENANCE.freshness, "stable", "14c. stable freshness");
  assert.ok(Object.isFrozen(MIGRATED_DEBATE_PROVENANCE), "14d. and it is frozen, so no consumer can mutate it");
  assert.equal(presentSourceFreshness(MIGRATED_DEBATE_PROVENANCE).degraded, false, "14e. it survives the decision layer");
  assert.ok(!/nsda|official rule|official requirement/i.test(JSON.stringify(MIGRATED_DEBATE_PROVENANCE)),
    "14f. it claims no official source");

  // ---- 15-16. lesson-quality fields + deterministic questions ------------------------------------
  for (const id of MIGRATED) {
    const entry = getEducationLesson(id);
    assert.ok(entry && isConceptEducationLessonEntry(entry), `15a. "${id}" is a concept-education entry`);
    const c = entry.source.lesson.content;
    for (const [field, value] of [["objective", c.objective], ["explanation", c.explanation], ["whyMatters", c.whyMatters],
                                  ["workedExample.prompt", c.workedExample.prompt], ["workedExample.weakAnswer", c.workedExample.weakAnswer],
                                  ["workedExample.strongAnswer", c.workedExample.strongAnswer], ["workedExample.whyItWorks", c.workedExample.whyItWorks]] as const) {
      assert.ok(value.trim().length > 0, `15b. "${id}" has ${field}`);
    }
    assert.ok(c.steps.length > 0, `15c. "${id}" has a teachable process`);
    assert.ok(c.practiceQuestions.length > 0, `15d. "${id}" has independent practice`);
    assert.ok(c.masteryCheck.length > 0, `15e. "${id}" has a final check`);
    for (const q of [c.guidedQuestion, ...c.practiceQuestions, ...c.masteryCheck]) {
      assert.ok(q.choices.length >= 2, `16a. "${id}" question has at least two choices`);
      assert.equal(q.choices.filter((choice) => choice === q.correctAnswer).length, 1,
        `16b. "${id}" question has exactly one stored answer, present among its choices`);
      assert.ok(q.hint.trim() && q.explanation.trim() && q.skillTag.trim(), `16c. "${id}" question has hint, explanation and tag`);
    }
  }

  // ---- 17-20. text preservation, by identity + by mutation control -------------------------------
  // Because the registry holds the ORIGINAL objects, preservation is identity — but prove that a
  // clone, a mutated string and a missing field would each be caught.
  for (const id of MIGRATED) {
    const original = LEARNING_SKILL_CATALOG.find((c) => c.slug === id);
    const entry = getEducationLesson(id);
    assert.ok(original && entry, `17a. "${id}" present in both`);
    const a: string[] = []; const b: string[] = [];
    collectStrings(original, a); collectStrings(entry.source, b);
    assert.deepEqual(b, a, `17b. every authored string of "${id}" is reachable from the registry entry, in order`);
    // 18. one-character mutation must fail the same comparison.
    const mutated = JSON.parse(JSON.stringify(original)) as unknown;
    const m: string[] = []; collectStrings(mutated, m);
    m[0] = `${m[0]}x`;
    assert.notDeepEqual(m, a, `18. control: a one-character change to "${id}" fails the comparison`);
    // 19. a missing field must fail.
    const short = a.slice(0, a.length - 1);
    assert.notDeepEqual(short, a, `19. control: a removed text unit of "${id}" fails the comparison`);
    // 20. a clone must fail the identity contract.
    assert.notEqual(entry.source, mutated, `20. control: a clone of "${id}" is not identity-equal`);
  }

  // ---- 21-23. sequence integrity -----------------------------------------------------------------
  const ids = new Set(EDUCATION_LESSONS.map((e) => e.id));
  for (const entry of EDUCATION_LESSONS) {
    if (entry.nextLessonId !== null) assert.ok(ids.has(entry.nextLessonId), `21. "${entry.id}" next lesson resolves`);
  }
  assert.equal(getEducationLesson("claim-warrant-impact")?.nextLessonId, "debate-signposting", "21b. CWI now leads into the migrated chain");
  assert.equal(getEducationLesson("debate-constructive-speeches")?.nextLessonId, null, "21c. the last migrated lesson ends the chain honestly");
  assert.deepEqual(EDUCATION_COURSES.find((c) => c.id === "debate-performance")?.moduleIds,
    ["debate-argument-construction", "debate-round-strategy", "debate-speech-structure"], "22. exact Debate module order");
  const moduleIds = new Set(EDUCATION_MODULES.map((m) => m.id));
  for (const m of EDUCATION_MODULES) {
    if (m.prerequisiteId !== null) assert.ok(moduleIds.has(m.prerequisiteId), `23. module "${m.id}" prerequisite resolves`);
  }

  // ---- 24-25. skill mapping honesty ---------------------------------------------------------------
  assert.equal(getEducationLesson("debate-refutation")?.skillSlug, "debate-rebuttal", "24. refutation is associated with debate-rebuttal");
  for (const id of ["debate-signposting", "debate-clash", "debate-constructive-speeches"]) {
    assert.equal(getEducationLesson(id)?.skillSlug, undefined, `25. "${id}" claims no seeded mastery skill`);
  }

  // ---- 26-30. the practice component is inert ------------------------------------------------------
  const inertCode = stripComments(practice);
  for (const banned of ["recordDrillMastery", "MasteryProgress", "SkillReviewSchedule", "XPLog", "xpReward",
                        "authored-lesson-progress", "localStorage", "sessionStorage", "document.cookie",
                        "fetch(", "/api/", "XMLHttpRequest", "sendBeacon", "use server", "@/lib/prisma",
                        "spaced-review", "@/lib/xp", "assignments"]) {
    assert.ok(!inertCode.includes(banned), `26-29. the checks component performs no ${banned}`);
  }
  assert.ok(inertCode.includes('"use client"') || practice.startsWith('"use client"'), "26b. control: it really is the client component being scanned");
  // 30. no course-level percentage anywhere in the new surface.
  for (const [label, code] of [["view", view], ["practice", practice], ["index route", indexRoute]] as const) {
    assert.ok(!/\b\d+\s*%|percent|masteryPercent|progressPercent/i.test(stripComments(code)), `30. no percentage in the ${label}`);
  }
  assert.ok(!/mastery/i.test(stripComments(view).replace(/masteryCheck/g, "")), "30b. the view never uses the word mastery outside the source field name");

  // ---- 31-32. the legacy lesson path is untouched ---------------------------------------------------
  assert.ok(getLesson("claim-warrant-impact"), "31a. the CWI lesson still resolves through its legacy lookup");
  assert.ok(slugRoute.includes("<LessonView") && slugRoute.includes("<LessonPractice"), "32. CWI still renders through LessonView + LessonPractice");
  assert.ok(slugRoute.indexOf("getLesson(params.slug)") < slugRoute.indexOf("conceptEducationLesson(params.slug)"),
    "32b. the legacy lookups run BEFORE the canonical one");

  // ---- 33-35. DECA and HOSA are untouched ----------------------------------------------------------
  const deca = getRoleplayLesson("how-deca-roleplay-works");
  const hosa = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.ok(deca && deca.practiceStatus === "available", "33. DECA practice is still available");
  assert.ok(hosa && hosa.practiceStatus === "temporarily-unavailable", "34/35. HOSA practice is still unavailable");
  assert.ok(!("practice" in hosa) && !("scenario" in hosa), "35b. and HOSA still defines no interactive practice or scenario");

  // ---- 36-39. forbidden surfaces (byte-identity already asserted at check 4) ------------------------
  // M13E1C connected a compatibility layer to /skills. The protection is not removed — it becomes an
  // ALLOWLIST, so an unrelated legacy surface cannot quietly start consuming the education modules.
  const EDUCATION_CONSUMERS = new Set([
    // canonical lessons surface (M13E1B)
    "app/(app)/lessons/page.tsx",
    "app/(app)/lessons/[slug]/page.tsx",
    "components/lessons/concept-education-lesson-view.tsx",
    "components/lessons/concept-education-lesson-practice.tsx",
    // legacy /skills compatibility surface (M13E1C)
    "app/(app)/skills/[slug]/page.tsx",
    "app/(app)/skills/[slug]/practice/page.tsx",
    "components/skills/skill-path.tsx",
    "app/(app)/study-arcade/review/page.tsx"
  ]);
  const found: string[] = [];
  for (const file of [...walkTree("app"), ...walkTree("components")]) {
    if (!stripComments(read(file)).includes("lib/education")) continue;
    found.push(file);
    assert.ok(EDUCATION_CONSUMERS.has(file), `36. only approved surfaces consume lib/education (${file})`);
  }
  assert.deepEqual([...found].sort(), [...EDUCATION_CONSUMERS].sort(),
    "36b. and every approved consumer really does import it");
  // The /skills index itself still does NOT reach the education modules — it renders SkillPath only.
  assert.ok(!stripComments(read("app/(app)/skills/page.tsx")).includes("lib/education"),
    "36c. the /skills index page still consumes nothing from lib/education directly");
  // /lessons stays canonical: the compatibility surface may only reach the registry through the
  // compatibility module, never through the raw lesson registry the canonical surface uses.
  for (const file of ["app/(app)/skills/[slug]/page.tsx", "app/(app)/skills/[slug]/practice/page.tsx",
                      "app/(app)/study-arcade/review/page.tsx"]) {
    assert.ok(!/from "@\/lib\/education\/(registry|tracks)/.test(stripComments(read(file))),
      `36d. ${file} reaches the registry only through skills-compat`);
  }

  // ---- 40. no generic seed-template filler, in data ------------------------------------------------
  const migratedStrings: string[] = [];
  for (const id of MIGRATED) collectStrings(getEducationLesson(id)?.source, migratedStrings);
  const haystack = migratedStrings.join("\n");
  for (const signature of EDUCATION_GENERIC_FILLER_SIGNATURES) {
    assert.ok(!haystack.includes(signature), `40. no migrated lesson contains "${signature.slice(0, 40)}…"`);
  }
  assert.ok(/\bpractice\b/i.test(haystack) || /\bjudge\b/i.test(haystack), "40b. control: the scan really saw the authored text");

  // ---- 41-42. fail closed ---------------------------------------------------------------------------
  assert.equal(getEducationLesson("no-such-debate-lesson"), undefined, "41. an unknown canonical id resolves to nothing");
  assert.ok(slugRoute.includes("notFound()"), "41b. and the route still fails closed");
  assert.ok(slugRoute.includes('entry.visibility !== "learner"'), "42. an internal entry cannot render");
  assert.ok(slugRoute.includes("isConceptEducationLessonEntry"), "42b. narrowing is by the discriminant, not a probe");

  // ---- 43. the new pages carry the real authored titles ---------------------------------------------
  for (const id of MIGRATED) {
    const entry = getEducationLesson(id);
    assert.ok(entry && isConceptEducationLessonEntry(entry), `43a. "${id}" is renderable`);
    assert.ok(entry.source.lesson.title.trim().length > 0, `43b. "${id}" has a real title`);
    assert.equal(entry.source.slug, id, `43c. "${id}" source slug matches its canonical id`);
  }

  // ---- 44-49. accessibility contract, by source ------------------------------------------------------
  assert.equal((view.match(/<h1/g) ?? []).length, 1, "44. the concept view renders exactly one h1");
  const levels = [...view.matchAll(/<h([1-3])/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `45. heading order does not skip (${levels.join(",")})`);
  }
  assert.ok(practice.includes("focus-ring"), "46. answer controls carry the visible focus class");
  assert.ok((practice.match(/min-h-11/g) ?? []).length >= 4, "47. answer and action targets carry the 44px minimum");
  assert.ok(practice.includes("aria-live"), "48a. changed feedback is announced");
  assert.ok(practice.includes("CheckCircle2") && practice.includes("XCircle") && /Not yet|Correct/.test(practice),
    "48b. correctness is icon + word, never colour alone");
  assert.ok(practice.includes("aria-pressed"), "48c. the selected answer is exposed accessibly");
  assert.ok(!/overflow-x-|whitespace-nowrap|w-\[\d/.test(stripComments(view) + stripComments(practice)), "49. no fixed width or nowrap that could overflow");
  assert.ok(view.includes("break-words") && practice.includes("break-words"), "49b. long titles and choices wrap");

  // ---- 50. provenance is visible on every new page ---------------------------------------------------
  assert.ok(view.includes("SourceFreshnessNote"), "50. the concept view renders the shared source note");

  // ---- registry validation --------------------------------------------------------------------------
  assert.deepEqual(validateEducationRegistry({ ...EDUCATION_REGISTRY, seededSlugs: [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS] }), [],
    `the real registry validates cleanly; got ${JSON.stringify(validateEducationRegistry({ ...EDUCATION_REGISTRY, seededSlugs: [...SEEDED_LESSON_SLUGS, ...SEEDED_SKILL_SLUGS] }))}`);

  // ---- selector controls ------------------------------------------------------------------------------
  assert.ok(trackFile.includes("LEARNING_SKILL_CATALOG"), "selector: the track file imports the catalog rather than copying it");
  for (const banned of ["...entry", "Object.assign", "structuredClone", "JSON.parse"]) {
    assert.ok(!stripComments(trackFile).includes(banned), `selector: no ${banned} — the source is referenced, never copied`);
  }
  assert.ok(trackFile.includes("throw new Error"), "selector: it fails loudly rather than degrading");

  console.log(
    `Education-migration smoke passed: four already-authored Debate lessons — Guide the judge through your speech, Create direct clash, Answer with refutation, and Build a constructive speech — are now learner-visible, and each registry entry holds the ORIGINAL LEARNING_SKILL_CATALOG object by strict identity, proven against clones, one-character mutations and removed fields that all fail the same checks. lib/learning-content.ts and every legacy lesson module, renderer, drill bank, assignment file and Prisma file are byte-identical to HEAD, while the /lessons and /skills INDEX pages — which M14 Phase 1a converted to async track resolution — are pinned instead against the immutable pre-Phase-1a commit, where every changed line must be exactly that conversion. The Debate course now runs argument construction -> round strategy -> speech structure with resolving prerequisites and a next-lesson chain that ends honestly at null. Only debate-refutation names a seeded skill, as association alone: the checks component contains no mastery, XP, progress, storage, API, server-action or AI reference at all, states before the first question that nothing is saved, and introduces no percentage anywhere. All five held Debate entries — including both parliamentary ones — are absent from the registry by id and by title. Every question has at least two choices and exactly one stored answer present among them, feedback is icon plus word with aria-live, targets carry the 44px minimum and a visible focus ring, and the source-freshness note renders on every new page. lib/spaced-review.ts is no longer blanket-hashed — the canonical lesson routes are pinned instead, no education module reaches the mastery writer at all, recordDrillMastery keeps its boolean export beside the added detailed result, the Debate submit route is byte-identical and still calls the boolean form, and no second lesson or mastery renderer was introduced.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
