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
          <Badge variant="secondary">{isDebate ? "Skill drills" : "Skills"}</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        {/* Owner QA Repair 3B: the non-Debate header promised focused per-stage pages and a
            five-step outline — a retired lesson shape no track renders. DECA's skills live in three
            real places, named here; HOSA's in its Event HQ. The page says what it holds. */}
        <h1 className="mt-3 text-3xl font-bold">{isDebate ? "Drill a debate skill" : activeTrack ? `${activeTrack.label} skills` : "Skills"}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {isDebate
            ? "Drills work one skill at a time and repeat it, and each one tells you whether it added to your record; skills that record come back later for review. Start with the lesson that teaches the skill — these are not the questions inside a lesson, and those live in the lesson."
            : activeTrack?.id === "DECA"
              ? "DECA records four skills. Each card below names one, says which side of the event CompeteReady trains it for, links the lesson to start from, and opens its own drill in the Study Arcade, where your results are recorded. The role-play practice room is where you rehearse the whole event; it records nothing."
              : activeTrack?.id === "HOSA"
                ? "HOSA trains from your exact event. Medical Terminology practice lives on its Event HQ page; start from the Event Navigator below."
                : "Pick a track to see the skills it trains."}
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

      {/* Owner QA Repair 3B: the five-step outline card that used to sit here (ending in a quiz)
          described a lesson shape no track renders, so it is gone for every track. Nothing replaces
          it: the card promised a product, not a fact. */}
      {isDebate || !activeTrack ? null : (
        <div className="rounded-lg border bg-card p-4">
          <p className="font-semibold">Where {activeTrack.short} skills are taught{activeTrack.id === "DECA" ? " and recorded" : ""}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href={`/lessons?track=${activeTrack.slug}` as Route} className="focus-ring inline-flex min-h-11 min-w-11 items-center gap-1 text-sm font-semibold text-primary">
              {activeTrack.id === "DECA" ? "DECA lessons" : `${activeTrack.short} lessons`}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </Link>
            {activeTrack.id === "DECA" ? (
              <Link href={`/study-arcade?track=${activeTrack.slug}` as Route} className="focus-ring inline-flex min-h-11 min-w-11 items-center gap-1 text-sm font-semibold text-primary">
                DECA skill drills
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
