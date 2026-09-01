import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpen, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Fact } from "@/components/ui/fact";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { getActiveTrack } from "@/lib/track-server";
import { lessonsForTrack } from "@/lib/lessons";
import { roleplayLessonsForTrack } from "@/lib/roleplay-lessons";
import { educationLessonsForTrack, getEducationModule } from "@/lib/education/registry";
import { EDUCATION_TRACKS, isConceptEducationLessonEntry, type EducationTrack } from "@/lib/education/types";

/**
 * `TrainingTrack` still includes the soft-removed Model UN; `EducationTrack` deliberately does not.
 * Narrowing through the canonical list is what keeps a retired track from ever reaching the
 * education registry — it resolves to no lessons rather than being coerced into one.
 */
function educationTrack(track: string | undefined): EducationTrack | null {
  return EDUCATION_TRACKS.find((candidate) => candidate === track) ?? null;
}

/**
 * One availability statement about a lesson. `state` picks the reinforcement chip; the WORD in
 * `value` is the status, so the meaning survives with every styling class removed.
 */
type LessonAvailability = {
  label: string;
  value: string;
  state: "available" | "unavailable" | "informational";
  detail?: string;
};

type LessonCard = {
  slug: string;
  title: string;
  subtitle: string;
  minutes: number;
  label: string;
  kind: "Concept lesson" | "Role-play lesson";
  availability: LessonAvailability[];
  unavailableNote?: string;
};

const CHIP: Record<LessonAvailability["state"], "success" | "unavailable" | "info"> = {
  available: "success",
  unavailable: "unavailable",
  informational: "info"
};

// Guided lessons index (Learn -> Performance Course). Track-scoped: Debate shows its concept lessons,
// DECA/HOSA show their role-play course. Fail closed to an honest empty state when a track has none.
export default async function LessonsIndexPage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = await getActiveTrack(searchParams.track);
  const canonicalTrack = educationTrack(activeTrack?.id);
  const cards: LessonCard[] = [
    ...lessonsForTrack(activeTrack?.slug).map((l) => ({
      slug: l.slug, title: l.title, subtitle: l.subtitle, minutes: l.estimatedMinutes,
      label: "General Debate", kind: "Concept lesson" as const,
      // A concept lesson ends with its own checks AND the track keeps a separate drill set, so
      // neither fact may swallow the other. "Knowledge checks" is the term the migrated entries
      // below already use: the lesson's own questions are not the drill system, and calling them
      // "Practice" made one page name two different things the same way.
      availability: [
        { label: "Reading", value: "Available", state: "available" as const },
        {
          label: "Knowledge checks",
          value: "Available in this lesson",
          state: "available" as const,
          detail: "Questions inside the lesson. They check the reading you just did and save nothing."
        },
        {
          label: "Skill drills",
          value: "Available separately",
          state: "available" as const,
          detail: "A separate repeat-until-solid drill set in Study Arcade — not these questions."
        }
      ]
    })),
    // M11R5C: lessons differ in what they contain, so this page promises nothing on their behalf. A
    // withdrawn lesson carries its OWN short note (authored in the registry) rather than a page-level
    // guess about what it still offers. Everything below branches on the `practiceStatus`
    // discriminant — never on a slug, and never on missing data.
    ...roleplayLessonsForTrack(activeTrack?.slug).map((l) => ({
      slug: l.slug, title: l.title, subtitle: l.subtitle, minutes: l.estimatedMinutes,
      label: l.organization, kind: "Role-play lesson" as const,
      unavailableNote: l.practiceStatus === "available" ? undefined : l.practiceUnavailable.cardNote,
      availability: l.practiceStatus === "available"
        ? [
            { label: "Reading", value: "Available", state: "available" as const },
            {
              label: "Guided practice",
              value: "Available",
              state: "available" as const,
              // Supported by the practice component itself, which persists a device-local draft and
              // explicitly nothing else — no server write, no completion, no mastery, no rating.
              detail: "Guided practice is available, but it does not create a saved score, competition result, or mastery record."
            }
          ]
        : [
            { label: "Reading", value: "Available", state: "available" as const },
            { label: "Interactive scenario", value: "Unavailable", state: "unavailable" as const },
            { label: "Scope", value: "Informational only", state: "informational" as const }
          ]
    })),
    // M13E1B — migrated Debate concept lessons, in registry (teaching) order after the lesson that
    // already shipped. Only learner-visible canonical entries of the migrated source kind appear, so
    // the three pre-existing lessons are never listed twice.
    ...(canonicalTrack
      ? educationLessonsForTrack(canonicalTrack)
          .filter(isConceptEducationLessonEntry)
          .filter((entry) => entry.visibility === "learner")
          .map((entry) => ({
            slug: entry.id,
            title: entry.source.lesson.title,
            subtitle: entry.source.lesson.content.objective,
            minutes: entry.source.lesson.estimatedMinutes,
            label: getEducationModule(entry.moduleId)?.label ?? "General Debate",
            kind: "Concept lesson" as const,
            // Reading and checks, and nothing saved. Stated as words first, exactly like every other
            // card here, so the meaning survives with all styling removed.
            availability: [
              { label: "Reading", value: "Available", state: "available" as const },
              {
                label: "Knowledge checks",
                value: "Available in this lesson",
                state: "available" as const,
                detail: "Answering them saves nothing — no score, no progress, no mastery record."
              },
              {
                label: "Skill drills",
                value: "Available separately",
                state: "available" as const,
                detail: "A separate repeat-until-solid drill set in Study Arcade — not these questions."
              }
            ]
          }))
      : [])
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        badges={
          <>
            <Badge variant="secondary">Performance Course</Badge>
            {activeTrack ? <Badge variant="outline">{activeTrack.label}</Badge> : null}
          </>
        }
        heading={<h1 className="page-title">Learn how your event works</h1>}
        description={
          <p>
            Each lesson explains the concept or the event in plain language and shows the learning activities available
            for that topic. Lessons differ in what they include, so each card says what its own lesson offers.
          </p>
        }
      />

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
        <div className="space-y-4">
          {cards.map((card) => (
            // Deliberately NOT one card-wide link any more: the entry now carries several
            // availability statements, and wrapping them all in an anchor would make the link's
            // accessible name the whole card. One real action, one accessible name.
            <article key={card.slug} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{card.label}</Badge>
                <StatusChip variant="neutral" icon={null}>{card.kind}</StatusChip>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {card.minutes} min
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold">{card.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.subtitle}</p>

              {/* What this lesson actually offers. Every value is a word first; the chip only
                  reinforces it, so nothing here depends on colour. */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {card.availability.map((item) => (
                  <Fact
                    key={item.label}
                    label={item.label}
                    value={<StatusChip variant={CHIP[item.state]}>{item.value}</StatusChip>}
                    description={item.detail}
                  />
                ))}
              </div>

              {/* Visible text, not colour alone. The wording is the lesson's own authored note. */}
              {card.unavailableNote ? (
                <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  {card.unavailableNote}
                </p>
              ) : null}

              <Link
                href={`/lessons/${card.slug}` as Route}
                className={cn(buttonVariants(), "mt-4 h-auto min-h-11 min-w-11 px-4")}
              >
                Start lesson
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
