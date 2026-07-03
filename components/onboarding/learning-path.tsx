"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CheckCircle2, Circle, GraduationCap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackById } from "@/lib/training-tracks";
import { useTrainingTrack } from "@/components/training/training-track-context";
import {
  BEGINNER_TERMS,
  buildLearningPath,
  currentPathWeek,
  DEFAULT_PROFILE,
  LEARNING_PROFILE_KEY,
  nextRecommendation,
  normalizeLearningProfile,
  scoreDiagnostic,
  type LearningProfile
} from "@/lib/learning-path";

type Props = { weakAreas: string[]; hasActivity: boolean; pendingAssignment?: boolean };

export function LearningPath({ weakAreas, hasActivity, pendingAssignment }: Props) {
  const { track } = useTrainingTrack();
  const [profile, setProfile] = useState<LearningProfile | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LEARNING_PROFILE_KEY);
      if (stored) {
        setProfile(normalizeLearningProfile(JSON.parse(stored)));
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const info = trackById(track);
  const working = profile ? { ...profile, track } : { ...DEFAULT_PROFILE, track };
  const path = buildLearningPath(track);
  const currentWeek = currentPathWeek(working);
  const { startingSkill } = scoreDiagnostic(working);
  const currentFocus = path[currentWeek - 1]?.focus ?? startingSkill;
  const next = nextRecommendation({ hasActivity, weakAreas, pendingAssignment, startingSkill, currentFocus });
  const showBeginner = !profile || profile.experience === "NEW" || profile.experience === "BEGINNER";

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-semibold">Your Training Path</span>
            <Badge variant="secondary">{info.label}</Badge>
            {profile ? <Badge variant="outline">{profile.experience.toLowerCase()}</Badge> : null}
          </div>
          <Link href={`/training/${info.slug}` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {!profile ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-semibold">Personalize your path</p>
            <p className="mt-1 text-muted-foreground">Take a 2-minute diagnostic so recommendations fit your goals and experience.</p>
            <Link href={"/onboarding/diagnostic" as Route} className={cn(buttonVariants({ size: "sm" }), "mt-2")}>
              Start diagnostic
            </Link>
          </div>
        ) : null}

        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next step</p>
          <p className="mt-1 font-semibold">{next}</p>
        </div>

        <ol className="grid gap-2 sm:grid-cols-2">
          {path.map((step) => {
            const done = step.week < currentWeek;
            const current = step.week === currentWeek;
            return (
              <li
                key={step.week}
                className={cn("flex items-start gap-2 rounded-md border p-3 text-sm", current ? "border-primary bg-primary/5" : "bg-background")}
              >
                {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden /> : <Circle className={cn("mt-0.5 h-4 w-4", current ? "text-primary" : "text-muted-foreground")} aria-hidden />}
                <span>
                  <span className="block text-xs font-semibold text-muted-foreground">
                    Week {step.week}
                    {current ? " · current focus" : done ? " · done earlier" : ""}
                  </span>
                  <span className="font-medium">{step.focus}</span>
                </span>
              </li>
            );
          })}
        </ol>

        {showBeginner ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
              Quick definitions
            </p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {BEGINNER_TERMS.map((t) => (
                <li key={t.term}>
                  <span className="font-semibold">{t.term}:</span> <span className="text-muted-foreground">{t.plain}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
