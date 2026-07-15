import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DebateRoom } from "@/components/debate/debate-room";
import { DecaRoleplay } from "@/components/training/deca-roleplay";
import { HosaEventPrep } from "@/components/training/hosa-event-prep";
import { HosaRoleplay } from "@/components/training/hosa-roleplay";
import { MunConference } from "@/components/training/mun-conference";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { trackBySlug } from "@/lib/training-tracks";

export default async function TrackPracticePage({ params }: { params: { track: string } }) {
  const track = trackBySlug(params.track);
  if (!track) {
    notFound();
  }

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
      ) : track.id === "MODEL_UN" ? (
        <>
          <div>
            <Badge variant="secondary">Training in: {track.label}</Badge>
            <h1 className="mt-3 text-2xl font-bold">Model UN practice</h1>
          </div>
          <MunConference />
        </>
      ) : (
        <>
          {track.id === "DECA" ? <DecaRoleplay /> : null}
          {/* HOSA guided flow: the verified Medical Terminology exam (HosaEventPrep) is the flagship,
              plus a clearly-labeled generic health-science role-play for the other categories. Neither
              routes into the legacy /debate/[id] room — the generic TrackPracticeSetup launcher is gone. */}
          {track.id === "HOSA" ? (
            <>
              <HosaEventPrep />
              <HosaRoleplay />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
