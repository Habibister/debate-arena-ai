import Link from "next/link";
import type { Route } from "next";
import { Gavel, History, MessageSquareText, PlayCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getActiveTrack } from "@/lib/track-server";
import { cn } from "@/lib/utils";
import type { TrackInfo } from "@/lib/training-tracks";

// Compete — the launcher for scored practice. Track-aware: each track shows ONLY its own scored
// activities. A "start scored activity" card launches directly (Debate -> /debate, never a hub in
// between). No cross-track actions — a DECA/HOSA learner never sees a debate round launcher.
type Destination = { label: string; detail: string; icon: LucideIcon; href?: string; comingSoon?: boolean };

function competeDestinations(track: TrackInfo): Destination[] {
  if (track.id === "GENERAL_DEBATE") {
    return [
      { label: "Full Debate Round", detail: "A full live round: AI opponent, real turn order, judged ballot — saved to your record.", icon: Gavel, href: `/debate?track=${track.slug}` },
      { label: "History", detail: "Every past round and ballot — nothing is deleted.", icon: History, href: "/debates/history" }
    ];
  }
  if (track.id === "DECA") {
    return [
      { label: "Guided DECA Role-Play", detail: "A coached run-through: scenario → pitch → the judge's objections → feedback. Retry freely.", icon: MessageSquareText, href: "/training/deca/practice" },
      { label: "Full DECA Simulation", detail: "The timed end-to-end run: prep clock → pitch → objections → scored ballot. Results aren't saved yet.", icon: PlayCircle, href: `/study-arcade?track=${track.slug}` },
      { label: "History", detail: "Your past debate/practice sessions and ballots.", icon: History, href: "/debates/history" }
    ];
  }
  if (track.id === "HOSA") {
    return [
      { label: "Guided HOSA Role-Play", detail: "A coached patient interaction: scenario → your response → feedback. Retry freely.", icon: MessageSquareText, href: "/training/hosa/practice" },
      { label: "Full HOSA Simulation", detail: "A timed, scored professional interaction. Not built yet — coming soon.", icon: PlayCircle, comingSoon: true },
      { label: "History", detail: "Your past sessions and feedback.", icon: History, href: "/debates/history" }
    ];
  }
  return [];
}

export default function CompetePage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = getActiveTrack(searchParams.track);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Compete</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="page-title mt-3">Compete</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">Scored practice that mirrors the real event. Pick your arena.</p>
      </div>

      {!activeTrack ? (
        // Fail closed: without a resolved track we never guess an arena (or show another track's).
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <p className="font-semibold">Choose your track first</p>
            <p className="max-w-md text-sm text-muted-foreground">Compete shows the scored activities for your event. Pick a track to see them.</p>
            <Link href={"/training" as Route} className={cn(buttonVariants({ size: "sm" }), "mt-2")}>Choose a track</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competeDestinations(activeTrack).map((dest) => {
            const Icon = dest.icon;
            if (dest.comingSoon || !dest.href) {
              return (
                <div key={dest.label} className="rounded-lg border border-dashed bg-muted/30 p-5 opacity-80" aria-disabled="true">
                  <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
                  <div className="mt-3 flex items-center gap-2">
                    <h2 className="text-lg font-bold text-muted-foreground">{dest.label}</h2>
                    <Badge variant="outline">Coming soon</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{dest.detail}</p>
                </div>
              );
            }
            return (
              <Link key={dest.label} href={dest.href as Route} className="rounded-lg border bg-card p-5 transition-colors hover:bg-muted">
                <Icon className="h-6 w-6 text-track" aria-hidden />
                <h2 className="mt-3 text-lg font-bold">{dest.label}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{dest.detail}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
