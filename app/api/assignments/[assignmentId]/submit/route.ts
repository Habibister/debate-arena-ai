import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { completeAssignment } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";
import { assignmentSubmitSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { assignmentId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const input = await parseJson(request, assignmentSubmitSchema);
    const submission = await completeAssignment({
      assignmentId: params.assignmentId,
      userId: session.user.id,
      input
    });

    return NextResponse.json({ submission });
  } catch (error) {
    return apiError(error);
  }
}
