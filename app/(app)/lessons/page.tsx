import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveTrack } from "@/lib/track-server";
import { lessonsForTrack } from "@/lib/lessons";

// Guided lessons index. Authored teaching lessons are General Debate only for now; other tracks show
// an honest empty state rather than a filled-in placeholder.
export default function LessonsIndexPage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = getActiveTrack(searchParams.track);
  const lessons = lessonsForTrack(activeTrack?.slug);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Guided lessons</Badge>
          {activeTrack ? <Badge variant="outline">{activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Learn the skill, then practice it</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Each lesson explains one skill in plain language, shows a weak argument next to a strong one so the
          difference is visible, names the mistakes debaters actually make, and ends with practice that updates
          your real mastery.
        </p>
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <BookOpen className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="font-semibold">No guided lessons here yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Guided lessons are being written for General Debate first. Switch to the General Debate track to see
              the first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/lessons/${lesson.slug}` as Route}
              className="group flex flex-col rounded-lg border bg-card p-5 transition-colors hover:bg-muted"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">General Debate</Badge>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {lesson.estimatedMinutes} min
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold">{lesson.title}</h2>
              <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{lesson.subtitle}</p>
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
