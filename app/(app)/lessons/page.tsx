import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpen, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveTrack } from "@/lib/track-server";
import { lessonsForTrack } from "@/lib/lessons";
import { roleplayLessonsForTrack } from "@/lib/roleplay-lessons";

type LessonCard = { slug: string; title: string; subtitle: string; minutes: number; label: string; unavailableNote?: string };

// Guided lessons index (Learn -> Performance Course). Track-scoped: Debate shows its concept lessons,
// DECA/HOSA show their role-play course. Fail closed to an honest empty state when a track has none.
export default function LessonsIndexPage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = getActiveTrack(searchParams.track);
  const cards: LessonCard[] = [
    ...lessonsForTrack(activeTrack?.slug).map((l) => ({ slug: l.slug, title: l.title, subtitle: l.subtitle, minutes: l.estimatedMinutes, label: "General Debate" })),
    // M11R5C: lessons differ in what they contain, so this page promises nothing on their behalf. A
    // withdrawn lesson carries its OWN short note (authored in the registry) rather than a page-level
    // guess about what it still offers.
    ...roleplayLessonsForTrack(activeTrack?.slug).map((l) => ({
      slug: l.slug, title: l.title, subtitle: l.subtitle, minutes: l.estimatedMinutes, label: l.organization,
      unavailableNote: l.practiceStatus === "available" ? undefined : l.practiceUnavailable.cardNote
    }))
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Performance Course</Badge>
          {activeTrack ? <Badge variant="outline">{activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Learn how your event works</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Each lesson explains the concept or the event in plain language and shows the learning activities available
          for that topic. Lessons differ in what they include, so each card says what its own lesson offers.
        </p>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="font-semibold">No guided lessons here yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Guided lessons are rolling out per track. Switch tracks to see the ones that are ready.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.slug}
              href={`/lessons/${card.slug}` as Route}
              className="group flex flex-col rounded-lg border bg-card p-5 transition-colors hover:bg-muted"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{card.label}</Badge>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {card.minutes} min
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold">{card.title}</h2>
              <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{card.subtitle}</p>
              {/* Visible text, not colour alone. The wording is the lesson's own authored note. */}
              {card.unavailableNote ? (
                <span className="mt-2 inline-flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {card.unavailableNote}
                </span>
              ) : null}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Start lesson
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
