import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, parseJson, unauthorized } from "@/lib/api";
import { generatePracticeQuestions } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceTestCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const tests = await prisma.practiceTest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        organization: true,
        eventType: true,
        eventCluster: true,
        difficulty: true,
        questionCount: true,
        status: true,
        score: true,
        weakAreas: true,
        recommendations: true,
        createdAt: true,
        completedAt: true,
        questions: {
          select: {
            id: true,
            question: true,
            choices: true,
            skillTag: true,
            difficulty: true
          }
        }
      }
    });

    return NextResponse.json({ tests });
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

    const input = await parseJson(request, practiceTestCreateSchema);
    const generated = await generatePracticeQuestions({
      organization: input.organization,
      eventType: input.eventType,
      eventCluster: input.eventCluster,
      difficulty: input.difficulty,
      count: input.questionCount
    });
    const normalizedQuestions = generated.questions.map((question) => {
      const choices = (Array.isArray(question.choices) ? question.choices : [])
        .map((choice) => String(choice).trim())
        .filter(Boolean);
      const rawCorrectAnswer = String(question.correctAnswer).trim();
      const correctAnswer =
        choices.find((choice) => choice.toLowerCase() === rawCorrectAnswer.toLowerCase()) ??
        choices[0] ??
        rawCorrectAnswer;

      return {
        question: String(question.question).trim(),
        choices,
        correctAnswer,
        explanation: String(question.explanation).trim(),
        skillTag: String(question.skillTag).trim()
      };
    });

    if (
      normalizedQuestions.length !== input.questionCount ||
      normalizedQuestions.some((question) => question.choices.length < 2 || !question.question || !question.explanation || !question.skillTag)
    ) {
      throw new Error("Practice question generation returned an invalid test shape.");
    }

    const test = await prisma.practiceTest.create({
      data: {
        userId: session.user.id,
        organization: input.organization,
        eventType: input.eventType,
        eventCluster: input.eventCluster,
        difficulty: input.difficulty,
        questionCount: input.questionCount,
        questions: {
          create: normalizedQuestions.map((question) => ({
            question: question.question,
            choices: question.choices,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            skillTag: question.skillTag,
            difficulty: input.difficulty
          }))
        }
      },
      select: { id: true }
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
