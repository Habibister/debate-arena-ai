import {
  decaDiagnosticRoutesForLearner,
  decaUnbridgedDiagnostics,
  type DecaDiagnosticRoute
} from "@/lib/education/deca-diagnostic-bridge";
import { learnerVisibleLesson } from "@/lib/education/diagnosis";
import { getEducationLesson } from "@/lib/education/registry";
import type { EducationTrack } from "@/lib/education/types";

/**
 * WHAT A GRADED PRACTICE TEST RECOMMENDS (shared results-page repair, after beginner QA R2).
 *
 * The results page serves DECA and HOSA tests. QA-R2 connected DECA feedback to real teaching through
 * the diagnostic bridge, but the page applied that DECA work to every organization: a HOSA learner
 * read "Nothing here maps to a written DECA lesson yet", and HOSA's own stored suggestions were filtered
 * through the DECA bridge's check and hidden. For DECA, the grader now stores exactly the routes the
 * bridge produces, and the page ALSO recomputes them, so every lesson appeared twice and the Lessons
 * tile counted it twice.
 *
 * This module is the ONE place the results page gets its recommendations from. Rules:
 *
 *   1. Only a DECA test goes through the DECA bridge. Every other organization is resolved on its own
 *      track and never sees a DECA route, a DECA gap list or DECA copy.
 *   2. A stored suggestion is shown as a LESSON only when it is a learner-visible registry lesson of
 *      the test's own track. Nothing held, unregistered or cross-track is ever linked, and a lesson
 *      of another track is not named either.
 *   3. A lesson appears once. Identity is the canonical lesson id, never a display title.
 *   4. `lessonCount` is the number of distinct lessons the page links, computed after rule 3.
 *   5. HOSA's stored suggestions come from the older seeded lesson rows, none of which has a written
 *      lesson today. They are the grader's real suggestions, so they stay visible, but named as topics
 *      with no written lesson yet — never linked and never counted as lessons.
 *
 * Pure: no React, no database, no network, no provider. `buildTestResultRecommendations` takes its
 * lookups as arguments so it can be proved without the registry.
 */

export type StoredLessonRecommendation = { lessonSlug: string; title?: string; reason: string };

export type ResultOrganization = "DECA" | "HOSA" | "OTHER";

/** A lesson the page links: always learner-visible and always in the test's own track. */
export type ResultLesson = { lessonId: string; title: string; reason: string; href: string };

/** A stored suggestion with no written lesson behind it. Named, never linked. */
export type ResultUnwrittenTopic = { slug: string; title: string; reason: string };

export type TestResultRecommendations = {
  organization: ResultOrganization;
  /** DECA only: diagnosis → published lesson → drill. Empty for every other organization. */
  diagnosticRoutes: DecaDiagnosticRoute[];
  /** DECA only: diagnostics no published DECA lesson covers. Empty for every other organization. */
  uncoveredDiagnostics: string[];
  /** Stored suggestions that are real lessons of this track and not already a diagnostic route. */
  storedLessons: ResultLesson[];
  /** Non-DECA only: stored suggestions with no written lesson yet (rule 5). */
  unwrittenTopics: ResultUnwrittenTopic[];
  /** Stored suggestions that are neither linked nor named: DECA's retired pre-bridge rows, or any row
   *  for an organization with no active track. Disclosed as a count, never linked. */
  olderRecordCount: number;
  /** Distinct lessons linked on the page (rule 4). */
  lessonCount: number;
  /** The first linked lesson, as a full path, or null when the page links none. */
  firstLessonHref: string | null;
};

export type TestResultRecommendationDeps = {
  decaRoutes: (diagnostics: readonly string[]) => DecaDiagnosticRoute[];
  decaUncovered: (diagnostics: readonly string[]) => string[];
  /** A learner-visible registry lesson with its track, or null for anything held or unregistered. */
  publishedLesson: (lessonId: string) => { lessonId: string; title: string; track: EducationTrack } | null;
};

