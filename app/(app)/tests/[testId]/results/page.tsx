import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, ClipboardList, MessageSquareText, RotateCcw, Target } from "lucide-react";
import { NextStepCard } from "@/components/app/next-step-card";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { studyDeckForSkill, type StudyOrganization } from "@/lib/study-content";
import {
  decaBridgeLessonIsPublished,
  decaDiagnosticRoutesForLearner,
  decaUnbridgedDiagnostics
} from "@/lib/education/deca-diagnostic-bridge";
import { resolveActiveTrack } from "@/lib/track-server";
import { isTrackRetired, trackByOrganization } from "@/lib/training-tracks";
import { cn } from "@/lib/utils";

type RecommendationPayload = {
  lessons?: unknown;
  note?: string;
};

type LessonRecommendation = {
  lessonSlug: string;
  title?: string;
  reason: string;
};

function normalizeChoices(choices: unknown): string[] {
  return Array.isArray(choices) ? choices.map((choice) => String(choice)) : [];
}

function normalizeLessonRecommendations(value: unknown): LessonRecommendation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is LessonRecommendation => {
    return (
      typeof item === "object" &&
      item !== null &&
      "lessonSlug" in item &&
      "reason" in item &&
      typeof item.lessonSlug === "string" &&
      typeof item.reason === "string"
    );
  });
}

function explainWrongSelection(selectedAnswer: string, skillTag: string) {
  if (selectedAnswer === "No answer") {
    return `No answer was submitted, so this counts as a missed ${skillTag} rep. Review the correct answer and retry a smaller set.`;
  }

  return `Your selected answer was weaker because it did not best satisfy the tested ${skillTag} skill. The correct answer is stronger because it directly addresses the scenario, stays within the event expectations, and gives a measurable or safe next step.`;
}

