import Link from "next/link";
import type { Route } from "next";
import { GraduationCap, HeartPulse, Briefcase, Globe2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRACKS, TRACK_DISCLAIMER, type TrainingTrack } from "@/lib/training-tracks";

const ICONS: Record<TrainingTrack, typeof GraduationCap> = {
  GENERAL_DEBATE: GraduationCap,
  HOSA: HeartPulse,
  DECA: Briefcase,
  MODEL_UN: Globe2
};

export const metadata = { title: "Choose your training track" };

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Training</Badge>
        <h1 className="mt-3 text-3xl font-bold">Choose your training track</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Pick a track and the app focuses on it — dashboard, practice, decks, tests, and games. You can switch tracks anytime.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TRACKS.map((track) => {
          const Icon = ICONS[track.id];
          return (
            <Card key={track.id}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="text-lg font-bold">{track.label}</h2>
                </div>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{track.description}</p>
                <Link href={`/training/${track.slug}` as Route} className={cn(buttonVariants({ size: "sm" }), "mt-4 w-fit")}>
                  Enter track
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{TRACK_DISCLAIMER}</p>
    </div>
  );
}
