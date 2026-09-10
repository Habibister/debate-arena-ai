import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpenCheck, Compass, Dumbbell, MessageSquareText, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DECA_DRILL_AREAS } from "@/lib/deca-drills";
import { decaPracticeMappingForArea } from "@/lib/education/deca-practice-map";
import { getEducationLesson } from "@/lib/education/registry";
import { EDUCATION_TRACKS, isConceptEducationLessonEntry, type EducationTrack } from "@/lib/education/types";
import type { TrainingTrack } from "@/lib/training-tracks";

/**
 * The skills index (M13E1C).
 *
 * This component was a hardcoded array of nine fictional skills carrying invented mastery
 * percentages (82%, 64%, 58%…), a "Mastery Map" heading, a permanently locked Public Speaking row
 * that could never unlock because no such skill is seeded, and three destinations that 404 when
 * opened. None of it came from the database or from any real learner activity.
 *
 * It now lists what actually exists. Every tile leads somewhere that resolves. There is no
 * percentage, no bar and no completion or mastery claim, because this component has no access to
 * real per-learner progress and will not imply otherwise.
 *
 * For General Debate it lists PRACTICE destinations. It previously listed the track's published
 * LESSONS here, each tile opening `/lessons/<id>` — so this surface was a second copy of the Learn
 * catalog wearing the word "skills", and the training hub linked to it as "Skill drills". A learner
 * who followed Practice arrived back at the reading. Debate's drills and its review queue are what
 * this surface names now; the lessons are reachable where they live, under Learn.
 */

type TileAction = { label: string; href: Route };

type Tile = {
  key: string;
  title: string;
  /** What half of the DECA event this trains, where the record states one. Omitted elsewhere. */
  component?: string;
  detail: string;
  icon: typeof BookOpenCheck;
  /** Every destination this tile offers, in the order a learner uses them: learn it, then practise it. */
  actions: TileAction[];
};

/**
 * The four DECA areas, built from the canonical map rather than restated here (Final DECA cleanup).
 *
 * The page told a DECA learner "DECA records four skills — performance indicators, business reasoning,
 * customer relations and marketing fundamentals" and then listed one role-play room, so none of the
 * four was openable and the learner could not tell which were role-play skills and which the cluster
 * exam tests. Every field below comes from the two modules that already own it:
 *
 *   • lib/deca-drills.ts        — the area id used in `?area=`, its label and its description
 *   • lib/education/deca-practice-map.ts — which half of the event it serves and the lesson that OWNS
 *                                          teaching it
 *
 * Nothing is inferred from a name. An area whose mapping is missing, whose coverage is not "owned", or
 * whose teaching owner is not a learner-visible lesson is still LISTED with its drill — it is a real
 * recorded area — but it is never given a teaching link the record does not support.
 */
function decaAreaTiles(): Tile[] {
  return DECA_DRILL_AREAS.map((area) => {
    const mapping = decaPracticeMappingForArea(area.id);
    const ownerId = mapping?.coverage === "owned" ? mapping.publishedTeachingOwner : null;
    const owner = ownerId ? getEducationLesson(ownerId) : undefined;
    const lesson = owner && owner.visibility === "learner" && isConceptEducationLessonEntry(owner) ? owner : undefined;
    const lessonTitle = lesson?.source.lesson.title;
    const actions: TileAction[] = [];
    if (lesson && lessonTitle) {
      // "Start with" and not "taught by": the map's own note says this field names ONE lesson per area
      // even where the curriculum defines several — Marketing is taught across MK1-MK6 and this is its
      // gateway. It is a remediation destination, so the label promises a starting point, not coverage.
      actions.push({ label: `Start with the lesson: ${lessonTitle}`, href: `/lessons/${lesson.id}?track=deca` as Route });
    }
    actions.push({ label: "Drill it in the Study Arcade", href: `/study-arcade?track=deca&area=${area.id}` as Route });
    return {
      key: area.id,
      title: area.label,
      // ATTRIBUTED, because the split is OURS. lib/education/deca-practice-map.ts records it as "a
      // distinction the product had not modelled" — CompeteReady's training model, not a DECA
      // publication. Saying "the exam tests this" unattributed would put our grouping in DECA's mouth.
      component:
        mapping?.component === "roleplay"
          ? "CompeteReady grouping: role-play side"
          : mapping?.component === "exam"
            ? "CompeteReady grouping: exam side"
            : undefined,
      detail: area.description,
      // An unclassified area gets a neutral icon too — the word and the icon must agree, or the tile
      // looks classified while the text says nothing.
      icon: mapping?.component === "roleplay" ? MessageSquareText : mapping?.component === "exam" ? BookOpenCheck : Dumbbell,
      actions
    };
  });
}