export default async function PracticeTestResultsPage({
  params,
  searchParams
}: {
  params: { testId: string };
  searchParams?: { track?: string | string[] };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=/tests/${params.testId}/results`);
  }

  const test = await prisma.practiceTest.findFirst({
    where: {
      id: params.testId,
      userId: session.user.id
    },
    include: {
      questions: {
        orderBy: { createdAt: "asc" },
        include: {
          answers: {
            where: { userId: session.user.id }
          }
        }
      }
    }
  });

  if (!test) {
    notFound();
  }

  // M15 S1A A4a — PERSISTED REWARD TRUTH.
  //
  // This page is reached by `router.push` after grading, and the client discards the grade response
  // (it parses it only for `error`), so no response field can reach here. The XP shown must therefore
  // come from what was actually written. The grade route records exactly one XPLog row per completed
  // test — `amount` = the real award, or 0 once the daily XP limit is reached — so that row IS the
  // reward fact. It previously rendered a hardcoded "+20", correct only while every completion paid
  // 20; under a daily limit that would have told a learner they earned XP they did not.
  const rewardEvent = await prisma.xPLog.findFirst({
    where: { userId: session.user.id, sourceType: "PRACTICE_TEST", sourceId: test.id },
    orderBy: { createdAt: "desc" },
    select: { amount: true }
  });

  if (test.status !== "COMPLETED") {
    redirect(`/tests/${test.id}`);
  }

  // RECORD-OWNED CONTEXT (Owner QA Repair 3D). A graded test belongs to the organization stored on
  // the row. A learner who has since moved to another track can still open their own older result,
  // and the shell must name the RECORD's track, not their current selection. Same rule as the replay:
  // stamped once into `?track=`, no cookie written, and skipped entirely when the record's
  // organization maps to no active track.
  const recordTrack = trackByOrganization(test.organization);
  if (recordTrack && !isTrackRetired(recordTrack.id)) {
    const rawTrack = searchParams?.track;
    const trackParam = typeof rawTrack === "string" ? rawTrack : undefined;
    const effective = await resolveActiveTrack(trackParam);
    if (effective.track?.id !== recordTrack.id) {
      redirect(`/tests/${test.id}/results?track=${recordTrack.slug}` as Route);
    }
  }

  const recommendations = (test.recommendations ?? {}) as RecommendationPayload;
  const lessonRecommendations = normalizeLessonRecommendations(recommendations.lessons);
  const score = test.score ?? 0;
  const correctCount = test.questions.filter((question) => question.answers[0]?.isCorrect).length;
  // P0-5 (2026-09-09): one practice-test score is not readiness evidence — there is no validated
  // readiness model behind it and no semantic evaluation. The band still describes the RESULT, which
  // a single score can honestly support; it no longer asserts that the learner is ready.
  const resultLabel = score >= 85 ? "Strong practice result" : score >= 70 ? "Solid practice result" : "Focused review";
  // QA-R2 #5 + #6. The weak areas are the question bank's own vocabulary ("Target market analysis"),
  // which appears nowhere else in the product, and the stored lesson recommendations point at legacy
  // rows that have no written lesson behind them. The bridge is the one place that says which of the
  // four recorded skills a diagnostic belongs to and which published lesson teaches it; anything it
  // cannot cover is listed as uncovered rather than sent somewhere plausible.
  const diagnosticRoutes = test.organization === "DECA" ? decaDiagnosticRoutesForLearner(test.weakAreas) : [];
  const uncoveredDiagnostics = test.organization === "DECA" ? decaUnbridgedDiagnostics(test.weakAreas) : [];
  // A stored recommendation is rendered ONLY when its slug still resolves to a lesson a learner can
  // read. The rest are older records: they stay out of the way rather than presenting themselves as
  // lessons that exist.
  const liveRecommendations = lessonRecommendations.filter((lesson) => decaBridgeLessonIsPublished(lesson.lessonSlug));
  const retiredRecommendationCount = lessonRecommendations.length - liveRecommendations.length;
  const studyOrganization = test.organization === "DECA" || test.organization === "HOSA" ? test.organization : undefined;
  const recommendedDeck = studyOrganization ? studyDeckForSkill(test.weakAreas[0] ?? test.eventCluster ?? test.eventType, studyOrganization) : undefined;

  // The return names the catalog it opens. For a result whose organization is not the learner's
  // current track that is a DIFFERENT track's test list, so the label says which — the learner is
  // never moved into another track's catalog by a generic "Back".
  const backHref = (recordTrack && !isTrackRetired(recordTrack.id) ? `/tests?track=${recordTrack.slug}` : "/tests") as Route;
  const backLabel = recordTrack && !isTrackRetired(recordTrack.id) ? `Back to ${recordTrack.label} practice tests` : "Back to practice tests";

  return (
    <div className="space-y-6">
      <Link href={backHref} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto min-h-11 min-w-11 px-3")}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="accent">Results</Badge>
            <h1 className="page-title mt-3">{test.organization} Practice Test</h1>
            <p className="mt-2 text-muted-foreground">
              {test.eventCluster ?? test.eventType} · {test.difficulty.toLowerCase()} · {test.questionCount} questions
            </p>
          </div>
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Generate another
          </Link>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="rounded-lg border bg-background p-5">
            <p className="text-sm font-semibold text-muted-foreground">Score</p>
            <p className="mt-3 text-6xl font-bold">{score}%</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {correctCount} of {test.questions.length} correct · {resultLabel}
            </p>
            <Progress value={score} className="mt-5" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <Target className="h-5 w-5 text-primary" aria-hidden />
              <p className="mt-3 text-sm font-semibold">Weak skills</p>
              <p className="mt-1 text-2xl font-bold">{test.weakAreas.length}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <BookOpenCheck className="h-5 w-5 text-secondary" aria-hidden />
              {/* Counts what this page can actually open — a tile reading 3 while every one of those
                  three had no lesson behind it was the same defect one number further up the page. */}
              <p className="mt-3 text-sm font-semibold">Lessons</p>
              <p className="mt-1 text-2xl font-bold">{diagnosticRoutes.length + liveRecommendations.length}</p>
            </div>
            {/* M15 S1A A4a — three states, and the third is the important one. A MISSING ledger row
                is not proof of an award and not proof that the limit was hit: tests graded before
                A4a have no row at all. So the tile is omitted rather than inventing either claim.
                The score, weak areas and recommendations below are unaffected in every case. */}
            {rewardEvent === null ? null : rewardEvent.amount > 0 ? (
              <div className="rounded-lg border bg-background p-4">
                <ClipboardList className="h-5 w-5 text-accent" aria-hidden />
                <p className="mt-3 text-sm font-semibold">XP earned</p>
                <p className="mt-1 text-2xl font-bold">+{rewardEvent.amount}</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-background p-4">
                <ClipboardList className="h-5 w-5 text-accent" aria-hidden />
                <p className="mt-3 text-sm font-semibold">XP earned</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  No XP — today&apos;s XP limit is reached. Your score, weak areas and recommendations are all
                  still here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <NextStepCard
          title="Practice weak skills"
          description="Start with the first recommended lesson, then retry the same cluster."
          href={(diagnosticRoutes[0]?.lessonHref ?? liveRecommendations[0]?.lessonSlug ?? "/skills") as Route}
          icon={BookOpenCheck}
          tone="secondary"
        />
        <NextStepCard
          title="Study weak terms"
          description="Review flashcards tied to the terms and concepts you missed."
          href={(recommendedDeck ? `/study/${recommendedDeck.deckSlug}` : "/study") as Route}
          icon={Target}
          tone="accent"
        />
        <NextStepCard
          title="Generate a retake"
          description="Create a shorter test in the same category after reviewing explanations."
          href="/tests"
          icon={ClipboardList}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <RecommendedVideos
          organization={studyOrganization as StudyOrganization | undefined}
          skillTags={[...test.weakAreas, test.eventCluster ?? test.eventType]}
          title="Recommended videos and resources"
        />
        <NextStepCard
          title="Practice speaking"
          description="Turn the same weak skill into a judged roleplay or debate response."
          href="/debate"
          icon={MessageSquareText}
          tone="secondary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Card>
            <CardHeader>
              <CardTitle as="h2">Weak Skill Detection</CardTitle>
            </CardHeader>
            <CardContent>
              {test.weakAreas.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {test.weakAreas.map((area) => (
                      <Badge key={area} variant="outline">
                        {area}
                      </Badge>
                    ))}
                  </div>
                  {/* Said once, in plain words: these are what THIS test measured, not the four skills
                      the product records. The card below turns them into those four. */}
                  <p className="text-sm leading-6 text-muted-foreground">
                    These are the topics this test asked about. The next card shows which recorded skill each one
                    belongs to.
                  </p>
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="No weak areas detected" description="Strong performance on this attempt. Move up a difficulty level or switch event categories." className="min-h-32" />
              )}
              {recommendations.note ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{recommendations.note}</p> : null}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle as="h2">What to work on</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnosticRoutes.length > 0 ? (
              diagnosticRoutes.map((route) => (
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
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Nothing here maps to a written DECA lesson yet. Review the explanations below and retry a shorter set in
                the same cluster.
              </p>
            )}
            {uncoveredDiagnostics.length > 0 ? (
              // Never silently dropped: a topic we cannot teach yet is named, so the learner knows the
              // gap is ours rather than assuming the lesson list covers everything they missed.
              <p className="text-sm leading-6 text-muted-foreground">
                No DECA lesson covers {uncoveredDiagnostics.join(", ")} yet, so nothing above points there.
              </p>
            ) : null}
            {liveRecommendations.length > 0 ? (
              <div className="rounded-lg border bg-background p-4">
                <p className="text-sm font-semibold">Also recommended when this test was graded</p>
                <ul className="mt-2 space-y-1">
                  {liveRecommendations.map((lesson) => (
                    <li key={lesson.lessonSlug}>
                      <Link
                        href={`/lessons/${lesson.lessonSlug}?track=deca` as Route}
                        className="focus-ring inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
                      >
                        {lesson.title ?? lesson.lessonSlug}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {retiredRecommendationCount > 0 ? (
              // The older grader stored names from a lesson system that was retired. The record is not
              // rewritten and the names are not turned into links that go nowhere.
              <p className="text-xs leading-6 text-muted-foreground">
                This test was graded when {retiredRecommendationCount === 1 ? "one recommendation" : `${retiredRecommendationCount} recommendations`}{" "}
                pointed at an older lesson list that no longer has written lessons behind it, so {retiredRecommendationCount === 1 ? "it is" : "they are"} not linked here.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {test.questions.map((question, index) => {
          const answer = question.answers[0];
          const selectedAnswer = answer?.selectedAnswer ?? "No answer";
          const isCorrect = Boolean(answer?.isCorrect);
          const choices = normalizeChoices(question.choices);

          return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle as="h2" className="text-base">Question {index + 1}</CardTitle>
                  <Badge variant={isCorrect ? "accent" : "outline"}>
                    {isCorrect ? "Correct" : question.skillTag}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-7">{question.question}</p>
                <div className="mt-4 grid gap-2">
                  {choices.map((choice) => {
                    const correct = choice === question.correctAnswer;
                    const selected = choice === selectedAnswer;
                    return (
                      <div
                        key={choice}
                        className={cn(
                          "flex items-start gap-3 rounded-md border p-3 text-sm",
                          correct ? "border-accent bg-accent/10" : selected ? "border-destructive/40 bg-destructive/10" : "bg-background"
                        )}
                      >
                        {correct ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                        ) : selected ? (
                          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                        ) : (
                          <span className="mt-1 h-3 w-3 shrink-0 rounded-full border" />
                        )}
                        <span>{choice}</span>
                      </div>
                    );
                  })}
                </div>
                {!isCorrect ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="font-semibold">Why the correct answer is right</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.explanation}</p>
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                      <p className="font-semibold">Why your answer missed</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {explainWrongSelection(selectedAnswer, question.skillTag)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
