// The learner-facing name of a practice drill, resolved from whichever track owns it (P1-C).
//
// WHY THIS EXISTS. `drillAreaLabel` in lib/debate-drills.ts reads the DEBATE bank and asserts
// non-null, so it THROWS on a DECA area. Both the review card and the Coach called it, which is one
// of the two reasons DECA remediation could not be shown to a learner: the destination resolved
// correctly and the surface could not name it. Rather than add a second per-track lookup beside the
// one the concept lesson view already had, all three surfaces now resolve through here.
//
// FAILS CLOSED, NEVER THROWS AND NEVER INVENTS. Each track is looked up in its OWN bank. The area
// union already makes an unknown area a compile error, so the fallback is unreachable in practice —
// but it returns the area's own id rather than asserting non-null, because a label surface should
// degrade to something literal instead of crashing a learner's review page.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { DRILL_AREAS } from "@/lib/debate-drills";
import { DECA_DRILL_AREAS } from "@/lib/deca-drills";
import type { DebatePracticeDrill, DecaPracticeDrill, EducationPracticeDrill } from "@/lib/education/types";

/**
 * COMPILE-TIME EXHAUSTIVENESS, kept from the maps this file replaced.
 *
 * The old per-surface maps were `Record<area, string>`, so tsc forced a line per new area — "a new
 * area cannot be forgotten". Looking the label up in the bank alone would have quietly traded that
 * for a fallback: an area added to the union but not to its bank would render as its raw id. These
 * hold no labels, so nothing is duplicated and nothing can drift; they exist purely so that adding
 * an area to either union is a compile error until it is acknowledged here. That its bank really
 * carries a label for each is asserted in deca-practice-map:smoke, which owns this boundary.
 */
const DEBATE_AREAS: Record<DebatePracticeDrill["area"], true> = {
  "claim-warrant-impact": true,
  rebuttal: true,
  "evidence-evaluation": true,
  weighing: true,
  clash: true,
  signposting: true,
  "constructive-speech": true
};

const DECA_AREAS: Record<DecaPracticeDrill["area"], true> = {
  "performance-indicators": true,
  "business-reasoning": true,
  "customer-relations": true,
  "marketing-fundamentals": true
};

export const PRACTICE_DRILL_AREAS_COVERED = { debate: DEBATE_AREAS, deca: DECA_AREAS } as const;

export function practiceDrillAreaLabel(drill: EducationPracticeDrill): string {
  if (drill.track === "deca") {
    return DECA_DRILL_AREAS.find((area) => area.id === drill.area)?.label ?? drill.area;
  }
  return DRILL_AREAS.find((area) => area.id === drill.area)?.label ?? drill.area;
}

/**
 * The study-arcade deep link for a drill, with its area preserved.
 *
 * Both learner surfaces built this string by hand and had to keep the two copies in step. The area
 * parameter is the load-bearing half: dropping it lands the learner on the mixed picker, which for
 * DECA spreads a session across all four areas and usually cannot reach the per-area unique-question
 * floor a mastery record depends on.
 */
export function practiceDrillHref(drill: EducationPracticeDrill): string {
  return `/study-arcade?track=${drill.track}&area=${drill.area}`;
}
