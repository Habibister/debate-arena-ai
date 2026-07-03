import { getServerSession } from "next-auth";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, CircleDashed, MessageSquareText, PlayCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { authOptions } from "@/lib/auth";
import { getStudentDebates, isUnfinished, sideLabel } from "@/lib/debate-history";
import { Badge } from "@/components/ui/badge";
import { trackByOrganization } from "@/lib/training-tracks";

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
      <div>
        <h1 className="text-2xl font-bold">Debate history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every debate you have started. Resume the unfinished ones or replay the judged ones — scores shown are your real results.
        </p>
      </div>

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
            return (
              <Card key={debate.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{debate.topic}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1 text-sm text-muted-foreground">
                    <p>
                      {track?.label ?? debate.organization} · {debate.eventType} · {debate.format}
                    </p>
                    <p>
                      {sideLabel(debate.studentSide)} · vs {debate.aiPersona ?? "AI opponent"}
                      {debate.assistedPractice ? (
                        <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                          Assisted Practice
                        </Badge>
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
                  {unfinished ? (
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
