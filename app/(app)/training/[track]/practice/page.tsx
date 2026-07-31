import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DebateRoom } from "@/components/debate/debate-room";
import { DecaRoleplaySetup } from "@/components/training/deca-roleplay-setup";
import { HosaEventPrep } from "@/components/training/hosa-event-prep";
import { MunConference } from "@/components/training/mun-conference";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isTrackRetired, trackBySlug } from "@/lib/training-tracks";

export default async function TrackPracticePage({ params }: { params: { track: string } }) {
  const track = trackBySlug(params.track);
  if (!track) {
    notFound();
  }
  // Soft-removed tracks (Model UN) redirect to the track chooser instead of rendering a hidden page.
  if (isTrackRetired(track.id)) {
    redirect("/training");
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
          {track.id === "DECA" ? <DecaRoleplaySetup /> : null}
          {/* M11R6: HOSA practice here is the verified Medical Terminology exam and nothing else. The
              generic health-science role-play that used to sit beside it invented patient scenarios
              and scored them against no sourced rubric, so it was withdrawn. Events HOSA runs that
              CompeteReady has not verified are NOT represented here — the Event Navigator says so. */}
          {track.id === "HOSA" ? <HosaEventPrep /> : null}
        </>
      )}
    </div>
  );
}
