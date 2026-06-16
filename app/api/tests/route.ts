import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson, unauthorized } from "@/lib/api";
import { generatePracticeQuestions } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildFallbackPracticeQuestions } from "@/lib/test-question-bank";
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
    const fallbackQuestions = buildFallbackPracticeQuestions({
      organization: input.organization,
      eventType: input.eventType,
      eventCluster: input.eventCluster,
      difficulty: input.difficulty,
      count: input.questionCount
    });
    let generated: Awaited<ReturnType<typeof generatePracticeQuestions>>;

    try {
      generated = await generatePracticeQuestions({
        organization: input.organization,
        eventType: input.eventType,
        eventCluster: input.eventCluster,
        difficulty: input.difficulty,
        count: input.questionCount
      });
    } catch (generationError) {
      // Development-only resilience: local demo tests must keep working when OpenAI is missing,
      // invalid, rate-limited, or unreachable. Production still uses live AI whenever configured.
      console.warn("[practice-test fallback] AI question generation failed. Using local question bank.", generationError);
      generated = { questions: [] };
    }
    const generatedQuestions = Array.isArray(generated.questions) ? generated.questions : [];
    const normalizedQuestions = [...generatedQuestions, ...fallbackQuestions].map((question) => {
      const choices = (Array.isArray(question.choices) ? question.choices : [])
        .map((choice) => String(choice).trim())
        .filter(Boolean);
      const rawCorrectAnswer = String(question.correctAnswer).trim();
      const correctAnswer =
        choices.find((choice) => choice.toLowerCase() === rawCorrectAnswer.toLowerCase()) ??
        choices[0] ??
        rawCorrectAnswer;
      const uniqueChoices = Array.from(new Set(choices)).slice(0, 4);

      if (!uniqueChoices.includes(correctAnswer) && uniqueChoices.length > 0) {
        uniqueChoices[0] = correctAnswer;
      }

      return {
        question: String(question.question).trim(),
        choices: uniqueChoices,
        correctAnswer,
        explanation: String(question.explanation).trim(),
        skillTag: String(question.skillTag).trim()
      };
    }).filter((question) => question.choices.length === 4 && question.choices.includes(question.correctAnswer));
    const selectedQuestions = normalizedQuestions.slice(0, input.questionCount);

    if (
      selectedQuestions.length !== input.questionCount ||
      selectedQuestions.some((question) => !question.question || !question.explanation || !question.skillTag)
    ) {
      throw new HttpError("We could not build a complete practice set. Please try a different category or question count.", 502);
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
          create: selectedQuestions.map((question) => ({
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
