import type { Level, MessageRole, Organization } from "@prisma/client";
import { getOpenAIClient, openAIModel } from "@/lib/openai";

type DebateTranscriptMessage = {
  role: MessageRole;
  round: number;
  content: string;
};

async function jsonCompletion<T>(system: string, prompt: string): Promise<T> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: openAIModel,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return JSON.parse(content) as T;
}

export async function generateTopic(input: {
  organization: Organization;
  level: Level;
  focusArea?: string;
}) {
  return jsonCompletion<{
    topic: string;
    background: string;
    affirmativePosition: string;
    negativePosition: string;
    suggestedEvidenceAngles: string[];
  }>(
    "You generate original, age-appropriate competitive training topics. Avoid copyrighted prompts and real private student data. Return JSON only.",
    `Generate one ${input.level} ${input.organization} practice topic. Optional focus area: ${input.focusArea ?? "none"}.
Return JSON with topic, background, affirmativePosition, negativePosition, and suggestedEvidenceAngles.`
  );
}

export async function generateOpponentResponse(input: {
  organization: Organization;
  level: Level;
  topic: string;
  side: "AFFIRMATIVE" | "NEGATIVE";
  round: number;
  transcript: DebateTranscriptMessage[];
}) {
  return jsonCompletion<{
    response: string;
    strategy: string;
    pressurePoints: string[];
  }>(
    "You are a realistic debate sparring partner. Match the student's level, keep arguments educational, and never invent citations as real sources.",
    `Topic: ${input.topic}
Organization: ${input.organization}
Level: ${input.level}
Opponent side: ${input.side}
Round: ${input.round}
Transcript JSON: ${JSON.stringify(input.transcript)}

Return JSON with response, strategy, and pressurePoints.`
  );
}

export async function judgeDebate(input: {
  organization: Organization;
  level: Level;
  topic: string;
  transcript: DebateTranscriptMessage[];
}) {
  return jsonCompletion<{
    overallScore: number;
    scores: {
      logic: number;
      evidence: number;
      rebuttal: number;
      persuasion: number;
      clarity: number;
      communication: number;
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    readinessForNextLevel: {
      ready: boolean;
      rationale: string;
      nextMilestone: string;
    };
  }>(
    "You are a fair educational judge for student competitions. Score from 0-100 and give specific coaching feedback. Return JSON only.",
    `Judge this ${input.level} ${input.organization} debate.
Topic: ${input.topic}
Transcript JSON: ${JSON.stringify(input.transcript)}

Return JSON with overallScore, scores, strengths, weaknesses, recommendations, and readinessForNextLevel.`
  );
}

export async function generatePracticeQuestions(input: {
  organization: Extract<Organization, "DECA" | "HOSA">;
  difficulty: Level;
  count: 10 | 25 | 50;
}) {
  return jsonCompletion<{
    questions: Array<{
      question: string;
      choices: string[];
      correctAnswer: string;
      explanation: string;
      skillTag: string;
    }>;
  }>(
    "You generate original practice exam questions inspired by competition standards. Do not copy copyrighted exams. Return JSON only.",
    `Create ${input.count} original ${input.organization} ${input.difficulty} multiple-choice practice questions.
Each question must include question, choices, correctAnswer, explanation, and skillTag.`
  );
}

export async function generateLessonContent(input: {
  organization: Organization;
  level: Level;
  skillName: string;
}) {
  return jsonCompletion<{
    lesson: string;
    examples: string[];
    guidedPractice: string[];
    independentPractice: string[];
    masteryQuiz: Array<{ question: string; answer: string; explanation: string }>;
  }>(
    "You write concise, scaffolded lessons for middle and high school competitors. Return JSON only.",
    `Generate a ${input.level} lesson for ${input.organization} skill "${input.skillName}".
Return lesson, examples, guidedPractice, independentPractice, and masteryQuiz.`
  );
}

export async function recommendLessons(input: {
  organization: Organization;
  weaknesses: string[];
  availableLessons: Array<{ slug: string; title: string; skill: string }>;
}) {
  return jsonCompletion<{
    recommendations: Array<{
      lessonSlug: string;
      reason: string;
      priority: "high" | "medium" | "low";
    }>;
  }>(
    "You map student weaknesses to the most relevant lessons. Return JSON only.",
    `Organization: ${input.organization}
Weaknesses: ${JSON.stringify(input.weaknesses)}
Available lessons: ${JSON.stringify(input.availableLessons)}

Return JSON recommendations with lessonSlug, reason, and priority.`
  );
}

export async function evaluateReadiness(input: {
  organization: Organization;
  currentLevel: Level;
  recentScores: number[];
  weaknessSummary: string[];
}) {
  return jsonCompletion<{
    ready: boolean;
    confidence: number;
    rationale: string;
    requiredEvidence: string[];
  }>(
    "You evaluate whether a student is ready for the next competitive training level. Return JSON only.",
    `Organization: ${input.organization}
Current level: ${input.currentLevel}
Recent scores: ${JSON.stringify(input.recentScores)}
Weakness summary: ${JSON.stringify(input.weaknessSummary)}

Return JSON with ready, confidence, rationale, and requiredEvidence.`
  );
}
