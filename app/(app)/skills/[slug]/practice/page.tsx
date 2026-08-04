import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { DebateWritingPractice } from "@/components/skills/debate-writing-practice";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDebateSkillScenario } from "@/lib/debate-skill-practice";
import { resolveSkillsSlug } from "@/lib/education/skills-compat";
import { cn } from "@/lib/utils";

/**
 * Debate writing practice, now GATED BY TRACK (M13E1C).
 *
 * This route previously passed its raw slug straight to `getDebateSkillScenario`, whose `aliasFor`
 * falls back to `debate-claim-building-1` for anything it does not recognise. Every DECA, HOSA,
 * retired Model UN and misspelled slug therefore received the same debate motion — and the path was
 * genuinely reachable: `/study-arcade/review` links here for ANY due skill, including the HOSA
 * Medical Terminology skill the MedTerm engine schedules reviews for.
 *
 * Support is now decided from the resolved track before anything renders. Nothing falls back.
 */
const TRACK_LABEL: Record<string, string> = {
  DEBATE: "General Debate",
  DECA: "DECA",
  HOSA: "HOSA",
  MODEL_UN: "Model UN"
};

export default function DebateSkillWritingPracticePage({ params }: { params: { slug: string } }) {
  const resolution = resolveSkillsSlug(params.slug);

  // Unknown, or a canonical lesson whose practice lives inside the lesson rather than here.
  if (resolution.kind !== "compatibility") {
    notFound();
  }

  const back = (
    <Link
      href={`/skills/${params.slug}` as Route}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto min-h-11 min-w-11 px-3")}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back
    </Link>
  );

  if (!resolution.debatePracticeSupported) {
    const retired = resolution.track === "MODEL_UN";
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {back}
        <div className="rounded-lg border bg-card p-6">
          <Badge variant="secondary">{TRACK_LABEL[resolution.track] ?? resolution.track}</Badge>
          <h1 className="mt-3 break-words text-3xl font-bold tracking-tight">{resolution.title}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              Writing practice is not available for this skill
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-7 text-muted-foreground">
              The written practice on this page is built for Debate arguments, so it would hand you a
              debate motion rather than anything from your event. That would not be practice for you.
              {retired ? " Model UN is also no longer one of the training tracks." : null}
            </p>
            <Link
              href={resolution.destination.href as Route}
              className={cn(buttonVariants({ size: "sm" }), "h-auto min-h-11 min-w-11 whitespace-normal px-4 text-center")}
            >
              {resolution.destination.label}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scenario = getDebateSkillScenario(params.slug, "BEGINNER", 0);

  return (
    <div className="space-y-6">
      {back}
      <DebateWritingPractice slug={params.slug} initialScenario={scenario} />
    </div>
  );
}
