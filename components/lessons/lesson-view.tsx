import { AlertTriangle, ArrowUpRight, Brain, CheckCircle2, Clock, Film, Lightbulb, Target, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthoredLesson } from "@/lib/lessons";
import { SourceFreshnessNote } from "@/components/source/source-freshness-note";

// Static teaching (sections 1-4 + the empty video slot). Theme-token styling so it reads in light and
// dark; status is always paired with an icon AND a text label (never color alone).
export function LessonView({ lesson }: { lesson: AuthoredLesson }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">General Debate</Badge>
          <Badge variant="outline">Lesson</Badge>
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

      {/* (1) What it is */}
      <section aria-labelledby="what-it-is" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="what-it-is" className="text-xl font-bold">What it is</h2>
        </div>
        <p className="mt-3 leading-7 text-muted-foreground">{lesson.whatItIs.intro}</p>
        <div className="mt-5 grid gap-3">
          {lesson.whatItIs.parts.map((part, i) => (
            <div key={part.term} className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="text-base font-bold">{part.term}</h3>
              </div>
              <p className="mt-2 leading-7 text-muted-foreground">{part.plain}</p>
              <p className="mt-2 border-l-2 border-primary/40 pl-3 leading-7">{part.example}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 leading-7 text-muted-foreground">{lesson.whatItIs.closer}</p>
      </section>

      {/* Optional video slot — empty placeholder, never a fake embed */}
      <section aria-labelledby="video-slot" className="rounded-lg border border-dashed bg-card p-6">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 id="video-slot" className="text-xl font-bold">Video walkthrough</h2>
        </div>
        {lesson.video.url ? (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-md border">
            <iframe
              src={lesson.video.url}
              title={`${lesson.title} video walkthrough`}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-3 flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed bg-muted/40 p-6 text-center">
            <Film className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-muted-foreground">Coming soon</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">{lesson.video.caption}</p>
          </div>
        )}
      </section>

      {/* (2) + (3) Same claim, weak vs strong */}
      <section aria-labelledby="contrast" className="rounded-lg border bg-card p-6">
        <h2 id="contrast" className="text-xl font-bold">See the difference on one claim</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Both arguments below defend the exact same claim. Only the warrant and impact change — that is the whole skill.
        </p>
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">The claim</p>
          <p className="mt-1 font-semibold">{lesson.sharedClaim}</p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {/* Weak */}
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ThumbsDown className="h-4 w-4" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-wide">Weak argument</h3>
            </div>
            <blockquote className="mt-3 border-l-2 border-amber-500/50 pl-3 leading-7 text-foreground">
              {lesson.weak.text}
            </blockquote>
            <p className="mt-4 text-sm font-semibold">Why it fails</p>
            <ul className="mt-2 space-y-2">
              {lesson.weak.reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Strong */}
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <ThumbsUp className="h-4 w-4" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-wide">Strong argument</h3>
            </div>
            <blockquote className="mt-3 border-l-2 border-emerald-500/50 pl-3 leading-7 text-foreground">
              {lesson.strong.text}
            </blockquote>
            <p className="mt-4 text-sm font-semibold">Why it works</p>
            <ul className="mt-2 space-y-2">
              {lesson.strong.reasons.map((reason) => (
                <li key={reason} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
          {lesson.strong.honestyNote}
        </p>
      </section>

      {/* Incremental revision — how to cross the gap, one pass at a time */}
      <section aria-labelledby="revise" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="revise" className="text-xl font-bold">Revise it, one pass at a time</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{lesson.revisionLadder.intro}</p>
        <ol className="mt-4 space-y-3">
          {lesson.revisionLadder.steps.map((step, i) => (
            <li key={step.label} className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                <h3 className="text-sm font-bold">{step.label}</h3>
              </div>
              <p className="mt-2 border-l-2 border-primary/40 pl-3 leading-7 text-foreground">{step.warrant}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.note}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Show, don't tell: evidence quality */}
      <section aria-labelledby="evidence" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="evidence" className="text-xl font-bold">Make your evidence specific</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{lesson.evidenceUpgrade.intro}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ThumbsDown className="h-4 w-4" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-wide">Vague</h3>
            </div>
            <blockquote className="mt-3 border-l-2 border-amber-500/50 pl-3 leading-7 text-foreground">{lesson.evidenceUpgrade.vague}</blockquote>
          </div>
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.06] p-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <ThumbsUp className="h-4 w-4" aria-hidden />
              <h3 className="text-sm font-bold uppercase tracking-wide">Specific</h3>
            </div>
            <blockquote className="mt-3 border-l-2 border-emerald-500/50 pl-3 leading-7 text-foreground">{lesson.evidenceUpgrade.specific}</blockquote>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold">What changed</p>
        <ul className="mt-2 space-y-2">
          {lesson.evidenceUpgrade.whatChanged.map((change) => (
            <li key={change} className="flex gap-2 text-sm leading-6 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span>{change}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">{lesson.evidenceUpgrade.honestyNote}</p>
      </section>

      {/* Misconception repair — name the wrong mental model, then correct it */}
      <section aria-labelledby="misconception" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="misconception" className="text-xl font-bold">The mental model to fix</h2>
        </div>
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">The wrong idea</p>
          <p className="mt-1 font-semibold">{lesson.misconception.name}</p>
          <p className="mt-2 leading-7 text-muted-foreground">{lesson.misconception.wrongModel}</p>
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold">Why it’s wrong</p>
          <p className="mt-1 leading-7 text-muted-foreground">{lesson.misconception.whyWrong}</p>
        </div>
        <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">The right model</p>
          <p className="mt-2 leading-7 text-foreground">{lesson.misconception.rightModel}</p>
        </div>
      </section>

      {/* (4) Common mistakes */}
      <section aria-labelledby="mistakes" className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
          <h2 id="mistakes" className="text-xl font-bold">Common mistakes</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">The three things debaters actually get wrong on this skill.</p>
        <ol className="mt-4 space-y-4">
          {lesson.commonMistakes.map((mistake, i) => (
            <li key={mistake.title} className="rounded-lg border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{i + 1}</span>
                <div>
                  <h3 className="font-bold">{mistake.title}</h3>
                  <p className="mt-1 leading-7 text-muted-foreground">{mistake.explanation}</p>
                  <p className="mt-2 flex gap-2 text-sm leading-6">
                    <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span><span className="font-semibold text-foreground">Fix:</span> <span className="text-muted-foreground">{mistake.fix}</span></span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
