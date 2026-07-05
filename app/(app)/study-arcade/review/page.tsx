import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
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
            {due.map((review) => (
              <Link
                key={review.skillId}
                href={`/skills/${review.skillSlug}/practice` as Route}
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
                  {review.reviewCount > 0
                    ? `Survived ${review.reviewCount} ${review.reviewCount === 1 ? "review" : "reviews"} so far — due since ${review.nextReviewAt.toISOString().slice(0, 10)}.`
                    : `First review — due since ${review.nextReviewAt.toISOString().slice(0, 10)}.`}
                </p>
                <span className="mt-2 inline-block text-sm font-semibold text-primary">Reassess now</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
