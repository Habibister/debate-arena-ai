import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, ClipboardList } from "lucide-react";
import { StudentAssignmentActions } from "@/components/assignments/student-assignment-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assignmentStatusLabel, assignmentTypeLabel, statusForSubmission } from "@/lib/assignment-types";
import { getStudentAssignmentDetail, getStudentEvidenceOptions } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

function dueLabel(date?: Date | null) {
  if (!date) return "No due date";
  return date.toLocaleString();
}

export default async function StudentAssignmentDetailPage({ params }: { params: { assignmentId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=/assignments/${params.assignmentId}`);
  }

  const assignment = await getStudentAssignmentDetail({ assignmentId: params.assignmentId, userId: session.user.id }).catch(() => null);

  if (!assignment) {
    notFound();
  }

  const status = statusForSubmission(assignment.submissions[0]);
  const evidenceOptions = await getStudentEvidenceOptions(session.user.id, assignment.type, assignment.targetId);
  const coachName =
    assignment.team.coach?.user?.displayName ?? assignment.team.coach?.user?.name ?? assignment.team.coach?.user?.username ?? "your coach";
  const manualReflectionAllowed = assignment.type === "FLASHCARD_DECK" || assignment.type === "REVIEW_GAME";

  return (
    <div className="space-y-6">
      <Link href={"/assignments" as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Assignments
      </Link>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{assignmentTypeLabel(assignment.type)}</Badge>
              <Badge variant="outline">{assignmentStatusLabel(status)}</Badge>
            </div>
            <CardTitle className="mt-3 text-3xl">{assignment.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">{assignment.instructions}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Team</p>
                <p className="mt-1 font-semibold">{assignment.team.name}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Coach</p>
                <p className="mt-1 font-semibold">{coachName}</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Due</p>
                <p className="mt-1 font-semibold">{dueLabel(assignment.dueDate)}</p>
              </div>
            </div>
            {assignment.targetLabel ? (
              <div className="rounded-md border bg-muted/40 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Assigned content</p>
                <p className="mt-1 font-semibold">{assignment.targetLabel}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" aria-hidden />
                <CardTitle>Completion rules</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Starting records progress only. Your coach sees completion after you submit valid evidence.</p>
              <p>
                {manualReflectionAllowed
                  ? "This activity uses a short reflection because the current study games do not yet store durable session records."
                  : "The evidence list only shows completed activity records that belong to your account."}
              </p>
            </CardContent>
          </Card>

          <StudentAssignmentActions
            assignmentId={assignment.id}
            type={assignment.type}
            status={status}
            evidenceOptions={evidenceOptions}
            manualReflectionAllowed={manualReflectionAllowed}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-secondary" aria-hidden />
            <CardTitle>What your coach can see</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Your coach can see your status, completion date, and submitted evidence for this assignment. Students outside this team cannot access it.
        </CardContent>
      </Card>
    </div>
  );
}
