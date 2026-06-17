import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Layers3, Lock, MessageSquareText, Sparkles, Target } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { HttpError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { getCoachStudentProgress } from "@/lib/coach-progress";

export const dynamic = "force-dynamic";

function PermissionDenied() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Coach Dashboard</Badge>
        <h1 className="mt-3 text-3xl font-bold">Student progress</h1>
      </div>
      <EmptyState
        icon={Lock}
        title="You do not have permission to view this student."
        description="You can only view students who have joined one of your own teams."
        actionLabel="Back to coach dashboard"
        actionHref="/coach"
      />
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-center">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

export default async function CoachStudentProgressPage({ params }: { params: { studentId: string } }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  // First gate: only coaches/admins reach this page at all.
  if (!session?.user?.id || (role !== "COACH" && role !== "ADMIN")) {
    return <PermissionDenied />;
  }

  let data: Awaited<ReturnType<typeof getCoachStudentProgress>>;
  try {
    data = await getCoachStudentProgress(session.user.id, params.studentId, role);
  } catch (error) {
    // 403 (not your student) and 404 (no such student) both resolve to a safe denial message.
    if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
      return <PermissionDenied />;
    }
    throw error;
  }

  const { student, membership, debate, skills, tests, study, recommendations } = data;
  const masteryDisplay = data.masteryPercent === 0 && !data.hasAnyActivity ? "Not started" : `${data.masteryPercent}%`;
  const joinedLabel = membership.joinedAt ? new Date(membership.joinedAt).toLocaleDateString() : "—";

  return (
    <div className="space-y-6">
      <Link href="/coach" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to coach dashboard
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <UserAvatar username={student.username} displayName={student.displayName} avatarUrl={student.avatarUrl} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{student.displayName}</h1>
                <Badge variant="outline">{(student.level ?? "BEGINNER").toLowerCase()}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                @{student.username}
                {student.email ? <> · {student.email}</> : null}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {membership.teamName ? <>Team: {membership.teamName} · </> : null}Joined {joinedLabel}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatChip label="Debate rating" value={`${data.rating}`} />
            <StatChip label="XP" value={`${student.xp}`} />
            <StatChip label="Rank" value={`${student.rank}`.replace("_", " ")} />
            <StatChip label="Streak" value={`${student.streak} days`} />
            <StatChip label="Mastery" value={masteryDisplay} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{data.ratingLabel}</p>
        </CardContent>
      </Card>

      {/* 1. Debate performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" aria-hidden />
            Debate performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {debate.judgedRounds === 0 && debate.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No debate rounds yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatChip label="Judged rounds" value={`${debate.judgedRounds}`} />
                <StatChip label="Wins" value={`${debate.wins}`} />
                <StatChip label="Losses" value={`${debate.losses}`} />
                <StatChip label="Avg judge score" value={debate.averageScore !== null ? `${debate.averageScore}` : "—"} />
              </div>

              {debate.recent.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent rounds</p>
                  <div className="space-y-2">
                    {debate.recent.map((round) => (
                      <div key={round.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{round.topic}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(round.createdAt).toLocaleDateString()} · {round.status.toLowerCase()}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{round.overallScore !== null ? `${round.overallScore}` : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {debate.latestFeedback ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Latest judge feedback</p>
                  {debate.latestFeedback.strengths.length > 0 ? (
                    <p className="mt-2 text-sm"><span className="font-semibold">Strengths:</span> {debate.latestFeedback.strengths.join("; ")}</p>
                  ) : null}
                  {debate.latestFeedback.weaknesses.length > 0 ? (
                    <p className="mt-1 text-sm"><span className="font-semibold">To improve:</span> {debate.latestFeedback.weaknesses.join("; ")}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Skill growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" aria-hidden />
            Skill growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not started yet.</p>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold">{skill.name}</span>
                    <span className="text-muted-foreground">{skill.masteryPercent}%</span>
                  </div>
                  <Progress value={skill.masteryPercent} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
            Practice tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tests.completed === 0 ? (
            <p className="text-sm text-muted-foreground">No practice tests completed yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <StatChip label="Completed" value={`${tests.completed}`} />
                <StatChip label="Average score" value={tests.averageScore !== null ? `${tests.averageScore}%` : "—"} />
                <StatChip
                  label="Latest"
                  value={tests.latest && typeof tests.latest.score === "number" ? `${tests.latest.score}%` : "—"}
                />
              </div>
              {tests.weakCategories.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Weak categories</p>
                  <div className="flex flex-wrap gap-2">
                    {tests.weakCategories.map((category) => (
                      <Badge key={category} variant="outline">{category}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* 4. Study / flashcards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5 text-primary" aria-hidden />
            Study / flashcards
          </CardTitle>
        </CardHeader>
        <CardContent>
          {study.cardsCompleted === 0 ? (
            <p className="text-sm text-muted-foreground">No flashcards studied yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatChip label="Decks studied" value={`${study.decksStudied}`} />
              <StatChip label="Cards completed" value={`${study.cardsCompleted}`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Recommended next steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            Recommended next steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendations.map((step) => (
              <li key={step} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {step}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
