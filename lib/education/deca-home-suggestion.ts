import {
  DECA_DIAGNOSTIC_BRIDGE,
  decaDiagnosticRoutesForLearner,
  type DecaDiagnosticRoute
} from "@/lib/education/deca-diagnostic-bridge";

/**
 * HOME'S SUGGESTED NEXT STEP FOR DECA (final DECA beginner QA, finding A).
 *
 * Home printed the test's FIRST weak area ("which flagged Operations planning") and then "— part of"
 * the skill of the first weak area the bridge covers, with that other area's lesson and drill. Whenever
 * the first area had no lesson, the sentence and the links described two different diagnostics:
 * "Operations planning — part of business reasoning", linking the lesson that teaches Performance
 * measurement. Operations planning belongs to no skill the product records.
 *
 * This module picks ONE diagnostic and everything on the card comes from it:
 *
 *   1. The lead is chosen from the flagged test's FULL record, not a three-area window, so a covered
 *      area is never lost because the grader happened to record it fourth.
 *   2. Among the flagged areas the bridge routes to a published lesson, the lead is the one the bridge
 *      lists first. The bridge is declared in curriculum order (performance indicators, business
 *      reasoning, customer relations, marketing, and each area's lessons in course order).
 *   3. The heading, the sentence, the lesson and the drill are all the lead's own route. A flagged
 *      area the bridge does not route is named as not linked to a DECA lesson — never attached to
 *      another area's lesson.
 *   4. When no flagged area is routed there is no lesson and no drill, and no single area is singled
 *      out: the card names what was flagged, says none of it is linked to a DECA lesson yet, and
 *      suggests the one action that exists — that test's own feedback.
 *
 * The card says what the product LINKS, never what the curriculum lacks. A published lesson can teach
 * an area the bridge has no row for — a cluster test tags its questions with the cluster's own name, so
 * "Distribution" is flagged although "Getting It to the Customer" teaches it — and "no DECA lesson
 * covers Distribution" would be false. The bridge is not extended here; that is a curriculum decision.
 *
 * The grader records weak areas in whatever order the missed questions came back from the database, so
 * that order means nothing. Every area the card names is put in one fixed order first — areas the
 * bridge lists in its order, any other area after them alphabetically — so the same missed questions
 * always give the same card.
 *
 * The bridge itself is not changed. Pure: no React, no database, no network, no provider.
 * `buildDecaHomeSuggestion` takes its lookups as arguments so it can be proved without the registry.
 */

export type DecaHomeSuggestion = {
  /** The flagged diagnostic whose lesson and drill the card links: `route.diagnostic`, or null with no route. */
  lead: string | null;
  /** The published lesson and drill for `lead`, or null when no flagged area has DECA teaching. */
  route: DecaDiagnosticRoute | null;
  /** The card heading, e.g. "Suggested: Business reasoning". */
  heading: string;
  /** The words after "which flagged ". With a route they name `lead` first, so the sentence and the links agree. */
  evidence: string;
};

export type DecaHomeSuggestionDeps = {
  /** The bridge's routes for these diagnostics: mapped to a published lesson only, one per lesson. */
  routesFor: (diagnostics: readonly string[]) => DecaDiagnosticRoute[];
  /** Where the bridge lists a diagnostic; Infinity when the bridge has no row for it. */
  bridgeOrder: (diagnostic: string) => number;
};

/** The card names at most three flagged areas, as it did before this repair, and counts the rest. */
const NAMED_LIMIT = 3;

/** The heading when no flagged area is linked to a DECA lesson: the one action that exists, which the
 *  card's link opens — that test's results, with an explanation for every question missed. */
export const DECA_UNCOVERED_HEADING = "Suggested: Review the questions you missed";

/** "a", "a and b", "a, b and c". */
function andList(items: readonly string[]): string {
  return items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "a, b" plus "and N more" when some were left unnamed. */
function namedWithRest(named: readonly string[], rest: number): string {
  return `${named.join(", ")}${rest > 0 ? ` and ${rest} more` : ""}`;
}

export function buildDecaHomeSuggestion(
  flaggedAreas: readonly string[],
  deps: DecaHomeSuggestionDeps
): DecaHomeSuggestion | null {
  // The test's own record, without blanks or repeats, in the one fixed order described above. A repeat
  // is matched the way the bridge matches (trimmed, any case); when spellings differ, one fixed spelling
  // is kept, so neither the card nor its order depends on which spelling was recorded first.
  const spellings = new Map<string, string>();
  for (const raw of flaggedAreas) {
    const area = raw.trim();
    if (!area) continue;
    const key = area.toLowerCase();
    const kept = spellings.get(key);
    if (kept === undefined || area < kept) spellings.set(key, area);
  }
  const flagged = [...spellings.values()].sort(
    (a, b) => deps.bridgeOrder(a) - deps.bridgeOrder(b) || a.localeCompare(b, "en")
  );
  if (flagged.length === 0) return null;

  const covered = new Set(flagged.filter((area) => deps.routesFor([area]).length > 0));
  const leadCovered = flagged.find((area) => covered.has(area));
  const route = leadCovered ? deps.routesFor([leadCovered])[0] ?? null : null;

  if (route) {
    const lead = route.diagnostic;
    const others = flagged.filter((area) => area !== lead);
    const namedOthers = others.slice(0, NAMED_LIMIT - 1);
    const uncoveredNamed = namedOthers.filter((area) => !covered.has(area));
    // "Performance indicators" and "Business reasoning" are both a bank tag and the skill's own name;
    // the card names them once rather than "Performance indicators — part of performance indicators".
    const isTheSkill = lead.toLowerCase() === route.areaLabel.toLowerCase();
    return {
      lead,
      route,
      heading: `Suggested: ${route.areaLabel}`,
      evidence:
        (isTheSkill ? `${lead}.` : `${lead} — part of ${route.areaLabel.toLowerCase()}.`) +
        (namedOthers.length > 0 ? ` It also flagged ${namedWithRest(namedOthers, others.length - namedOthers.length)}.` : "") +
        (uncoveredNamed.length > 0
          ? ` ${andList(uncoveredNamed)} ${uncoveredNamed.length === 1 ? "isn't" : "aren't"} linked to a DECA lesson yet.`
          : "")
    };
  }

  const named = flagged.slice(0, NAMED_LIMIT);
  return {
    lead: null,
    route: null,
    heading: DECA_UNCOVERED_HEADING,
    evidence:
      `${namedWithRest(named, flagged.length - named.length)}. ` +
      `${flagged.length === 1 ? "It isn't" : "None of them is"} linked to a DECA lesson yet, so that test's explanations are the place to start.`
  };
}

/** Where the bridge lists a diagnostic, matched the way the bridge matches (case-insensitive, trimmed). */
export function decaBridgeOrder(diagnostic: string): number {
  const key = diagnostic.trim().toLowerCase();
  const index = DECA_DIAGNOSTIC_BRIDGE.findIndex((entry) => entry.diagnostic.toLowerCase() === key);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

/** Home's DECA suggestion, resolved against the real bridge and registry. */
export function decaHomeSuggestionForLearner(flaggedAreas: readonly string[]): DecaHomeSuggestion | null {
  return buildDecaHomeSuggestion(flaggedAreas, {
    routesFor: decaDiagnosticRoutesForLearner,
    bridgeOrder: decaBridgeOrder
  });
}
