import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, unauthorized } from "@/lib/api";
import { startAssignment } from "@/lib/assignments";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { assignmentId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const result = await startAssignment({
      assignmentId: params.assignmentId,
      userId: session.user.id
    });

    return NextResponse.json({
      submission: result.submission,
      launchPath: result.launchPath
    });
  } catch (error) {
    return apiError(error);
  }
}
