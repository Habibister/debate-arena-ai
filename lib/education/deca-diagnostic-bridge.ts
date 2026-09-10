import type { DecaDrillArea } from "@/lib/deca-drills";
import { DECA_DRILL_AREAS } from "@/lib/deca-drills";
import { decaPracticeMappingForArea } from "@/lib/education/deca-practice-map";
import { getEducationLesson } from "@/lib/education/registry";

/**
 * THE DECA DIAGNOSTIC BRIDGE (beginner QA R2, findings #5 and #6).
 *
 * A graded DECA practice test reports weak areas in the question bank's own vocabulary — "Target market
 * analysis", "Promotion strategy", "Service recovery". The product's persistent skills are the four
 * drill areas — performance indicators, business reasoning, customer relations, marketing fundamentals.
 * Nothing connected the two, so a beginner was told what they were weak at in words that appear nowhere
 * else in the app, and the lesson links beside those words pointed at legacy rows with no lesson behind
 * them.
 *
 * This module is the ONE place that says which persistent skill a diagnostic belongs to, and which
 * published lesson actually teaches it. Two rules govern every row:
 *
 *   1. A row exists ONLY where published teaching really covers the diagnostic. Finance, operations,
 *      entrepreneurship and personal-finance tags have no row, because no DECA lesson teaches them yet.
 *      An unmapped diagnostic returns null and the caller says so plainly — it never guesses a lesson.
 *
 *   2. `lessonId` is the lesson that teaches THAT diagnostic, which is not always the area's remediation
 *      gateway. Marketing is taught across MK1-MK6; `deca-practice-map` names MK1 because a drill needs
 *      one destination, while a learner who missed promotion questions should be sent to the promotion
 *      lesson. The gateway is still available through `decaPracticeMappingForArea`.
 *
 * Pure: no React, no database, no network, no provider. Static data plus lookups.
 */

export type DecaDiagnosticBridgeEntry = {
  /** The diagnostic exactly as the question bank tags it. */
  diagnostic: string;
  /** The persistent skill it belongs to — one of the four the product records. */
  area: DecaDrillArea;
  /** The published lesson that teaches this diagnostic. */
  lessonId: string;
  /** One learner-facing line explaining the connection. */
  why: string;
};

/**
 * Every mapped diagnostic. Keys are matched case-insensitively on the stored tag.
 *
 * Coverage notes, so a later reader does not have to re-derive the judgement:
 *   • Marketing cluster tags map to the specific MK lesson that owns them (MK1 customers, MK2 why they
 *     choose you, MK6 promotion). "Marketing metrics" maps to BUSINESS REASONING, not marketing: the
 *     approved curriculum assigns campaign measurement — cost per acquisition and the like — to the
 *     reasoning side, and `deca-practice-map` records that same call for the mk-08 bank item.
 *   • Hospitality service tags map to customer relations, which is what "Handling Customer Situations"
 *     teaches: facts, policy, options and authority in a service situation.
 *   • The generic tags the bank falls back to for an unlisted cluster ("Business reasoning",
 *     "Performance indicators") map to their own areas.
 *   • Professional communication is DELIBERATELY absent: its lesson is held, so there is nothing to send
 *     a learner to.
 */
export const DECA_DIAGNOSTIC_BRIDGE: readonly DecaDiagnosticBridgeEntry[] = [
  {
    diagnostic: "Performance indicators",
    area: "performance-indicators",
    lessonId: "deca-understanding-performance-indicators",
    why: "Reading what an indicator asks you to demonstrate is the performance-indicator skill itself."
  },
  {
    diagnostic: "Business reasoning",
    area: "business-reasoning",
    lessonId: "deca-justifying-your-recommendation",
    why: "Attaching a business reason to a recommendation is what business reasoning trains."
  },
  {
    diagnostic: "Marketing metrics",
    area: "business-reasoning",
    lessonId: "deca-justifying-your-recommendation",
    why: "Measuring a campaign is a measurement question — metric, comparison and target — which the reasoning lesson teaches."
  },
  {
    diagnostic: "Performance measurement",
    area: "business-reasoning",
    lessonId: "deca-justifying-your-recommendation",
    why: "Naming how you would measure a result is part of justifying a recommendation."
  },
  {
    diagnostic: "Service recovery",
    area: "customer-relations",
    lessonId: "deca-handling-customer-situations",
    why: "Putting a service failure right is the customer-relations spine: facts, policy, options, authority."
  },
  {
    diagnostic: "Guest experience",
    area: "customer-relations",
    lessonId: "deca-handling-customer-situations",
    why: "Handling what a guest actually asks for is the same customer-relations skill."
  },
  {
    diagnostic: "Target market analysis",
    area: "marketing-fundamentals",
    lessonId: "deca-who-the-customer-is",
    why: "Deciding who the customer is comes first in the marketing course."
  },
  {
    diagnostic: "Customer behavior",
    area: "marketing-fundamentals",
    lessonId: "deca-who-the-customer-is",
    why: "Why a customer buys is taught alongside who they are."
  },
  {
    diagnostic: "Value proposition",
    area: "marketing-fundamentals",
    lessonId: "deca-why-they-choose-you",
    why: "A value proposition is the reason someone chooses you over the alternative."
  },
  {
    diagnostic: "Promotion strategy",
    area: "marketing-fundamentals",
    lessonId: "deca-telling-them-about-it",
    why: "Choosing how to tell customers about the offer is the promotion lesson."
  }
];

