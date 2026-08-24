import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Clock, Flag, Lightbulb, ListOrdered, ThumbsDown, ThumbsUp, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SourceFreshnessNote } from "@/components/source/source-freshness-note";
import { cn } from "@/lib/utils";
import type { ConceptEducationLessonSource, EducationPracticeDrill } from "@/lib/education/types";
import type { SourceFreshnessMetadata } from "@/lib/source-freshness";
import {
  ConceptEducationLessonPractice,
  type ConceptCheck
} from "@/components/lessons/concept-education-lesson-practice";

/**
 * The canonical renderer for a migrated concept lesson (M13E1B).
 *
 * It renders ONLY what the source object actually contains: objective, explanation, why it matters,
 * the numbered process, one worked example shown weak-then-strong with the authored reason the
 * strong version works, and the lesson's own deterministic checks. Nothing is invented — there is no
 * revision ladder, no evidence upgrade, no misconception section, no common-mistakes list and no
 * video, because these four lessons do not have them. An empty section would be exactly the generic
 * filler this milestone exists to remove.
 *
 * The legacy Claim/Warrant/Impact lesson keeps its own `LessonView`, untouched.
 *
 * Server-rendered apart from the checks, which need ephemeral selection state.
 */
/** Learner-facing drill names. Keyed by the typed area union so a new area cannot be forgotten. */
const DRILL_AREA_LABELS: Record<EducationPracticeDrill["area"], string> = {
  "claim-warrant-impact": "Claim / Warrant / Impact",
  rebuttal: "Rebuttal",
  "evidence-evaluation": "Evidence evaluation",
  weighing: "Weighing"
};

export function ConceptEducationLessonView({
  source,
  provenance,
  moduleLabel,
  next,
  practiceDrill
}: {
  source: ConceptEducationLessonSource;
  provenance: SourceFreshnessMetadata;
  moduleLabel: string;
  next: { id: string; title: string } | null;
  /**
   * The exact drill that measures this lesson's concept, when the registry names one. Absent for a
   * lesson with no proven matching drill — and absent renders NOTHING here, never a disabled button
   * and never a generic practice link, because a call to action that lands on unrelated questions
   * would be its own small dishonesty.
   */
  practiceDrill?: EducationPracticeDrill;
}) {
  const { lesson } = source;
  const content = lesson.content;

  // Presented in teaching order. `masteryCheck` is the catalog's field name; the learner sees
  // "Final check", and nothing here calls it mastery.
  const checks: ConceptCheck[] = [
    { group: "guided", question: content.guidedQuestion },
    ...content.practiceQuestions.map((question) => ({ group: "independent" as const, question })),
    ...content.masteryCheck.map((question) => ({ group: "final" as const, question }))
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">General Debate</Badge>
          <Badge variant="outline">{moduleLabel}</Badge>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {lesson.estimatedMinutes} min
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{lesson.summary}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Teaching lesson — original instruction, not official competition material. Examples are
          illustrative; your event&apos;s current official rules control.
        </p>
        {/* Structured provenance through the shared decision layer. No source or date is restated. */}
        <SourceFreshnessNote metadata={provenance} className="mt-3" compact />
      </header>

      <section aria-labelledby="objective" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="objective" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">What you&apos;ll be able to do</h2>
        </div>
        <p className="mt-3 leading-7 text-foreground">{content.objective}</p>
      </section>

      <section aria-labelledby="what-it-is" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="what-it-is" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">What it is</h2>
        </div>
        <p className="mt-3 leading-7 text-muted-foreground">{content.explanation}</p>
        <h3 className="mt-5 font-semibold text-foreground">Why it matters</h3>
        <p className="mt-2 leading-7 text-muted-foreground">{content.whyMatters}</p>
      </section>

      <section aria-labelledby="how" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="how" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">How to do it</h2>
        </div>
        <ol className="mt-4 space-y-3">
          {content.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <span className="min-w-0 break-words leading-7 text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="worked" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="worked" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">One situation, answered two ways</h2>
        </div>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">The situation</p>
        <p className="mt-1 break-words leading-7 text-foreground">{content.workedExample.prompt}</p>

        {/* Both labels carry an icon AND a word, so the weak/strong distinction survives with CSS off. */}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-warning/50 bg-warning/[0.06] p-4">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <ThumbsDown className="h-4 w-4 shrink-0 text-warning" aria-hidden />
              Weak answer
            </p>
            <p className="mt-2 break-words leading-7 text-muted-foreground">{content.workedExample.weakAnswer}</p>
          </div>
          <div className="rounded-lg border border-success/50 bg-success/[0.06] p-4">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <ThumbsUp className="h-4 w-4 shrink-0 text-success" aria-hidden />
              Strong answer
            </p>
            <p className="mt-2 break-words leading-7 text-muted-foreground">{content.workedExample.strongAnswer}</p>
          </div>
        </div>

        <p className="mt-4 rounded-md border bg-muted/40 p-3 leading-7 text-foreground">
          <span className="font-semibold">Why the strong version works. </span>
          {content.workedExample.whyItWorks}
        </p>
      </section>

      <section aria-labelledby="practice" className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="practice" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">Practice</h2>
        </div>
        <ConceptEducationLessonPractice checks={checks} />
      </section>

      {practiceDrill ? (
        <section aria-labelledby="practice-drill" className="rounded-lg border bg-card p-6">
          <h2 id="practice-drill" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">
            Practice this skill
          </h2>
          <p className="mt-2 leading-7 text-muted-foreground">
            The check above is for practice and records nothing. The {DRILL_AREA_LABELS[practiceDrill.area]} drill
            is scored on the server — that is where your record of this skill starts.
          </p>
          <Link
            href={`/study-arcade?track=${practiceDrill.track}&area=${practiceDrill.area}` as Route}
            className={cn(buttonVariants({ size: "sm" }), "mt-4 h-auto min-h-11 min-w-11 whitespace-normal px-4 text-center")}
          >
            Practice this skill in the {DRILL_AREA_LABELS[practiceDrill.area]} drill
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="next" className="rounded-lg border bg-card p-6">
        <h2 id="next" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">
          {next ? "Next lesson" : "You&apos;ve reached the end of this course so far"}
        </h2>
        {next ? (
          <>
            <p className="mt-2 leading-7 text-muted-foreground">{next.title}</p>
            <Link
              href={`/lessons/${next.id}` as Route}
              className={cn(buttonVariants({ size: "sm" }), "mt-4 h-auto min-h-11 min-w-11 whitespace-normal px-4 text-center")}
            >
              Continue to {next.title}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </>
        ) : (
          <p className="mt-2 leading-7 text-muted-foreground">
            This is the last Debate lesson written so far. More are being authored — nothing is being
            hidden from you, and nothing here has been marked complete on your behalf.
          </p>
        )}
      </section>
    </div>
  );
}
