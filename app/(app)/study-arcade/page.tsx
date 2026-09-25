import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { BookOpenCheck, Gamepad2, Layers3, PlayCircle, RotateCcw, Sparkles } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { ConceptDrills } from "@/components/training/concept-drills";
import { DebateDrills } from "@/components/training/debate-drills";
import { DRILL_AREAS, drillAreaFromQuery, progressTrackingForAreas } from "@/lib/debate-drills";
import { DecaRoleplaySetup } from "@/components/training/deca-roleplay-setup";
import { DECA_DRILL_AREAS, isDecaDrillArea } from "@/lib/deca-drills";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countDueReviews } from "@/lib/spaced-review";
import { deckSummaries } from "@/lib/study-content";
import { getActiveTrack } from "@/lib/track-server";

// Study Arcade landing — the drill layer's front door per the master plan. This is the shell:
// existing decks and games are linked (not rebuilt), and the review tiles show REAL activity
// numbers from MasteryProgress or honest empty states. No fabricated counts, ever.
export default async function StudyArcadePage({
  searchParams
}: {
  searchParams: { track?: string; area?: string; focus?: string };
}) {
  const activeTrack = await getActiveTrack(searchParams.track);
  // `?area=` is untrusted URL text. It is narrowed against the real Debate drill areas — never cast —
  // and anything unknown, empty or belonging to another track simply yields `undefined`, which leaves
  // the drill on its existing "mixed" default. It is applied ONLY to the Debate component, so a
  // Debate area on a DECA or HOSA URL changes nothing about those tracks.
  const debateArea = drillAreaFromQuery(searchParams.area);
  // QA-R3 #11. A link labelled "Full DECA Simulation" used to land at the top of this page, thousands
  // of pixels above the simulation, and an anchor alone did not reliably deliver the learner there. The
  // simulation is one section of this page, not a separate product, so the link asks the page to LEAD
  // with it instead. Same component, same route, no duplicate page — only the order changes.
  const focusSimulation = searchParams.focus === "simulation";
  // The same narrowing for DECA. Without it the DECA branch dropped `?area=` entirely, so the
  // concept lesson's "Practice this skill in the Performance indicators drill" link landed on the
  // mixed picker — a link whose visible label named one drill and whose destination was another.
  const decaArea = isDecaDrillArea(searchParams.area) ? searchParams.area : undefined;
  const allDecks = deckSummaries();
  const decks = activeTrack ? allDecks.filter((d) => d.organization === activeTrack.organization) : allDecks;
  const cardCount = decks.reduce((total, deck) => total + deck.count, 0);
  const hasDecks = decks.length > 0;
  // The resolved track's OWN slug — not the raw query, which was empty whenever the track came from
  // the learner's selection or organization and so emitted `?track=` with nothing after it.
  const trackQuery = activeTrack ? `?track=${activeTrack.slug}` : "";

  // DECA Full Simulation entry point: fetch the registry-driven prep format only when DECA is in view.
  // Null (no spec) makes the simulation degrade to an untimed flow with no fake "official" clock.
  const showDeca = !activeTrack || activeTrack.id === "DECA";

  // PROGRESS-TRACKING CAPABILITY for the Debate drills setup copy. The client cannot see whether a
  // `Skill` row exists, and the submit writer refuses to record without one, so the promise had to
  // be resolved here or not made. Fails CLOSED: any error leaves the set empty, every area resolves
  // to `skill-missing`, and the learner is told progress is not tracked rather than promised a
  // record that will not happen. Read-only; this seeds nothing.
  let seededDrillSkills = new Set<string>();
  try {
    const slugs = DRILL_AREAS.map((area) => area.skillSlug).filter(Boolean);
    const rows = await prisma.skill.findMany({ where: { slug: { in: slugs } }, select: { slug: true } });
    seededDrillSkills = new Set(rows.map((row) => row.slug));
  } catch {
    // leave empty — no promise is made when the answer is unknown
  }
  const debateProgressTracking = progressTrackingForAreas(seededDrillSkills);

  // Real practice signals for the review tiles (0 for a brand-new account; never sample data).
  const session = await getServerSession(authOptions);
  let practicedSkills = 0;
  let skillsInProgress = 0;
  let reviewsDue = 0;
  // OWNER QA #2: these counted every MasteryProgress row the learner had, on a page that says
  // "Training in: DECA" and sits beside a review tile that IS track-scoped. A DECA learner whose only
  // recorded skills were Debate ones read "4 skills with a recorded result so far" on the DECA page.
  // The count is scoped through the Skill's own organization — the authoritative relationship, the
  // same one getDueReviews uses — rather than fetched globally and relabelled. No resolved track
  // means no count, matching the review contract: an unresolved track is never "show everything".
  if (session?.user?.id && activeTrack) {
    try {
      const trackScope = { userId: session.user.id, lastPracticedAt: { not: null }, skill: { organization: activeTrack.organization } };
      [practicedSkills, skillsInProgress, reviewsDue] = await Promise.all([
        prisma.masteryProgress.count({ where: trackScope }),
        prisma.masteryProgress.count({ where: { ...trackScope, NOT: { masteryLevel: "MASTERED" } } }),
        countDueReviews(session.user.id, activeTrack.organization)
      ]);
    } catch {
      // reviews tiles degrade to zero-state rather than breaking the page
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Study Arcade</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="page-title mt-3">Study Arcade</h1>
        {/* G19 (M14 Phase 1e): recording claims are scoped to the surfaces that actually record.
            Drills write mastery + spaced review; flashcard decks and review games make no server
            write at all (components/study/ issues none), so the copy must never lump them in. */}
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Repetition that doesn&apos;t feel like a chore: skill drills{activeTrack ? ` for ${activeTrack.label}` : ""},
          plus flashcard decks and review games that sharpen recall. Each drill says whether it added to your
          record — decks and games never do.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <RotateCcw className="h-4 w-4 text-primary" aria-hidden />
              Reviews due
            </div>
            {reviewsDue > 0 ? (
              <>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <span className="text-lg font-bold text-foreground">{reviewsDue}</span>{" "}
                  {reviewsDue === 1 ? "skill is" : "skills are"} due for review — mastery only counts if it survives the
                  gap.
                </p>
                <Link href={`/study-arcade/review${trackQuery}` as Route} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
                  Start review session
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {skillsInProgress > 0
                  ? `Nothing due right now — practised skills that record come up for review on their own schedule.`
                  : "No reviews due yet. Practise a skill that records, and its review schedule starts from there."}
              </p>
            )}
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden />
              {/* OWNER QA #3: this said "Continue <track>" over "Pick up where you left off", but the
                  only thing it consults is whether the TRACK HAS DECKS — a catalog fact, not the
                  learner's history. No DECA continuation state exists to consult, and none is being
                  invented for a heading, so the copy says what is actually true: here is the practice
                  available. */}
              {activeTrack ? `Practise ${activeTrack.label}` : "Choose a track"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {activeTrack
                ? hasDecks
                  ? `${decks.length} ${decks.length === 1 ? "deck" : "decks"} and review games are available below.`
                  : `${activeTrack.label} does not use flashcard decks — that practice happens in ${activeTrack.label} sessions and lessons. Head to Training to continue.`
                : "Select a training track to get track-specific decks and games."}
            </p>
            {/* Owner QA Repair 2: "Open Training" under "Practise DECA" went to the track CHOOSER —
                the label promised this track's training and the destination left the track. It now
                opens this track's own hub; with no track resolved it still offers the chooser. */}
            <Link href={(activeTrack ? `/training/${activeTrack.slug}` : "/training") as Route} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
              {activeTrack ? `Open ${activeTrack.label} training` : "Choose your competition"}
            </Link>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <BookOpenCheck className="h-4 w-4 text-secondary" aria-hidden />
              Your record
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {practicedSkills > 0 ? (
                <>
                  <span className="text-lg font-bold text-foreground">{practicedSkills}</span> {practicedSkills === 1 ? "skill" : "skills"} with a recorded result so far, from real drill sessions. Deck and game reps sharpen recall but aren&apos;t recorded.
                </>
              ) : (
                "Zero so far — this fills in from drills that record. Nothing here is ever simulated."
              )}
            </p>
          </div>
        </div>
      </div>

      {showDeca && focusSimulation ? (
        <div id="full-simulation" className="scroll-mt-24">
          <DecaRoleplaySetup mode="simulation" />
        </div>
      ) : null}

      {/* General Debate has no flashcard decks; its drills are the argument/rebuttal/evidence/weighing
          concept reps that feed mastery + spaced review. */}
      {!activeTrack || activeTrack.id === "GENERAL_DEBATE" ? <DebateDrills initialArea={debateArea} progressTracking={debateProgressTracking} /> : null}

      {/* DECA concept drills (performance indicators, business reasoning, customer relations, marketing)
          — concept-level practice that feeds mastery + spaced review, separate from role-play judging. */}
      {!activeTrack || activeTrack.id === "DECA" ? (
        <ConceptDrills
          sessionEndpoint="/api/deca/drills/session"
          checkEndpoint="/api/deca/drills/check"
          submitEndpoint="/api/deca/drills/submit"
          areas={DECA_DRILL_AREAS.map((a) => ({ id: a.id, label: a.label }))}
          initialArea={decaArea}
          title="DECA concept drills"
          blurb="Original multiple-choice reps on core DECA concepts — performance indicators, business reasoning, customer relations, and marketing. Every answer gets an explanation, and your real scores feed mastery + spaced review."
        />
      ) : null}

      {/* DECA Full Simulation — one timed end-to-end round (prep clock → pitch → objections → scored
          ballot), distinct from the isolated concept drills above. Reuses the registry-backed role-play
          AI + rubric; provenance stays honest (official only on the Hospitality/HLM path). */}
      {/* QA-R3 #11: the anchor a "Full DECA Simulation" link lands on. The card is one of several on
          this page, so a bare /study-arcade link dropped the learner at the top of a flashcard page and
          left them to hunt for the simulation. No duplicate page is created — the link now names the
          section it opens. */}
      {showDeca && !focusSimulation ? (
        <div id="full-simulation" className="scroll-mt-24">
          <DecaRoleplaySetup mode="simulation" />
        </div>
      ) : null}

      {/* Final DECA QA, finding B: the anchor a results page's "Browse study decks" lands on when no
          deck matches what the test flagged. */}
      <Card id="flashcard-decks" className="scroll-mt-24">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle as="h2" className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" aria-hidden />
              Flashcard decks
            </CardTitle>
            {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
          </div>
        </CardHeader>
        {decks.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No {activeTrack ? activeTrack.label : ""} flashcard decks are available yet.
            </p>
          </CardContent>
        ) : (
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {decks.map((deck) => (
              <Link
                key={deck.deckSlug}
                href={`/study/${deck.deckSlug}` as Route}
                className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant={deck.organization === "DECA" ? "secondary" : "accent"}>{deck.organization}</Badge>
                    <h3 className="mt-3 font-semibold">{deck.deck}</h3>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {deck.count} terms
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Term, definition, example, and one quick check question per card.
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <Gamepad2 className="h-3.5 w-3.5" aria-hidden />
                  Cards + review games
                </span>
              </Link>
            ))}
          </CardContent>
        )}
      </Card>

      <RecommendedVideos organization={activeTrack?.organization} title="Video resource shelf" limit={6} />
      <p className="text-xs text-muted-foreground">
        {cardCount > 0 ? `${cardCount} total cards across ${decks.length} ${decks.length === 1 ? "deck" : "decks"}.` : ""}{" "}
        Looking for the full resource library? It moved to <Link href={`/resources${trackQuery}` as Route} className="font-semibold text-primary hover:underline">Resources</Link>.
      </p>
    </div>
  );
}
