import { getServerSession } from "next-auth";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Gavel, Lock, ShieldAlert } from "lucide-react";
import { RetryMotionButton } from "@/components/debate/retry-motion-button";
import { SpeakButton } from "@/components/debate/accessibility/speak-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HttpError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { getAttemptsForMotion, getDebateReplay, practiceTypeLabel, showsOpponentMeta, sideLabel } from "@/lib/debate-history";
import { trackByOrganization } from "@/lib/training-tracks";

export const dynamic = "force-dynamic";

// One official message rendered with an explicit speaker label. Student speeches carry an authorId;
// the AI opponent's do not; MODERATOR frames the round. Private Side Coach messages are never persisted,
// so they cannot appear in this transcript.
function speakerLabel(role: string, hasAuthor: boolean, persona: string | null): string {
  if (role === "MODERATOR") return "Moderator";
  if (hasAuthor) return "You";
  return persona ? `Opponent (${persona})` : "Opponent";
}

type ScoredDebate = {
  logicScore: number | null;
  evidenceScore: number | null;
  rebuttalScore: number | null;
  persuasionScore: number | null;
  clarityScore: number | null;
  communicationScore: number | null;
};

// Only real, stored category scores — nulls are omitted, never zero-filled or estimated.
function categoryRows(debate: ScoredDebate): Array<{ label: string; score: number }> {
  const rows: Array<{ label: string; score: number | null }> = [
    { label: "Logic", score: debate.logicScore },
    { label: "Evidence", score: debate.evidenceScore },
    { label: "Rebuttal", score: debate.rebuttalScore },
    { label: "Persuasion", score: debate.persuasionScore },
    { label: "Clarity", score: debate.clarityScore },
    { label: "Communication", score: debate.communicationScore }
  ];
  return rows.filter((row): row is { label: string; score: number } => typeof row.score === "number");
}

