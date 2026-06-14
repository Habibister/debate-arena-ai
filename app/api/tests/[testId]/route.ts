import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, unauthorized } from "@/lib/api";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { testId: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const test = await prisma.practiceTest.findFirst({
      where: {
        id: params.testId,
        userId: session.user.id
      },
      include: {
        questions: {
          orderBy: { createdAt: "asc" }
        },
        answers: true
      }
    });

    if (!test) {
      throw new HttpError("Practice test not found", 404);
    }

    return NextResponse.json({
      test: {
        ...test,
        questions: test.questions.map((question) => ({
          id: question.id,
          testId: question.testId,
          question: question.question,
          choices: question.choices,
          skillTag: question.skillTag,
          difficulty: question.difficulty,
          createdAt: question.createdAt,
          correctAnswer: test.status === "COMPLETED" ? question.correctAnswer : undefined,
          explanation: test.status === "COMPLETED" ? question.explanation : undefined
        }))
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
