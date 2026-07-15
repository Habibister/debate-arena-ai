import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { ArrowRight, ClipboardList, Lock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalDate } from "@/components/ui/local-date";
import { assignmentTypeLabel, completionStats } from "@/lib/assignment-types";
import { getAssignedStudentIds, getCoachAssignments } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";
import { canAccessCoachTools } from "@/lib/roles";

export const dynamic = "force-dynamic";

function dueLabel(date?: Date | null) {
  if (!date) return "No due date";
  return <>Due <LocalDate value={date} /></>;
}

export default async function CoachAssignmentsPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user?.id || !canAccessCoachTools(role)) {
    return (
      <div className="space-y-6">
        <Badge variant="secondary">Coach Assignments</Badge>
        <EmptyState
          icon={Lock}
          title="You need a coach account to view assignments."
          description="Coach assignment progress is only available to coaches and admins."
          actionLabel="Back to dashboard"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const assignments = await getCoachAssignments(session.user.id, role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="secondary">Coach Assignments</Badge>
          <h1 className="mt-3 text-3xl font-bold">Assigned work</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Track completion against the students who were actually assigned each activity.
          </p>
        </div>
        <Link href={"/coach/assignments/new" as Route} className={buttonVariants()}>
          <Plus className="h-4 w-4" aria-hidden />
          Create assignment
        </Link>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="You have not created any assignments yet."
          description="Create a team assignment to start tracking student practice evidence."
          actionLabel="Create assignment"
          actionHref="/coach/assignments/new"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.map((assignment) => {
              const assignedStudentIds = getAssignedStudentIds(assignment);
              const statusByStudent = new Map(assignment.submissions.map((submission) => [submission.studentId, submission.status]));
              const stats = completionStats(assignedStudentIds.map((studentId) => statusByStudent.get(studentId) ?? "NOT_STARTED"));
              return (
                <Link
                  key={assignment.id}
                  href={`/coach/assignments/${assignment.id}` as Route}
                  className="flex flex-col gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted md:flex-row md:items-center md:justify-between"
                >
                  <span>
                    <span className="font-semibold">{assignment.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {assignmentTypeLabel(assignment.type)} · {assignment.team.name} · {dueLabel(assignment.dueDate)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{stats.completionRate}% complete</Badge>
                    <Badge variant="outline">
                      {stats.completed}/{stats.total} students
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
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
