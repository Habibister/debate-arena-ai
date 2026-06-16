import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { FlashcardStudy } from "@/components/study/flashcard-study";
import { buttonVariants } from "@/components/ui/button";
import { flashcardsForDeck } from "@/lib/study-content";

export default function StudyDeckPage({ params }: { params: { deck: string } }) {
  const cards = flashcardsForDeck(params.deck);

  if (cards.length === 0) {
    notFound();
  }

  const firstCard = cards[0];
  const organization = firstCard.organization;

  return (
    <div className="space-y-6">
      <Link href="/study" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Study
      </Link>

      <FlashcardStudy cards={cards} deckName={firstCard.deck} />

      <RecommendedVideos
        organization={organization}
        skillTags={[firstCard.deck, ...firstCard.relatedSkills]}
        title="Watch, then practice"
        limit={3}
      />
    </div>
  );
}
