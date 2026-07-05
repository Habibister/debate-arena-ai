import Link from "next/link";
import { BookOpenCheck, CheckCircle2, ClipboardList, Layers3, Sparkles } from "lucide-react";
import { TestBuilderPreview } from "@/components/tests/test-builder-preview";
import { PracticeTestGenerator } from "@/components/tests/practice-test-generator";
import { RubricBreakdown } from "@/components/specs/rubric-breakdown";
import { SpecBanner } from "@/components/specs/spec-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_OPTIONS } from "@/lib/rubrics";
import { getOfficialTestFormat } from "@/lib/competition-specs";
import { getActiveTrack } from "@/lib/track-server";

const testSteps = [
  { title: "Generate", detail: "Choose 10, 25, 50, or a 100-question mixed exam.", icon: Sparkles },
  { title: "Answer", detail: "Complete the set with progress tracking.", icon: ClipboardList },
  { title: "Improve", detail: "Review explanations and recommended lessons.", icon: BookOpenCheck }
];

export default async function TestsPage({ searchParams }: { searchParams: { track?: string; assignmentId?: string } }) {
  // `?track=` wins; otherwise fall back to the selected track (cookie).
  const activeTrack = getActiveTrack(searchParams.track);
  // The DECA/HOSA test generator is only shown when it is actually relevant. Model UN and General
  // Debate get an honest empty state instead of another organization's generator. An assigned test
  // (?assignmentId=) always shows the generator so a valid assignment never lands on an empty page.
  const isAssignment = Boolean(searchParams.assignmentId);
  const lockedOrganization = activeTrack?.id === "DECA" ? "DECA" : activeTrack?.id === "HOSA" ? "HOSA" : undefined;
  const showGenerator = isAssignment || !activeTrack || activeTrack.id === "DECA" || activeTrack.id === "HOSA";
  // Registry-driven official test shape (HOSA MT: 50 questions / 60 minutes). Null when the
  // registry has no timed multiple-choice round for the organization — generator is unchanged.
  const officialFormat = lockedOrganization ? await getOfficialTestFormat(lockedOrganization) : null;
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">DECA and HOSA</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Practice tests</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Generate original questions by DECA event cluster or HOSA event category, score attempts, explain mistakes, and route weak areas into lessons.
        </p>
        {lockedOrganization ? (
          <div className="mt-4 space-y-3">
            <SpecBanner organization={lockedOrganization} />
            <RubricBreakdown organization={lockedOrganization} />
          </div>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {testSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-md border bg-background p-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  {step.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {showGenerator ? (
        <>
          <PracticeTestGenerator lockedOrganization={lockedOrganization} officialFormat={officialFormat} />
          <TestBuilderPreview />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No practice tests for {activeTrack?.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Practice tests are available for DECA and HOSA only.</p>
            <p>
              Your {activeTrack?.label} track uses debate/practice and skill lessons instead of an exam generator. Switch to
              DECA or HOSA from the Training page to generate practice tests.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supported test tracks</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {!activeTrack || activeTrack.id === "DECA" ? (
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">DECA</p>
              <p className="mt-2 font-semibold">{EVENT_OPTIONS.DECA.map((event) => event.label).join(", ")}</p>
            </div>
          ) : null}
          {!activeTrack || activeTrack.id === "HOSA" ? (
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold text-muted-foreground">HOSA</p>
              <p className="mt-2 font-semibold">{EVENT_OPTIONS.HOSA.map((event) => event.label).join(", ")}</p>
            </div>
          ) : null}
          {activeTrack && activeTrack.id !== "DECA" && activeTrack.id !== "HOSA" ? (
            <div className="rounded-lg border bg-background p-4 md:col-span-2">
              <p className="text-sm font-semibold">Practice tests are available for DECA and HOSA.</p>
              <p className="mt-2 text-sm text-muted-foreground">Your {activeTrack.label} track uses debate/practice and study instead.</p>
            </div>
          ) : null}
          <div className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
              After grading
            </div>
            <p className="mt-2 font-semibold">Score, explanations, weak areas, recommended lessons</p>
          </div>
        </CardContent>
      </Card>

      <Link href="/study" className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
        <Layers3 className="mt-1 h-5 w-5 text-primary" aria-hidden />
        <span>
          <span className="block font-semibold">Study DECA/HOSA terms before testing</span>
          <span className="mt-1 block text-sm leading-6 text-muted-foreground">
            Open original flashcard decks with definitions, examples, quick checks, and external video resources.
          </span>
        </span>
      </Link>
    </div>
  );
}
