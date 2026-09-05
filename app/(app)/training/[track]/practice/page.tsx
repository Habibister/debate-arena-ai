import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
  // DEBATE has no Practice stage. This route's Debate branch rendered a SECOND copy of the same
  // `DebateRoom` that `/debate` renders, under the heading "Debate practice" — a duplicate of the
  // Compete setup, named as a stage Debate no longer has. Nothing has linked it for Debate since the
  // hub sent "Start practice" to `/debate` directly, but a typed or bookmarked URL still reached it,
  // so a learner could land on a page telling them Practice is where Debate training happens.
  // It redirects to the canonical Compete setup instead of being deleted, because the route is SHARED
  // and DECA and HOSA both still render their own real surfaces below. Those two are the reason this
  // route stays; nothing else is.
  //
  // MODEL UN IS NOT A REASON. It is a RETIRED track (`RETIRED_TRACKS` in lib/training-tracks.ts), and
  // the `isTrackRetired` redirect above fires before any branch below, so the `MunConference` branch
  // is UNREACHABLE legacy residue. It is left untouched as debt rather than deleted in a routing
  // milestone — but it must never be cited as evidence that this route, or Model UN, is supported.
  if (track.id === "GENERAL_DEBATE") {
    redirect("/debate?track=debate");
  }

  return (
    <div className="space-y-6">
      <Link href={`/training/${track.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {track.label} hub
      </Link>

      {track.id === "MODEL_UN" ? (
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