export default async function DebateReplayPage({ params }: { params: { debateId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=/debates/${params.debateId}/replay`);
  }

  let debate: Awaited<ReturnType<typeof getDebateReplay>>;
  try {
    debate = await getDebateReplay(session.user.id, session.user.role, params.debateId);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message =
      status === 403
        ? "You do not have permission to view this debate."
        : status === 404
          ? "This debate could not be found."
          : "This debate replay is unavailable right now.";
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold">Replay unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link href={"/debates/history" as Route} className={`mt-4 ${buttonVariants({ variant: "outline", size: "sm" })}`}>
          Back to history
        </Link>
      </div>
    );
  }

  const isOwner = debate.studentId === session.user.id;
  const track = trackByOrganization(debate.organization);
  const attempts = isOwner ? await getAttemptsForMotion(session.user.id, debate.topic, debate.id) : [];
  const judged = debate.status === "JUDGED";
  const hasJudgeNotes =
    debate.strengths.length > 0 || debate.weaknesses.length > 0 || debate.recommendations.length > 0 || typeof debate.overallScore === "number";

  // Read-aloud text for the judge feedback — reuses the same speech-synthesis engine as the transcript.
  const judgeSpeech = [
    typeof debate.overallScore === "number" ? `Overall score ${debate.overallScore}.` : "",
    debate.strengths.length ? `Strengths: ${debate.strengths.join(". ")}.` : "",
    debate.weaknesses.length ? `To improve: ${debate.weaknesses.join(". ")}.` : "",
    debate.recommendations.length ? `Recommendations: ${debate.recommendations.join(". ")}.` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Replay</Badge>
          <Badge variant="outline">{track?.label ?? debate.organization}</Badge>
          <Badge variant="outline">{practiceTypeLabel(debate)}</Badge>
          {judged ? <Badge>Completed</Badge> : <Badge variant="outline">Not yet judged</Badge>}
          {debate.assistedPractice ? <Badge variant="outline">Assisted Practice</Badge> : null}
        </div>
        <h1 className="text-2xl font-bold">{debate.topic}</h1>
        <p className="text-sm text-muted-foreground">
          {showsOpponentMeta(debate)
            ? `Your side: ${sideLabel(debate.studentSide)} · Opponent side: ${sideLabel(debate.opponentSide)} · Opponent: ${debate.aiPersona ?? "AI opponent"}`
            : "Solo practice session"}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Official transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {debate.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No speeches were recorded for this debate.</p>
          ) : (
            debate.messages.map((message) => (
              <div key={message.id} className="rounded-md border bg-background p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {speakerLabel(message.role, Boolean(message.authorId), debate.aiPersona)}
                  </p>
                  <SpeakButton text={message.content} label="Read aloud" />
                </div>
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            ))
          )}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Private Side Coach guidance was never part of this transcript and is not shown here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Gavel className="h-4 w-4" aria-hidden />
              Judge feedback
            </span>
            {judged && hasJudgeNotes && judgeSpeech ? <SpeakButton text={judgeSpeech} label="Read aloud" /> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!judged ? (
            <p className="text-sm text-muted-foreground">This debate has not been judged, so there is no score or feedback yet.</p>
          ) : !hasJudgeNotes ? (
            <p className="text-sm text-muted-foreground">No judge feedback was recorded for this debate.</p>
          ) : (
            <>
              {typeof debate.overallScore === "number" ? (
                <p className="text-sm font-semibold">Overall score: {debate.overallScore}</p>
              ) : null}
              {categoryRows(debate).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categoryRows(debate).map((row) => (
                    <span key={row.label} className="rounded-md border bg-background px-2 py-1 text-xs">
                      {row.label}: <span className="font-semibold">{row.score}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              {debate.strengths.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Strengths</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                    {debate.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {debate.weaknesses.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">To improve</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                    {debate.weaknesses.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {debate.recommendations.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Recommendations</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                    {debate.recommendations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {isOwner && attempts.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your other attempts at this motion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Real results from your judged attempts at this motion. No improvement is calculated — compare the values yourself.
            </p>
            {attempts.map((attempt) => {
              const rows = categoryRows(attempt);
              const hasQualitative = attempt.strengths.length > 0 || attempt.weaknesses.length > 0 || attempt.recommendations.length > 0;
              return (
                <div key={attempt.id} className="space-y-2 rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {attempt.createdAt.toLocaleDateString()} · {sideLabel(attempt.studentSide)}
                      {typeof attempt.overallScore === "number" ? ` · Overall ${attempt.overallScore}` : ""}
                      {attempt.assistedPractice ? (
                        <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                          Assisted Practice
                        </Badge>
                      ) : null}
                    </p>
                    <Link href={`/debates/${attempt.id}/replay` as Route} className="text-xs font-semibold text-primary hover:underline">
                      View replay
                    </Link>
                  </div>
                  {rows.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {rows.map((row) => (
                        <span key={row.label} className="rounded-md border px-2 py-0.5 text-xs">
                          {row.label}: <span className="font-semibold">{row.score}</span>
                        </span>
                      ))}
                    </div>
                  ) : hasQualitative ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {attempt.strengths.length > 0 ? <p><span className="font-semibold text-emerald-600">Strengths:</span> {attempt.strengths.join("; ")}</p> : null}
                      {attempt.weaknesses.length > 0 ? <p><span className="font-semibold text-amber-600">To improve:</span> {attempt.weaknesses.join("; ")}</p> : null}
                      {attempt.recommendations.length > 0 ? <p><span className="font-semibold text-sky-600">Recommendations:</span> {attempt.recommendations.join("; ")}</p> : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Comparison data is unavailable for this attempt.</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {isOwner ? (
        <RetryMotionButton
          config={{
            organization: debate.organization,
            eventType: debate.eventType,
            format: debate.format,
            level: debate.level,
            topic: debate.topic,
            studentSide: debate.studentSide,
            aiPersona: debate.aiPersona
          }}
        />
      ) : null}
    </div>
  );
}
