import type { Organization } from "@prisma/client";

/**
 * COACH TRUTH (HOSA phase H1).
 *
 * The coach's student page showed a figure labelled "Mastery" that, for any student with no
 * MasteryProgress rows, was actually the mean of their practice-test scores. That is always the case
 * for a HOSA student: HOSA's only drill (Medical Terminology) writes a review schedule and no mastery
 * row at all, by design. So a coach reading "Mastery 62%" was reading a test average under a word that
 * means something else — the same fake-progress pattern the learner-facing surfaces already refuse.
 *
 * The rules this module holds:
 *
 *   • MASTERY IS EVIDENCE, NOT AN ESTIMATE. It is derived from mastery rows or it does not exist.
 *     No test average, review schedule, completion count or activity signal may stand in for it.
 *   • ABSENCE IS NOT ZERO. No rows returns null, never 0 — the same distinction the spaced-review
 *     layer already draws (`masteryPercent: progress?.masteryPercent ?? null`), where a persisted 0 is
 *     a measured result and null is the absence of one.
 *   • A COACH VIEW BELONGS TO ONE TRACK. The organization comes from stored data — the team the coach
 *     is viewing the student through — and never from blending every track the student has touched.
 *   • A RECOMMENDATION NAMES A REAL CAPABILITY OF THAT TRACK. HOSA has no round, no ballot and no
 *     simulation, so no HOSA view may propose one. General Debate has no practice-test product
 *     (`trackHasPracticeTests`), so no Debate view may propose one either. When the track is unknown,
 *     the answer is no recommendation — not a default set built out of Debate's vocabulary.
 *
 * Pure: no React, no prisma, no fetch, no provider. Every rule above is decidable from its arguments,
 * so it can be proved without touching the shared database.
 */

// ---------------------------------------------------------------------------------------------
// 1. Mastery
// ---------------------------------------------------------------------------------------------

export type CoachMasterySkill = { masteryPercent: number };

/**
 * The coach-facing mastery figure: the mean of REAL recorded mastery, or null when nothing is
 * recorded. Null is the whole point — the caller must be unable to print a number here without rows
 * behind it, so there is no parameter that lets a test average, a score or a default reach this value.
 */
export function coachMasteryFigure(skills: readonly CoachMasterySkill[]): number | null {
  if (skills.length === 0) {
    return null;
  }
  const total = skills.reduce((sum, skill) => sum + skill.masteryPercent, 0);
  return Math.round(total / skills.length);
}

// ---------------------------------------------------------------------------------------------
// 2. Which track is this coach view about?
// ---------------------------------------------------------------------------------------------

export type CoachTrackContextInput = {
  /** The organization of the team the coach is viewing this student through. */
  teamOrganization?: Organization | null;
  /** The student's own signup organization, used only when no team context exists. */
  studentOrganization?: Organization | null;
};

/**
 * The organization a coach's student view is scoped to.
 *
 * Precedence mirrors the learner-side track contract (route context first, the account's own
 * organization second, fail closed last). Here the "route context" is the team: a coach reaches a
 * student THROUGH a team they own, and that team carries a stored organization, so the view belongs to
 * that track. An admin looking at a student who is in no team falls back to the student's own signup
 * organization. If neither exists the answer is null and the caller must show nothing track-specific —
 * blending every organization together is exactly the defect this replaces.
 *
 * Nothing here is inferred from a cookie, a URL, a question's category text or a track's content.
 */
export function resolveCoachOrganization(input: CoachTrackContextInput): Organization | null {
  return input.teamOrganization ?? input.studentOrganization ?? null;
}

// ---------------------------------------------------------------------------------------------
// 3. Recommendations
// ---------------------------------------------------------------------------------------------

export type CoachRecommendationInput = {
  /** The resolved track for this view. Null means unresolved — say nothing track-specific. */
  organization: Organization | null;
  hasAnyActivity: boolean;
  judgedRounds: number;
  completedTests: number;
  weakSignals: readonly string[];
  lowMasterySkills: readonly string[];
};

type TrackRecommendationRules = {
  /** Shown when the student has no recorded activity on this track yet. */
  firstStep: string;
  /** Weak-signal vocabulary for this track only — another track's words must not match here. */
  signals: ReadonlyArray<{ pattern: RegExp; step: string }>;
  /** A round/ballot step, for tracks that actually have one. HOSA deliberately has none. */
  roundStep?: string;
  /** A practice-test step, only for tracks with the exam product (`trackHasPracticeTests`). */
  testStep?: string;
  /** Used when nothing above matched. Names only capabilities this track really has. */
  momentum: string;
};

/**
 * What a coach may truthfully be told to assign, per track.
 *
 * Every entry names a capability that exists in the product today:
 *   • DEBATE — drills (app/api/debate/drills/*) and judged AI rounds. It has NO practice-test product
 *     (lib/training-tracks.ts `TRACKS_WITH_PRACTICE_TESTS` lists DECA and HOSA only), so no test step.
 *   • DECA — the four recorded drill areas (lib/deca-drills.ts) and the role-play round, plus the exam.
 *   • HOSA — Medical Terminology practice (app/api/hosa/medterm/*) and the exam. NO round step: HOSA
 *     has no simulation, and its scenario/judging routes are withdrawn, so proposing one would ask a
 *     coach to assign something that does not exist.
 *
 * Organizations with no training product (Model UN is soft-removed; Mock Trial and Public Speaking have
 * none) are deliberately absent, so they fall through to "no recommendation" rather than to Debate's.
 */
