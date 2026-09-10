import { getServerSession } from "next-auth";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, CircleDashed, MessageSquareText, PlayCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GUIDED_ROUND_LABEL } from "@/lib/guided-rounds";
import { authOptions } from "@/lib/auth";
import { getStudentDebates, isUnfinished, practiceTypeLabel, showsOpponentMeta, sideLabel } from "@/lib/debate-history";
import { Badge } from "@/components/ui/badge";
import { isTrackRetired, trackByOrganization } from "@/lib/training-tracks";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

function statusLabel(status: string): string {
  if (status === "JUDGED") return "Completed";
  if (status === "ACTIVE") return "In progress";
  if (status === "SETUP") return "Not started";
  if (status === "ARCHIVED") return "Archived";
  return status;
}

export default async function DebateHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/debates/history");
  }

  const debates = await getStudentDebates(session.user.id);

  return (
    <div className="space-y-6">
      {/* Owner QA Repair 2: this list holds every track's sessions (each row is labelled with its
          own track below), but it was headed "Debate history" — a DECA or HOSA learner arriving from
          their Compete page read another track's name over their own sessions. */}
      <PageHeader
        heading={<h1 className="page-title">History</h1>}
        description={
          <p className="text-sm">
            Every round and session saved to your history, from any of your tracks — each labelled with its own. Resume the unfinished ones or replay the judged ones — scores shown are your real results.
          </p>
        }
      />

      {debates.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No debates yet"
          description="Start a practice debate and it will appear here so you can resume or replay it."
          actionLabel="Start a debate"
          actionHref="/debate"
        />
      ) : (
        <div className="space-y-3">
          {debates.map((debate) => {
            const unfinished = isUnfinished(debate.status);
            const track = trackByOrganization(debate.organization);
            // QA-R1 #13. History legitimately holds every track's sessions, and a Model UN round a
            // learner really started is their own record — it is not deleted or hidden. But Model UN is
            // retired: the product offers no way to train it, so "Continue" led back into a track that
            // no longer exists. The row keeps its place and its label, says the track is no longer
            // offered, and stops advertising a way back in. A judged round can still be replayed,
            // because reading your own record is not the same as resuming training in a dead track.
            const retiredTrack = Boolean(track && isTrackRetired(track.id));
            return (
              <Card key={debate.id}>
                <CardHeader className="pb-2">
                  <CardTitle as="h2" className="text-base">{debate.topic}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1 text-sm text-muted-foreground">
                    <p>
                      {track?.label ?? debate.organization} · {practiceTypeLabel(debate)}{" "}
                      {retiredTrack ? (
                        <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                          No longer offered
                        </Badge>
                      ) : null}
                    </p>
                    <p>
                      {showsOpponentMeta(debate) ? <>{sideLabel(debate.studentSide)} · vs {debate.aiPersona ?? "AI opponent"}</> : "Solo practice"}
                      {debate.assistedPractice ? (
                        <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                          Assisted Practice
                        </Badge>
                      ) : null}
                      {/* A guided lesson round stays in history and is named as what it is: coached
                          practice on a curriculum-limited ballot, never a full independent round. */}
                      {debate.practiceMode === "LESSON" ? (
                        <Badge className="ml-2 align-middle text-[10px]">{GUIDED_ROUND_LABEL}</Badge>
                      ) : null}
                    </p>
                    <p className="flex items-center gap-1.5 font-semibold text-foreground">
                      {debate.status === "JUDGED" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                      ) : unfinished ? (
                        <CircleDashed className="h-4 w-4 text-amber-500" aria-hidden />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden />
                      )}
                      {statusLabel(debate.status)}
                      {debate.status === "JUDGED" && typeof debate.overallScore === "number"
                        ? ` · Score ${debate.overallScore}`
                        : ""}
                    </p>
                  </div>
                  {unfinished && retiredTrack ? (
                    // A statement, not a disabled control: there is nothing to press because the track
                    // itself is gone.
                    <p className="text-sm text-muted-foreground">
                      This track is no longer offered, so this session cannot be continued.
                    </p>
                  ) : unfinished ? (
                    <Link href={`/debate/${debate.id}` as Route} className={buttonVariants({ size: "sm" })}>
                      <PlayCircle className="mr-2 h-4 w-4" aria-hidden />
                      Continue
                    </Link>
                  ) : debate.status === "JUDGED" ? (
                    <Link
                      href={`/debates/${debate.id}/replay` as Route}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      View replay
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
