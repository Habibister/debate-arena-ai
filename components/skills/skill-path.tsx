import Link from "next/link";
import type { Route } from "next";
import { BookOpenCheck, CheckCircle2, ClipboardList, Layers3, Lock, PenLine, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { skillVisibleForTrack, type TrainingTrack } from "@/lib/training-tracks";

const skills: Array<{
  name: string;
  org: "Debate" | "DECA" | "HOSA" | "Public Speaking";
  mastery: number;
  status: "complete" | "active" | "locked";
  slug: string;
  action: "writing" | "test" | "study" | "lesson";
}> = [
  { name: "Claim, Warrant, Impact", org: "Debate", mastery: 82, status: "complete", slug: "debate-claim-building-1", action: "writing" },
  { name: "Evidence and Support", org: "Debate", mastery: 64, status: "active", slug: "debate-evidence-1", action: "writing" },
  { name: "Refutation", org: "Debate", mastery: 58, status: "active", slug: "debate-rebuttal-1", action: "writing" },
  { name: "Weighing Arguments", org: "Debate", mastery: 42, status: "active", slug: "debate-weighing", action: "writing" },
  { name: "Reading Scenarios", org: "DECA", mastery: 71, status: "active", slug: "deca-reading-scenarios", action: "test" },
  { name: "Marketing Terms", org: "DECA", mastery: 49, status: "active", slug: "deca-marketing", action: "study" },
  { name: "Medical Terminology", org: "HOSA", mastery: 54, status: "active", slug: "hosa-medical-terminology-basics", action: "study" },
  { name: "Patient Communication", org: "HOSA", mastery: 61, status: "active", slug: "hosa-patient-communication", action: "lesson" },
  { name: "Presentation Structure", org: "Public Speaking", mastery: 38, status: "locked", slug: "public-speaking-delivery-1", action: "lesson" }
];

function actionHref(skill: (typeof skills)[number]): Route {
  if (skill.action === "writing") {
    return `/skills/${skill.slug}/practice` as Route;
  }

  if (skill.action === "test") {
    return "/tests" as Route;
  }

  if (skill.action === "study") {
    return "/study" as Route;
  }

  return `/skills/${skill.slug}` as Route;
}

function actionLabel(skill: (typeof skills)[number]) {
  if (skill.action === "writing") {
    return "Practice writing";
  }

  if (skill.action === "test") {
    return "Test me";
  }

  if (skill.action === "study") {
    return "Study terms";
  }

  return skill.status === "complete" ? "Review" : "Practice";
}

function actionIcon(skill: (typeof skills)[number]) {
  if (skill.action === "writing") {
    return PenLine;
  }

  if (skill.action === "test") {
    return ClipboardList;
  }

  if (skill.action === "study") {
    return Layers3;
  }

  return BookOpenCheck;
}

// showSampleProgress is true only for demo accounts. Real users have not earned mastery yet, so we
// show "Not started" at 0% instead of fake percentages.
export function SkillPath({ showSampleProgress = false, track }: { showSampleProgress?: boolean; track?: TrainingTrack }) {
  // When a track is active, show only that track's skills plus shared-foundation skills.
  const visibleSkills = track ? skills.filter((skill) => skillVisibleForTrack(skill.org, track).visible) : skills;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Mastery Map</CardTitle>
          <Badge variant="accent">Adaptive lessons</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {visibleSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills for this track yet.</p>
        ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleSkills.map((skill) => {
            const shared = track ? skillVisibleForTrack(skill.org, track).shared : false;
            // Real users start every skill "not started" until they log real activity.
            const mastery = showSampleProgress ? skill.mastery : 0;
            const status = showSampleProgress ? skill.status : skill.status === "locked" ? "locked" : "active";
            const Icon = status === "complete" ? CheckCircle2 : status === "locked" ? Lock : PlayCircle;
            const skillForAction = { ...skill, status };
            const ActionIcon = actionIcon(skillForAction);
            return (
              <div key={skill.name} className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{skill.org}</p>
                    <h3 className="mt-1 font-semibold">{skill.name}</h3>
                    {shared ? <Badge variant="outline" className="mt-1">Shared foundation</Badge> : null}
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${mastery}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />
                    {status === "locked" ? "Locked path" : "Lesson set"}
                  </span>
                  <span className="font-semibold">{showSampleProgress ? `${mastery}%` : "Not started"}</span>
                </div>
                {status === "locked" ? (
                  <div className="mt-4 rounded-md border bg-muted px-3 py-2 text-center text-sm font-semibold text-muted-foreground">
                    Unlock after rebuttal
                  </div>
                ) : (
                  <Link href={actionHref(skillForAction)} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}>
                    <ActionIcon className="h-4 w-4" aria-hidden />
                    {actionLabel(skillForAction)}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        )}
      </CardContent>
    </Card>
  );
}
