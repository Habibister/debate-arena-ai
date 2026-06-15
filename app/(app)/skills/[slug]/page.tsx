import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, ClipboardList, Clock, Dumbbell, Flame, GraduationCap, PenLine, Layers3 } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma";
import type { StudyOrganization } from "@/lib/study-content";
import { cn } from "@/lib/utils";

type LessonContent = {
  objective?: string;
  lesson?: string;
  examples?: string[];
  guidedPractice?: string[];
  independentPractice?: string[];
  checks?: string[];
  masteryQuiz?: Array<{
    question: string;
    answer?: string;
    explanation?: string;
  }>;
};

type MasteryQuizItem = NonNullable<LessonContent["masteryQuiz"]>[number];

function parseLessonContent(content: unknown): LessonContent {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return {};
  }

  return content as LessonContent;
}

export default async function SkillPracticePage({ params }: { params: { slug: string } }) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [{ slug: params.slug }, { skill: { slug: params.slug } }]
    },
    include: {
      skill: {
        include: {
          lessons: {
            orderBy: { order: "asc" }
          }
        }
      }
    }
  });

  if (!lesson) {
    notFound();
  }

  const content = parseLessonContent(lesson.content);
  const currentIndex = lesson.skill.lessons.findIndex((item) => item.id === lesson.id);
  const previousLesson = currentIndex > 0 ? lesson.skill.lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lesson.skill.lessons.length - 1 ? lesson.skill.lessons[currentIndex + 1] : null;
  const masteryProgress = Math.round(((currentIndex + 1) / Math.max(lesson.skill.lessons.length, 1)) * 100);
  const examples = content.examples && content.examples.length > 0 ? content.examples : ["Identify the skill in a realistic prompt.", "Explain why the stronger answer works.", "Revise a weaker response into a competitive version."];
  const guidedPractice =
    content.guidedPractice && content.guidedPractice.length > 0
      ? content.guidedPractice
      : ["Complete one rep slowly. Name the goal, write a response, then compare it to the score category this lesson supports.", "Revise once for clarity and once for strategic impact."];
  const independentPractice =
    content.independentPractice && content.independentPractice.length > 0
      ? content.independentPractice
      : ["Set a short timer and produce the skill without notes.", "Log one weakness to target in your next practice test or judged round."];
  const checks = content.checks && content.checks.length > 0 ? content.checks : ["Can you name the goal of this skill?", "Can you use it under time pressure?", "Can you explain how it improves your score?"];
  const masteryQuiz: MasteryQuizItem[] =
    content.masteryQuiz && content.masteryQuiz.length > 0
      ? content.masteryQuiz
      : checks.map((check) => ({ question: check }));
  const isDebateSkill = lesson.skill.organization === "DEBATE";
  const studyOrganization = lesson.skill.organization === "DECA" || lesson.skill.organization === "HOSA" ? lesson.skill.organization : undefined;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <Link href="/skills" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Skills
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{lesson.skill.organization.replace("_", " ")}</Badge>
          <Badge variant="outline">{lesson.type.replace("_", " ").toLowerCase()}</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold">{lesson.title}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{lesson.summary}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              {lesson.estimatedMinutes} min
            </div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Flame className="h-4 w-4 text-accent" aria-hidden />
              +{lesson.xpReward} XP
            </div>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden />
              Step {currentIndex + 1} of {lesson.skill.lessons.length}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mastery Path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">{lesson.skill.name}</span>
            <span className="text-muted-foreground">{masteryProgress}%</span>
          </div>
          <Progress value={masteryProgress} />
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {lesson.skill.lessons.map((item) => (
              <Link
                key={item.id}
                href={`/skills/${item.slug}` as Route}
                className={`rounded-md border p-3 text-sm transition-colors ${item.id === lesson.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                <span className="font-semibold">{item.title}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
              <CardTitle>Lesson</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-8 text-muted-foreground">
              {content.lesson ?? "This lesson introduces the skill, shows what strong execution looks like, and gives you a repeatable pattern for practice."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-secondary" aria-hidden />
              <CardTitle>Examples</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {examples.map((example) => (
              <div key={example} className="rounded-lg border bg-background p-3 text-sm leading-6 text-muted-foreground">
                {example}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-accent" aria-hidden />
              <CardTitle>Guided Practice</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            {guidedPractice.map((step) => (
              <p key={step}>{step}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
              <CardTitle>Independent Practice</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            {independentPractice.map((step) => (
              <p key={step}>{step}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-secondary" aria-hidden />
              <CardTitle>Mastery Check</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {masteryQuiz.map((check) => (
              <div key={check.question} className="rounded-lg border bg-background p-3 text-sm leading-6 text-muted-foreground">
                <p className="font-semibold text-foreground">{check.question}</p>
                {check.answer ? <p className="mt-2">{check.answer}</p> : null}
                {check.explanation ? <p className="mt-2">{check.explanation}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {previousLesson ? (
          <Link href={`/skills/${previousLesson.slug}` as Route} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Previous: {previousLesson.title}
          </Link>
        ) : (
          <Link href="/tests" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}>
            <ClipboardList className="h-4 w-4" aria-hidden />
            Try a diagnostic test
          </Link>
        )}
        {nextLesson ? (
          <Link href={`/skills/${nextLesson.slug}` as Route} className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}>
            Next: {nextLesson.title}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link href="/debate" className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}>
            Apply in a judged round
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {isDebateSkill ? (
          <Link href={`/skills/${lesson.slug}/practice` as Route} className={cn(buttonVariants({ size: "lg" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}>
            <PenLine className="h-4 w-4" aria-hidden />
            Practice with writing feedback
          </Link>
        ) : null}
        {studyOrganization ? (
          <>
            <Link href="/tests" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}>
              <ClipboardList className="h-4 w-4" aria-hidden />
              Test this track
            </Link>
            <Link href="/study" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}>
              <Layers3 className="h-4 w-4" aria-hidden />
              Study terms
            </Link>
          </>
        ) : null}
      </div>

      <RecommendedVideos
        organization={(isDebateSkill ? "DEBATE" : studyOrganization) as StudyOrganization | undefined}
        skillTags={[lesson.skill.name, lesson.title]}
        title="Recommended video resources"
      />
    </div>
  );
}