const TRACK_RULES: Partial<Record<Organization, TrackRecommendationRules>> = {
  DEBATE: {
    // Unchanged wording: this exact line is the recorded expectation for a new Debate student.
    firstStep: "Have the student complete one debate or practice drill first.",
    signals: [
      { pattern: /rebut|refut/, step: "Assign a rebuttal drill." },
      { pattern: /eviden|weigh|impact/, step: "Practice evidence weighing." },
      { pattern: /clar|deliver|communicat/, step: "Run a clarity-focused speaking rep." }
    ],
    roundStep: "Run one AI debate round to get a judge ballot.",
    momentum: "Keep the momentum: assign one more judged round this week."
  },
  DECA: {
    firstStep: "Have the student complete one DECA drill or role-play first.",
    signals: [
      { pattern: /indicator|performance/, step: "Assign the performance-indicators drill." },
      { pattern: /reason|justif|business|metric|measure/, step: "Assign the business-reasoning drill." },
      { pattern: /customer|service|guest/, step: "Assign the customer-relations drill." },
      { pattern: /market|promot|price|product|value|target/, step: "Assign the marketing-fundamentals drill." }
    ],
    // Deliberately does not promise a ballot: a DECA round ends whether or not an evaluation comes
    // back, and the room says so itself (lib/rooms/roleplay-round.ts).
    roundStep: "Run one DECA role-play round.",
    testStep: "Complete one DECA practice test.",
    momentum: "Keep the momentum: assign one role-play and one practice test this week."
  },
  HOSA: {
    firstStep: "Have the student complete one Medical Terminology practice session first.",
    // HOSA's weak signals come from its own vocabulary — Medical Terminology areas and the test
    // categories. They route to the one HOSA practice that exists, because there is nowhere else
    // truthful to send them: HOSA has no lesson for these constructs and no drill outside Medical
    // Terminology.
    signals: [
      {
        pattern: /terminolog|word root|prefix|suffix|abbreviat|anatom|physiolog|patholog|body system/,
        step: "Assign a Medical Terminology practice session."
      }
    ],
    testStep: "Complete one HOSA practice test.",
    momentum: "Keep the momentum: assign one Medical Terminology session this week."
  }
};

function uniqueSteps(steps: readonly string[], limit: number): string[] {
  return Array.from(new Set(steps.map((step) => step.trim()).filter(Boolean))).slice(0, limit);
}

/**
 * The coach's next steps for ONE track.
 *
 * Returns an empty list — not a filler suggestion — when the track is unresolved or has no training
 * product. A coach reading nothing is being told nothing false; a coach reading Debate's steps under a
 * HOSA student is being told to assign a round that cannot be run.
 */
export function coachRecommendations(input: CoachRecommendationInput): string[] {
  const rules = input.organization ? TRACK_RULES[input.organization] : undefined;
  if (!rules) {
    return [];
  }

  if (!input.hasAnyActivity) {
    return [rules.firstStep];
  }

  const haystack = [...input.weakSignals, ...input.lowMasterySkills].join(" ").toLowerCase();
  const steps: string[] = [];

  for (const { pattern, step } of rules.signals) {
    if (pattern.test(haystack)) {
      steps.push(step);
    }
  }
  if (rules.testStep && input.completedTests === 0) {
    steps.push(rules.testStep);
  }
  if (rules.roundStep && input.judgedRounds === 0) {
    steps.push(rules.roundStep);
  }

  if (steps.length === 0) {
    steps.push(rules.momentum);
  }

  return uniqueSteps(steps, 5);
}

/** Control helper: the organizations this module will speak for at all. */
export function coachTrackedOrganizations(): Organization[] {
  return Object.keys(TRACK_RULES) as Organization[];
}

// ---------------------------------------------------------------------------------------------
// 4. Why a track's record is empty
// ---------------------------------------------------------------------------------------------
//
// Scoping a coach's view to one organization makes "nothing here" a common and correct answer, and an
// empty record has three different meanings that must not be reported with the same words:
//
//   • The student has not practised this track yet.
//   • The track is trained, but it does not record this KIND of evidence — HOSA's Medical Terminology
//     practice writes a spaced-review schedule and no mastery row, deliberately, forever.
//   • CompeteReady does not train this organization at all. A coach can create a Mock Trial or Public
//     Speaking team today (components/coach/create-team-form.tsx), and Model UN teams still exist from
//     before that track was soft-removed. None of those has a lesson, drill, skill or test.
//
// Saying "Not started yet" for the second and third cases blames the student for the product's shape.

/** Does CompeteReady train this organization at all? */
export function coachTrackIsTrained(organization: Organization | null | undefined): boolean {
  return Boolean(organization && TRACK_RULES[organization]);
}

/**
 * Does practice on this track write a durable mastery record?
 *
 * Only two routes in the product write MasteryProgress — app/api/debate/drills/submit and
 * app/api/deca/drills/submit — so only those two organizations can ever produce a mastery figure.
 * HOSA is trained but records review schedules instead (lib/hosa-medterm.ts states this is deliberate),
 * so an empty HOSA mastery record is a fact about the product, not about the student, and it will not
 * change by practising more.
 */
export function coachTrackRecordsMastery(organization: Organization | null | undefined): boolean {
  return organization === "DEBATE" || organization === "DECA";
}
