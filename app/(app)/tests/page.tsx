import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { BookOpenCheck, CheckCircle2, ClipboardList, Layers3, Sparkles } from "lucide-react";
import { TestBuilderPreview } from "@/components/tests/test-builder-preview";
import { PracticeTestGenerator } from "@/components/tests/practice-test-generator";
import { RubricBreakdown } from "@/components/specs/rubric-breakdown";
import { SpecBanner } from "@/components/specs/spec-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOfficialTestFormat, specEventTypesFor } from "@/lib/competition-specs";
import { testableEventTypes } from "@/lib/test-availability";
import { getActiveTrack } from "@/lib/track-server";
import { trackHasPracticeTests } from "@/lib/training-tracks";

const testSteps = [
  { title: "Generate", detail: "Choose 10, 25, 50, or a 100-question mixed exam.", icon: Sparkles },
  { title: "Answer", detail: "Complete the set with progress tracking.", icon: ClipboardList },
  { title: "Improve", detail: "Review explanations and recommended lessons.", icon: BookOpenCheck }
];

// The header describes exactly the organization the generator below is locked to. Keyed rather than
// compared, so this copy adds no second `lockedOrganization === "DECA"` branch to a file whose DECA
// branch is a pinned control.
const HEADER_DESCRIPTION = {
  DECA: "Generate original questions by DECA event cluster, score attempts, explain mistakes, and route weak areas into lessons.",
  HOSA: "Generate original questions by HOSA event category, score attempts, explain mistakes, and route weak areas into lessons.",
  BOTH: "Generate original questions by DECA event cluster or HOSA event category, score attempts, explain mistakes, and route weak areas into lessons."
} as const;

