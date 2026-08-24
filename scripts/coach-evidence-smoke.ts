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
const stub = {
  rows: [] as StubRow[],
  skills: [] as StubSkill[],
  mastery: [] as StubMastery[],
  skillReviewSchedule: {
    findMany: async () => stub.rows,
    count: async () => stub.rows.length
  },
  skill: { findMany: async () => stub.skills },
  masteryProgress: { findMany: async () => stub.mastery }
};
(globalThis as unknown as { prisma: unknown }).prisma = stub;

const DUE = new Date("2026-08-20T00:00:00.000Z");
function seed(slug: string, masteryPercent: number, extra?: { slug: string; masteryPercent: number }) {
  stub.rows = [{ skillId: "s1", nextReviewAt: DUE, reviewCount: 2 }];
  stub.skills = [{ id: "s1", name: nameFor(slug), slug, organization: orgFor(slug) }];
  stub.mastery = [{ skillId: "s1", masteryPercent, masteryLevel: "LEARNING" }];
  if (extra) {
    stub.rows.push({ skillId: "s2", nextReviewAt: new Date("2026-08-22T00:00:00.000Z"), reviewCount: 0 });
    stub.skills.push({ id: "s2", name: nameFor(extra.slug), slug: extra.slug, organization: orgFor(extra.slug) });
    stub.mastery.push({ skillId: "s2", masteryPercent: extra.masteryPercent, masteryLevel: "LEARNING" });
  }
}
const nameFor = (slug: string) => slug.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
const orgFor = (slug: string) =>
  slug.startsWith("deca-") ? "DECA" : slug.startsWith("hosa-") ? "HOSA" : slug.startsWith("debate-") ? "GENERAL_DEBATE" : "MODEL_UN";

