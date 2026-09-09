/**
 * M15 Learning Architecture Slice 3 — SERVER CHOOSES, AI EXPLAINS.
 *
 * Run with: npm run coach-evidence:smoke
 *
 * NO DATABASE, NO PROVIDER. The real `getEvidenceBackedNextAction` runs against a stub installed on
 * `globalThis.prisma` before `lib/prisma` is first imported (that module reads `globalThis.prisma`
 * before constructing a client, so no connection opens). Everything about the MODEL is proven
 * structurally over committed source — lib/ai.ts is never imported here, so no provider module code
 * runs at all. Immutable-baseline pins use the fixed pre-Slice-3 commit, never a moving HEAD.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The commit Slice 3 was built on. IMMUTABLE — these pins prove the frozen files are byte-identical
// to the audited pre-Slice-3 state, and cannot self-heal by HEAD advancing.
const PRE_SLICE3 = "ede805b6a60aa156839f5880a611323c1df0b76a";

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");
const gitShow = (path: string) => execSync(`git show ${PRE_SLICE3}:'${path}'`, { encoding: "utf8" });

// ---- stub prisma: models ONLY what getDueReviews touches --------------------------------------
type StubRow = { skillId: string; nextReviewAt: Date; reviewCount: number };
type StubSkill = { id: string; name: string; slug: string; organization: string };
type StubMastery = { skillId: string; masteryPercent: number; masteryLevel: string };
// The stub HONOURS its where-clauses (P1-C.2). It used to ignore them and return everything, which
// was harmless while the only filter was applied in JS — but track scoping is now done IN the query
// (`skillId: { in: <this organization's skills> }`), and a stub that ignores `where` would let a
// broken filter pass. Only the shapes lib/spaced-review.ts actually issues are modelled; anything
// else throws, so a new query shape cannot be silently unfiltered.
type StubWhere = {
  organization?: string;
  slug?: { in?: string[] };
  id?: { in?: string[] };
  skillId?: { in?: string[] };
  userId?: string;
  nextReviewAt?: unknown;
};
const stub = {
  rows: [] as StubRow[],
  skills: [] as StubSkill[],
  mastery: [] as StubMastery[],
  skillReviewSchedule: {
    findMany: async (args?: { where?: StubWhere; take?: number }) => {
      const where = args?.where ?? {};
      let rows = stub.rows;
      if (where.skillId?.in) rows = rows.filter((row) => where.skillId!.in!.includes(row.skillId));
      return args?.take === undefined ? rows : rows.slice(0, args.take);
    },
    count: async () => stub.rows.length
  },
  skill: {
    findMany: async (args?: { where?: StubWhere }) => {
      const where = args?.where ?? {};
      let skills = stub.skills;
      if (where.organization !== undefined) skills = skills.filter((sk) => sk.organization === where.organization);
      if (where.slug?.in) skills = skills.filter((sk) => where.slug!.in!.includes(sk.slug));
      if (where.id?.in) skills = skills.filter((sk) => where.id!.in!.includes(sk.id));
      return skills;
    }
  },
  masteryProgress: { findMany: async () => stub.mastery }
};
(globalThis as unknown as { prisma: unknown }).prisma = stub;

const DUE = new Date("2026-08-20T00:00:00.000Z");
function seed(slug: string, masteryPercent: number, extra?: { slug: string; masteryPercent: number }) {
  activeOrganization = orgFor(slug);
  stub.rows = [{ skillId: "s1", nextReviewAt: DUE, reviewCount: 2 }];
  stub.skills = [{ id: "s1", name: nameFor(slug), slug, organization: orgFor(slug) }];
  stub.mastery = [{ skillId: "s1", masteryPercent, masteryLevel: "LEARNING" }];
  if (extra) {
    stub.rows.push({ skillId: "s2", nextReviewAt: new Date("2026-08-22T00:00:00.000Z"), reviewCount: 0 });
    stub.skills.push({ id: "s2", name: nameFor(extra.slug), slug: extra.slug, organization: orgFor(extra.slug) });
    stub.mastery.push({ skillId: "s2", masteryPercent: extra.masteryPercent, masteryLevel: "LEARNING" });
  }
}
/**
 * The active track for the call under test. Every seeded fixture belongs to exactly one track, so
 * the default is that track's organization — the Coach is asked the question a learner training in
 * that track would ask. Tests that need a DIFFERENT active track pass one explicitly, which is how
 * the cross-track controls are written.
 */
let activeOrganization: string | null = null;

const nameFor = (slug: string) => slug.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
const orgFor = (slug: string) =>
  slug.startsWith("deca-") ? "DECA" : slug.startsWith("hosa-") ? "HOSA" : slug.startsWith("debate-") ? "GENERAL_DEBATE" : "MODEL_UN";

