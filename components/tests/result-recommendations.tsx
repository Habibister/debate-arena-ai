import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The "What to work on" card on a graded practice test.
 *
 * Presentation only. What it may show is decided by `lib/education/test-result-recommendations`, and
 * the page passes that result in; the shape is restated here so this component imports nothing from
 * the education registry. Every sentence that names a track is chosen by `organization`, so a HOSA
 * result can never read DECA copy.
 */
export type ResultRecommendationsView = {
  organization: "DECA" | "HOSA" | "OTHER";
  diagnosticRoutes: Array<{
    diagnostic: string;
    areaLabel: string;
    lessonId: string;
    why: string;
    lessonHref: string;
    drillHref: string;
  }>;
  uncoveredDiagnostics: string[];
  storedLessons: Array<{ lessonId: string; title: string; reason: string; href: string }>;
  unwrittenTopics: Array<{ slug: string; title: string; reason: string }>;
  olderRecordCount: number;
};

export function ResultRecommendationsCard({
  recommendations,
  trackLabel
}: {
  recommendations: ResultRecommendationsView;
  /** The test's own track name, e.g. "HOSA". Used only by the non-DECA branch. */
  trackLabel: string;
}) {
  const { organization, diagnosticRoutes, uncoveredDiagnostics, storedLessons, unwrittenTopics, olderRecordCount } =
    recommendations;
  const isDeca = organization === "DECA";
  const nothingToShow = diagnosticRoutes.length === 0 && storedLessons.length === 0 && unwrittenTopics.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">What to work on</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {diagnosticRoutes.map((route) => (
          <div key={route.lessonId} className="rounded-lg border bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {route.diagnostic} · recorded skill: {route.areaLabel}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{route.why}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <Link
                href={route.lessonHref as Route}
                className="focus-ring inline-flex min-h-11 min-w-11 items-center gap-1 text-sm font-semibold text-primary"
              >
                Read the lesson
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </Link>
              <Link
                href={route.drillHref as Route}
                className="focus-ring inline-flex min-h-11 min-w-11 items-center gap-1 text-sm font-semibold text-primary"
              >
                Drill {route.areaLabel.toLowerCase()}
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>
        ))}
        {nothingToShow ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {isDeca
              ? "Nothing here maps to a written DECA lesson yet. Review the explanations below and retry a shorter set in the same cluster."
              : `Nothing here maps to a written ${trackLabel} lesson yet. Review the explanations below and retry a shorter set in the same category.`}
          </p>
        ) : null}
        {isDeca && uncoveredDiagnostics.length > 0 ? (
          // Never silently dropped: a topic nothing here links to yet is named, so the learner knows the
          // gap is ours rather than assuming the lesson list covers everything they missed.
          // Final DECA QA: this says what is LINKED, not what the curriculum teaches. The bridge has no row
          // for some areas a published lesson does teach (a Distribution test flags "Distribution"), so
          // "No DECA lesson covers Distribution" was false.
          <p className="text-sm leading-6 text-muted-foreground">
            {uncoveredDiagnostics.length > 1
              ? `${uncoveredDiagnostics.slice(0, -1).join(", ")} and ${uncoveredDiagnostics[uncoveredDiagnostics.length - 1]} aren't`
              : `${uncoveredDiagnostics[0]} isn't`}{" "}
            linked to a DECA lesson yet, so nothing above points there.
          </p>
        ) : null}
        {storedLessons.length > 0 ? (
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold">
              {isDeca ? "Also recommended when this test was graded" : "Recommended when this test was graded"}
            </p>
            <ul className="mt-2 space-y-1">
              {storedLessons.map((lesson) => (
                <li key={lesson.lessonId}>
                  <Link
                    href={lesson.href as Route}
                    className="focus-ring inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
                  >
                    {lesson.title}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!isDeca && unwrittenTopics.length > 0 ? (
          // The grader's own suggestions for this track. They stay visible, but none has a written
          // lesson yet, so each is named as a topic and none is linked or counted as a lesson.
          <div className="rounded-lg border bg-background p-4">
            <p className="text-sm font-semibold">Suggested topics from this test</p>
            <ul className="mt-2 space-y-2">
              {unwrittenTopics.map((topic) => (
                <li key={topic.slug} className="text-sm leading-6">
                  <span className="font-semibold">{topic.title}</span>
                  <span className="text-muted-foreground"> · {topic.reason}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              There is no written {trackLabel} lesson for {unwrittenTopics.length === 1 ? "this topic" : "these topics"} yet,
              so {unwrittenTopics.length === 1 ? "it is" : "they are"} named here but not linked.
            </p>
          </div>
        ) : null}
        {olderRecordCount > 0 ? (
          // The older grader stored names from a lesson system that was retired. The record is not
          // rewritten and the names are not turned into links that go nowhere.
          <p className="text-xs leading-6 text-muted-foreground">
            This test was graded when {olderRecordCount === 1 ? "one recommendation" : `${olderRecordCount} recommendations`}{" "}
            pointed at an older lesson list that no longer has written lessons behind it, so{" "}
            {olderRecordCount === 1 ? "it is" : "they are"} not linked here.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
