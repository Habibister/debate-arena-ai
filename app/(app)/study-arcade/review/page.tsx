import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { practiceDrillAreaLabel, practiceDrillHref } from "@/lib/education/practice-drill";
import { COMPAT_TRACK_DESTINATION, compatTrackForSlug, debateWritingPracticeSupported, practiceRemediationForSkill } from "@/lib/education/skills-compat";
import { getDueReviews, PRACTICING_MASTERY_MIN } from "@/lib/spaced-review";
import { getActiveTrack } from "@/lib/track-server";

// Review session: the skills whose spaced review is due, each linking into the EXISTING skill
// practice flow (no new drill types). Passing a due review advances its interval; failing knocks
// mastery down and reschedules it for tomorrow — handled in the practice grading route.
// P1-C.2: this page resolves the ACTIVE TRACK and asks only for that track's due reviews. It
// previously passed a userId alone, so it listed every schedule row a learner had and rendered the
// owning track's badge, lesson and drill as their assigned training. `getActiveTrack` is the same
// canonical resolver the home page and the Study Arcade index already use, with the same `?track=`
// precedence — so an intentional switch through the track selector still moves the learner's review
// list, which is the point. What is gone is seeing another track's work without asking for it.
export default async function ReviewSessionPage({ searchParams }: { searchParams: { track?: string } }) {
  const session = await getServerSession(authOptions);
  const activeTrack = await getActiveTrack(searchParams.track);
  const due = session?.user?.id ? await getDueReviews(session.user.id, activeTrack?.organization) : [];
  // OWNER QA #4: the empty state always sent the learner to /skills. For DECA that page is titled
  // "Mastery paths" and its DECA branch holds one role-play tile and no drill at all, so a DECA
  // learner with an empty review list was pointed away from the only surface that could fill it.
  // The DECA drills live on the track's Study Arcade surface. Debate's /skills branch does carry its
  // drill tile, so Debate and HOSA are unchanged. Track-derived, because the surface that holds a
  // track's drills is not the same page for every track.
  const emptyStatePractice = activeTrack?.id === "DECA"
    ? { href: `/study-arcade?track=${activeTrack.slug}`, label: "the DECA skill drills" }
    : { href: "/skills", label: "Skills" };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Review session</Badge>
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold sm:text-4xl">
          <RotateCcw className="h-7 w-7 text-primary" aria-hidden />
          Reviews due
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Mastery only counts if it survives the gap. Complete a practice rep for each skill below: passing pushes its
          next review further out (1 → 3 → 7 → 14 days), failing brings the skill back tomorrow and lowers its mastery
          to what you actually demonstrated.
        </p>
      </div>

      {due.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Nothing due right now. Practise in{" "}
              <Link href={emptyStatePractice.href as Route} className="font-semibold text-primary hover:underline">
                {emptyStatePractice.label}
              </Link>{" "}
              — those record your practice, and a skill surfaces here when its review comes due.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {due.length} {due.length === 1 ? "skill" : "skills"} to reassess
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {due.map((review) => {
              // M13E1C: this card used to send EVERY due skill to /skills/[slug]/practice, which is
              // Debate writing practice. A HOSA Medical Terminology review — scheduled by the MedTerm
              // engine itself — landed on a debate motion. The destination and the wording are now
              // decided from the skill's own track, so the card cannot promise a reassessment that
              // does not exist for it.
              const reassessable = debateWritingPracticeSupported(review.skillSlug);
              const track = compatTrackForSlug(review.skillSlug);
              const fallback = track ? COMPAT_TRACK_DESTINATION[track] : { href: "/training", label: "Choose a training track" };
              // M15 Learning Architecture Slice 2: a due skill that has a mapped lesson AND a
              // server-graded drill can be sent to the EXACT drill that measures it, instead of the
              // generic destination above. Two separate facts decide the card, and they are not the
              // same question:
              //   DUE  — the schedule says reassess now. Every card here is due; that is the surface.
              //   WEAK — recorded mastery sits below the practicing floor.
              // A healthy learner is still due, so they still get the exact drill; what they do NOT
              // get is a lesson or any weakness wording, because nothing here demonstrates a gap.
              // `masteryPercent` is a high-water mark (it only falls on a failed due review), so this
              // reads the record that exists rather than claiming a fresh diagnosis.
              const remediation = practiceRemediationForSkill(review.skillSlug);
              // MASTERY IS SHOWN ONLY WHEN IT WAS RECORDED (P1-C.2). A real persisted 0 is evidence and
              // still reads "0% mastery"; an ABSENT record reads "Review due", because `?? 0` turned "we
              // have no mastery row" into the claim "your mastery is 0%". The HOSA Medical Terminology
              // path makes that the ordinary case rather than an edge case: it schedules a review and
              // never writes mastery, and it only schedules at all when the learner PASSED its floors.
              //
              // Below the floor is likewise a claim about a RECORD. With no mastery row there is no
              // record to be below, so this is false rather than true-by-default — otherwise every
              // review-only skill would carry weakness wording and a remedial lesson link it has no
              // evidence for.
              const belowPracticing = review.masteryPercent !== null && review.masteryPercent < PRACTICING_MASTERY_MIN;
              const summary = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline">{review.organization.replace(/_/g, " ")}</Badge>
                      <h3 className="mt-2 font-semibold">{review.skillName}</h3>
                    </div>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {review.masteryPercent === null ? "Review due" : `${review.masteryPercent}% mastery`}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {/* M13E1G: the numeric claim is gone. `reviewCount` is a ladder counter, and rows written
                        before the due-gate could be inflated by rapid submissions, so it cannot honestly be read
                        as reviews survived, reassessments completed, or practices done. The due date is the one
                        fact this card can prove. */}
                    {`Due for review since ${review.nextReviewAt.toISOString().slice(0, 10)}.`}
                  </p>
                </>
              );

              // The mapped branch takes precedence over the generic destination below. Through Wave 1B
              // the two paths were disjoint; Wave 1C deliberately maps debate-evidence AWAY from its
              // formative writing route: that route writes no MasteryProgress and cannot resolve the
              // review that made this card due, while the mapped server-graded drill can.
              // review-ladder:smoke requires every such displacement to be explicitly listed — a mapped
              // skill can still never lose a working destination silently, and a listing today does not
              // make future displacements automatically acceptable.
              // P1-C (2026-09-09): the track gate is GONE. It existed because this card named its drill
              // through the Debate-only `drillAreaLabel`, which throws on a DECA area — the destination
              // resolved correctly and the surface could not render it. Both halves are now track-aware,
              // so any track's remediation is shown here.
              //
              // WHAT STILL PROTECTS THE LEARNER is `practiceRemediationForSkill` itself, not this
              // branch: it refuses a lesson that is not learner-visible, refuses a non-concept entry,
              // and refuses any drill whose track does not match the track of the lesson that owns it.
              // A held lesson is never registered, so it can never be reached from here. The guard lives
              // in the helper on purpose — UI filtering alone would not stop the Coach making the same
              // mistake on the same data.
              if (remediation) {
                return (
                  <div key={review.skillId} className="rounded-lg border bg-background p-4">
                    {summary}
                    {belowPracticing ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {`Recorded mastery is below ${PRACTICING_MASTERY_MIN}%. Re-read the lesson first, then let the drill record where you are now.`}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-col items-start gap-2">
                      {belowPracticing ? (
                        <Link
                          href={`/lessons/${remediation.lessonId}` as Route}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {`Review: ${remediation.lessonTitle}`}
                        </Link>
                      ) : null}
                      <Link
                        href={practiceDrillHref(remediation.drill) as Route}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {`Reassess in the ${practiceDrillAreaLabel(remediation.drill)} drill`}
                      </Link>
                    </div>
                  </div>
                );
              }

              return (
              <Link
                key={review.skillId}
                href={(reassessable ? `/skills/${review.skillSlug}/practice` : fallback.href) as Route}
                className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted"
              >
                {summary}
                <span className="mt-2 inline-block text-sm font-semibold text-primary">
                  {reassessable ? "Reassess now" : fallback.label}
                </span>
              </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