async function main() {
  const { getEvidenceBackedNextAction, coachActionExplanationTemplate } = await import("../lib/coach-evidence");
  const nextAction = (organization: string | null = activeOrganization) =>
    getEvidenceBackedNextAction("u1", organization as never);
  const { PRACTICING_MASTERY_MIN } = await import("../lib/spaced-review");
  const { DEBATE_MASTERY_HELD_SKILLS } = await import("../lib/debate-drills");
  const { coachNextActionRequestSchema } = await import("../lib/validators");
  const {
    INTENDED_SKILL_SLUGS,
    debateWritingPracticeSupported,
    compatTrackForSlug,
    COMPAT_TRACK_DESTINATION,
    practiceRemediationForSkill
  } = await import("../lib/education/skills-compat");
  assert.equal((globalThis as unknown as { prisma?: unknown }).prisma, stub,
    "S3-0. control: the stub is the module's client — no PrismaClient constructed, no database touched");

  // ---- S3-1. low-mastery due mapped -> the exact lesson AND the exact drill --------------------
  // The pilot slug here was `debate-rebuttal` until M15 S2-HM. That skill's durable mastery is now
  // SUSPENDED, and a suspended skill is deliberately withheld from the due-review surfaces the Coach
  // reads (see S3-H below), so it can no longer stand for the ordinary mapped case. `debate-evidence`
  // replaces it: also mapped, also Debate, and still active. Nothing about the mapping architecture
  // changed — the expected object below is derived from the same registry metadata as before.
  seed("debate-evidence", 69);
  assert.deepEqual(await nextAction(), {
    type: "REVIEW_LESSON_THEN_DRILL",
    skill: { slug: "debate-evidence", name: "Debate Evidence", organization: "GENERAL_DEBATE" },
    dueSinceDate: "2026-08-20",
    belowPracticing: true,
    lesson: { id: "debate-evidence-evaluation", title: "Judge the evidence", href: "/lessons/debate-evidence-evaluation" },
    drill: { track: "debate", area: "evidence-evaluation", label: "Evidence evaluation", href: "/study-arcade?track=debate&area=evidence-evaluation" }
  }, "S3-1. mastery 69 on debate-evidence yields the evidence lesson and the evidence-evaluation drill, exact hrefs included");

  // ---- S3-2. healthy due mapped -> exact drill only, and DUE stays distinct from WEAK ----------
  for (const m of [70, 71]) {
    seed("debate-evidence", m);
    const a = await nextAction();
    assert.equal(a.type, "REDO_EXACT_DRILL", `S3-2. mastery ${m} is re-demonstration, not remediation`);
    assert.ok(!("lesson" in a), `S3-2b. and carries NO lesson at mastery ${m}`);
    assert.equal((a as { belowPracticing?: boolean }).belowPracticing, false,
      `S3-2c. and does not classify mastery ${m} as below practicing`);
  }
  seed("debate-evidence", 69);
  assert.equal((await nextAction()).type, "REVIEW_LESSON_THEN_DRILL",
    "S3-2d. 69 flips the branch — the boundary sits exactly at the canonical floor");
  assert.equal(PRACTICING_MASTERY_MIN, 70, "S3-2e. and that floor is the canonical 70, imported, not restated");

  // ---- S3-H. a mastery-HELD skill is not an actionable Coach next action -----------------------
  // A held skill's due row is never deleted and its nextReviewAt is never moved, so it stays due
  // forever. Acting on it cannot succeed: passing pushes no schedule out, failing lowers nothing.
  // Telling a coach to assign it would be instructing them to set a task with no resolution, so the
  // withholding happens once, at getDueReviews, and every consumer inherits it — including this one.
  seed("debate-rebuttal", 40);
  assert.equal((await nextAction()).type, "NO_DUE_ACTION",
    "S3-H. a due HELD skill yields no next action at all, at any mastery");
  seed("debate-rebuttal", 95);
  assert.equal((await nextAction()).type, "NO_DUE_ACTION",
    "S3-H2. including a strong one — it is the hold, not the score, that withdraws the action");
  // Non-vacuity: the row really was seeded, and the identical shape on an ACTIVE skill still acts.
  assert.equal(stub.rows.length, 1, "S3-H3. control: a due row was seeded — the emptiness is the filter, not the fixture");
  seed("debate-evidence", 95);
  assert.equal((await nextAction()).type, "REDO_EXACT_DRILL",
    "S3-H4. control: the same fixture on an active skill still produces an action");
  assert.deepEqual([...DEBATE_MASTERY_HELD_SKILLS], ["debate-rebuttal"],
    "S3-H5. and the hold list is the canonical one, imported, not restated here");

  // ---- S3-T. TRACK SCOPING: a due row is an ASSIGNMENT, and assignments follow the active track ----
  // Before P1-C.2 the Coach and the review page listed every schedule row a learner had. A DECA
  // student with a leftover Debate row was handed a Debate lesson and a Debate drill as their
  // training. The row is not deleted and its schedule is untouched — it simply is not this track's
  // work. Each case below seeds ONE skill and then asks the question from each track in turn.
  for (const [slug, ownOrg] of [["debate-evidence", "GENERAL_DEBATE"], ["deca-marketing", "DECA"], ["hosa-medterm", "HOSA"]] as const) {
    seed(slug, 40);
    const inTrack = await nextAction(ownOrg);
    assert.notEqual(inTrack.type, "NO_DUE_ACTION", `S3-T. ${slug} is actionable for a learner training in ${ownOrg}`);
    assert.equal(inTrack.type === "NO_DUE_ACTION" ? "" : inTrack.skill.organization, ownOrg,
      `S3-T2. and the action it returns belongs to ${ownOrg}`);
    for (const otherOrg of ["GENERAL_DEBATE", "DECA", "HOSA"].filter((o) => o !== ownOrg)) {
      assert.equal((await nextAction(otherOrg)).type, "NO_DUE_ACTION",
        `S3-T3. ${slug} is NOT assigned to a learner whose active track is ${otherOrg}`);
    }
    // An unresolved track is not "every track": it is no assignment at all.
    assert.equal((await nextAction(null)).type, "NO_DUE_ACTION",
      `S3-T4. ${slug} is not assigned when no track resolves at all`);
  }
  // Non-vacuity: the withholding above is the track filter, not an empty fixture.
  seed("debate-evidence", 40);
  assert.equal(stub.rows.length, 1, "S3-T5. control: a due row really was seeded for those cases");
  assert.notEqual((await nextAction("GENERAL_DEBATE")).type, "NO_DUE_ACTION", "S3-T6. control: and it is actionable in its own track");

  // The scoping is done in the QUERY, not by hiding rows in the UI.
  const spacedCode = stripComments(read("lib/spaced-review.ts"));
  assert.ok(/skillId: \{ in: eligibleIds \}/.test(spacedCode),
    "S3-T7. the schedule query itself is restricted to the active track's skill ids");
  assert.ok(!/organization/.test(spacedCode.slice(spacedCode.indexOf("export async function getDueReviews"))) ||
            /skill!\.organization === organization/.test(spacedCode),
    "S3-T8. and the defensive second gate compares Skill.organization, never a slug or area string");

  // ---- S3-M. ABSENCE IS NOT ZERO ---------------------------------------------------------------
  // `masteryPercent: progress?.masteryPercent ?? 0` made "no mastery row" indistinguishable from
  // "measured zero". HOSA Medical Terminology is the case that makes this routine rather than
  // hypothetical: its submit route is deliberately review-only — it writes the schedule row and never
  // a MasteryProgress row — and it writes only when the learner PASSED its floors. So the learner most
  // likely to be told "0% mastery" is the one who just answered nearly everything correctly.
  seed("hosa-medterm", 92);
  stub.mastery = []; // the review-only shape: a schedule row exists, no MasteryProgress row does
  const reviewOnly = await nextAction("HOSA");
  assert.notEqual(reviewOnly.type, "NO_DUE_ACTION", "S3-M. the review-only skill still surfaces as due for its own track");
  assert.equal((reviewOnly as { belowPracticing?: boolean }).belowPracticing, false,
    "S3-M2. with NO mastery record it is not classified as below the practicing floor — absence is not a demonstrated weakness");
  const { getDueReviews: getDue } = await import("../lib/spaced-review");
  const rowsNoMastery = await getDue("u1", "HOSA" as never);
  assert.equal(rowsNoMastery.length, 1, "S3-M3. control: the due row is present");
  assert.equal(rowsNoMastery[0].masteryPercent, null, "S3-M4. and its mastery percentage is NULL, not 0");
  assert.equal(rowsNoMastery[0].masteryLevel, null, "S3-M5. and its level is NULL, not \"NOT_STARTED\"");

  // ---- S3-M6. A REAL ZERO IS EVIDENCE, AND SURVIVES --------------------------------------------
  // The repair must not swing the other way and hide a genuinely recorded 0%. Zero that was measured
  // is a fact about the learner; only ABSENCE is null.
  seed("hosa-medterm", 0);
  const rowsRealZero = await getDue("u1", "HOSA" as never);
  assert.equal(rowsRealZero.length, 1, "S3-M6. control: the due row is present");
  assert.equal(rowsRealZero[0].masteryPercent, 0, "S3-M7. a persisted 0 stays 0 — measured zero is evidence, not absence");
  assert.notEqual(rowsRealZero[0].masteryPercent, null, "S3-M8. and is never collapsed into absence");
  const realZeroAction = await nextAction("HOSA");
  assert.equal((realZeroAction as { belowPracticing?: boolean }).belowPracticing, true,
    "S3-M9. and a real 0 IS below the practicing floor, exactly as before");

  // ---- S3-M10. DECA real mastery is untouched --------------------------------------------------
  for (const slug of ["deca-performance-indicators", "deca-business-reasoning", "deca-customer-relations", "deca-marketing"]) {
    seed(slug, 64);
    const rows = await getDue("u1", "DECA" as never);
    assert.equal(rows.length, 1, `S3-M10. ${slug}: its own track still sees it`);
    assert.equal(rows[0].masteryPercent, 64, `S3-M11. ${slug}: a real recorded percentage is preserved exactly`);
  }

  // ---- S3-3. most-overdue-first: the FIRST row of the existing ordering wins -------------------
  // The far-weaker later-due skill was `debate-rebuttal` until M15 S2-HM; a held skill is filtered
  // out entirely, which would make this ordering case vacuous. `debate-weighing` keeps it real.
  seed("debate-evidence", 95, { slug: "debate-weighing", masteryPercent: 5 });
  const first = await nextAction();
  assert.equal(first.type === "NO_DUE_ACTION" ? "" : first.skill.slug, "debate-evidence",
    "S3-3. the earlier-due skill is chosen even though the later one is far weaker — no weakest-first reranking");
  const helperCode = stripComments(read("lib/coach-evidence.ts"));
  assert.ok(!helperCode.includes(".sort("), "S3-3b. the helper never re-sorts the due list");
  assert.ok(/const first = due\[0\];/.test(helperCode), "S3-3c. it takes exactly the first row of the existing ordering");
  assert.ok(/orderBy: \{ nextReviewAt: "asc" \}/.test(stripComments(read("lib/spaced-review.ts"))),
    "S3-3d. and that ordering is still getDueReviews' explicit nextReviewAt asc");

  // ---- S3-4. unmapped due skills: EXACT parity with the review card's destination rule ---------
  let paritySlugs = 0;
  for (const slug of INTENDED_SKILL_SLUGS) {
    if (practiceRemediationForSkill(slug)) continue; // the mapped pilot is covered by S3-1/S3-2
    seed(slug, 40);
    const a = await nextAction();
    assert.equal(a.type, "EXISTING_REVIEW_DESTINATION", `S3-4. ${slug} keeps its existing destination`);
    const reassessable = debateWritingPracticeSupported(slug);
    const track = compatTrackForSlug(slug);
    const fallback = track ? COMPAT_TRACK_DESTINATION[track] : { href: "/training", label: "Choose a training track" };
    const expected = reassessable
      ? { href: `/skills/${slug}/practice`, label: "Reassess now" }
      : { href: fallback.href, label: fallback.label };
    assert.deepEqual(a.type === "EXISTING_REVIEW_DESTINATION" ? a.destination : null, expected,
      `S3-4b. ${slug}'s Coach destination equals the review card's rule`);
    assert.ok(!("lesson" in a) && !("drill" in a), `S3-4c. ${slug} gets no fabricated lesson or drill`);
    paritySlugs += 1;
  }
  // P1-B4 SUPERSEDES the ">= 9" floor. That number was calibrated when most skills had no teaching
  // owner, so it decayed every time one gained a remediation — and once all four DECA skills resolved
  // it failed while the sweep was working exactly as intended. The control's real job is that the loop
  // is not vacuous and that it covered precisely the unmapped skills, so it is derived from the same
  // source the loop filters on and cannot go stale again.
  const unmapped = [...INTENDED_SKILL_SLUGS].filter((slug) => !practiceRemediationForSkill(slug));
  assert.ok(unmapped.length > 0, "S3-4d. control: there are still unmapped skills for the sweep to cover");
  assert.equal(paritySlugs, unmapped.length,
    "S3-4e. and the sweep covered every one of them — exactly the skills with no remediation");
  assert.ok([...INTENDED_SKILL_SLUGS].some((s) => s.startsWith("deca-")) && [...INTENDED_SKILL_SLUGS].some((s) => s.startsWith("hosa-")),
    "S3-4e. control: DECA and HOSA slugs were among them — cross-track safety was actually exercised");

  // ---- S3-W. Wave 1B: the weighing mapping flows through the SAME architecture, unchanged ------
  // These cases exist because Wave 1B published the corrected weighing lesson with its exact drill
  // mapping. No Coach logic changed — the assertions below pass only because the helper derives
  // everything from registry metadata, which is the entire point of the Slice 3 design.
  seed("debate-weighing", 69);
  assert.deepEqual(await nextAction(), {
    type: "REVIEW_LESSON_THEN_DRILL",
    skill: { slug: "debate-weighing", name: "Debate Weighing", organization: "GENERAL_DEBATE" },
    dueSinceDate: "2026-08-20",
    belowPracticing: true,
    lesson: { id: "debate-weighing", title: "Explain why your impact wins", href: "/lessons/debate-weighing" },
    drill: { track: "debate", area: "weighing", label: "Weighing", href: "/study-arcade?track=debate&area=weighing" }
  }, "S3-W1. mastery 69 on debate-weighing yields the weighing lesson and the weighing drill, exact hrefs included");
  for (const m of [70, 71]) {
    seed("debate-weighing", m);
    const a = await nextAction();
    assert.equal(a.type, "REDO_EXACT_DRILL", `S3-W2. weighing mastery ${m} is re-demonstration, not remediation`);
    assert.ok(!("lesson" in a), `S3-W2b. and carries NO lesson at mastery ${m}`);
  }
  seed("debate-evidence", 95, { slug: "debate-weighing", masteryPercent: 5 });
  const w3 = await nextAction();
  assert.equal(w3.type === "NO_DUE_ACTION" ? "" : w3.skill.slug, "debate-evidence",
    "S3-W3. most-overdue-first still wins — a weaker weighing row later in the order is not preferred");

  // ---- S3-E. Wave 1C: the evidence mapping flows through the SAME architecture, unchanged ------
  seed("debate-evidence", 69);
  assert.deepEqual(await nextAction(), {
    type: "REVIEW_LESSON_THEN_DRILL",
    skill: { slug: "debate-evidence", name: "Debate Evidence", organization: "GENERAL_DEBATE" },
    dueSinceDate: "2026-08-20",
    belowPracticing: true,
    lesson: { id: "debate-evidence-evaluation", title: "Judge the evidence", href: "/lessons/debate-evidence-evaluation" },
    drill: { track: "debate", area: "evidence-evaluation", label: "Evidence evaluation", href: "/study-arcade?track=debate&area=evidence-evaluation" }
  }, "S3-E1. mastery 69 on debate-evidence yields the evidence lesson and the evidence drill, exact hrefs included");
  for (const m of [70, 71]) {
    seed("debate-evidence", m);
    const a = await nextAction();
    assert.equal(a.type, "REDO_EXACT_DRILL", `S3-E2. evidence mastery ${m} is re-demonstration, not remediation`);
    assert.ok(!("lesson" in a), `S3-E2b. and carries NO lesson at mastery ${m}`);
  }
  seed("debate-weighing", 95, { slug: "debate-evidence", masteryPercent: 5 });
  const e3 = await nextAction();
  assert.equal(e3.type === "NO_DUE_ACTION" ? "" : e3.skill.slug, "debate-weighing",
    "S3-E3. most-overdue-first still wins — a weaker evidence row later in the order is not preferred");

  // ---- S3-C. Clash closure: the clash mapping flows through the SAME architecture, unchanged ---
  seed("debate-clash", 69);
  assert.deepEqual(await nextAction(), {
    type: "REVIEW_LESSON_THEN_DRILL",
    skill: { slug: "debate-clash", name: "Debate Clash", organization: "GENERAL_DEBATE" },
    dueSinceDate: "2026-08-20",
    belowPracticing: true,
    lesson: { id: "debate-clash", title: "Find the real clash", href: "/lessons/debate-clash" },
    drill: { track: "debate", area: "clash", label: "Clash", href: "/study-arcade?track=debate&area=clash" }
  }, "S3-C1. mastery 69 on debate-clash yields the clash lesson and the clash drill, exact hrefs included");
  for (const m of [70, 71]) {
    seed("debate-clash", m);
    const a = await nextAction();
    assert.equal(a.type, "REDO_EXACT_DRILL", `S3-C2. clash mastery ${m} is re-demonstration, not remediation`);
    assert.ok(!("lesson" in a), `S3-C2b. and carries NO lesson at mastery ${m}`);
  }
  seed("debate-weighing", 95, { slug: "debate-clash", masteryPercent: 5 });
  const c3 = await nextAction();
  assert.equal(c3.type === "NO_DUE_ACTION" ? "" : c3.skill.slug, "debate-weighing",
    "S3-C3. most-overdue-first still wins — a weaker clash row later in the order is not preferred");

  // ---- S3-5. unknown skill fails safe ----------------------------------------------------------
  seed("totally-unknown-skill", 10);
  const unknown = await nextAction();
  assert.deepEqual(unknown.type === "EXISTING_REVIEW_DESTINATION" ? unknown.destination : null,
    { href: "/training", label: "Choose a training track" },
    "S3-5. an unknown slug routes to the generic chooser and nothing else");
  assert.ok(!("lesson" in unknown) && !("drill" in unknown), "S3-5b. and carries no lesson or drill");

  // ---- S3-6. the request contract accepts NO learning-state claims -----------------------------
  assert.deepEqual(coachNextActionRequestSchema.parse({}), {}, "S3-6. the empty request parses");
  for (const [field, value] of Object.entries({
    weaknesses: ["rebuttal"], availableLessons: [{ slug: "x" }], weaknessSummary: ["x"], recentScores: [10],
    mastery: 5, masteryPercent: 5, skillSlug: "debate-rebuttal", lessonId: "debate-refutation",
    readiness: true, weakSkills: ["x"], scores: [1]
  })) {
    assert.throws(() => coachNextActionRequestSchema.parse({ [field]: value }),
      `S3-6b. a smuggled learning claim is rejected, not ignored (${field})`);
  }

  // ---- S3-7. the route derives from the authenticated user, in the guarded order ---------------
  const route = stripComments(read("app/api/ai/recommendations/route.ts"));
  assert.ok(/getEvidenceBackedNextAction\(user\.id\b/.test(route),
    "S3-7. the action comes from the server-side helper keyed by the authenticated userId");
  // S3-7a (P1-C.2). The Coach now answers for the learner's ACTIVE TRACK, and that track must come
  // from the canonical server-side resolver — never from the request, which is the whole point of a
  // strict-empty request schema. A client-supplied track would be a learning claim in disguise.
  assert.ok(/resolveActiveTrack\(\)/.test(route),
    "S3-7a. and the track it is scoped to is resolved server-side by the canonical resolver");
  assert.ok(/getEvidenceBackedNextAction\(user\.id, active\.track\?\.organization\)/.test(route),
    "S3-7a2. from that resolution, not from anything the caller sent");
  assert.ok(!/resolveActiveTrack\([^)]+\)/.test(route),
    "S3-7a3. with no route slug smuggled into the resolver on this endpoint");
  for (const gone of ["weaknesses", "availableLessons", "weaknessSummary", "recentScores", "recommendLessons"]) {
    assert.ok(!route.includes(gone), `S3-7b. no client learning input survives in the route (${gone})`);
  }
  assert.ok(!/const input\b|input\./.test(route), "S3-7c. the parsed body is never read — it exists only to be rejected when non-empty");
  const at = (needle: string) => { const i = route.indexOf(needle); assert.ok(i >= 0, `S3-7d. anchor present: ${needle}`); return i; };
  assert.ok(at("requireUser()") < at("enforceRateLimit(") && at("enforceRateLimit(") < at("parseJson("),
    "S3-7e. auth, then rate limit, then body parse — the security ordering is preserved");

  // ---- S3-8. the deterministic helper is pure of AI, XP, and unused evidence -------------------
  for (const banned of ["jsonCompletion", "runProviderCompletion", "@/lib/ai", "xPLog", "XPLog", "awardXp",
                        "PracticeAttempt", "practiceAttempt", "QuestionAttempt", "questionAttempt",
                        "lastOutcome", "reviewCount", "localStorage", "sessionStorage", "fetch(", "use client"]) {
    assert.ok(!helperCode.includes(banned), `S3-8. lib/coach-evidence.ts stays deterministic and evidence-scoped (${banned})`);
  }

  // ---- S3-9. no due rows -> NO_DUE_ACTION, truthfully worded -----------------------------------
  stub.rows = []; stub.skills = []; stub.mastery = [];
  const none = await nextAction();
  assert.deepEqual(none, { type: "NO_DUE_ACTION" }, "S3-9. an empty record yields no personalized action");
  assert.equal(coachActionExplanationTemplate(none), "No evidence-backed review is due right now.",
    "S3-9b. and its wording claims no weakness and no personalization");

  // ---- S3-10. NO_DUE_ACTION never reaches the provider -----------------------------------------
  const noDueReturn = route.indexOf('if (action.type === "NO_DUE_ACTION")');
  const providerCall = route.indexOf("explainNextAction(");
  assert.ok(noDueReturn >= 0 && providerCall >= 0 && noDueReturn < providerCall,
    "S3-10. the NO_DUE_ACTION return sits before the one explainNextAction call");
  assert.ok(/if \(action\.type === "NO_DUE_ACTION"\) \{\s*return NextResponse\.json\(\{ action, explanation: template \}\);\s*\}/.test(route),
    "S3-10b. and that branch returns the deterministic template directly");

  // ---- S3-11. templates: truthful copy for every action type -----------------------------------
  // Same slug substitution as S3-1: a held skill produces NO_DUE_ACTION, so it cannot exercise the
  // mapped templates. The template LOGIC is unchanged and still fills from registry metadata.
  seed("debate-evidence", 69);
  const low = await nextAction();
  assert.equal(coachActionExplanationTemplate(low),
    "Your Debate Evidence review is due. Your recorded mastery is below the practicing level, so review Judge the evidence first, then retry the Evidence evaluation drill.",
    "S3-11. the low-mastery template states the record, the lesson, then the drill");
  seed("debate-evidence", 71);
  assert.equal(coachActionExplanationTemplate(await nextAction()),
    "Your Debate Evidence review is due. Retry the Evidence evaluation drill to re-demonstrate it.",
    "S3-11b. the healthy template is pure re-demonstration — no weakness language");
  // And the held skill reaches the learner-safe template instead of a task it cannot finish.
  seed("debate-rebuttal", 69);
  assert.equal(coachActionExplanationTemplate(await nextAction()),
    "No evidence-backed review is due right now.",
    "S3-11e. a held skill yields the no-due template, never a retry instruction");
  seed("hosa-medical-terminology", 40);
  const unmappedTemplate = coachActionExplanationTemplate(await nextAction());
  assert.ok(unmappedTemplate.startsWith("Your Hosa Medical Terminology review is due."),
    "S3-11c. the unmapped template still states only due-ness plus the existing destination");
  for (const banned of ["bad at", "don't understand", "getting worse", "keep failing", "competition ready"]) {
    for (const t of [coachActionExplanationTemplate(low), unmappedTemplate]) {
      assert.ok(!t.toLowerCase().includes(banned), `S3-11d. no diagnosis language in templates (${banned})`);
    }
  }

  // ---- S3-12. the model can change exactly ONE thing: the prose --------------------------------
  const ai = stripComments(read("lib/ai.ts"));
  assert.ok(ai.includes("jsonCompletion<{ explanation: string }>"),
    "S3-12. the provider's entire output contract for the Coach is one explanation string");
  assert.ok(/\(\) => \(\{ explanation: fallbackExplanation \}\)/.test(ai),
    "S3-12b. provider failure falls back to the server template — the action is never at stake");
  assert.ok(/typeof value\?\.explanation === "string"/.test(ai) && /value\.explanation\.length <= 600/.test(ai),
    "S3-12c. and provider output is validated down to a bounded string");
  assert.ok(!route.includes("action: explained") && !route.includes("action: tagged"),
    "S3-12d. the response's action field comes only from the helper, never from provider output");
  assert.ok(!route.includes("href"), "S3-12e. the route itself constructs and parses no hrefs at all");
  const explainStart = ai.indexOf("export async function explainNextAction");
  const explainEnd = ai.indexOf('"coach next-action explanation"');
  assert.ok(explainStart >= 0 && explainEnd > explainStart, "S3-12f-anchors. the explanation function is locatable");
  const explainBody = ai.slice(explainStart, explainEnd);
  for (const gone of ["user.email", "user.name", "userId", "email"]) {
    assert.ok(!explainBody.includes(gone), `S3-12f. no learner identity is sent to the provider (${gone})`);
  }
  assert.ok(!/masteryPercent/.test(explainBody),
    "S3-12g. the provider sees the belowPracticing boolean, never the raw percentage");

  // ---- S3-13. the route has a REAL learner-facing caller that sends no evidence ----------------
  const card = stripComments(read("components/app/coach-next-action-card.tsx"));
  assert.ok(card.includes('fetch("/api/ai/recommendations"'), "S3-13. the dashboard card really calls the route");
  assert.ok(card.includes("JSON.stringify({})"), "S3-13b. and its body is a literal empty object");
  for (const banned of ["weaknesses", "weaknessSummary", "weakSkills", "recentScores", "availableLessons",
                        "masteryPercent", "skillSlug:", "lessonId:", "readiness"]) {
    assert.ok(!card.includes(banned), `S3-13c. the card sends and invents no learning state (${banned})`);
  }
  const dash = stripComments(read("app/(app)/dashboard/page.tsx"));
  assert.ok(dash.includes("<CoachNextActionCard />"), "S3-13d. the dashboard renders the Coach card");
  assert.ok(card.includes("aria-busy") && card.includes("aria-live") && card.includes("aiNotice"),
    "S3-13e. loading state is announced and AI provenance notices are surfaced, not hidden");

  // ---- S3-14. the readiness surface is FROZEN --------------------------------------------------
  const sha = (p: string) => execSync(`git show ${PRE_SLICE3}:'${p}' | shasum -a 256`, { encoding: "utf8" }).split(" ")[0];
  const now = (p: string) => execSync(`shasum -a 256 '${p}'`, { encoding: "utf8" }).split(" ")[0];
  assert.equal(now("app/api/ai/readiness/route.ts"), sha("app/api/ai/readiness/route.ts"),
    "S3-14. the readiness route is byte-identical to the immutable pre-Slice-3 baseline");
  const evalSlice = (src: string) => {
    const start = src.indexOf("export async function evaluateReadiness");
    const end = src.indexOf('"readiness evaluation"');
    assert.ok(start >= 0 && end > start, "S3-14b. evaluateReadiness anchors exist");
    return src.slice(start, end);
  };
  assert.equal(evalSlice(read("lib/ai.ts")), evalSlice(gitShow("lib/ai.ts")),
    "S3-14c. evaluateReadiness is character-identical to the baseline — deferred, not touched");
  assert.ok(read("lib/validators.ts").includes("export const readinessRequestSchema"),
    "S3-14d. its request schema survives under its original name");

  // ---- S3-15/16. schema and the Slice 1/2 surfaces are byte-frozen -----------------------------
  // lib/education/registry.ts is deliberately absent from Wave 1A onward: curriculum publication
  // legitimately EXTENDS the registry (Wave 1A inserts the orientation entry), so a byte freeze
  // would forbid approved curriculum work rather than protect the Coach. What the pin protected FOR
  // THE COACH is asserted behaviourally instead: the executed mapped cases above (S3-1, S3-W), the
  // parity sweep (S3-4), review-ladder:smoke's S2-5/S2-6 agreement and cardinality guards, and
  // education-registry:smoke's strict identity controls.
  //
  // COLLECT, DO NOT ABORT (P1-C.1). These pins used to be a loop of bare asserts, so the FIRST stale
  // one ended the whole suite and every control after it silently stopped running. That is how a
  // stale lib/spaced-review.ts digest hid S3-15d for two phases: the suite was red for a reason
  // nobody had to look past. Mismatches are now collected and reported together, so one stale pin
  // costs you that pin and nothing else.
  const pinFailures: string[] = [];
  const pin = (p: string, expected: string, why: string) => {
    const actual = now(p);
    if (actual !== expected) pinFailures.push(`${p}: expected ${expected.slice(0, 12)}… got ${actual.slice(0, 12)}… (${why})`);
  };
  pin("prisma/schema.prisma", sha("prisma/schema.prisma"), "immutable pre-Slice-3 baseline");
  pin("components/lessons/concept-education-lesson-practice.tsx", sha("components/lessons/concept-education-lesson-practice.tsx"),
      "immutable pre-Slice-3 baseline");

  // ---- S3-15e. lib/spaced-review.ts: RE-ACCEPTED, not self-healed (P1-C.1) ----------------------
  // This file stopped being byte-identical to ede805b on 2026-09-01 and the pin was never updated, so
  // the control had been failing on a file nobody had modified since. The drift is real and semantic —
  // not comments — and it is the MASTERY HOLD:
  //   3065b9e fix(education): hold unsafe rebuttal mastery
  //   c9bdb1d fix(education): align held mastery learner truth
  // Together they stop a held skill from being written or surfaced as a due review: a due card for a
  // held skill can never be resolved (passing pushes nothing out, failing lowers nothing), so showing
  // one tells a learner to do something that cannot succeed. Both are reviewed, intentional commits
  // with their own contracts. The file is ACCEPTED; the digest below records that acceptance.
  //
  // This is a re-acceptance, not a loosening, and deliberately not a self-heal: the digest is a
  // literal, so the file cannot drift again without failing here, and the acceptance is ANCHORED to
  // the named product fact below rather than resting on an opaque hex string. Any further change —
  // including one that removed the hold — fails this pin and must be accepted on its own evidence.
  const SPACED_REVIEW_ACCEPTED = "26e073e7a37ef105dcbe7ff78196862b87fd71cc27eb50e9e17e845d2647e9a1";
  pin("lib/spaced-review.ts", SPACED_REVIEW_ACCEPTED, "accepted at the mastery-hold commits 3065b9e + c9bdb1d, then re-accepted at P1-C.2 for track-scoped reviews and nullable mastery");
  assert.deepEqual(pinFailures, [], `S3-15. frozen-file pins: ${pinFailures.join(" | ")}`);

  // S3-15e2. The acceptance is anchored: the accepted file really is the mastery-hold one, and the
  // pre-Slice-3 version really lacked it. If someone bumps the digest to whatever the file happens to
  // say, these still have to hold.
  const spacedNow = read("lib/spaced-review.ts");
  const spacedBase = gitShow("lib/spaced-review.ts");
  assert.ok(spacedNow.includes("debateMasteryHeld"), "S3-15e2. the accepted file carries the mastery hold");
  assert.ok(!spacedBase.includes("debateMasteryHeld"), "S3-15e3. and the pre-Slice-3 baseline did not");
  assert.ok(/status: "mastery-held"/.test(spacedNow), "S3-15e4. a held skill is reported as held, never as skill-missing");
  // S3-15e5. EACH persistence boundary carries its own gate, checked separately. A single
  // file-wide regex was not enough: deleting the gate from one writer still matched the other one,
  // so a mutation that removed a real containment passed. The ruling is about the skill, not about
  // one entry point, so both writers are asserted independently — and each gate must come BEFORE
  // that writer's skill lookup, or a held skill would be reported as a seeding fault instead.
  const fnBody = (src: string, name: string) => {
    const start = src.indexOf(`export async function ${name}(`);
    assert.ok(start >= 0, `S3-15e5a. ${name} exists in lib/spaced-review.ts`);
    const next = src.indexOf("\nexport ", start + 1);
    return src.slice(start, next === -1 ? src.length : next);
  };
  // S3-15e2b (P1-C.2). Two more named facts the digest is anchored to, added when this file changed
  // again. Both are truth properties, not implementation details, so a future digest bump cannot
  // quietly undo either: due reviews are scoped to ONE organization in the QUERY, and an absent
  // mastery row stays absent instead of becoming a zero.
  assert.ok(/skillId: \{ in: eligibleIds \}/.test(spacedNow),
    "S3-15e2b. the due-review query is restricted to the active track's own skill ids");
  assert.ok(/where: \{ organization \}, select: \{ id: true \}/.test(spacedNow),
    "S3-15e2c. and that id set comes from Skill.organization, the authoritative relationship");
  assert.ok(/if \(!organization\) return null;/.test(spacedNow),
    "S3-15e2d. an unresolved track yields no assignment at all, rather than every track's rows");
  assert.ok(/masteryPercent: progress\?\.masteryPercent \?\? null/.test(spacedNow),
    "S3-15e2e. missing mastery is null, never a fabricated zero");
  assert.ok(!/masteryPercent: progress\?\.masteryPercent \?\? 0/.test(spacedNow),
    "S3-15e2f. and the coercion that produced \"0% mastery\" is gone");
  for (const writer of ["recordDrillMasteryDetailed", "recordDrillMasteryInTransaction"]) {
    const body = fnBody(spacedNow, writer);
    const gate = body.search(/if \(debateMasteryHeld\(skillSlug\)\) return \{ status: "mastery-held"/);
    assert.ok(gate >= 0, `S3-15e5. ${writer} gates on the mastery hold before writing`);
    const lookup = body.search(/findUnique\(\{ where: \{ slug: skillSlug \}|prisma\.skill\.findUnique/);
    if (lookup >= 0) {
      assert.ok(gate < lookup, `S3-15e5b. ${writer} checks the hold BEFORE its skill lookup, so held is never reported as skill-missing`);
    }
  }

  // S3-15e6. What the byte pin protects FOR THE COACH, asserted as behaviour so the digest is not the
  // only line of defence. The Coach takes due[0] of getDueReviews and compares mastery to the floor;
  // if either of those changed shape the Coach would silently choose a different action.
  const { PRACTICING_MASTERY_MIN: floorNow } = await import("../lib/spaced-review");
  assert.equal(typeof floorNow, "number", "S3-15e6. the mastery floor the Coach compares against is still a number");
  assert.ok(/orderBy: \{ nextReviewAt: "asc" \}/.test(spacedNow),
    "S3-15e7. due reviews are still ordered most-overdue-first — the ordering the Coach's due[0] relies on");
  assert.ok(/take: 50|take === undefined \? \{\} : \{ take \}/.test(spacedNow),
    "S3-15e8. and the due list is still bounded");
  // ---- S3-15f. skills-compat: raw byte pin deliberately RETIRED (Clash measurable-practice) ----
  // The file legitimately carries mutable catalog data — the skill inventory that approved
  // measurement work extends — so byte identity would forbid approved work, exactly the reasoning
  // that retired the registry pin in Wave 1A. What the pin protected FOR THE COACH is asserted
  // behaviorally instead (manifest/seed agreement stays owned by skills-compat:smoke 27h/162):
  const { resolveSkillsSlug: s315Resolve } = await import("../lib/education/skills-compat");
  for (const slug of ["debate-weighing", "debate-clash"]) {
    const r = s315Resolve(slug);
    assert.equal(r.kind, "canonical-redirect",
      `S3-15f. ${slug} resolves to its canonical lesson — the inventory can never hijack an authored route`);
    assert.equal(debateWritingPracticeSupported(slug), false,
      `S3-15f2. and ${slug} never silently activates Debate writing practice`);
  }
  assert.equal(practiceRemediationForSkill("debate-claim-building"), null,
    "S3-15f3. the authored-lesson CWI association still cannot mint a lesson-then-drill remediation");
  assert.ok(stripComments(read("lib/education/skills-compat.ts")).includes("isConceptEducationLessonEntry(entry)"),
    "S3-15f4. and the concept-entry discriminant guard is still the code enforcing that boundary");
  // ---- S3-15g. concept lesson view: raw byte pin deliberately RETIRED (typed label catalog) ----
  // The view's private DRILL_AREA_LABELS map moved to lib/education/practice-drill.ts in P1-C, where
  // one track-aware resolver now serves all three learner surfaces; the area union still makes an
  // unknown area a compile error. The Slice 1 trust boundary is asserted content-sightedly instead:
  const lessonView = read("components/lessons/concept-education-lesson-view.tsx");
  assert.ok(lessonView.includes("The check above is for practice and records nothing"),
    "S3-15g. the formative framing stays truthful — in-lesson checks record nothing");
  assert.ok(/\{practiceDrill \? \(/.test(lessonView),
    "S3-15g2. the practice CTA renders only when practiceDrill metadata exists");
  // S3-15g3. SUPERSEDED (P1-C): the href template moved into the one shared builder that all four
  // surfaces now call, so pinning the literal here would fail on a change that removed no
  // destination. The property is unchanged and is still what is asserted — the CTA is built from
  // THIS lesson's metadata, and no destination is hardcoded in the view.
  assert.ok(/practiceDrillHref\(practiceDrill\)/.test(lessonView),
    "S3-15g3. the CTA href is derived from the metadata — no hardcoded destination");
  assert.ok(!/study-arcade\?track=(debate|deca)/.test(lessonView),
    "S3-15g3b. and no literal track is written into the view at all");
  assert.ok(!/clash/i.test(stripComments(lessonView).replace('clash: "Clash"', "")),
    "S3-15g4. no Clash special case exists in the view beyond the typed label line");
  for (const banned of ["MasteryProgress", "spaced-review", "recordDrillMastery", "recordPracticeOutcome"]) {
    assert.ok(!lessonView.includes(banned),
      `S3-15g5. the lesson view reaches no durable evidence machinery (${banned})`);
  }
  // The review page's pin is COMMENT-STRIPPED rather than raw since Wave 1C: the deliberate
  // debate-evidence writing-practice displacement made its old disjointness comment false, and a
  // truthful comment must not cost the pin. Every token outside a comment is still compared against
  // the same immutable baseline. Sound for this file because nothing comment-like hides inside a
  // string: it has no multi-line template literal and every block-comment opener is a real JSX
  // comment — asserted below on BOTH versions rather than assumed.
  const reviewPath = "app/(app)/study-arcade/review/page.tsx";
  const executableView = (src: string) => stripComments(src).replace(/^[ \t]*\n/gm, "");
  for (const [flavor, src] of [["working-tree", read(reviewPath)], ["baseline", gitShow(reviewPath)]] as const) {
    for (const lit of src.match(/`[^`]*`/g) ?? []) {
      assert.ok(!lit.includes("\n"), `S3-15c. the ${flavor} review page has no multi-line template literal the stripper could cut into`);
    }
    assert.equal((src.match(/\/\*/g) ?? []).length, (src.match(/\{\s*\/\*/g) ?? []).length,
      `S3-15c2. every block-comment opener in the ${flavor} review page is a real JSX comment, none hides in a string`);
  }
  // S3-15d. SUPERSEDED (P1-C). Whole-file executable identity was a proxy for two things: that this
  // page never grows durable-evidence machinery, and that it and the Coach cannot drift apart. It
  // also forbade the one change P1-C exists to make — the page named its drill through the
  // Debate-only `drillAreaLabel`, which THROWS on a DECA area, so a correct DECA remediation
  // resolved and then could not be rendered. A pin that forbids fixing that is protecting the bug.
  //
  // Both properties are now asserted directly, plus a scope pin proving nothing ELSE in the file
  // moved: every executable line that differs from the baseline belongs to the remediation card.
  const baseLines = executableView(gitShow(reviewPath)).split("\n");
  const nowLines = executableView(read(reviewPath)).split("\n");
  const changed = [
    ...nowLines.filter((line) => !baseLines.includes(line)),
    ...baseLines.filter((line) => !nowLines.includes(line))
  ].filter((line) => line.trim().length > 0);
  // RECORDED PRE-EXISTING DRIFT, not a P1-C change. The empty-state copy was rewritten by approved
  // work after ede805b, so the file has NOT been executable-identical to the frozen baseline for
  // some time. Nothing caught it: the S3-15 loop above asserts a spaced-review.ts hash that already
  // fails at HEAD, which aborted this suite before it ever reached this control. Both halves of that
  // pair are pre-existing and are deliberately NOT repaired here. The allowance is pinned to the
  // exact two lines, and each is checked to be present at HEAD as well, so it can never absorb a
  // NEW edit to this page.
  const PRE_EXISTING_COPY_DRIFT = [
    "that record your practice; their review schedule starts from there, and they surface here when due.",
    "to start their review schedule, then come back when they surface."
  ];
  const headLines = executableView(execSync(`git show HEAD:'${reviewPath}'`, { encoding: "utf8" })).split("\n");
  for (const drifted of PRE_EXISTING_COPY_DRIFT) {
    assert.ok(baseLines.some((line) => line.includes(drifted)) || headLines.some((line) => line.includes(drifted)),
      `S3-15d0. the recorded drift line is real, in the baseline or at HEAD: ${drifted}`);
  }
  for (const line of changed) {
    if (PRE_EXISTING_COPY_DRIFT.some((drifted) => line.includes(drifted))) continue;
    assert.ok(/remediation|practiceDrill(Href|AreaLabel)|drillAreaLabel|debate-drills|education\/practice-drill|getActiveTrack|activeTrack|getDueReviews|searchParams|ReviewSessionPage|masteryPercent/.test(line),
      `S3-15d. the review page changed outside its accepted scope: ${line.trim()}`);
  }
  // ...and the page still WRITES nothing. It legitimately READS the mastery record — that is what a
  // due-review list is — so the ban is on the writers and on the client itself, checked with comments
  // stripped so that naming a writer in order to say the page avoids it does not trip the control.
  const reviewSrc = read(reviewPath);
  const reviewCode = stripComments(reviewSrc);
  // S3-15d1b (P1-C.2). The accepted scope widened, so the two new facts get their own anchors —
  // the line-level pin says WHERE the page may change, these say WHAT the change has to be.
  assert.ok(/getActiveTrack\(searchParams\.track\)/.test(reviewSrc),
    "S3-15d1b. the review page resolves the active track through the canonical resolver");
  assert.ok(/getDueReviews\(session\.user\.id, activeTrack\?\.organization\)/.test(reviewSrc),
    "S3-15d1c. and asks only for that track's due reviews");
  assert.ok(/review\.masteryPercent === null \? "Review due"/.test(reviewSrc),
    "S3-15d1d. an absent mastery record is shown as what it is, not as a percentage");
  assert.ok(/review\.masteryPercent !== null && review\.masteryPercent < PRACTICING_MASTERY_MIN/.test(reviewSrc),
    "S3-15d1e. and absence never counts as below the floor");
  for (const banned of ["recordDrillMastery", "recordPracticeOutcome", "prisma", "XPLog", "awardXp", ".update(", ".create(", ".upsert("]) {
    assert.ok(!reviewCode.includes(banned), `S3-15d2. the review page writes no durable evidence (${banned})`);
  }
  // ...and it cannot drift from the Coach, because both compute the same destination the same way
  // from the same helper. This is the property whole-file identity was standing in for.
  const coachSrc = read("lib/coach-evidence.ts");
  for (const [file, src] of [["the review page", reviewSrc], ["the Coach", coachSrc]] as const) {
    assert.ok(/practiceRemediationForSkill\(/.test(src), `S3-15d3. ${file} resolves remediation through the shared helper`);
    assert.ok(/practiceDrillHref\(remediation\.drill\)/.test(src), `S3-15d4. ${file} builds the drill link from what that helper returned`);
    assert.ok(/practiceDrillAreaLabel\(remediation\.drill\)/.test(src), `S3-15d5. ${file} names the drill from the same value`);
    assert.ok(!/study-arcade\?track=(debate|deca)/.test(src), `S3-15d6. ${file} hardcodes no destination`);
    assert.ok(!/drill\.track === "(debate|deca)"/.test(src), `S3-15d7. ${file} lets no track literal decide what renders`);
  }
  assert.ok(executableView(read(reviewPath)).includes("if (remediation)"),
    "S3-15e. and the stripped view demonstrably keeps executable code — the mapped branch is present in it");
  // The Taught-only orientation must be invisible to the evidence path: no skillSlug, no drill, so
  // no due row can reference it and no remediation can derive it. Asserted executably:
  const { practiceRemediationForSkill: s315Lookup } = await import("../lib/education/skills-compat");
  assert.equal(s315Lookup("debate-round-orientation"), null,
    "S3-15b. the Taught-only orientation is invisible to the remediation/Coach evidence path");

  console.log(
    `Coach-evidence smoke passed: the AI Coach's next action is chosen by the server from durable evidence and the model can change nothing but the prose. Mastery 69 on the mapped pilot yields the exact refutation lesson and the exact rebuttal drill; 70 and 71 yield the drill alone with no weakness framing, so DUE stays distinct from WEAK at exactly the canonical PRACTICING floor. The most-overdue due row is selected from getDueReviews' existing nextReviewAt-asc order with no re-sorting; every unmapped seeded skill lands on the same destination the review card's rule produces (${paritySlugs} slugs swept, DECA and HOSA included); unknown slugs fall back to the track chooser with no fabricated lesson or drill. The request schema is a strict empty object that rejects eleven smuggled learning claims; the route reads only the authenticated userId in auth -> rate-limit -> parse order; the helper contains no AI, XP, attempt-table or reviewCount logic. NO_DUE_ACTION returns the deterministic template before the single provider call site; provider output is validated to one bounded string, falls back to the same template, and can reach neither the action nor any href; no learner identity or raw percentage is sent. The dashboard card is a real caller posting a literal empty object. The readiness route, evaluateReadiness, the schema and the concept lesson practice component are byte-identical to the immutable pre-Slice-3 baseline ${PRE_SLICE3.slice(0, 8)}. spaced-review is NOT: it was re-accepted at the mastery-hold commits 3065b9e + c9bdb1d against a recorded digest, anchored to the hold gates themselves so the digest cannot be bumped to bless a removed containment. The review page is no longer executable-identical either — P1-C made it track-aware, and its empty-state copy had already drifted from the baseline before that; the delta is pinned to the remediation card plus that one recorded copy change. The education-registry, skills-compat and concept-lesson-view byte pins were deliberately retired because approved curriculum and measurement work legitimately extends their catalogs; the trust boundaries they protected are asserted semantically instead — resolver precedence and canonical-id shadowing, the concept-entry discriminant that keeps CWI's authored association from minting remediation, the formative records-nothing framing, and the metadata-derived CTA.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
