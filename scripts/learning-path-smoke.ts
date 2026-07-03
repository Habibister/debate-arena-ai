/**
 * Personalized diagnostic + learning path smoke test (pure logic + wiring — no DB, no browser).
 * Run with: npm run learning-path:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  buildLearningPath,
  currentPathWeek,
  DEFAULT_PROFILE,
  nextRecommendation,
  normalizeLearningProfile,
  scoreDiagnostic,
  type LearningProfile
} from "../lib/learning-path";

function main() {
  // Normalize bad/malformed input -> safe defaults.
  const bad = normalizeLearningProfile({ track: "NOPE", experience: "wizard", confidence: { speaking: 99 }, methods: ["telepathy"] });
  assert.equal(bad.track, DEFAULT_PROFILE.track, "invalid track falls back");
  assert.equal(bad.experience, "NEW", "invalid experience falls back");
  assert.equal(bad.confidence.speaking, 3, "out-of-range confidence clamps to default");
  assert.deepEqual(bad.methods, [], "invalid methods dropped");

  // Diagnostic scoring: the lowest-confidence area is the recommended starting skill.
  const p: LearningProfile = { ...DEFAULT_PROFILE, confidence: { speaking: 4, organizing: 1, evidence: 3, responding: 5 } };
  assert.equal(scoreDiagnostic(p).startingSkill, "Argument structure", "lowest = organizing -> Argument structure");
  assert.deepEqual(scoreDiagnostic(p).weakConfidence, ["organizing"]);
  assert.equal(scoreDiagnostic({ ...DEFAULT_PROFILE, confidence: { speaking: 5, organizing: 5, evidence: 1, responding: 5 } }).startingSkill, "Evidence & impact");

  // Track-specific paths (no cross-track content).
  assert.equal(buildLearningPath("GENERAL_DEBATE").length, 5);
  assert.ok(buildLearningPath("HOSA")[0].focus.includes("Terminology"), "HOSA starts with terminology");
  assert.ok(buildLearningPath("DECA")[0].focus.includes("Performance indicators"), "DECA starts with performance indicators");
  assert.ok(buildLearningPath("MODEL_UN")[0].focus.includes("Country research"), "Model UN starts with country research");
  assert.ok(!buildLearningPath("HOSA").some((s) => /performance indicators/i.test(s.focus)), "HOSA path excludes DECA focus");

  // Experience decides the current-week pointer (clamped to path length).
  assert.equal(currentPathWeek({ ...DEFAULT_PROFILE, experience: "NEW" }), 1);
  assert.equal(currentPathWeek({ ...DEFAULT_PROFILE, experience: "INTERMEDIATE" }), 2);
  assert.equal(currentPathWeek({ ...DEFAULT_PROFILE, experience: "ADVANCED" }), 3);

  // Recommendation priority uses only real signals — no fabricated progress.
  assert.match(
    nextRecommendation({ hasActivity: false, weakAreas: [], startingSkill: "Argument structure", currentFocus: "Argument structure" }),
    /Complete your first activity/,
    "no activity -> complete-first message (no percentages)"
  );
  assert.match(
    nextRecommendation({ hasActivity: true, weakAreas: ["Rebuttal"], startingSkill: "x", currentFocus: "y" }),
    /Practice your weak area: Rebuttal/,
    "real weak area drives the recommendation"
  );
  assert.match(
    nextRecommendation({ hasActivity: true, weakAreas: [], pendingAssignment: true, startingSkill: "x", currentFocus: "y" }),
    /assigned coach work/,
    "pending assignment takes priority"
  );
  assert.match(
    nextRecommendation({ hasActivity: true, weakAreas: [], startingSkill: "x", currentFocus: "Weighing" }),
    /Continue your path: Weighing/,
    "otherwise continue the path"
  );

  // No fake progress: path focuses carry no percentages.
  for (const track of ["GENERAL_DEBATE", "HOSA", "DECA", "MODEL_UN"] as const) {
    assert.ok(!buildLearningPath(track).some((s) => /%/.test(s.focus)), "no percentages in path");
  }

  // Reuses the real TrainingTrack source of truth (no duplicate track definitions).
  const libSrc = readFileSync("lib/learning-path.ts", "utf8");
  assert.ok(/from "@\/lib\/training-tracks"/.test(libSrc), "learning-path reuses lib/training-tracks");
  assert.ok(!/type TrainingTrack =/.test(libSrc), "no duplicate TrainingTrack definition");

  // Routes/components + dashboard wiring.
  assert.ok(existsSync("app/(app)/onboarding/diagnostic/page.tsx"), "diagnostic route exists");
  assert.ok(existsSync("components/onboarding/diagnostic-form.tsx"), "diagnostic form exists");
  assert.ok(existsSync("components/onboarding/learning-path.tsx"), "learning path component exists");
  const dash = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
  assert.ok(dash.includes("<LearningPath"), "dashboard renders the learning path");
  assert.ok(dash.includes("hasActivity") && dash.includes("pendingAssignment"), "dashboard passes real signals");

  console.log("Learning-path smoke tests passed: normalize, diagnostic scoring, track-specific paths, experience pointer, real-signal recommendations (no fake progress), track reuse, routes + dashboard wiring.");
}

main();
