import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpenCheck, Compass, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { educationLessonsForTrack } from "@/lib/education/registry";
import { EDUCATION_TRACKS, isConceptEducationLessonEntry, type EducationTrack } from "@/lib/education/types";
import { getLesson } from "@/lib/lessons";
import type { TrainingTrack } from "@/lib/training-tracks";

/**
 * The skills index (M13E1C).
 *
 * This component was a hardcoded array of nine fictional skills carrying invented mastery
 * percentages (82%, 64%, 58%…), a "Mastery Map" heading, a permanently locked Public Speaking row
 * that could never unlock because no such skill is seeded, and three destinations that 404 when
 * opened. None of it came from the database or from any real learner activity.
 *
 * It now lists what actually exists: the track's real authored lessons, and — for DECA and HOSA,
 * whose training lives outside the lesson system — the one true destination each. Every tile leads
 * somewhere that resolves. There is no percentage, no bar and no completion or mastery claim,
 * because this component has no access to real per-learner progress and will not imply otherwise.
 */

type Tile = { key: string; title: string; detail: string; href: Route; icon: typeof BookOpenCheck; cta: string };

function canonicalTrack(track: TrainingTrack | undefined): EducationTrack | null {
  return EDUCATION_TRACKS.find((candidate) => candidate === track) ?? null;
}

function tilesForTrack(track: TrainingTrack | undefined): Tile[] {
  const canonical = canonicalTrack(track);
  if (!canonical) return [];

  if (canonical === "GENERAL_DEBATE") {
    return educationLessonsForTrack(canonical)
      .filter((entry) => entry.visibility === "learner")
      .map((entry) => {
        // The shipped Claim/Warrant/Impact lesson is not a migrated concept entry, so its wording
        // comes from its own legacy object rather than from the concept source shape.
        const legacy = isConceptEducationLessonEntry(entry) ? null : getLesson(entry.id);
        return {
          key: entry.id,
          title: isConceptEducationLessonEntry(entry) ? entry.source.lesson.title : legacy?.title ?? entry.id,
          detail: isConceptEducationLessonEntry(entry) ? entry.source.lesson.content.objective : legacy?.subtitle ?? "",
          href: `/lessons/${entry.id}` as Route,
          icon: BookOpenCheck,
          cta: "Open lesson"
        };
      });
  }

  if (canonical === "DECA") {
    return [
      {
        key: "deca-practice",
        title: "DECA role-play practice",
        detail: "Work a scenario end to end with a coach available. Nothing is scored or recorded.",
        href: "/training/deca/practice" as Route,
        icon: MessageSquareText,
        cta: "Open practice"
      }
    ];
  }

  return [
    {
      key: "hosa-events",
      title: "Find your HOSA event",
      detail: "HOSA events differ too much for one path. Start from your exact event and train what it contains.",
      href: "/training/hosa/events" as Route,
      icon: Compass,
      cta: "Open the Event Navigator"
    }
  ];
}

/**
 * `showSampleProgress` is still accepted because `app/(app)/skills/page.tsx` passes it, and that
 * route is outside this change's boundary. It is deliberately UNUSED: it existed to gate demo-only
 * mastery literals, and there are no longer any percentages on this surface to gate.
 */
export function SkillPath({ track }: { showSampleProgress?: boolean; track?: TrainingTrack }) {
  const tiles = tilesForTrack(track);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills in this track</CardTitle>
      </CardHeader>
      <CardContent>
        {tiles.length === 0 ? (
          // Fail closed: with no resolved track we show nothing rather than another track's content.
          <p className="text-sm text-muted-foreground">Pick a track to see the skills it trains.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <li key={tile.key}>
                  <Link
                    href={tile.href}
                    className="focus-ring flex min-h-11 min-w-11 items-start gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted"
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-track" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-semibold text-foreground">{tile.title}</span>
                      {tile.detail ? (
                        <span className="mt-1 block break-words text-sm leading-6 text-muted-foreground">{tile.detail}</span>
                      ) : null}
                      <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                        {tile.cta}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