async function main() {
  const { getEvidenceBackedNextAction, coachActionExplanationTemplate } = await import("../lib/coach-evidence");
  const { PRACTICING_MASTERY_MIN } = await import("../lib/spaced-review");
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
  seed("debate-rebuttal", 69);
  assert.deepEqual(await getEvidenceBackedNextAction("u1"), {
    type: "REVIEW_LESSON_THEN_DRILL",
    skill: { slug: "debate-rebuttal", name: "Debate Rebuttal", organization: "GENERAL_DEBATE" },
    dueSinceDate: "2026-08-20",
    belowPracticing: true,
    lesson: { id: "debate-refutation", title: "Answer with refutation", href: "/lessons/debate-refutation" },
    drill: { track: "debate", area: "rebuttal", label: "Rebuttal", href: "/study-arcade?track=debate&area=rebuttal" }
  }, "S3-1. mastery 69 on debate-rebuttal yields the refutation lesson and the rebuttal drill, exact hrefs included");

  // ---- S3-2. healthy due mapped -> exact drill only, and DUE stays distinct from WEAK ----------
  for (const m of [70, 71]) {
    seed("debate-rebuttal", m);
    const a = await getEvidenceBackedNextAction("u1");
    assert.equal(a.type, "REDO_EXACT_DRILL", `S3-2. mastery ${m} is re-demonstration, not remediation`);
    assert.ok(!("lesson" in a), `S3-2b. and carries NO lesson at mastery ${m}`);
    assert.equal((a as { belowPracticing?: boolean }).belowPracticing, false,
      `S3-2c. and does not classify mastery ${m} as below practicing`);
  }
  seed("debate-rebuttal", 69);
  assert.equal((await getEvidenceBackedNextAction("u1")).type, "REVIEW_LESSON_THEN_DRILL",
    "S3-2d. 69 flips the branch — the boundary sits exactly at the canonical floor");
  assert.equal(PRACTICING_MASTERY_MIN, 70, "S3-2e. and that floor is the canonical 70, imported, not restated");

  // ---- S3-3. most-overdue-first: the FIRST row of the existing ordering wins -------------------
  seed("debate-evidence", 95, { slug: "debate-rebuttal", masteryPercent: 5 });
  const first = await getEvidenceBackedNextAction("u1");
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
    const a = await getEvidenceBackedNextAction("u1");
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
  assert.ok(paritySlugs >= 9, "S3-4d. control: the parity sweep really covered the seeded inventory");
  assert.ok([...INTENDED_SKILL_SLUGS].some((s) => s.startsWith("deca-")) && [...INTENDED_SKILL_SLUGS].some((s) => s.startsWith("hosa-")),
    "S3-4e. control: DECA and HOSA slugs were among them — cross-track safety was actually exercised");

  // ---- S3-W. Wave 1B: the weighing mapping flows through the SAME architecture, unchanged ------
  // These cases exist because Wave 1B published the corrected weighing lesson with its exact drill
  // mapping. No Coach logic changed — the assertions below pass only because the helper derives
  // everything from registry metadata, which is the entire point of the Slice 3 design.
  seed("debate-weighing", 69);
  assert.deepEqual(await getEvidenceBackedNextAction("u1"), {
    type: "REVIEW_LESSON_THEN_DRILL",
    skill: { slug: "debate-weighing", name: "Debate Weighing", organization: "GENERAL_DEBATE" },
    dueSinceDate: "2026-08-20",
    belowPracticing: true,
    lesson: { id: "debate-weighing", title: "Explain why your impact wins", href: "/lessons/debate-weighing" },
    drill: { track: "debate", area: "weighing", label: "Weighing", href: "/study-arcade?track=debate&area=weighing" }
  }, "S3-W1. mastery 69 on debate-weighing yields the weighing lesson and the weighing drill, exact hrefs included");
  for (const m of [70, 71]) {
    seed("debate-weighing", m);
    const a = await getEvidenceBackedNextAction("u1");
    assert.equal(a.type, "REDO_EXACT_DRILL", `S3-W2. weighing mastery ${m} is re-demonstration, not remediation`);
    assert.ok(!("lesson" in a), `S3-W2b. and carries NO lesson at mastery ${m}`);
  }
  seed("debate-evidence", 95, { slug: "debate-weighing", masteryPercent: 5 });
  const w3 = await getEvidenceBackedNextAction("u1");
  assert.equal(w3.type === "NO_DUE_ACTION" ? "" : w3.skill.slug, "debate-evidence",
    "S3-W3. most-overdue-first still wins — a weaker weighing row later in the order is not preferred");

  // ---- S3-5. unknown skill fails safe ----------------------------------------------------------
  seed("totally-unknown-skill", 10);
  const unknown = await getEvidenceBackedNextAction("u1");
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
  assert.ok(route.includes("getEvidenceBackedNextAction(user.id)"),
    "S3-7. the action comes from the server-side helper keyed by the authenticated userId");
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
  const none = await getEvidenceBackedNextAction("u1");
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
  seed("debate-rebuttal", 69);
  const low = await getEvidenceBackedNextAction("u1");
  assert.equal(coachActionExplanationTemplate(low),
    "Your Debate Rebuttal review is due. Your recorded mastery is below the practicing level, so review Answer with refutation first, then retry the Rebuttal drill.",
    "S3-11. the low-mastery template states the record, the lesson, then the drill");
  seed("debate-rebuttal", 71);
  assert.equal(coachActionExplanationTemplate(await getEvidenceBackedNextAction("u1")),
    "Your Debate Rebuttal review is due. Retry the Rebuttal drill to re-demonstrate it.",
    "S3-11b. the healthy template is pure re-demonstration — no weakness language");
  seed("hosa-medical-terminology", 40);
  const unmappedTemplate = coachActionExplanationTemplate(await getEvidenceBackedNextAction("u1"));
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
  for (const p of ["prisma/schema.prisma",
                   "app/(app)/study-arcade/review/page.tsx",
                   "components/lessons/concept-education-lesson-view.tsx",
                   "components/lessons/concept-education-lesson-practice.tsx",
                   "lib/spaced-review.ts",
                   "lib/education/skills-compat.ts"]) {
    assert.equal(now(p), sha(p), `S3-15. ${p} is byte-identical to the immutable pre-Slice-3 baseline`);
  }
  // The Taught-only orientation must be invisible to the evidence path: no skillSlug, no drill, so
  // no due row can reference it and no remediation can derive it. Asserted executably:
  const { practiceRemediationForSkill: s315Lookup } = await import("../lib/education/skills-compat");
  assert.equal(s315Lookup("debate-round-orientation"), null,
    "S3-15b. the Taught-only orientation is invisible to the remediation/Coach evidence path");

  console.log(
    `Coach-evidence smoke passed: the AI Coach's next action is chosen by the server from durable evidence and the model can change nothing but the prose. Mastery 69 on the mapped pilot yields the exact refutation lesson and the exact rebuttal drill; 70 and 71 yield the drill alone with no weakness framing, so DUE stays distinct from WEAK at exactly the canonical PRACTICING floor. The most-overdue due row is selected from getDueReviews' existing nextReviewAt-asc order with no re-sorting; every unmapped seeded skill lands on the same destination the review card's rule produces (${paritySlugs} slugs swept, DECA and HOSA included); unknown slugs fall back to the track chooser with no fabricated lesson or drill. The request schema is a strict empty object that rejects eleven smuggled learning claims; the route reads only the authenticated userId in auth -> rate-limit -> parse order; the helper contains no AI, XP, attempt-table or reviewCount logic. NO_DUE_ACTION returns the deterministic template before the single provider call site; provider output is validated to one bounded string, falls back to the same template, and can reach neither the action nor any href; no learner identity or raw percentage is sent. The dashboard card is a real caller posting a literal empty object. The readiness route, evaluateReadiness, the schema, both Slice 1 lesson components, the review page, spaced-review and the skills-compat routing layer are byte-identical to the immutable pre-Slice-3 baseline ${PRE_SLICE3.slice(0, 8)}; the education-registry byte pin was deliberately retired because curriculum publication legitimately extends the registry, whose Coach-facing behavior is guarded semantically by the mapped-case, parity, agreement and cardinality controls instead.`
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
