import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Layers3, Lock, MessageSquareText, Sparkles, Target } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalDate } from "@/components/ui/local-date";
import { Progress } from "@/components/ui/progress";
import { GUIDED_ROUND_LABEL } from "@/lib/guided-rounds";
import { HttpError } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { canAccessCoachTools } from "@/lib/roles";
import { coachTrackIsTrained, coachTrackRecordsMastery } from "@/lib/coach-truth";
import { trackByOrganization } from "@/lib/training-tracks";
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
  if (!session?.user?.id || !canAccessCoachTools(role)) {
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
  // HOSA H1. "Mastery" names recorded mastery evidence and nothing else. When this track has no
  // mastery rows for this student the chip shows the page's own absent-value mark rather than a
  // number, because the number it used to show was the practice-test average — which is still on the
  // page, under its own name, in the Practice tests card below.
  const masteryDisplay = data.masteryPercent === null ? "—" : `${data.masteryPercent}%`;
  // The organization is always what the figures were read with. The TRACK is only a label for it, and
  // some organizations (Mock Trial, Public Speaking) have no track page at all — so fall back to the
  // organization's own name rather than claiming the track is unknown when it is not.
  const scopeLabel = data.organization
    ? trackByOrganization(data.organization)?.label ?? data.organization.replace(/_/g, " ").toLowerCase()
    : null;
  // Why this track's record might be empty. These three cases must not share one sentence: a student
  // who has not started, a track that records no mastery by design (HOSA), and an organization
  // CompeteReady does not train at all (Mock Trial and Public Speaking are both selectable when a
  // coach creates a team; Model UN teams predate its removal).
  const trackIsTrained = coachTrackIsTrained(data.organization);
  const trackRecordsMastery = coachTrackRecordsMastery(data.organization);
  const joinedLabel = membership.joinedAt ? <LocalDate value={membership.joinedAt} /> : "—";

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
              {/* HOSA H1. Says exactly which figures were read for this track and which were not.
                  Skills and practice tests are scoped to it; rounds, XP, rank and the streak are
                  account-wide columns, and the round queries are held to their existing shape by the
                  guided-round controls, so claiming the whole page is track-scoped would be false. */}
              <p className="mt-1 text-sm text-muted-foreground">
                {scopeLabel ? (
                  <>
                    Skills and practice tests below are {scopeLabel} only. Rounds, XP, rank and sessions are
                    account-wide.
                  </>
                ) : (
                  <>No track resolved for this student yet</>
                )}
              </p>
              {scopeLabel && !trackIsTrained ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  CompeteReady does not train {scopeLabel}, so there is nothing recorded for it. Any work this
                  student has done sits on another track.
                </p>
              ) : null}
            </div>
          </div>

          {/* Real evidence only: judged rounds, XP, rank, sessions, mastery — no synthetic rating and
              no stand-in. Mastery reads "—" until this track records mastery for this student. */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatChip label="Judged rounds" value={`${data.debate.judgedRounds}`} />
            <StatChip label="XP" value={`${student.xp}`} />
            <StatChip label="Rank" value={`${student.rank}`.replace("_", " ")} />
            <StatChip label="Practice sessions" value={String(student.streak)} />
            <StatChip label="Mastery" value={masteryDisplay} />
          </div>
          {data.masteryPercent === null ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {!trackIsTrained
                ? `CompeteReady records no mastery for ${scopeLabel ?? "this organization"}.`
                : trackRecordsMastery
                  ? "No mastery recorded on this track yet. Mastery comes from drills that write a durable skill record — it is never estimated from test scores."
                  : `${scopeLabel ?? "This track"} practice records a review schedule rather than a mastery figure, so this stays blank however much the student practises. It is not a gap in their work.`}
            </p>
          ) : null}
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
              {/* M15 S1A A3a: the Wins/Losses pair is gone. "Losses" was derived as
                  judgedRounds - wins, and once A3a stopped the judge route incrementing User.wins
                  that subtraction reported every future judged round as a loss. The two chips only
                  read as a competitive record TOGETHER, so showing "Wins 0" beside a growing round
                  count would state the same false record by implication. What remains is what the
                  database actually records: how many rounds were judged, and their average
                  formative ballot score. Relabelling the historical "Wins" counters elsewhere is
                  A3b; nothing here deletes or rewrites that stored history. */}
              <div className="grid grid-cols-2 gap-2">
                <StatChip label="Judged rounds" value={`${debate.judgedRounds}`} />
                {/* A3b-3: "Avg judge score" implied a verified result. The number is real — it
                    averages stored ballot scores — but formative, so it carries the same name the
                    ballot itself uses. Value, null handling and query are unchanged. */}
                <StatChip label="Avg practice ballot score (current scoring)" value={debate.averageScore !== null ? `${debate.averageScore}` : "—"} />
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
                            <LocalDate value={round.createdAt} /> · {round.status.toLowerCase()}
                            {round.practiceMode === "LESSON" ? ` · ${GUIDED_ROUND_LABEL.toLowerCase()}` : ""}
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
            // "Not started yet" is only true where starting would produce a row. For HOSA it never
            // would, and for an untrained organization there is nothing to start.
            <p className="text-sm text-muted-foreground">
              {!trackIsTrained
                ? `CompeteReady records no skills for ${scopeLabel ?? "this organization"}.`
                : trackRecordsMastery
                  ? "Not started yet."
                  : `${scopeLabel ?? "This track"} practice does not record skill mastery.`}
            </p>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold">{skill.name}</span>
                    <span className="text-muted-foreground">{skill.masteryPercent}%</span>
                  </div>
                  <Progress value={skill.masteryPercent} />
                  {/* The recorded figure is real and unchanged. This says only that it cannot move at
                      the moment, so a flat bar is not misread as a student who stopped practising. */}
                  {skill.updating ? null : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Recorded earlier. This skill is in practice mode, so the figure is not updating.
                    </p>
                  )}
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
            <p className="text-sm text-muted-foreground">
              {!trackIsTrained
                ? `CompeteReady has no practice tests for ${scopeLabel ?? "this organization"}.`
                : "No practice tests completed yet."}
            </p>
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
          {/* HOSA H1. A next step names something this track can actually be assigned. When the track
              is unresolved there is nothing truthful to suggest, and saying nothing is the honest
              answer — the list used to fill that gap with General Debate's steps. */}
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {scopeLabel
                ? `No next step to suggest: ${scopeLabel} is not a track CompeteReady trains.`
                : "No next step to suggest until this student's track is known."}
            </p>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((step) => (
                <li key={step} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-sm">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {step}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
