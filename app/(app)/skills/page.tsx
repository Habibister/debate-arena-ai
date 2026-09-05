import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { SkillPath } from "@/components/skills/skill-path";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo";
import { getActiveTrack } from "@/lib/track-server";

const lessonStructure = ["Lesson", "Examples", "Guided practice", "Independent practice", "Mastery quiz"];

export default async function SkillsPage({ searchParams }: { searchParams: { track?: string } }) {
  const session = await getServerSession(authOptions);
  const showSampleProgress = isDemoUser(session?.user?.email);
  // `?track=` wins; otherwise fall back to the selected track (cookie) so skills stay track-scoped.
  const activeTrack = await getActiveTrack(searchParams.track);
  // Debate's surface here is drills and reviews. The page's original framing described a lesson-shaped
  // mastery path ("lessons, examples, guided reps, mastery checks"), which is neither what Debate has
  // nor what this page lists for it.
  //
  // It is named as an ACTION, never as a stage. Debate's journey is Learn then Compete; drills and
  // reviews are things a learner does inside Learn, not a third product area to understand first. The
  // badge said "Practice" and the heading "Practice a debate skill", which read as a category — and
  // this page has a shell nav entry while the lesson catalog did not, so that category out-ranked the
  // teaching. DECA and HOSA keep their existing framing untouched; only the Debate branch changed.
  const isDebate = activeTrack?.id === "GENERAL_DEBATE";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{isDebate ? "Skill drills" : "Skill Development"}</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold">{isDebate ? "Drill a debate skill" : "Mastery paths"}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {isDebate
            ? "Drills work one skill at a time and repeat it, and each one tells you whether it added to your record; skills that record come back later for review. Start with the lesson that teaches the skill — these are not the questions inside a lesson, and those live in the lesson."
            : "Skills are organized by organization and lesson sequence, with focused pages for lessons, examples, guided reps, independent practice, and mastery checks."}
        </p>
      </div>

      <SkillPath showSampleProgress={showSampleProgress} track={activeTrack?.id} />

      {/* Practice finds the gap; Learn supplies the reteaching. Stated as the relationship it is,
          rather than folding the lesson catalog back into this page as though lessons were drills. */}
      {isDebate ? (
        <div className="rounded-lg border bg-card p-4">
          <p className="font-semibold">A drill keeps going wrong?</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            A drill shows you where the gap is. The teaching that closes it is the lesson on that skill, under Learn.
          </p>
          <Link
            href={"/lessons?track=debate" as Route}
            className="focus-ring mt-3 inline-flex min-h-11 min-w-11 items-center gap-1 text-sm font-semibold text-primary"
          >
            Go to Debate lessons
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Link>
        </div>
      ) : null}

      {isDebate ? null : (
      <Card>
        <CardHeader>
          <CardTitle>Lesson anatomy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {lessonStructure.map((item, index) => (
            <div key={item} className="rounded-lg border bg-background p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold">{item}</h3>
            </div>
          ))}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
