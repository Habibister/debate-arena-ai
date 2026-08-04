import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { COMPAT_TRACK_DESTINATION, compatTrackForSlug, debateWritingPracticeSupported } from "@/lib/education/skills-compat";
import { getDueReviews } from "@/lib/spaced-review";

// Review session: the skills whose spaced review is due, each linking into the EXISTING skill
// practice flow (no new drill types). Passing a due review advances its interval; failing knocks
// mastery down and reschedules it for tomorrow — handled in the practice grading route.
export default async function ReviewSessionPage() {
  const session = await getServerSession(authOptions);
  const due = session?.user?.id ? await getDueReviews(session.user.id) : [];

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
              Nothing due right now. Practice skills in{" "}
              <Link href={"/skills" as Route} className="font-semibold text-primary hover:underline">
                Skills
              </Link>{" "}
              to start their review schedule, then come back when they surface.
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
              return (
              <Link
                key={review.skillId}
                href={(reassessable ? `/skills/${review.skillSlug}/practice` : fallback.href) as Route}
                className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline">{review.organization.replace(/_/g, " ")}</Badge>
                    <h3 className="mt-2 font-semibold">{review.skillName}</h3>
                  </div>
                  <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {review.masteryPercent}% mastery
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    {/* M13E1G: the numeric claim is gone. `reviewCount` is a ladder counter, and rows written
                        before the due-gate could be inflated by rapid submissions, so it cannot honestly be read
                        as reviews survived, reassessments completed, or practices done. The due date is the one
                        fact this card can prove. */}
                    {`Due for review since ${review.nextReviewAt.toISOString().slice(0, 10)}.`}
                </p>
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
