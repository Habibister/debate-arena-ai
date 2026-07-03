import type { Assignment, AssignmentStatus, AssignmentType } from "@prisma/client";

export const ASSIGNMENT_TYPE_META: Record<
  AssignmentType,
  {
    label: string;
    description: string;
    requiresTarget: boolean;
    evidenceLabel: string;
  }
> = {
  DEBATE_ROUND: {
    label: "Complete a debate round",
    description: "Students complete a judged debate round and submit the debate as evidence.",
    requiresTarget: false,
    evidenceLabel: "Completed judged debate ID"
  },
  REBUTTAL_PRACTICE: {
    label: "Practice rebuttal",
    description: "Students complete a practice rebuttal debate and submit the judged round.",
    requiresTarget: false,
    evidenceLabel: "Completed rebuttal debate ID"
  },
  FLASHCARD_DECK: {
    label: "Complete flashcard deck",
    description: "Students review an existing flashcard deck and submit a short completion reflection.",
    requiresTarget: true,
    evidenceLabel: "Reflection note"
  },
  REVIEW_GAME: {
    label: "Play review game",
    description: "Students play an existing deck review game and submit a short completion reflection.",
    requiresTarget: true,
    evidenceLabel: "Reflection note"
  },
  PRACTICE_TEST: {
    label: "Take practice test",
    description: "Students complete a generated DECA/HOSA practice test and submit the completed test.",
    requiresTarget: false,
    evidenceLabel: "Completed practice test ID"
  },
  LESSON: {
    label: "Watch or read lesson",
    description: "Students complete an existing lesson practice attempt and submit that completed attempt.",
    requiresTarget: true,
    evidenceLabel: "Completed lesson practice attempt ID"
  }
};

export function assignmentTypeLabel(type: AssignmentType) {
  return ASSIGNMENT_TYPE_META[type]?.label ?? type.replaceAll("_", " ");
}

export function assignmentStatusLabel(status?: AssignmentStatus | null) {
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not started";
}

export function assignmentLaunchPath(assignment: Pick<Assignment, "id" | "type" | "targetId">) {
  const assignmentParam = `assignmentId=${encodeURIComponent(assignment.id)}`;

  if (assignment.type === "REBUTTAL_PRACTICE") {
    return `/debate?${assignmentParam}&format=PRACTICE_REBUTTAL`;
  }

  if (assignment.type === "DEBATE_ROUND") {
    return `/debate?${assignmentParam}`;
  }

  if (assignment.type === "PRACTICE_TEST") {
    return `/tests?${assignmentParam}`;
  }

  if (assignment.type === "FLASHCARD_DECK") {
    return assignment.targetId ? `/study/${assignment.targetId}?${assignmentParam}` : `/study?${assignmentParam}`;
  }

  if (assignment.type === "REVIEW_GAME") {
    return assignment.targetId ? `/study/${assignment.targetId}/games?${assignmentParam}` : `/study?${assignmentParam}`;
  }

  return assignment.targetId ? `/skills/${assignment.targetId}?${assignmentParam}` : `/skills?${assignmentParam}`;
}

export function completionStats(statuses: AssignmentStatus[]) {
  const total = statuses.length;
  const completed = statuses.filter((status) => status === "COMPLETED").length;
  const inProgress = statuses.filter((status) => status === "IN_PROGRESS").length;
  const notStarted = total - completed - inProgress;

  return {
    total,
    completed,
    inProgress,
    notStarted,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

export function statusForSubmission(submission?: { status: AssignmentStatus } | null) {
  return submission?.status ?? "NOT_STARTED";
}
