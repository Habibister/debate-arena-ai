import type { Route } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DebateRoom } from "@/components/debate/debate-room";
import { RubricBreakdown } from "@/components/specs/rubric-breakdown";
import { SpecBanner } from "@/components/specs/spec-banner";
import { getActiveTrack } from "@/lib/track-server";
import { COMPETENCY_LABELS, defaultSupportLevel, guidedRubricFor } from "@/lib/education/coaching";

export default async function DebatePage({ searchParams }: { searchParams: { track?: string; guided?: string } }) {
  // GUIDED ROUND, launched from a lesson's scaffolded try. `guided` names the lesson; the curriculum's
  // guided declaration says which skill is primary, which are reinforcement, and which are LOCKED.
  // Resolved FAIL-CLOSED: an id with no declaration means an ordinary round — there is no half-guided
  // state, and nothing about the learner is assumed from a query string.
  const guidedLessonId = typeof searchParams.guided === "string" ? searchParams.guided : undefined;
  const guidedRubric = guidedLessonId ? guidedRubricFor(guidedLessonId) : null;
  const guidedSupport = guidedRubric ? defaultSupportLevel("guided") : null;
  // The debate room is a General Debate (parliamentary/PF) experience. Other tracks have their own
  // legitimate practice (DECA role play, HOSA scenarios, Model UN committee) — never present
  // parliamentary debate as their training. Send them to the correct track practice instead.
  const activeTrack = await getActiveTrack(searchParams.track);
  if (activeTrack && activeTrack.id !== "GENERAL_DEBATE") {
    redirect(`/training/${activeTrack.slug}/practice` as Route);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">AI Debate Arena</Badge>
          <Badge variant="outline">Free local judging</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Create a debate room</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Choose a motion, format, timer, and side. CompeteReady will create a dedicated arena page with turn order,
          AI opponent speeches, and a judge decision when the round is complete.
        </p>
        <div className="mt-4">
          <SpecBanner organization="DEBATE" />
        </div>
      </div>

      {guidedRubric && guidedLessonId ? (
        <div className="rounded-lg border border-primary/40 bg-primary/[0.05] p-5" role="status">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Guided round</Badge>
            <Badge variant="outline">Support: {guidedSupport === "HIGH_SUPPORT" ? "high" : guidedSupport === "MEDIUM_SUPPORT" ? "medium" : guidedSupport === "LOW_SUPPORT" ? "low" : "independent"}</Badge>
          </div>
          <p className="mt-3 leading-7 text-foreground">
            This round is for <span className="font-semibold">{COMPETENCY_LABELS[guidedRubric.primary]}</span>.
            {guidedRubric.reinforcement.length > 0 ? (
              <> Keep using {guidedRubric.reinforcement.map((c) => COMPETENCY_LABELS[c]).join(" and ")} as well.</>
            ) : null}
          </p>
          {/* NEVER TEST BEFORE TEACHING, said to the learner in their own words. Both the coach AND
              the judge are limited to what this lesson has taught. What IS still true has to be said
              too: the round is a real round and it is saved. Calling a stored transcript "nothing" is
              the same class of lie as promising progress that never happens. So the copy separates
              the two: the round is kept, the record is not moved. */}
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The coach comments only on those skills, and so does the judge at the end — it scores what
            you have been taught, names one thing to fix, and picks no winner. The round is saved to
            your practice history. It earns no XP, changes no rank, and does not count toward mastery
            or your average score.
          </p>
        </div>
      ) : null}

      <DebateRoom track={searchParams.track} guidedLessonId={guidedRubric ? guidedLessonId : undefined} />

      <RubricBreakdown organization="DEBATE" eventType="PUBLIC_FORUM" />
    </div>
  );
}