const BY_DIAGNOSTIC = new Map(DECA_DIAGNOSTIC_BRIDGE.map((entry) => [entry.diagnostic.toLowerCase(), entry]));

/** The bridge row for a stored weak-area tag, or null when no published lesson covers it. */
export function decaBridgeForDiagnostic(diagnostic: string | null | undefined): DecaDiagnosticBridgeEntry | null {
  if (typeof diagnostic !== "string") return null;
  return BY_DIAGNOSTIC.get(diagnostic.trim().toLowerCase()) ?? null;
}

/** The learner-facing name of a persistent skill — the words the Skills page and the drills use. */
export function decaAreaLabel(area: DecaDrillArea): string {
  return DECA_DRILL_AREAS.find((candidate) => candidate.id === area)?.label ?? area;
}

/** Where that skill is practised. One destination, the same one the Skills index offers. */
export function decaAreaDrillHref(area: DecaDrillArea): string {
  return `/study-arcade?track=deca&area=${area}`;
}

export type DecaDiagnosticRoute = {
  diagnostic: string;
  area: DecaDrillArea;
  areaLabel: string;
  lessonId: string;
  why: string;
  lessonHref: string;
  drillHref: string;
};

/**
 * Turn stored weak-area tags into routes a learner can follow, dropping anything the product cannot
 * truthfully teach. `isPublishedLesson` is injected so the caller decides what "published" means and so
 * this module can be proved without importing the registry.
 *
 * Order and duplicates: the first diagnostic that maps to a given lesson wins, so a learner who missed
 * four marketing questions gets one route per lesson rather than four copies of the same card.
 */
export function decaDiagnosticRoutes(
  diagnostics: readonly string[],
  isPublishedLesson: (lessonId: string) => boolean
): DecaDiagnosticRoute[] {
  const seen = new Set<string>();
  const routes: DecaDiagnosticRoute[] = [];
  for (const diagnostic of diagnostics) {
    const entry = decaBridgeForDiagnostic(diagnostic);
    if (!entry) continue;
    if (!isPublishedLesson(entry.lessonId)) continue;
    if (seen.has(entry.lessonId)) continue;
    seen.add(entry.lessonId);
    routes.push({
      diagnostic,
      area: entry.area,
      areaLabel: decaAreaLabel(entry.area),
      lessonId: entry.lessonId,
      why: entry.why,
      lessonHref: `/lessons/${entry.lessonId}?track=deca`,
      drillHref: decaAreaDrillHref(entry.area)
    });
  }
  return routes;
}

/** Diagnostics this record cannot teach yet — returned so a surface can say so instead of inventing. */
export function decaUnbridgedDiagnostics(diagnostics: readonly string[]): string[] {
  return diagnostics.filter((diagnostic) => !decaBridgeForDiagnostic(diagnostic));
}

/** Control: every row points at one of the four real areas, and every area's gateway still resolves. */
export function decaBridgeAreasAreCanonical(): boolean {
  const areas = new Set(DECA_DRILL_AREAS.map((area) => area.id));
  return DECA_DIAGNOSTIC_BRIDGE.every(
    (entry) => areas.has(entry.area) && Boolean(decaPracticeMappingForArea(entry.area))
  );
}

/** True when a lesson exists in the registry AND a learner can actually open it. */
export function decaBridgeLessonIsPublished(lessonId: string): boolean {
  return getEducationLesson(lessonId)?.visibility === "learner";
}

/**
 * The routes for a learner surface: the pure core above, resolved against the real registry.
 *
 * Surfaces call THIS and import nothing else from lib/education, so the registry keeps exactly the
 * consumers the architecture suites allow and the pure core stays provable without the registry.
 */
export function decaDiagnosticRoutesForLearner(diagnostics: readonly string[]): DecaDiagnosticRoute[] {
  return decaDiagnosticRoutes(diagnostics, decaBridgeLessonIsPublished);
}
