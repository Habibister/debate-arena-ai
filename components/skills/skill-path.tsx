import Link from "next/link";
import type { Route } from "next";
import { BookOpenCheck, CheckCircle2, Lock, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const skills = [
  { name: "Claim Building", org: "Debate", mastery: 82, status: "complete", slug: "debate-claim-building-1" },
  { name: "Evidence", org: "Debate", mastery: 64, status: "active", slug: "debate-evidence-1" },
  { name: "Rebuttal", org: "Debate", mastery: 58, status: "active", slug: "debate-rebuttal-1" },
  { name: "Cross Examination", org: "Debate", mastery: 34, status: "locked", slug: "debate-rebuttal-2" },
  { name: "Resolution Writing", org: "Model UN", mastery: 46, status: "active", slug: "mun-resolution-writing-1" },
  { name: "Roleplay", org: "DECA", mastery: 71, status: "active", slug: "deca-roleplay-1" }
];

export function SkillPath() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Khan-Style Mastery Map</CardTitle>
          <Badge variant="accent">Adaptive lessons</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => {
            const Icon = skill.status === "complete" ? CheckCircle2 : skill.status === "locked" ? Lock : PlayCircle;
            return (
              <div key={skill.name} className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{skill.org}</p>
                    <h3 className="mt-1 font-semibold">{skill.name}</h3>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${skill.mastery}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />
                    Lesson set
                  </span>
                  <span className="font-semibold">{skill.mastery}%</span>
                </div>
                <Link href={`/skills/${skill.slug}` as Route} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}>
                  Practice
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