function canonicalTrack(track: TrainingTrack | undefined): EducationTrack | null {
  return EDUCATION_TRACKS.find((candidate) => candidate === track) ?? null;
}

function tilesForTrack(track: TrainingTrack | undefined): Tile[] {
  const canonical = canonicalTrack(track);
  if (!canonical) return [];

  if (canonical === "GENERAL_DEBATE") {
    // Exactly the two Debate practice capabilities that exist today. Written practice is deliberately
    // absent: it is real, but it opens only from a skill's own compatibility page and from the review
    // queue, so naming it here would be inventing a destination rather than surfacing one.
    return [
      {
        key: "debate-drills",
        title: "Debate skill drills",
        detail: "Short sets on one skill at a time — claim/warrant/impact, rebuttal, evidence, weighing, clash, signposting, constructive.",
        icon: Dumbbell,
        actions: [{ label: "Open skill drills", href: "/study-arcade?track=debate" as Route }]
      },
      {
        key: "debate-review",
        title: "Reviews due",
        detail: "Skills that record your practice come back later on a spacing schedule. It never shows a number you did not earn.",
        icon: RotateCcw,
        actions: [{ label: "Open reviews", href: "/study-arcade/review?track=debate" as Route }]
      }
    ];
  }

  if (canonical === "DECA") {
    return [
      ...decaAreaTiles(),
      {
        key: "deca-practice",
        title: "DECA role-play practice",
        // P1-D: this said "Nothing is scored or recorded". The second half is true — no DECA role-play
        // writes anything. The first half was false: the room ends in a judged ballot and renders an
        // overall score. Under-claiming is still claiming wrongly, and a learner told nothing is scored
        // then handed a number learns that the product does not know what it does.
        component: "The whole event",
        detail: "Work a scenario end to end with a coach available. You get a practice score — nothing is recorded.",
        icon: MessageSquareText,
        actions: [{ label: "Open practice", href: "/training/deca/practice" as Route }]
      }
    ];
  }

  return [
    {
      key: "hosa-events",
      title: "Find your HOSA event",
      detail: "HOSA events differ too much for one path. Start from your exact event and train what it contains.",
      icon: Compass,
      actions: [{ label: "Open the Event Navigator", href: "/training/hosa/events" as Route }]
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
  const showsDecaGrouping = canonicalTrack(track) === "DECA";

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Skills in this track</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Same rule the Event Navigator states while a learner browses families: a grouping we made
            for training is named as ours, where the learner is reading it. */}
        {showsDecaGrouping ? (
          <p className="mb-3 rounded-md border bg-muted/40 p-3 text-xs leading-6 text-muted-foreground">
            Role-play side and exam side are <span className="font-medium text-foreground">how CompeteReady groups these
            for training</span> — not DECA&apos;s published taxonomy, and not a statement of what your exam contains. Your
            current official event guideline is the authority on that.
          </p>
        ) : null}
        {tiles.length === 0 ? (
          // Fail closed: with no resolved track we show nothing rather than another track's content.
          <p className="text-sm text-muted-foreground">Pick a track to see the skills it trains.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <li key={tile.key} className="rounded-lg border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-track" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold text-foreground">{tile.title}</p>
                      {/* The classification is a WORD, not a colour or an icon: which half of the
                          event this trains is the thing a beginner cannot work out from the name. */}
                      {tile.component ? (
                        <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{tile.component}</p>
                      ) : null}
                      {tile.detail ? (
                        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{tile.detail}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {tile.actions.map((action) => (
                          <Link
                            key={action.href}
                            href={action.href}
                            className="focus-ring inline-flex min-h-11 min-w-11 items-center gap-1 break-words text-sm font-semibold text-primary"
                          >
                            {action.label}
                            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
