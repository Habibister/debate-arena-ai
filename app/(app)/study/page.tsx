import Link from "next/link";
import type { Route } from "next";
import { BookOpenCheck, Layers3, PlayCircle } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deckSummaries } from "@/lib/study-content";
import { getActiveTrack } from "@/lib/track-server";

export default function StudyPage({ searchParams }: { searchParams: { track?: string } }) {
  // Show only the active track's decks — no cross-track content. `?track=` wins on this route;
  // otherwise the selected track (preference cookie) is used so the choice survives navigation.
  const activeTrack = getActiveTrack(searchParams.track);
  const allDecks = deckSummaries();
  const decks = activeTrack ? allDecks.filter((d) => d.organization === activeTrack.organization) : allDecks;

  // Hero copy + totals are computed from content ALLOWED for the active track — never global numbers.
  // General Debate and Model UN have no decks, so they get honest empty-state copy (never a global total).
  const cardCount = decks.reduce((total, deck) => total + deck.count, 0);
  const hasDecks = decks.length > 0;
  const heroDescription = !activeTrack
    ? "Review original DECA and HOSA term decks, then use quick checks and shared video resources to turn weak areas into practice."
    : hasDecks
      ? `Review original ${activeTrack.label} term decks, then use quick checks and shared video resources to turn weak areas into practice.`
      : `${activeTrack.label} does not use flashcard decks — that practice happens in ${activeTrack.label} sessions and lessons. Shared study resources are still available below.`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Study tools</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Flashcards and resources</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{heroDescription}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <Layers3 className="h-4 w-4 text-primary" aria-hidden />
              {decks.length} {decks.length === 1 ? "deck" : "decks"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {hasDecks
                ? `${activeTrack ? activeTrack.label : "DECA and HOSA"} term decks, kept separate so study stays focused.`
                : `No ${activeTrack ? activeTrack.label : ""} flashcard decks yet.`}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <BookOpenCheck className="h-4 w-4 text-secondary" aria-hidden />
              {cardCount} {cardCount === 1 ? "card" : "cards"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {hasDecks ? "Original definitions, examples, and quick checks." : "Cards appear here once this track has decks."}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 font-semibold">
              <PlayCircle className="h-4 w-4 text-accent" aria-hidden />
              Shared video resources
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Shared external resources that lead back into in-app practice.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Flashcard decks</CardTitle>
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
            <Link key={deck.deckSlug} href={`/study/${deck.deckSlug}` as Route} className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant={deck.organization === "DECA" ? "secondary" : "accent"}>{deck.organization}</Badge>
                  <h3 className="mt-3 font-semibold">{deck.deck}</h3>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{deck.count} terms</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Term, definition, example, and one quick check question per card.</p>
            </Link>
          ))}
        </CardContent>
        )}
      </Card>

      <RecommendedVideos organization={activeTrack?.organization} title="Video resource shelf" limit={6} />
    </div>
  );
}
