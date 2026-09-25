import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { apiError, HttpError, parseJson, unauthorized } from "@/lib/api";
import { clientIp, sessionUserId } from "@/lib/api-auth";
import { generatePracticeQuestions } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildFallbackPracticeQuestions } from "@/lib/test-question-bank";
import { hosaMedTermPracticeQuestions } from "@/lib/hosa-test-source";
import { HOSA_TESTABLE_CATEGORY, testSelectionIsServable, testUnavailableReason } from "@/lib/test-availability";
import { practiceTestCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = sessionUserId(session);

    if (!userId) {
      return unauthorized();
    }

    const tests = await prisma.practiceTest.findMany({
      where: { userId },
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
    const userId = sessionUserId(session);

    if (!userId) {
      return unauthorized();
    }

    await enforceRateLimit({ userId, ip: clientIp(request), workload: "heavy" });

    const input = await parseJson(request, practiceTestCreateSchema);

    // FAIL CLOSED ON THE SELECTION (H3). The schema checks shapes, not truth: it accepted any event
    // type string at all, including a retired track's and one whose own `allowedModes` exclude TEST.
    // Hiding an option in the client is not a gate — this is. One rule, shared with the generator.
    if (!testSelectionIsServable(input)) {
      throw new HttpError(testUnavailableReason(input), 422);
    }

    // MEDICAL TERMINOLOGY IS ASSESSED WITH REAL QUESTIONS (H3). CompeteReady holds 180 authored
    // Medical Terminology items with explanations; until now this route ignored them and asked a
    // template generator for health-flavoured filler instead. Where a real bank exists it is used,
    // and no generated content is mixed into it.
    const bankQuestions =
      input.organization === "HOSA" && input.eventCluster === HOSA_TESTABLE_CATEGORY
        ? hosaMedTermPracticeQuestions(input.questionCount)
        : null;

    // THE TEMPLATE FALLBACK IS NO LONGER SERVED TO HOSA — AND THERE ARE TWO WAYS IT USED TO ARRIVE.
    // Measured on this tree it produced four distinct stems in a ten-question set, one trio of wrong
    // answers shared by all sixteen categories, and a correct answer that always began "Use ",
    // answerable without knowing any health science. Removing it HERE is not enough: `generatePractice
    // Questions` never throws, and on any provider failure it returns that same generator's output as
    // though it were generated content (lib/ai.ts — `fallbackPracticeQuestions` wraps
    // `buildFallbackPracticeQuestions`). So HOSA does not call the provider at all: its one servable
    // category is answered by the authored bank, and there is nothing else for it to fall back to.
    // DECA's flow is untouched by this phase and keeps both its provider path and that fallback.
    const isHosa = input.organization === "HOSA";
    const fallbackQuestions =
      bankQuestions || isHosa
        ? []
        : buildFallbackPracticeQuestions({
            organization: input.organization,
            eventType: input.eventType,
            eventCluster: input.eventCluster,
            difficulty: input.difficulty,
            count: input.questionCount
          });
    let generated: Awaited<ReturnType<typeof generatePracticeQuestions>>;

    if (bankQuestions || isHosa) {
      // A real bank answers for itself: no provider call, no filler, nothing to fall back to. A HOSA
      // request that reached here without a bank set has no honest source, and the completeness check
      // below refuses it rather than letting anything fill the gap.
      generated = { questions: [] };
    } else {
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
    }
    const generatedQuestions = Array.isArray(generated.questions) ? generated.questions : [];
    const normalizedQuestions = [...(bankQuestions ?? []), ...generatedQuestions, ...fallbackQuestions].map((question) => {
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
        userId,
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
