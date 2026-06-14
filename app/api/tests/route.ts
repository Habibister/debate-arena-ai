import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { generatePracticeQuestions } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceTestCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tests = await prisma.practiceTest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      questions: true
    }
  });

  return NextResponse.json({ tests });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = await parseJson(request, practiceTestCreateSchema);
    const generated = await generatePracticeQuestions({
      organization: input.organization,
      eventType: input.eventType,
      eventCluster: input.eventCluster,
      difficulty: input.difficulty,
      count: input.questionCount
    });

    const test = await prisma.practiceTest.create({
      data: {
        userId: session.user.id,
        organization: input.organization,
        eventType: input.eventType,
        eventCluster: input.eventCluster,
        difficulty: input.difficulty,
        questionCount: input.questionCount,
        questions: {
          create: generated.questions.map((question) => ({
            question: question.question,
            choices: question.choices,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            skillTag: question.skillTag,
            difficulty: input.difficulty
          }))
        }
      },
      include: { questions: true }
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
