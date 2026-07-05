import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { BookOpenCheck, Gamepad2, Layers3, PlayCircle, RotateCcw, Sparkles } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deckSummaries } from "@/lib/study-content";
import { getActiveTrack } from "@/lib/track-server";

// Study Arcade landing — the drill layer's front door per the master plan. This is the shell:
// existing decks and games are linked (not rebuilt), and the review tiles show REAL activity
// numbers from MasteryProgress or honest empty states. No fabricated counts, ever.
export default async function StudyArcadePage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = getActiveTrack(searchParams.track);
  const allDecks = deckSummaries();
  const decks = activeTrack ? allDecks.filter((d) => d.organization === activeTrack.organization) : allDecks;
  const cardCount = decks.reduce((total, deck) => total + deck.count, 0);
  const hasDecks = decks.length > 0;
  const trackQuery = activeTrack ? `?track=${searchParams.track ?? ""}` : "";

  // Real practice signals for the review tiles (0 for a brand-new account; never sample data).
  const session = await getServerSession(authOptions);
  let practicedSkills = 0;
  let skillsInProgress = 0;
  if (session?.user?.id) {
    try {
      [practicedSkills, skillsInProgress] = await Promise.all([
        prisma.masteryProgress.count({ where: { userId: session.user.id, lastPracticedAt: { not: null } } }),
        prisma.masteryProgress.count({
          where: { userId: session.user.id, lastPracticedAt: { not: null }, NOT: { masteryLevel: "MASTERED" } }
        })
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
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Study Arcade</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Repetition that doesn&apos;t feel like a chore: flashcard decks, review games, and drills that feed your real
          mastery record{activeTrack ? ` for ${activeTrack.label}` : ""}.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <RotateCcw className="h-4 w-4 text-primary" aria-hidden />
              Reviews due
            </div>
            {skillsInProgress > 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                <span className="text-lg font-bold text-foreground">{skillsInProgress}</span> practiced{" "}
                {skillsInProgress === 1 ? "skill is" : "skills are"} not yet mastered — keep drilling them. Scheduled
                spaced review arrives with Spaced Reassessment.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                No reviews due yet — practice a skill or play a review game to start your mastery record.
              </p>
            )}
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden />
              {activeTrack ? `Continue ${activeTrack.label}` : "Choose a track"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {activeTrack
                ? hasDecks
                  ? `Pick up where you left off: ${decks.length} ${decks.length === 1 ? "deck" : "decks"} and review games below.`
                  : `${activeTrack.label} does not use flashcard decks — that practice happens in ${activeTrack.label} sessions and lessons. Head to Training to continue.`
                : "Select a training track to get track-specific decks and games."}
            </p>
            <Link href={(activeTrack && !hasDecks ? "/training" : "/training") as Route} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
              {activeTrack ? "Open Training" : "Choose your competition"}
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
                  <span className="text-lg font-bold text-foreground">{practicedSkills}</span> {practicedSkills === 1 ? "skill" : "skills"} practiced so far — every arcade rep updates your real mastery progress.
                </>
              ) : (
                "Zero so far — that changes with your first drill. Nothing here is ever simulated."
              )}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
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
        Looking for the full resource library? It moved to <Link href={"/resources" as Route} className="font-semibold text-primary hover:underline">Resources</Link>.
      </p>
    </div>
  );
}
