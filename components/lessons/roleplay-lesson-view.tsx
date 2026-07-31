import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Clock, Lightbulb, ListChecks, MapPin, MessageSquare, Target, ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RolePlayLine, RoleplayLesson } from "@/lib/roleplay-lessons";
import { SourceFreshnessNote } from "@/components/source/source-freshness-note";

function Transcript({ lines, tone }: { lines: RolePlayLine[]; tone: "weak" | "strong" }) {
  const weak = tone === "weak";
  return (
    <div className="mt-3 space-y-3">
      {lines.map((line, i) => (
        <div key={i}>
          <div className={`rounded-lg border p-3 ${weak ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-emerald-500/40 bg-emerald-500/[0.06]"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{line.speaker}</p>
            <p className="mt-1 leading-7 text-foreground">{line.text}</p>
          </div>
          {line.note ? (
            <p className="mt-1 flex gap-2 pl-3 text-sm leading-6 text-muted-foreground">
              <span aria-hidden className={weak ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>▸</span>
              <span>{line.note}</span>
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// Static teaching for a role-play lesson (everything except the interactive practice). Theme-token
// styling, semantic sections, status paired with icon + text.
export function RoleplayLessonView({ lesson }: { lesson: RoleplayLesson }) {
  const orgLabel = lesson.organization === "DECA" ? "DECA" : "HOSA";
  return (
    <div className="space-y-6">
      <header className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{orgLabel}</Badge>
          <Badge variant="outline">Performance Course · Lesson {lesson.courseMapCurrentIndex ?? 0}</Badge>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {lesson.estimatedMinutes} min
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{lesson.subtitle}</p>
        <p className="mt-4 text-xs text-muted-foreground">{lesson.provenanceNote}</p>
        {/* Structured provenance from the lesson data — the renderer restates no source or date. */}
        <SourceFreshnessNote metadata={lesson.provenance} className="mt-3" compact />
      </header>

      {/* What it is */}
      <section aria-labelledby="what" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="what" className="text-xl font-bold">What it is</h2>
        </div>
        {lesson.intro.map((p, i) => (
          <p key={i} className="mt-3 leading-7 text-muted-foreground">{p}</p>
        ))}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {lesson.keyIdeas.map((idea) => (
            <div key={idea.term} className="rounded-lg border bg-background p-4">
              <h3 className="text-sm font-bold">{idea.term}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{idea.plain}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Event timeline */}
      <section aria-labelledby="timeline" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="timeline" className="text-xl font-bold">{lesson.timelineLabel ?? "The event, start to finish"}</h2>
        </div>
        {/* M11R3: present only when the sequence is CompeteReady's teaching order rather than the
            event's sourced structure. Visible text, never colour alone. */}
        {lesson.timelineNote ? (
          <p className="mt-2 text-xs leading-6 text-muted-foreground">{lesson.timelineNote}</p>
        ) : null}
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {lesson.timeline.map((step, i) => (
            <li key={step} className="flex items-start gap-3 rounded-md border bg-background p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <span className="text-sm leading-6">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Framework */}
      <section aria-labelledby="framework" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="framework" className="text-xl font-bold">{lesson.framework.name}</h2>
        </div>
        <ol className="mt-4 space-y-2">
          {lesson.framework.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{i + 1}</span>
              <span className="leading-7">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">{lesson.framework.note}</p>
      </section>

      {/* Scenario + worked examples render ONLY for an explicitly available lesson. The branch is on
          the `practiceStatus` discriminant, never on missing data — a lesson whose practice was
          deliberately withdrawn omits these sections entirely, and an incomplete "available" lesson
          is a compile error rather than something that silently renders like a withdrawn one. */}
      {lesson.practiceStatus === "available" ? (
        <section aria-labelledby="scenario" className="rounded-lg border border-primary/30 bg-primary/5 p-6">
          <h2 id="scenario" className="text-xl font-bold">{lesson.scenario.title}</h2>
          <p className="mt-2 leading-7">{lesson.scenario.text}</p>
          <div className="mt-4 rounded-md border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{lesson.prepOutline.title}</p>
            <p className="mt-1 text-sm italic text-muted-foreground">{lesson.prepOutline.note}</p>
            <ul className="mt-2 space-y-1.5">
              {lesson.prepOutline.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                  <span aria-hidden className="text-primary">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Weak vs strong worked role-play — required on an available lesson, so no per-field guard. */}
      {lesson.practiceStatus === "available" ? (
        <section aria-labelledby="worked" className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="worked" className="text-xl font-bold">One scenario, performed two ways</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Same situation, same role. Read the annotations under each line — that&apos;s where the skill is.</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <ThumbsDown className="h-4 w-4" aria-hidden />
                <h3 className="text-sm font-bold uppercase tracking-wide">{lesson.weakExample.title}</h3>
              </div>
              <Transcript lines={lesson.weakExample.lines} tone="weak" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <ThumbsUp className="h-4 w-4" aria-hidden />
                <h3 className="text-sm font-bold uppercase tracking-wide">{lesson.strongExample.title}</h3>
              </div>
              <Transcript lines={lesson.strongExample.lines} tone="strong" />
            </div>
          </div>
        </section>
      ) : null}

      {/* Common mistakes */}
      <section aria-labelledby="mistakes" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
          <h2 id="mistakes" className="text-xl font-bold">Common mistakes</h2>
        </div>
        <ol className="mt-4 space-y-3">
          {lesson.commonMistakes.map((m, i) => (
            <li key={m.title} className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{i + 1}</span>
                <div>
                  <h3 className="font-bold">{m.title}</h3>
                  <p className="mt-1 leading-7 text-muted-foreground">{m.explanation}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// The course map + next-lesson footer, shown after the interactive practice.
export function RoleplayCourseFooter({ lesson }: { lesson: RoleplayLesson }) {
  const currentIndex = lesson.courseMapCurrentIndex ?? 0;
  return (
    <div className="space-y-6">
      {lesson.supportingLink ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{lesson.supportingLink.label}</span> {lesson.supportingLink.note}
        </p>
      ) : null}

      <section aria-labelledby="next" className="rounded-lg border border-primary/30 bg-primary/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Continue to</p>
        <h2 id="next" className="mt-1 flex items-center gap-2 text-xl font-bold">
          {lesson.nextLesson.label}
          <ArrowRight className="h-5 w-5 text-primary" aria-hidden />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.nextLesson.note}</p>
        <p className="mt-3 text-xs text-muted-foreground">The next lessons are being written — this pilot lesson comes first.</p>
      </section>

      <section aria-labelledby="coursemap" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="coursemap" className="text-xl font-bold">Your {lesson.organization} Performance Course</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">The full path from zero to a competitor. This lesson is ready now; the rest are on the way.</p>
        <ol className="mt-4 space-y-1.5">
          {lesson.courseMap.map((title, i) => (
            <li key={title} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
              {i === currentIndex ? (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" aria-hidden />
                  {title}
                </span>
              ) : (
                <span className="text-muted-foreground">{title}</span>
              )}
              {i === currentIndex ? <Badge variant="outline" className="ml-auto">You&apos;re here</Badge> : <Badge variant="outline" className="ml-auto opacity-70">Coming soon</Badge>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
