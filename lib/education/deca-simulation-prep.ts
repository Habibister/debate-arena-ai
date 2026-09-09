/**
 * What to read before a DECA role-play — the Learn -> Simulate connection (P1-D).
 *
 * WHAT THIS IS. The DECA role-play curriculum finished with P1-B6: orientation teaches the event,
 * `deca-reading-scenarios` teaches decoding the card, and `deca-identifying-problem` teaches saying
 * what needs to change. Two further lessons teach the skills a round leans on. Until now none of
 * that was reachable from the place a learner actually starts a simulation, and the ballot offered
 * no way back to any of it. This module is the one list both surfaces read.
 *
 * RECOMMENDED, NOT REQUIRED. These are curriculum prerequisites, not a product lock. Nothing here
 * gates the simulator, and the copy that renders it says "recommended", never "you are not ready" —
 * readiness is a measurement this product does not make, so it is not a word this path may use. A
 * learner who wants to practise first can, which is often the right way to find out what to read.
 *
 * FAIL CLOSED, through the resolver the post-round diagnosis already uses. An id that is not
 * registered, not learner-visible, or has no title resolves to NOTHING and is silently dropped
 * rather than rendered as a broken link. `deca-professional-communication` is held, so if it were
 * ever listed here it would simply not appear — but it is not listed, because the owner's ruling is
 * that it is optional support and does not gate simulation.
 *
 * CLUSTER KNOWLEDGE IS DELIBERATELY ABSENT. Customer Relations and the six Marketing lessons are
 * exam-side content in `deca-business-content`. They transfer to some scenarios, but they are not
 * universal role-play preparation, and listing them here would make the exam course look like a
 * prerequisite for the role-play. Every id below belongs to `deca-roleplay-core`, and a control
 * proves it rather than trusting this comment.
 *
 * Pure: registry data only — no React, no Prisma, no network, no environment.
 */
import { learnerVisibleLesson, type DiagnosisDestination } from "@/lib/education/diagnosis";
import { getEducationLesson } from "@/lib/education/registry";

export type SimulationPrepStep = DiagnosisDestination & {
  /** One line on what this lesson gives you for a round. Never a claim about readiness. */
  why: string;
};

/** The three core preparation lessons, in the order the approved curriculum teaches them. */
export const DECA_SIMULATION_CORE_PREP: ReadonlyArray<{ lessonId: string; why: string }> = [
  { lessonId: "how-deca-roleplay-works", why: "What happens in a round, from receiving the scenario to the score sheet." },
  { lessonId: "deca-reading-scenarios", why: "Pull your role, your audience, the situation and the task out of the scenario." },
  { lessonId: "deca-identifying-problem", why: "Say what needs to change, without inventing a reason the scenario never gave." }
];

/** The two role-play skills with their own published teaching owners and their own drills. */
export const DECA_SIMULATION_SKILL_PREP: ReadonlyArray<{ lessonId: string; why: string }> = [
  { lessonId: "deca-understanding-performance-indicators", why: "What an indicator asks you to demonstrate, rather than recite." },
  { lessonId: "deca-justifying-your-recommendation", why: "Attach a business reason to whatever you recommend." }
];

/** The course every simulation-prep lesson must belong to. Cluster/exam content is not prep. */
export const DECA_SIMULATION_PREP_COURSE = "deca-roleplay-core";

function resolve(list: ReadonlyArray<{ lessonId: string; why: string }>): SimulationPrepStep[] {
  const out: SimulationPrepStep[] = [];
  for (const item of list) {
    const destination = learnerVisibleLesson(item.lessonId);
    if (!destination) continue; // held, unregistered or untitled — never rendered as a dead link
    const entry = getEducationLesson(item.lessonId);
    // A prep step must be DECA role-play course content. This is the guard that keeps exam-side
    // cluster knowledge, and any other track's lesson, out of the role-play preparation path.
    if (!entry || entry.track !== "DECA" || entry.courseId !== DECA_SIMULATION_PREP_COURSE) continue;
    out.push({ ...destination, why: item.why });
  }
  return out;
}

/** The preparation path, resolved. Core first, then the two skills. */
export function decaSimulationPrep(): { core: SimulationPrepStep[]; skills: SimulationPrepStep[] } {
  return { core: resolve(DECA_SIMULATION_CORE_PREP), skills: resolve(DECA_SIMULATION_SKILL_PREP) };
}

/** Everything, flattened — what the post-round "review your preparation" list offers. */
export function decaSimulationPrepAll(): SimulationPrepStep[] {
  const { core, skills } = decaSimulationPrep();
  return [...core, ...skills];
}

/**
 * Where the DECA role-play course sends a learner when its chain ends.
 *
 * THE DEAD END THIS CLOSES. A concept lesson with no `nextLessonId` renders "You've reached the end
 * of this course so far" and nothing else — true, and a full stop. The DECA role-play course exists
 * to prepare for a role-play, so the honest onward action is the role-play itself.
 *
 * DERIVED FROM THE CHAIN, not hardcoded to one lesson id. It answers only for a learner-visible DECA
 * role-play-course lesson whose chain actually terminates, so when the course grows the action moves
 * to the new terminus on its own instead of stranding itself on a lesson that is no longer last.
 *
 * The copy states what the simulator does and does not do. It is not a test, not an assessment, and
 * nothing it produces is recorded — which is the current truth and must stay stated while it is.
 */
export const DECA_SIMULATION_ENTRY = Object.freeze({
  href: "/training/deca/practice",
  label: "Practice a role-play",
  detail: "This course prepares you for a DECA role-play. It is practice — nothing you do there is recorded."
});

export function decaCourseEndAction(lessonId: string): typeof DECA_SIMULATION_ENTRY | null {
  const entry = getEducationLesson(lessonId);
  if (!entry || entry.visibility !== "learner") return null;
  if (entry.track !== "DECA" || entry.courseId !== DECA_SIMULATION_PREP_COURSE) return null;
  if (entry.nextLessonId !== null) return null; // not the end of the chain
  return DECA_SIMULATION_ENTRY;
}
