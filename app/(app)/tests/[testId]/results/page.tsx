import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert, ClipboardList, MessageSquareText, RotateCcw, Target } from "lucide-react";
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

export default async function PracticeTestResultsPage({ params }: { params: { testId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
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

  if (test.status !== "COMPLETED") {
    redirect(`/tests/${test.id}`);
  }

  const recommendations = (test.recommendations ?? {}) as RecommendationPayload;
  const lessonRecommendations = normalizeLessonRecommendations(recommendations.lessons);
  const score = test.score ?? 0;
  const correctCount = test.questions.filter((question) => question.answers[0]?.isCorrect).length;
  const readinessLabel = score >= 85 ? "Ready to level up" : score >= 70 ? "Close to ready" : "Focused review";
  const studyOrganization = test.organization === "DECA" || test.organization === "HOSA" ? test.organization : undefined;
  const recommendedDeck = studyOrganization ? studyDeckForSkill(test.weakAreas[0] ?? test.eventCluster ?? test.eventType, studyOrganization) : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="accent">Results</Badge>
            <h1 className="mt-3 text-3xl font-bold">{test.organization} Practice Test</h1>
            <p className="mt-2 text-muted-foreground">
              {test.eventCluster ?? test.eventType} · {test.difficulty.toLowerCase()} · {test.questionCount} questions
            </p>
          </div>
          <Link href="/tests" className={buttonVariants({ variant: "outline" })}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Generate another
          </Link>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="rounded-lg border bg-background p-5">
            <p className="text-sm font-semibold text-muted-foreground">Score</p>
            <p className="mt-3 text-6xl font-bold">{score}%</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {correctCount} of {test.questions.length} correct · {readinessLabel}
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
              <p className="mt-3 text-sm font-semibold">Lessons</p>
              <p className="mt-1 text-2xl font-bold">{lessonRecommendations.length}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <ClipboardList className="h-5 w-5 text-accent" aria-hidden />
              <p className="mt-3 text-sm font-semibold">XP earned</p>
              <p className="mt-1 text-2xl font-bold">+20</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <NextStepCard
          title="Practice weak skills"
          description="Start with the first recommended lesson, then retry the same cluster."
          href={(lessonRecommendations[0] ? `/skills/${lessonRecommendations[0].lessonSlug}` : "/skills") as Route}
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
              <CardTitle>Weak Skill Detection</CardTitle>
            </CardHeader>
            <CardContent>
              {test.weakAreas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {test.weakAreas.map((area) => (
                    <Badge key={area} variant="outline">
                      {area}
                    </Badge>
                  ))}
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
            <CardTitle>Recommended Lessons</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {lessonRecommendations.length > 0 ? (
              lessonRecommendations.map((lesson) => (
                <Link key={lesson.lessonSlug} href={`/skills/${lesson.lessonSlug}` as Route} className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{lesson.title ?? lesson.lessonSlug}</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{lesson.reason}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Your missed-question pattern did not map to a seeded lesson yet. Review the explanations below and try a focused retake.</p>
            )}
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
                  <CardTitle className="text-base">Question {index + 1}</CardTitle>
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
