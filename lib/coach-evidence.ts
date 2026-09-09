import { practiceDrillAreaLabel, practiceDrillHref } from "@/lib/education/practice-drill";
import type { EducationPracticeDrill } from "@/lib/education/types";
import {
  COMPAT_TRACK_DESTINATION,
  compatTrackForSlug,
  debateWritingPracticeSupported,
  practiceRemediationForSkill
} from "@/lib/education/skills-compat";
import { getDueReviews, PRACTICING_MASTERY_MIN } from "@/lib/spaced-review";

// M15 Learning Architecture Slice 3 — the DETERMINISTIC half of the AI Coach.
//
// SERVER CHOOSES, AI EXPLAINS. This module is the "server chooses" half: it derives the one next
// action a learner's durable record supports, from authoritative evidence only. It contains no AI,
// no prompt, no provider call and reads no client input — the model that later words the action can
// never choose it. coach-evidence:smoke holds every rule below.
//
// The decision preserves Slice 2's semantics exactly:
// - DUE is not WEAK. Every action here starts from a due review row; only a record below the
//   PRACTICING floor adds the lesson and the low-performance framing.
// - The remediation mapping is practiceRemediationForSkill — the same fail-closed lookup the review
//   card uses. Nothing here invents a lesson, a drill, or a destination.
// - An unmapped due skill goes exactly where the review card would send it, decided by the same
//   compatibility exports, so the Coach and /study-arcade/review can never disagree.

export type CoachSkill = {
  slug: string;
  name: string;
  organization: string;
};

/**
 * P1-C widened `track` from the literal "debate" to the canonical per-track union. The Coach never
 * chose a track; it simply could not describe a non-Debate one, so a DECA learner with a real due
 * review and a real destination was handed the generic fallback instead.
 */
export type CoachDrill = {
  track: EducationPracticeDrill["track"];
  area: EducationPracticeDrill["area"];
  label: string;
  href: string;
};

export type CoachNextAction =
  | { type: "NO_DUE_ACTION" }
  | {
      type: "REVIEW_LESSON_THEN_DRILL";
      skill: CoachSkill;
      dueSinceDate: string;
      belowPracticing: true;
      lesson: { id: string; title: string; href: string };
      drill: CoachDrill;
    }
  | {
      type: "REDO_EXACT_DRILL";
      skill: CoachSkill;
      dueSinceDate: string;
      belowPracticing: false;
      drill: CoachDrill;
    }
  | {
      type: "EXISTING_REVIEW_DESTINATION";
      skill: CoachSkill;
      dueSinceDate: string;
      belowPracticing: boolean;
      destination: { href: string; label: string };
    };

/**
 * The one evidence-backed next action for this learner, or NO_DUE_ACTION when the record supports
 * none. Selection rule: the FIRST row of getDueReviews' existing `nextReviewAt asc` ordering — the
 * most overdue skill. Deliberately NOT weakest-first or remediation-first: the repository already
 * defines due ordering, and this module must not quietly invent a competing priority.
 */
export async function getEvidenceBackedNextAction(userId: string): Promise<CoachNextAction> {
  const due = await getDueReviews(userId);
  const first = due[0];
  if (!first) return { type: "NO_DUE_ACTION" };

  const skill: CoachSkill = { slug: first.skillSlug, name: first.skillName, organization: first.organization };
  const dueSinceDate = first.nextReviewAt.toISOString().slice(0, 10);
  const belowPracticing = first.masteryPercent < PRACTICING_MASTERY_MIN;

  const remediation = practiceRemediationForSkill(first.skillSlug);
  // P1-C (2026-09-09): the Debate-only gate is gone. Nothing here coerces a track — the drill is
  // copied through from the remediation exactly as the helper resolved it, and the helper is what
  // refuses a cross-track, unpublished or non-concept target. The Coach and /study-arcade/review now
  // reach the same destination for the same skill on the same data, which is the property that kept
  // them from disagreeing when only Debate resolved.
  if (remediation) {
    const drill: CoachDrill = {
      track: remediation.drill.track,
      area: remediation.drill.area,
      label: practiceDrillAreaLabel(remediation.drill),
      href: practiceDrillHref(remediation.drill)
    };
    if (belowPracticing) {
      return {
        type: "REVIEW_LESSON_THEN_DRILL",
        skill,
        dueSinceDate,
        belowPracticing: true,
        lesson: {
          id: remediation.lessonId,
          title: remediation.lessonTitle,
          href: `/lessons/${remediation.lessonId}`
        },
        drill
      };
    }
    return { type: "REDO_EXACT_DRILL", skill, dueSinceDate, belowPracticing: false, drill };
  }

  const reassessable = debateWritingPracticeSupported(first.skillSlug);
  const track = compatTrackForSlug(first.skillSlug);
  const fallback = track ? COMPAT_TRACK_DESTINATION[track] : { href: "/training", label: "Choose a training track" };
  return {
    type: "EXISTING_REVIEW_DESTINATION",
    skill,
    dueSinceDate,
    belowPracticing,
    destination: reassessable
      ? { href: `/skills/${first.skillSlug}/practice`, label: "Reassess now" }
      : { href: fallback.href, label: fallback.label }
  };
}

/**
 * Deterministic learner-facing wording for an action — the copy shown when no model is called
 * (NO_DUE_ACTION) or when every provider fails. Built from the action's own metadata, so it states
 * only what the record shows: due-ness always, low demonstrated performance only below the floor.
 */
export function coachActionExplanationTemplate(action: CoachNextAction): string {
  switch (action.type) {
    case "NO_DUE_ACTION":
      return "No evidence-backed review is due right now.";
    case "REVIEW_LESSON_THEN_DRILL":
      return `Your ${action.skill.name} review is due. Your recorded mastery is below the practicing level, so review ${action.lesson.title} first, then retry the ${action.drill.label} drill.`;
    case "REDO_EXACT_DRILL":
      return `Your ${action.skill.name} review is due. Retry the ${action.drill.label} drill to re-demonstrate it.`;
    case "EXISTING_REVIEW_DESTINATION":
      return `Your ${action.skill.name} review is due. ${action.destination.label}.`;
  }
}
