import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { HttpError, apiError, unauthorized } from "@/lib/api";
import { createAssignment, getStudentAssignments } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";
import { assignmentCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const assignments = await getStudentAssignments(session.user.id);
    return NextResponse.json({ assignments });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const body = await request.json().catch(() => {
      throw new HttpError("Invalid JSON body", 400);
    });
    const input = assignmentCreateSchema.parse(body);
    const assignment = await createAssignment({
      coachUserId: session.user.id,
      role: session.user.role,
      input
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