const TRACK_FOR_ORGANIZATION: Record<"DECA" | "HOSA", { track: EducationTrack; slug: string }> = {
  DECA: { track: "DECA", slug: "deca" },
  HOSA: { track: "HOSA", slug: "hosa" }
};

export function resultOrganization(organization: string): ResultOrganization {
  return organization === "DECA" || organization === "HOSA" ? organization : "OTHER";
}

/** The sentence under the weak-area badges. Only DECA has a card that maps topics to recorded skills. */
export function weakAreaExplanation(organization: string): string {
  return resultOrganization(organization) === "DECA"
    ? "These are the topics this test asked about. The next card shows which recorded skill each one belongs to."
    : "These are the topics this test asked about.";
}

export function buildTestResultRecommendations(
  input: { organization: string; weakAreas: readonly string[]; stored: readonly StoredLessonRecommendation[] },
  deps: TestResultRecommendationDeps
): TestResultRecommendations {
  const organization = resultOrganization(input.organization);
  const diagnosticRoutes = organization === "DECA" ? deps.decaRoutes(input.weakAreas) : [];
  const uncoveredDiagnostics = organization === "DECA" ? deps.decaUncovered(input.weakAreas) : [];

  const shown = new Set(diagnosticRoutes.map((route) => route.lessonId));
  const storedLessons: ResultLesson[] = [];
  const unwrittenTopics: ResultUnwrittenTopic[] = [];
  const namedTopics = new Set<string>();
  let olderRecordCount = 0;

  const trackInfo = organization === "OTHER" ? null : TRACK_FOR_ORGANIZATION[organization];
  for (const recommendation of input.stored) {
    const slug = recommendation.lessonSlug.trim();
    const lesson = deps.publishedLesson(slug);
    if (lesson && trackInfo && lesson.track === trackInfo.track) {
      // Rule 3: already on the page as a diagnostic route, or already listed once.
      if (shown.has(lesson.lessonId)) continue;
      shown.add(lesson.lessonId);
      storedLessons.push({
        lessonId: lesson.lessonId,
        title: lesson.title,
        reason: recommendation.reason,
        href: `/lessons/${lesson.lessonId}?track=${trackInfo.slug}`
      });
      continue;
    }
    // A published lesson of ANOTHER track is never linked and never named: that would present another
    // track's teaching as this learner's training.
    if (organization === "HOSA" && !lesson) {
      if (namedTopics.has(slug)) continue;
      namedTopics.add(slug);
      unwrittenTopics.push({ slug, title: recommendation.title?.trim() || slug, reason: recommendation.reason });
      continue;
    }
    olderRecordCount += 1;
  }

  const firstLessonHref = diagnosticRoutes[0]?.lessonHref ?? storedLessons[0]?.href ?? null;
  return {
    organization,
    diagnosticRoutes,
    uncoveredDiagnostics,
    storedLessons,
    unwrittenTopics,
    olderRecordCount,
    lessonCount: shown.size,
    firstLessonHref
  };
}

/** A learner-visible registry lesson and its track — the shared "may I send a learner here" rule. */
export function publishedLesson(lessonId: string): { lessonId: string; title: string; track: EducationTrack } | null {
  const lesson = learnerVisibleLesson(lessonId);
  const entry = lesson ? getEducationLesson(lesson.lessonId) : undefined;
  if (!lesson || !entry) return null;
  return { lessonId: lesson.lessonId, title: lesson.title, track: entry.track };
}

/** The recommendations for a learner surface, resolved against the real bridge and registry. */
export function testResultRecommendationsForLearner(input: {
  organization: string;
  weakAreas: readonly string[];
  stored: readonly StoredLessonRecommendation[];
}): TestResultRecommendations {
  return buildTestResultRecommendations(input, {
    decaRoutes: decaDiagnosticRoutesForLearner,
    decaUncovered: decaUnbridgedDiagnostics,
    publishedLesson
  });
}
