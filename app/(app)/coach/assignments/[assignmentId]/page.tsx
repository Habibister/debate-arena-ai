import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, ExternalLink, Lock } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { assignmentStatusLabel, assignmentTypeLabel, completionStats } from "@/lib/assignment-types";
import { getAssignedStudentIds, getCoachAssignmentDetail } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function evidenceHref(evidenceType?: string | null, evidenceId?: string | null) {
  if (!evidenceType || !evidenceId) return null;
  if (evidenceType === "DEBATE") return `/debate/${evidenceId}` as Route;
  if (evidenceType === "PRACTICE_TEST") return `/tests/${evidenceId}/results` as Route;
  if (evidenceType === "LESSON_ATTEMPT") return "/skills" as Route;
  return null;
}

function dateLabel(date?: Date | null) {
  if (!date) return "No due date";
  return date.toLocaleString();
}

export default async function CoachAssignmentDetailPage({ params }: { params: { assignmentId: string } }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user?.id || (role !== "COACH" && role !== "ADMIN")) {
    return (
      <div className="space-y-6">
        <Badge variant="secondary">Coach Assignments</Badge>
        <EmptyState
          icon={Lock}
          title="You need a coach account to view this assignment."
          description="Only the coach who owns the team, or an admin, can view assignment progress."
          actionLabel="Back to dashboard"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const assignment = await getCoachAssignmentDetail({
    assignmentId: params.assignmentId,
    userId: session.user.id,
    role
  }).catch(() => null);

  if (!assignment) {
    notFound();
  }

  const assignedIds = getAssignedStudentIds(assignment);
  const assignedSet = new Set(assignedIds);
  const submissionsByStudent = new Map(assignment.submissions.map((submission) => [submission.studentId, submission]));
  const statuses = assignedIds.map((studentId) => submissionsByStudent.get(studentId)?.status ?? "NOT_STARTED");
  const stats = completionStats(statuses);
  const assignedMembers = assignment.team.members.filter((member) => assignedSet.has(member.userId));

  return (
    <div className="space-y-6">
      <Link href={"/coach/assignments" as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Assignments
      </Link>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{assignmentTypeLabel(assignment.type)}</Badge>
          <Badge variant="outline">{assignment.team.name}</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold">{assignment.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{assignment.instructions}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Assigned</p>
            <p className="mt-1 text-xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Completed</p>
            <p className="mt-1 text-xl font-bold">{stats.completed}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">In progress</p>
            <p className="mt-1 text-xl font-bold">{stats.inProgress}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Due</p>
            <p className="mt-1 text-sm font-semibold">{dateLabel(assignment.dueDate)}</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">Completion rate</span>
            <span className="text-muted-foreground">{stats.completionRate}%</span>
          </div>
          <Progress value={stats.completionRate} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignedMembers.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Students will appear here after they join your team." description="No students are currently assigned to this work." className="min-h-32" />
          ) : (
            assignedMembers.map((member) => {
              const student = member.user;
              const submission = submissionsByStudent.get(student.id);
              const status = submission?.status ?? "NOT_STARTED";
              const href = evidenceHref(submission?.evidenceType, submission?.evidenceId);
              return (
                <div key={student.id} className="rounded-lg border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar username={student.username} displayName={student.displayName ?? student.name} avatarUrl={student.avatarUrl ?? student.image} />
                      <div>
                        <p className="font-semibold">{student.displayName ?? student.name ?? student.username ?? "Student"}</p>
                        <p className="text-xs text-muted-foreground">@{student.username ?? "student"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status === "COMPLETED" ? "secondary" : status === "IN_PROGRESS" ? "accent" : "outline"}>
                        {assignmentStatusLabel(status)}
                      </Badge>
                      {submission?.completedAt ? <Badge variant="outline">Completed {submission.completedAt.toLocaleDateString()}</Badge> : null}
                    </div>
                  </div>
                  {submission?.notes ? <p className="mt-3 rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">{submission.notes}</p> : null}
                  {href ? (
                    <Link href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
                      View evidence
                      <ExternalLink className="h-4 w-4" aria-hidden />
                    </Link>
                  ) : submission?.evidenceType ? (
                    <p className="mt-3 text-xs font-semibold text-muted-foreground">Evidence: {submission.evidenceType}</p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
