import type { Level, MessageRole, Organization, PracticeMode } from "@prisma/client";
import { getOpenAIClient, openAIModel } from "@/lib/openai";
import { getRubricSeed, SHARED_SPEAKING_SKILLS, type RubricCategorySeed } from "@/lib/rubrics";

type DebateTranscriptMessage = {
  role: MessageRole;
  round: number;
  content: string;
};

type CategoryScore = {
  key: string;
  label: string;
  score: number;
  reason: string;
};

type SharedSpeakingScores = {
  clarity: number;
  confidence: number;
  pacing: number;
  volume: number;
  organization: number;
  vocabulary: number;
  persuasion: number;
  professionalism: number;
};

type ReadinessForNextLevel = {
  ready: boolean;
  rationale: string;
  nextMilestone: string;
};

function compactRubric(categories: RubricCategorySeed[]) {
  return categories.map((category) => ({
    key: category.key,
    label: category.label,
    description: category.description,
    scoreMin: category.scoreMin,
    scoreMax: category.scoreMax,
    weight: category.weight,
    lessonSlugs: category.lessonSlugs
  }));
}

function rubricFor(organization: Organization, eventType: string) {
  const seed = getRubricSeed(organization, eventType);
  return seed ? compactRubric(seed.categories) : [];
}

function originalRubricInstruction() {
  return "Use an original DebateArena scoring system. The uploaded judge packet is reference material only: preserve the evaluation ideas but do not copy its wording.";
}

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
  eventType?: string;
  practiceMode?: PracticeMode;
  focusArea?: string;
}) {
  return jsonCompletion<{
    topic: string;
    background: string;
    affirmativePosition: string;
    negativePosition: string;
    suggestedEvidenceAngles: string[];
  }>(
    "You generate original, age-appropriate competitive practice prompts. Avoid copyrighted prompts, past exams, judge packet wording, and real private student data. Return JSON only.",
    `Generate one ${input.level} ${input.organization} practice prompt.
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
Optional focus area: ${input.focusArea ?? "none"}.
Return JSON with topic, background, affirmativePosition, negativePosition, and suggestedEvidenceAngles.`
  );
}

export async function generateOpponentResponse(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  practiceMode?: PracticeMode;
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
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
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
  eventType?: string;
  topic: string;
  transcript: DebateTranscriptMessage[];
}) {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  const rubric = rubricFor(input.organization, eventType);

  return jsonCompletion<{
    overallScore: number;
    categoryScores: CategoryScore[];
    sharedSpeaking: SharedSpeakingScores;
    speakerScores: Array<{
      speaker: string;
      team: "GOVERNMENT" | "OPPOSITION";
      score: number;
      rank: 1 | 2 | 3 | 4;
      descriptor: "poor" | "developing" | "competent" | "good" | "excellent" | "outstanding" | "exceptional";
      rationale: string;
    }>;
    teamWinner: "GOVERNMENT" | "OPPOSITION";
    reasonForDecision: string;
    strengths: string[];
    weaknesses: string[];
    improvementAdvice: string[];
    recommendedLessons: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
    readinessForNextLevel: ReadinessForNextLevel;
  }>(
    `You are a fair educational parliamentary debate judge. ${originalRubricInstruction()} Return JSON only.`,
    `Judge this ${input.level} ${input.organization} ${eventType} round.
Topic: ${input.topic}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Speaker points must use the 19-30 range:
19 poor; 20-21 developing; 22-23 competent; 24-26 good; 27-28 excellent; 29 outstanding; 30 exceptional.
Create four speaker slots if names are absent: Government 1, Government 2, Opposition 1, Opposition 2.
Assign ranks 1-4 with no ties.

Return JSON with overallScore, categoryScores, sharedSpeaking, speakerScores, teamWinner, reasonForDecision, strengths, weaknesses, improvementAdvice, recommendedLessons, and readinessForNextLevel.`
  );
}

export async function judgeDecaRoleplay(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
}) {
  const rubric = rubricFor("DECA", input.eventType);

  return jsonCompletion<{
    overallScore: number;
    categoryScores: CategoryScore[];
    sharedSpeaking: SharedSpeakingScores;
    strengths: string[];
    weaknesses: string[];
    improvementAdvice: string[];
    recommendedLessons: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
    judgeQuestionFeedback: string[];
    readinessForNextLevel: ReadinessForNextLevel;
  }>(
    "You are an educational DECA judge for original practice roleplays and case studies. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} DECA ${input.eventType} practice.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on business scenario understanding, performance indicators, solution quality, business reasoning, creativity, feasibility, professional communication, organization, judge questions, and delivery.
Return JSON with overallScore, categoryScores, sharedSpeaking, strengths, weaknesses, improvementAdvice, recommendedLessons, judgeQuestionFeedback, and readinessForNextLevel.`
  );
}

export async function judgeHosaPerformance(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
}) {
  const rubric = rubricFor("HOSA", input.eventType);

  return jsonCompletion<{
    overallScore: number;
    categoryScores: CategoryScore[];
    sharedSpeaking: SharedSpeakingScores;
    strengths: string[];
    weaknesses: string[];
    improvementAdvice: string[];
    recommendedLessons: Array<{ lessonSlug: string; reason: string; priority: "high" | "medium" | "low" }>;
    accuracyFlags: string[];
    readinessForNextLevel: ReadinessForNextLevel;
  }>(
    "You are an educational HOSA judge for original health science practice. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} HOSA ${input.eventType} performance.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on health science knowledge, medical/health accuracy, event task completion, scenario response, communication, professionalism, presentation quality, and skill/performance quality when relevant.
Return JSON with overallScore, categoryScores, sharedSpeaking, strengths, weaknesses, improvementAdvice, recommendedLessons, accuracyFlags, and readinessForNextLevel.`
  );
}

export async function generatePracticeQuestions(input: {
  organization: Extract<Organization, "DECA" | "HOSA">;
  eventType: string;
  eventCluster?: string;
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
    "You generate original practice exam questions inspired by competition standards. Do not copy copyrighted past exams unless legally provided by the user. Return JSON only.",
    `Create ${input.count} original ${input.organization} ${input.difficulty} multiple-choice practice questions.
Event/category: ${input.eventType}
Cluster or focus: ${input.eventCluster ?? "general"}
Each question must include question, choices, correctAnswer, explanation, and skillTag.
Questions should test transferable standards and concepts, not reproduce protected exam language.`
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
  eventType?: string;
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
Event type: ${input.eventType ?? "general"}
Weaknesses: ${JSON.stringify(input.weaknesses)}
Available lessons: ${JSON.stringify(input.availableLessons)}

Return JSON recommendations with lessonSlug, reason, and priority.`
  );
}

export async function evaluateReadiness(input: {
  organization: Organization;
  eventType?: string;
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
Event type: ${input.eventType ?? "general"}
Current level: ${input.currentLevel}
Recent scores: ${JSON.stringify(input.recentScores)}
Weakness summary: ${JSON.stringify(input.weaknessSummary)}

Return JSON with ready, confidence, rationale, and requiredEvidence.`
  );
}
