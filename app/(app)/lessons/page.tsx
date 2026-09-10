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
import { EDUCATION_COURSES, educationLessonsForTrack, getEducationLesson, getEducationModule } from "@/lib/education/registry";
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
  /** QA-R2 #15: which course this lesson belongs to, or null for a lesson outside the course model. */
  courseId?: string | null;
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
      courseId: getEducationLesson(l.slug)?.courseId ?? null,
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
            // Fails CLOSED to a neutral word. The old fallback was the literal "General Debate", so a
            // metadata slip on a DECA or HOSA entry would have printed another track's name on its card.
            label: getEducationModule(entry.moduleId)?.label ?? "Lesson",
            kind: "Concept lesson" as const,
            courseId: entry.courseId,
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

  // The registry's course `label` is documented as an internal name, so the learner-facing heading is
  // named here per course and falls back to that label for any course this map does not know.
  const COURSE_HEADING: Record<string, string> = {
    "deca-roleplay-core": "Role-play course",
    "deca-business-content": "Business-content course",
    "debate-performance": "Performance course"
  };

  // QA-R2 #15. The catalog put every card under one badge reading "Performance Course", so twelve DECA
  // lessons looked like one course — while the course map inside a role-play lesson listed five steps.
  // They are two DIFFERENT approved courses: the role-play core and the business-content course. The
  // page now groups by the course each lesson actually belongs to and names it, so the learner can see
  // how many things there are and which one they are in. A lesson outside the course model (the older
  // authored Debate set) keeps its own group.
  const courseGroups = EDUCATION_COURSES.filter((course) => course.track === canonicalTrack)
    .map((course) => ({
      course,
      heading: COURSE_HEADING[course.id] ?? course.label,
      cards: cards.filter((card) => card.courseId === course.id)
    }))
    .filter((group) => group.cards.length > 0);
  const ungrouped = cards.filter((card) => !courseGroups.some((group) => group.cards.includes(card)));

  return (
    <div className="space-y-6">
      <PageHeader
        badges={
          <>
            <Badge variant="secondary">{courseGroups.length > 1 ? `${courseGroups.length} courses` : "Guided lessons"}</Badge>
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
        <div className="space-y-8">
          {[
            ...courseGroups.map((group) => ({ key: group.course.id, heading: group.heading, cards: group.cards })),
            ...(ungrouped.length > 0
              ? [{ key: "other", heading: courseGroups.length > 0 ? "Other lessons in this track" : "Lessons", cards: ungrouped }]
              : [])
          ].map((group) => (
            <section key={group.key} className="space-y-4" aria-labelledby={`course-${group.key}`}>
              <div>
                <h2 id={`course-${group.key}`} className="text-lg font-bold">
                  {group.heading}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {group.cards.length} {group.cards.length === 1 ? "lesson" : "lessons"} published in this course, in order.
                </p>
              </div>
              {group.cards.map((card) => (
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
            </section>
          ))}
        </div>
      )}

      {/* SECONDARY, and deliberately last. Debate's journey is Learn then Compete: drills and reviews
          are things a learner does inside Learn, not a separate product area, so Learn has to reach
          them — but the teaching stays the page. This is one small block of links after every lesson
          card, never a grid of drill cards competing with the lessons above it.

          No counts and no due badge here on purpose: this page reads no session and imports no
          persistence layer (education-migration asserts that), so it cannot know what is due without
          becoming a different kind of page. It names the destination; the destination knows. */}
      {activeTrack?.id === "GENERAL_DEBATE" && cards.length > 0 ? (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-base font-semibold">After a lesson</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              A lesson teaches the skill; a drill repeats it and tells you whether it added to your record.
              Skills that record come back later for review.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href={"/study-arcade?track=debate" as Route}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 min-w-11 px-4")}
              >
                Drill a skill
              </Link>
              <Link
                href={"/study-arcade/review?track=debate" as Route}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 min-w-11 px-4")}
              >
                Reviews that are due
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
