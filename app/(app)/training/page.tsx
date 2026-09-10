import Link from "next/link";
import type { Route } from "next";
import { GraduationCap, HeartPulse, Briefcase, Globe2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { LearnerPathRail } from "@/components/ui/learner-path-rail";
import { PageHeader } from "@/components/ui/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { learnerPathForTrack } from "@/lib/learner-path";
import { resolveActiveTrack } from "@/lib/track-server";
import { ACTIVE_TRACKS, TRACK_DISCLAIMER, type TrainingTrack } from "@/lib/training-tracks";

const ICONS: Record<TrainingTrack, typeof GraduationCap> = {
  GENERAL_DEBATE: GraduationCap,
  HOSA: HeartPulse,
  DECA: Briefcase,
  MODEL_UN: Globe2
};

export const metadata = { title: "Choose your training track" };

export default async function TrainingPage() {
  // The learner's CURRENT track — their own selection if they have made one, otherwise their signup
  // organization. This page passes no route slug, so the shared resolver can return "preference",
  // "organization" or "none" — never "route" — which is what lets the chip below name the track that
  // is actually in force everywhere else. Reading it changes nothing: the resolver never writes.
  const resolution = await resolveActiveTrack();
  const currentTrack = resolution.resolved ? resolution.track : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Training"
        heading={<h1 className="page-title">Choose your training track</h1>}
        description="Each track has its own lessons, practice and competition. Pick one and the training tools update to match it — you see what that track actually offers, not a fixed list every track is assumed to have. You can switch tracks anytime."
      />

      {/* Three active tracks. Model UN is soft-removed and never reaches ACTIVE_TRACKS. */}
      <div className="grid gap-4 lg:grid-cols-3">
        {ACTIVE_TRACKS.map((track) => {
          const Icon = ICONS[track.id];
          const stages = learnerPathForTrack(track.id);
          const isCurrent = currentTrack?.id === track.id;
          return (
            // Deliberately NOT a wrapping link: the card contains its own action plus a rail of
            // stage links, and one interactive element must never contain another.
            <Card key={track.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-track/40 bg-track/15 text-track">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <h2 className="section-title">{track.label}</h2>
                  </div>
                  {/* Rendered only for the track the shared resolver actually put in force. */}
                  {isCurrent ? <StatusChip variant="track">Current track</StatusChip> : null}
                </div>

                <p className="text-sm leading-6 text-muted-foreground">{track.description}</p>

                {/* Static availability for this track — never a claim about the learner. */}
                <LearnerPathRail stages={stages} label={`${track.label} learner path`} className="mt-auto" />

                <Link
                  href={`/training/${track.slug}` as Route}
                  className={cn(buttonVariants({ size: "sm" }), "min-h-11 w-fit")}
                >
                  Enter track
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-2 text-xs leading-6 text-muted-foreground">
        {/* Owner QA Repair 2: this said the saved track changed "only when you switch it from a track
            page", while no track page had any control but a link back here — and for a signed-in
            learner the saved value was never consulted at all. Now entering a track IS the switch,
            and it is the track every other page uses until the learner enters another one. */}
        <p>
          Entering a track makes it your current track everywhere in CompeteReady until you enter another one.
          Opening a single lesson or page from another track only shows you that page — it doesn&apos;t change
          your current track.
        </p>
        <p>{TRACK_DISCLAIMER}</p>
      </div>
    </div>
  );
}
