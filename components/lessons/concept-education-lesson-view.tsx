import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle, ArrowRight, Clock, Flag, Layers, Lightbulb, ListChecks, ListOrdered, MessageSquareQuote,
  PenLine, ThumbsDown, ThumbsUp, Target, TrendingUp
} from "lucide-react";
import { ScaffoldedTry } from "@/components/coaching/scaffolded-try";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SourceFreshnessNote } from "@/components/source/source-freshness-note";
import { cn } from "@/lib/utils";
import { debateMasteryHeld as skillRecordSuspended, DRILL_AREAS } from "@/lib/debate-drills";
import { decaMasteryHeld as decaRecordSuspended, DECA_DRILL_AREAS } from "@/lib/deca-drills";
import { practiceDrillAreaLabel, practiceDrillHref } from "@/lib/education/practice-drill";
import type { ConceptEducationLessonSource, DebatePracticeDrill, DecaPracticeDrill, EducationPracticeDrill } from "@/lib/education/types";
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
 * strong version works, and the lesson's own deterministic checks. Nothing is invented, and an empty
 * section would be exactly the generic filler this renderer exists to avoid.
 *
 * TEACHING CAPACITY. The schema now also carries optional titled teaching sections, further examples,
 * a revision ladder, a misconception and a common-mistakes list. Each renders if and only if the
 * lesson authored it, so a lesson that carries none renders byte-for-byte the page it rendered
 * before they existed. These were added because their absence was an EDUCATIONAL limit rather than a
 * cosmetic one: without them a lesson could only buy depth as one longer paragraph, and could not
 * teach a wrong mental model or a common failure anywhere a learner would read it.
 *
 * TEACH FIRST, and the ORDER below is the invariant, not a layout preference:
 *   objective -> explanation -> teaching sections -> why it matters -> process
 *   -> worked example -> further examples -> revision ladder
 *   -> misconception -> common mistakes
 *   -> knowledge checks -> optional drill call to action -> next lesson
 * Every piece of instruction precedes every check. No question may move ahead of the teaching it
 * depends on, and error correction is teaching — a misconception a learner meets first inside a
 * question has been tested, not taught.
 *
 * The legacy Claim/Warrant/Impact lesson keeps its own `LessonView`, untouched. That lesson is the
 * QUALITY REFERENCE for what these sections are for; it is not the template — its shape is bespoke
 * and this one stays reusable.
 *
 * Server-rendered apart from the checks, which need ephemeral selection state.
 */
/**
 * Learner-facing drill names. P1-C: the per-track label maps that used to live here moved to
 * lib/education/practice-drill.ts, so this view, the review card and the Coach all name a drill the
 * same way from the same source. The maps had already been duplicated once for DECA; the shared
 * resolver reads each track's own bank instead, and keeps the compile-time area coverage the maps
 * provided.
 */
const drillAreaLabel = practiceDrillAreaLabel;

/**
 * The learner-facing name of the track a lesson belongs to.
 *
 * Read from the lesson's OWN catalog entry, never hardcoded. The badge used to be the literal
 * "General Debate", which was invisible while Debate was the only track with concept lessons and
 * became another track's branding on a DECA page the moment one shipped. Fails open to the
 * organization's own string rather than to a track name the lesson never claimed.
 */
const ORGANIZATION_LABELS: Record<string, string> = {
  DEBATE: "General Debate",
  DECA: "DECA",
  HOSA: "HOSA"
};

