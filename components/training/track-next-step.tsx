"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackById, type TrainingTrack } from "@/lib/training-tracks";
import { useTrainingTrack } from "@/components/training/training-track-context";

// Track-specific suggestions (prompts only — no fake progress/percentages/mastery).
const NEXT_STEPS: Record<TrainingTrack, string[]> = {
  GENERAL_DEBATE: ["Practice a rebuttal round", "Review evidence comparison", "Complete a full debate round"],
  HOSA: ["Continue medical terminology", "Take a health-science practice test", "Review weak HOSA terms"],
  DECA: ["Practice a role play", "Review performance indicators", "Take a cluster-exam practice set"],
  MODEL_UN: ["Draft an opening speech", "Practice a moderated caucus", "Review committee procedure"]
};

export function TrackNextStep() {
  const { track } = useTrainingTrack();
  const info = trackById(track);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-semibold">Your Training Path</span>
            <Badge variant="secondary">{info.label}</Badge>
          </div>
          <Link href={`/training/${info.slug}` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Open {info.short} hub
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {NEXT_STEPS[track].map((step) => (
            <li key={step} className="rounded-md border bg-background p-3 text-sm font-medium">
              {step}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
