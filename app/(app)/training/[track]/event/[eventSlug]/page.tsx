import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpenCheck, ClipboardList, Gamepad2, Gavel, Layers3, ListChecks, PlayCircle, Target } from "lucide-react";
import { RubricBreakdown } from "@/components/specs/rubric-breakdown";
import { SpecBanner } from "@/components/specs/spec-banner";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSpec } from "@/lib/competition-specs";
import { MEDTERM_AREAS } from "@/lib/hosa-medterm";
import { DECA_DRILL_AREAS } from "@/lib/deca-drills";
import { prisma } from "@/lib/prisma";
import { deckSummaries } from "@/lib/study-content";
import { isTrackRetired, trackBySlug } from "@/lib/training-tracks";
import type { Organization } from "@prisma/client";

export const dynamic = "force-dynamic";

type Stage = { order?: number; name?: string; minutes?: number | null; notes?: string };

type EventSection = { label: string; detail: string; href: string; icon: "drills" | "tests" | "sim" | "cards" | "skills" | "rounds" };

// Event HQ registry: one page per real event, gathering only surfaces that actually exist.
// Every entry names its spec so registry attribution (SpecBanner/RubricBreakdown) is honest.
const EVENT_HQ: Record<
  string,
  {
    trackSlug: string;
    organization: Organization;
    specEvent: string;
    title: string;
    overview: string;
    rubricEventType?: string;
    studyTopics?: Array<{ label: string; description?: string }>;
    sections: EventSection[];
  }
> = {
  "hosa/medical-terminology": {
    trackSlug: "hosa",
    organization: "HOSA",
    specEvent: "Medical Terminology",
    title: "Medical Terminology",
    overview:
      "HOSA's written knowledge event: a timed multiple-choice exam over medical prefixes, suffixes, roots, and clinical language. Everything on this page feeds the same real mastery record.",
    rubricEventType: "HEALTH_SCIENCE_EVENT",
    studyTopics: MEDTERM_AREAS.map((a) => ({ label: a.label })),
    sections: [
      { label: "Timed practice + official 50q mode", detail: "The knowledge engine with confidence checks, explanations, and spaced review.", href: "/training/hosa/practice", icon: "sim" },
      { label: "Flashcards", detail: "Term, definition, example, and a quick check per card.", href: "/study-arcade?track=hosa", icon: "cards" },
      { label: "Practice tests", detail: "Original generated sets in the official format where verified.", href: "/tests?track=hosa", icon: "tests" },
      { label: "Skills & lessons", detail: "Guided lessons feeding the same mastery record.", href: "/skills?track=hosa", icon: "skills" }
    ]
  },
  "deca/hotel-lodging-management": {
    trackSlug: "deca",
    organization: "DECA",
    specEvent: "Hotel and Lodging Management Series",
    title: "Hotel & Lodging Management",
    overview:
      "DECA's HLM role-play series: prep against performance indicators, present to a judge in character, and defend your reasoning in the objection round.",
    rubricEventType: "ROLEPLAY",
    sections: [
      { label: "Guided role-play", detail: "Scenario → pitch → in-character objections → scored ballot.", href: "/training/deca/practice", icon: "rounds" },
      { label: "Full Simulation (timed)", detail: "The complete round on the official prep clock.", href: "/study-arcade?track=deca", icon: "sim" },
      { label: "Concept drills", detail: "Performance indicators, business reasoning, customer relations, marketing.", href: "/study-arcade?track=deca", icon: "drills" },
      { label: "Practice tests", detail: "Cluster-exam style sets with explanations.", href: "/tests?track=deca", icon: "tests" }
    ]
  },
  "debate/public-forum": {
    trackSlug: "debate",
    organization: "DEBATE",
    specEvent: "Public Forum Debate",
    title: "Public Forum",
    overview:
      "Partner-style debate judged holistically with 0–30 speaker points. Train the round itself, then drill the skills the ballot actually rewards.",
    rubricEventType: "PUBLIC_FORUM",
    sections: [
      { label: "Full rounds", detail: "Live practice with an AI opponent and judged ballot.", href: "/debate?track=debate", icon: "rounds" },
      { label: "Skill drills", detail: "Claim building, evidence, rebuttal, weighing — real mastery + spaced review.", href: "/study-arcade?track=debate", icon: "drills" },
      { label: "Skills & lessons", detail: "Guided practice with mastery checks.", href: "/skills?track=debate", icon: "skills" }
    ]
  }
};

const SECTION_ICONS = {
  drills: Layers3,
  tests: ClipboardList,
  sim: PlayCircle,
  cards: Gamepad2,
  skills: BookOpenCheck,
  rounds: Gavel
} as const;

export default async function EventHqPage({ params }: { params: { track: string; eventSlug: string } }) {
  const track = trackBySlug(params.track);
  if (!track) notFound();
  if (isTrackRetired(track.id)) redirect("/training");

  const config = EVENT_HQ[`${params.track}/${params.eventSlug}`];
  // Unknown event, or an event that belongs to a different track: honest 404, never borrowed content.
  if (!config || config.trackSlug !== params.track) notFound();

  const spec = await getActiveSpec(config.organization, config.specEvent);
  const stages = (Array.isArray(spec?.roundStructure) ? spec?.roundStructure : []) as Stage[];

  // "Common mistakes": ONLY the user's real graded weak areas for this organization — never invented.
  const session = await getServerSession(authOptions);
  const recentTests = session?.user?.id
    ? await prisma.practiceTest.findMany({
        where: { userId: session.user.id, organization: config.organization, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 5,
        select: { weakAreas: true }
      })
    : [];
  const weakAreas = Array.from(new Set(recentTests.flatMap((t) => t.weakAreas))).slice(0, 4);

  const hasDeck = deckSummaries().some((d) => d.organization === config.organization);

  return (
    <div className="space-y-6">
      <Link href={`/training/${track.slug}` as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {track.label} hub
      </Link>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{track.label}</Badge>
          <Badge variant="outline">Event HQ</Badge>
        </div>
        <h1 className="page-title mt-3">{config.title}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">{config.overview}</p>
        <div className="mt-4">
          <SpecBanner organization={config.organization} eventName={config.specEvent} />
        </div>
      </div>

      {stages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-track" aria-hidden />
              Official round structure
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {stages.map((stage, index) => (
              <div key={index} className="rounded-md border bg-background p-3 text-sm">
                <p className="font-semibold">{stage.name ?? `Stage ${index + 1}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {typeof stage.minutes === "number" ? `${stage.minutes} min` : ""}
                  {stage.notes ? `${typeof stage.minutes === "number" ? " · " : ""}${stage.notes}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {config.sections
          .filter((s) => s.icon !== "cards" || hasDeck)
          .map((section) => {
            const Icon = SECTION_ICONS[section.icon];
            return (
              <Link key={section.label} href={section.href as Route} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
                <Icon className="h-5 w-5 text-track" aria-hidden />
                <p className="mt-2 font-semibold">{section.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.detail}</p>
              </Link>
            );
          })}
      </div>

      {config.studyTopics && config.studyTopics.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study topics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {config.studyTopics.map((topic) => (
              <span key={topic.label} className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium">
                {topic.label}
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {config.rubricEventType ? <RubricBreakdown organization={config.organization} eventType={config.rubricEventType} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-track" aria-hidden />
            Your common mistakes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weakAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {weakAreas.map((area) => (
                <span key={area} className="rounded-md border border-track/30 bg-track/10 px-3 py-1.5 text-sm font-medium">
                  {area}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing here yet — this fills in from your real graded tests as you practice. It is never invented.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
