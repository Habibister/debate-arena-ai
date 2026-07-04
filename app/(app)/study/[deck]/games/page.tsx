import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { StudyGames } from "@/components/study/games/study-games";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MIN_CARDS } from "@/lib/study-games";
import { flashcardsForDeck } from "@/lib/study-content";
import { getActiveTrack } from "@/lib/track-server";
import { trackAllowsOrganization } from "@/lib/training-tracks";

export default function StudyDeckGamesPage({ params, searchParams }: { params: { deck: string }; searchParams: { assignmentId?: string } }) {
  const cards = flashcardsForDeck(params.deck);

  if (cards.length === 0) {
    notFound();
  }

  // Direct-URL isolation for the games route too (same rule as the deck page); assigned activities
  // (?assignmentId=) open under the assignment's context and are exempt.
  const activeTrack = getActiveTrack();
  if (!searchParams.assignmentId && !trackAllowsOrganization(activeTrack, cards[0].organization)) {
    redirect("/study");
  }

  const deckName = cards[0].deck;
  const gameCards = cards.map((card) => ({ id: card.id, term: card.term, definition: card.definition }));

  return (
    <div className="space-y-6">
      <Link href={`/study/${params.deck}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to deck
      </Link>

      {gameCards.length < MIN_CARDS ? (
        <div className="space-y-2">
          <Badge variant="secondary">Review games</Badge>
          <EmptyState
            icon={Gamepad2}
            title={`You need at least ${MIN_CARDS} cards to play this game.`}
            description="This deck does not have enough terms for the review games yet. Try a larger deck."
            actionLabel="Back to study"
            actionHref="/study"
          />
        </div>
      ) : (
        <StudyGames deckName={deckName} cards={gameCards} />
      )}
    </div>
  );
}
