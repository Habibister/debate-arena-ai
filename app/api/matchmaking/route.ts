import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matchmakingRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = await parseJson(request, matchmakingRequestSchema);
    const matchedStudent = await prisma.user.findFirst({
      where: {
        id: { not: session.user.id },
        role: "STUDENT",
        organization: input.organization,
        level: input.level,
        ...(input.ageGroup ? { ageGroup: input.ageGroup } : {})
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        organization: true,
        level: true,
        ageGroup: true,
        rank: true,
        xp: true
      }
    });

    if (!matchedStudent) {
      return NextResponse.json({
        mode: "AI",
        opponent: null,
        reason: "No student is currently available for that organization, level, and age group. An AI opponent will be generated automatically."
      });
    }

    return NextResponse.json({
      mode: "REAL_STUDENT",
      opponent: matchedStudent,
      reason: "Matched with a student at a similar training level."
    });
  } catch (error) {
    return apiError(error);
  }
}
