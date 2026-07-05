import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DebateRoom } from "@/components/debate/debate-room";
import { TrackPracticeSetup } from "@/components/training/track-practice-setup";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getOfficialPrepFormat } from "@/lib/competition-specs";
import { trackToOrganization, trackBySlug } from "@/lib/training-tracks";

export default async function TrackPracticePage({ params }: { params: { track: string } }) {
  const track = trackBySlug(params.track);
  if (!track) {
    notFound();
  }

  // Registry-driven prep clock (e.g. DECA's official 10-minute prep). Null when the registry has
  // no structured prep rule for this organization — the setup renders exactly as before.
  const officialPrep = track.id === "GENERAL_DEBATE" ? null : await getOfficialPrepFormat(trackToOrganization(track.id));

  return (
    <div className="space-y-6">
      <Link href={`/training/${track.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {track.label} hub
      </Link>

      {track.id === "GENERAL_DEBATE" ? (
        <>
          <div>
            <Badge variant="secondary">Training in: {track.label}</Badge>
            <h1 className="mt-3 text-2xl font-bold">Debate practice</h1>
            <p className="mt-2 text-sm text-muted-foreground">Choose a format, then practice with an AI opponent and judge.</p>
          </div>
          <DebateRoom track={track.slug} />
        </>
      ) : (
        <TrackPracticeSetup track={track} officialPrep={officialPrep} />
      )}
    </div>
  );
}