export default async function TestsPage({ searchParams }: { searchParams: { track?: string; assignmentId?: string } }) {
  // `?track=` wins; otherwise fall back to the selected track (cookie).
  const activeTrack = await getActiveTrack(searchParams.track);
  const isAssignment = Boolean(searchParams.assignmentId);
  // A track with no practice-test product does not get a page explaining that it has no practice
  // tests. That empty state read as a feature the track almost had, and it was reachable from a
  // Tests entry the navigation should never have offered. The learner goes to their own track's
  // drill destination instead — Study Arcade is track-scoped, so this stays correct for any future
  // track without a test product.
  //
  // An ASSIGNED test (?assignmentId=) is exempt and always renders. An assignment is a real
  // obligation from a coach, and redirecting away from one would break it; the generator is locked
  // to the assignment's own organization, not to the selected track.
  if (!isAssignment && activeTrack && !trackHasPracticeTests(activeTrack.id)) {
    redirect(`/study-arcade?track=${activeTrack.slug}`);
  }
  const lockedOrganization = activeTrack?.id === "DECA" ? "DECA" : activeTrack?.id === "HOSA" ? "HOSA" : undefined;
  // Registry-driven official test shape (HOSA MT: 50 questions / 60 minutes). Null when the
  // registry has no timed multiple-choice round for the organization — generator is unchanged.
  const officialFormat = lockedOrganization ? await getOfficialTestFormat(lockedOrganization) : null;
  // The study CTA names decks only for a track that HAS them (DECA/HOSA). An assigned test is exempt
  // from the redirect above, so a Debate-resolved learner can reach this page — they get the generic
  // arcade link, never "Study General Debate terms" pointing at a deck list that does not exist.
  const studyTrack = lockedOrganization ? activeTrack : undefined;
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        {/* FINAL DECA CLEANUP — a track-scoped page describes ONE track.
            The eyebrow read "DECA and HOSA" and the description named both an event cluster and an
            event category on every render, including /tests?track=deca, where the generator below is
            already locked to DECA and uses only the DECA vocabulary. A beginner had to work out which
            half of the sentence was theirs. Both strings now follow `lockedOrganization`, which is the
            same value that locks the generator — so the header cannot describe a track the page is not
            serving. Where no organization is locked (an assigned test, or no resolved track) the
            generator really does offer both, and the copy still says both. */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{lockedOrganization ?? "DECA and HOSA"}</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Practice tests</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {HEADER_DESCRIPTION[lockedOrganization ?? "BOTH"]}
        </p>
{/* OWNER QA REPAIR 3C — the attribution here is per ORGANIZATION, because the two specs are
            different KINDS of document.

            DECA: the only seeded spec is the Hotel and Lodging Management Series, a ROLE-PLAY event.
            This page carried its judged evaluation form ("Official rubric — …, 100 points total",
            twelve scored lines) directly above a multiple-choice generator that scores nothing of the
            sort — a test result is the proportion answered correctly
            (app/api/tests/[testId]/grade/route.ts). It also carried that event's source banner over a
            generator whose cluster the learner picks freely, defaulting to Marketing. Neither belongs
            to this product: the exam segment of that spec carries no duration, so nothing on this page
            is derived from it at all. Both are gone for DECA; the form is still shown where it applies,
            on the event's own page.

            HOSA: the seeded spec IS the written test (Medical Terminology, 50 items / 60 minutes), its
            rubric line IS this product's scoring rule ("Test score — one point per correct item"), and
            the official-format option on the generator really is derived from it. Both stay. */}
        {/* HOSA H2 — the official block moved INTO the generator, and this is why.
            HOSA's seeded spec describes exactly one event: Medical Terminology. This header rendered
            its source banner, its rubric and its point total once per page load, above a generator
            where the learner then picks any of sixteen categories. Choosing Nutrition left "Official
            rubric — Medical Terminology (2025-2026)", "50 points total" and the 2026-07-05
            verification date on screen, reading as though they governed the set about to be
            generated. Fifteen of the sixteen categories have no official specification at all.
            A claim about one event can only be scoped by the selection that names the event, and that
            selection is client state, so the block now travels to the generator and renders only while
            Medical Terminology is chosen. Nothing about the claim itself changed. */}
        {lockedOrganization === "DECA" ? (
          <div className="mt-4">
            <p className="rounded-md border bg-background p-3 text-xs leading-6 text-muted-foreground">
              These are original multiple-choice questions on the cluster you choose, and your result is the share you
              answer correctly. DECA&apos;s judged evaluation form scores a role-play, not a test like this one, so it is
              not shown here — you will find it on your event&apos;s own page, with the role-play it belongs to.
            </p>
          </div>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {testSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-md border bg-background p-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  {step.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Every path that reaches this render has a generator to show: a track with practice tests, an
          assignment, or no selected track at all. The empty state that used to sit here is gone. */}
      <PracticeTestGenerator
        lockedOrganization={lockedOrganization}
        officialFormat={officialFormat}
        // The practice event types this specification actually describes. Both selectors name an
        // event, so both have to agree before the claim may speak: HOSA's spec maps from
        // HEALTH_SCIENCE_EVENT only, and a Prepared Speaking set is not a 50-item written exam.
        officialEventTypes={
          lockedOrganization && officialFormat
            ? specEventTypesFor(lockedOrganization, officialFormat.eventName)
            : []
        }
        // Server-rendered here (both read the registry), handed to the client generator as an element
        // it may only render while the selected category is the event these describe.
        officialClaims={
          lockedOrganization === "HOSA" ? (
            <div className="space-y-3">
              <SpecBanner organization={lockedOrganization} />
              <RubricBreakdown organization={lockedOrganization} />
            </div>
          ) : null
        }
      />
      <TestBuilderPreview organization={lockedOrganization} />

      <Card>
        <CardHeader>
          {/* Deliberately UNCHANGED. Renaming this to "What DECA tests cover" read as a claim about
              content, and the tiles under it list EVENT_OPTIONS labels (Roleplay, Case Study) — event
              types, not what a generated test covers, which comes from the cluster list instead. The
              card also holds the "After grading" tile, which is not coverage either. */}
          <CardTitle>Supported test tracks</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {!activeTrack || activeTrack.id === "DECA" ? (
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">DECA</p>
              {/* H3: the events that can actually be TESTED, not every event the organization runs.
                  This listed HOSA's Prepared Speaking as a supported practice test while the generator
                  above and the API both refuse it — a page contradicting itself two cards apart. */}
              <p className="mt-2 font-semibold">{testableEventTypes("DECA").map((event) => event.label).join(", ")}</p>
            </div>
          ) : null}
          {!activeTrack || activeTrack.id === "HOSA" ? (
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">HOSA</p>
              <p className="mt-2 font-semibold">{testableEventTypes("HOSA").map((event) => event.label).join(", ")}</p>
            </div>
          ) : null}
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
              After grading
            </div>
            <p className="mt-2 font-semibold">Score, explanations, weak areas, recommended lessons</p>
          </div>
        </CardContent>
      </Card>

      {/* Owner QA Repair 2: this went to the bare `/study` shim, which forwarded to the Study Arcade
          under the learner's DEFAULT track — a DECA tests page sent its reader to Debate decks. The
          destination now keeps the resolved track, and the label names only the decks it opens. */}
      <Link href={(studyTrack ? `/study-arcade?track=${studyTrack.slug}` : "/study-arcade") as Route} className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
        <Layers3 className="mt-1 h-5 w-5 text-primary" aria-hidden />
        <span>
          <span className="block font-semibold">{studyTrack ? `Study ${studyTrack.label} terms before testing` : "Study DECA/HOSA terms before testing"}</span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
            Open original flashcard decks with definitions, examples, quick checks, and external video resources.
          </span>
        </span>
      </Link>
    </div>
  );
}