function organizationLabel(organization: string): string {
  return ORGANIZATION_LABELS[organization] ?? organization;
}

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
  // Does the drill this lesson points at currently write a durable record? Read from the drill AREA's
  // own skill rather than from the lesson, because several lessons can share one area and only the
  // area names the skill that records. Undefined area or unheld skill both mean "records", which is
  // the pre-existing behaviour; only an explicitly held skill loses the claim.
  const drillSkillSlug = practiceDrill && practiceDrill.track === "debate"
    ? DRILL_AREAS.find((area) => area.id === practiceDrill.area)?.skillSlug
    : undefined;
  // DECA is resolved SEPARATELY, against its own bank and its own hold list. Letting a DECA area
  // fall through the Debate lookup returns undefined for every one of them, and the hold predicate
  // reads undefined as "not held" — so the strongest record claim on the page would have been true
  // only by coincidence, asserted by code that cannot see any DECA state at all.
  const decaDrillSkillSlug = practiceDrill && practiceDrill.track === "deca"
    ? DECA_DRILL_AREAS.find((area) => area.id === practiceDrill.area)?.skillSlug
    : undefined;
  const drillKeepsARecord = !skillRecordSuspended(drillSkillSlug) && !decaRecordSuspended(decaDrillSkillSlug);
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
          <Badge variant="secondary">{organizationLabel(source.organization)}</Badge>
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
        {content.explanation.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index} className="mt-3 leading-7 text-muted-foreground">{paragraph}</p>
        ))}
        {/* Authored teaching blocks, each with the lesson's OWN heading. The headings are never chosen
            here: "How to think about it" fits one concept and "When it fails" fits another, and a
            global heading set would force every lesson into a shape its material does not have. */}
        {content.teachingSections?.map((section) => (
          <div key={section.heading} className="mt-5">
            <h3 className="break-words font-semibold text-foreground">{section.heading}</h3>
            {/* A body may carry blank-line paragraph breaks; a single wall of text hides the sentence
                that matters on a phone. Bodies without breaks render exactly as before. */}
            {section.body.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index} className="mt-2 break-words leading-7 text-muted-foreground">{paragraph}</p>
            ))}
          </div>
        ))}
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

      {content.additionalExamples?.length ? (
        <section aria-labelledby="more-examples" className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="more-examples" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">More situations</h2>
          </div>
          <div className="mt-4 space-y-5">
            {content.additionalExamples.map((example) => (
              <div key={example.setup} className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">The situation</p>
                <p className="mt-1 break-words leading-7 text-foreground">{example.setup}</p>
                {/* A contrast only where the lesson authored one. A missing weak side is not an
                    omission to fill in — inventing a straw answer teaches nothing. */}
                {example.weak ? (
                  <p className="mt-3 flex flex-wrap items-baseline gap-x-2 break-words leading-7 text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <ThumbsDown className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                      Weak answer.{" "}
                    </span>
                    {example.weak}
                  </p>
                ) : null}
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 break-words leading-7 text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <ThumbsUp className="h-4 w-4 shrink-0 text-success" aria-hidden />
                    Strong answer.{" "}
                  </span>
                  {example.strong}
                </p>
                <p className="mt-3 break-words leading-7 text-foreground">
                  <span className="font-semibold">Why. </span>
                  {example.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {content.revisionLadder?.length ? (
        <section aria-labelledby="revision" className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="revision" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">
              Turning a weak answer into a strong one
            </h2>
          </div>
          {/* An ordered list: each rung is the previous one repaired, so the sequence carries meaning. */}
          <ol className="mt-4 space-y-4">
            {content.revisionLadder.map((rung, index) => (
              <li key={rung.attempt} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="break-words leading-7 text-muted-foreground">
                    <span className="font-semibold text-foreground">Attempt. </span>
                    {rung.attempt}
                  </p>
                  <p className="mt-2 break-words leading-7 text-muted-foreground">
                    <span className="font-semibold text-foreground">What is missing. </span>
                    {rung.diagnosis}
                  </p>
                  <p className="mt-2 break-words leading-7 text-muted-foreground">
                    <span className="font-semibold text-foreground">Revised. </span>
                    {rung.revision}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {content.misconception ? (
        <section aria-labelledby="misconception" className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="misconception" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">
              The mental model to fix
            </h2>
          </div>
          {/* Named, refuted, replaced — in that order. A wrong model displaced by nothing leaves the
              learner worse off than before it was named. */}
          <p className="mt-3 break-words leading-7 text-muted-foreground">
            <span className="font-semibold text-foreground">What people think. </span>
            {content.misconception.wrongModel}
          </p>
          <p className="mt-2 break-words leading-7 text-muted-foreground">
            <span className="font-semibold text-foreground">Why that fails. </span>
            {content.misconception.whyItFails}
          </p>
          <p className="mt-2 break-words leading-7 text-muted-foreground">
            <span className="font-semibold text-foreground">Think of it this way instead. </span>
            {content.misconception.betterModel}
          </p>
        </section>
      ) : null}

      {content.commonMistakes?.length ? (
        <section aria-labelledby="common-mistakes" className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="common-mistakes" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">Common mistakes</h2>
          </div>
          <ul className="mt-4 space-y-4">
            {content.commonMistakes.map((mistake) => (
              <li key={mistake.mistake} className="rounded-lg border bg-muted/20 p-4">
                <p className="break-words font-semibold text-foreground">{mistake.mistake}</p>
                <p className="mt-2 break-words leading-7 text-muted-foreground">
                  <span className="font-semibold text-foreground">Why it fails. </span>
                  {mistake.whyItFails}
                </p>
                <p className="mt-2 break-words leading-7 text-muted-foreground">
                  <span className="font-semibold text-foreground">The fix. </span>
                  {mistake.fix}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.languageFrames?.length ? (
        <section aria-labelledby="language" className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="language" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">Words you can use</h2>
          </div>
          {/* STARTERS ARE SCAFFOLDS. Each one is opening words and a blank; the substance that fills
              the blank is the learner's. The validator refuses a starter with no blank and no open
              ending, so a finished sentence cannot be authored here by accident. */}
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Each of these gives you the opening words and stops. What goes in the blank is your reasoning.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {content.languageFrames.map((frame) => (
              <div key={frame.purpose} className="rounded-lg border bg-muted/20 p-4">
                <p className="break-words font-semibold text-foreground">{frame.purpose}</p>
                <ul className="mt-2 space-y-2">
                  {frame.starters.map((starter) => (
                    <li key={starter} className="break-words font-mono text-sm leading-6 text-muted-foreground">
                      {starter.replace(/\{their claim\}|\{topic\}/g, "___")}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="practice" className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="practice" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">Practice</h2>
        </div>
        <ConceptEducationLessonPractice checks={checks} />
      </section>

      {content.scaffoldedTry ? (
        <section aria-labelledby="scaffolded-try" className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="scaffolded-try" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">Now try the move</h2>
          </div>
          {/* The constructed attempt. It follows the checks because recognising the move comes before
              producing it, and it precedes the guided round because a learner should have produced
              the move at least once before using it against an opponent. `source.slug` is the lesson
              id — the validator requires the two to be equal — so the guided application, the unlocked
              skills and the starter categories are all looked up from the canonical registry data. */}
          <div className="mt-4">
            <ScaffoldedTry
              lessonId={source.slug}
              scaffoldedTry={content.scaffoldedTry}
              languageFrames={content.languageFrames}
            />
          </div>
        </section>
      ) : null}

      {practiceDrill ? (
        <section aria-labelledby="practice-drill" className="rounded-lg border bg-card p-6">
          <h2 id="practice-drill" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">
            Practice this skill
          </h2>
          {/* What the drill DOES for the learner depends on whether its skill is currently recording.
              A skill whose evidence model is suspended still grades and still explains every answer,
              but it starts no record — so the sentence that promises one is only rendered where it is
              true. Derived from the area's own skill, never a hardcoded lesson list, so a lesson that
              points at a recording area keeps the stronger copy and one that does not never claims it. */}
          <p className="mt-2 leading-7 text-muted-foreground">
            The check above is for practice and records nothing.{" "}
            {drillKeepsARecord ? (
              <>
                The {drillAreaLabel(practiceDrill)} drill is scored on the server — that is where your
                record of this skill starts.
              </>
            ) : (
              <>
                The {drillAreaLabel(practiceDrill)} drill does not add to your record either right now —
                use it for extra scored practice, with feedback on every answer.
              </>
            )}
          </p>
          <Link
            href={practiceDrillHref(practiceDrill) as Route}
            className={cn(buttonVariants({ size: "sm" }), "mt-4 h-auto min-h-11 min-w-11 whitespace-normal px-4 text-center")}
          >
            Practice this skill in the {drillAreaLabel(practiceDrill)} drill
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="next" className="rounded-lg border bg-card p-6">
        <h2 id="next" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">
          {next ? "Next lesson" : "You’ve reached the end of this course so far"}
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
            This is the last lesson written for this course so far. More are being authored — nothing is
            being hidden from you, and nothing here has been marked complete on your behalf.
          </p>
        )}
      </section>
    </div>
  );
}
