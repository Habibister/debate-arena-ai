import type { Level, MessageRole, Organization, PracticeMode } from "@prisma/client";
import {
  OpenAIUnavailableError,
  getOpenAIClient,
  hasUsableOpenAIKey,
  isLikelyOpenAIUnavailableError,
  openAIModel
} from "@/lib/openai";
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

type LessonRecommendation = {
  lessonSlug: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

type TopicPackage = {
  topic: string;
  background: string;
  affirmativePosition: string;
  negativePosition: string;
  suggestedEvidenceAngles: string[];
  fallbackNotice?: string;
};

type OpponentResponse = {
  response: string;
  strategy: string;
  pressurePoints: string[];
  fallbackNotice?: string;
};

type DebateJudgeResult = {
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
  recommendedLessons: LessonRecommendation[];
  readinessForNextLevel: ReadinessForNextLevel;
  fallbackNotice?: string;
};

type PerformanceJudgeResult = {
  overallScore: number;
  categoryScores: CategoryScore[];
  sharedSpeaking: SharedSpeakingScores;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  recommendedLessons: LessonRecommendation[];
  judgeQuestionFeedback?: string[];
  accuracyFlags?: string[];
  readinessForNextLevel: ReadinessForNextLevel;
  fallbackNotice?: string;
};

const DEV_AI_FALLBACK_NOTICE =
  "Development-only local AI fallback is active because OpenAI is unavailable. Add a valid OPENAI_API_KEY to use live AI.";

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

function canUseDevelopmentFallback<T>(fallback?: () => T): fallback is () => T {
  // Development-only safety valve: local deterministic content is used only while running Next.js locally.
  // Production never bypasses OpenAI when NODE_ENV is not "development".
  return process.env.NODE_ENV === "development" && Boolean(fallback);
}

function fallbackCategories(organization: Organization, eventType: string) {
  const rubric = rubricFor(organization, eventType);

  if (rubric.length > 0) {
    return rubric.map((category, index) => ({
      key: category.key,
      label: category.label,
      score: [4, 3, 4, 3, 4][index % 5],
      reason: `Local development estimate: shows usable ${category.label.toLowerCase()} with one clear next step.`
    }));
  }

  const defaults: Record<Organization, Array<{ key: string; label: string }>> = {
    DEBATE: [
      { key: "argument", label: "Argument" },
      { key: "refutation", label: "Refutation" },
      { key: "contentEvidence", label: "Content and Evidence" },
      { key: "organization", label: "Organization" },
      { key: "delivery", label: "Delivery" },
      { key: "clash", label: "Clash" }
    ],
    MODEL_UN: [
      { key: "argument", label: "Position Logic" },
      { key: "diplomacy", label: "Diplomacy" },
      { key: "organization", label: "Organization" },
      { key: "delivery", label: "Delivery" }
    ],
    DECA: [
      { key: "scenarioUnderstanding", label: "Understanding of the Business Scenario" },
      { key: "performanceIndicators", label: "Use of Performance Indicators" },
      { key: "solutionQuality", label: "Quality of Proposed Solution" },
      { key: "businessReasoning", label: "Business Reasoning" },
      { key: "professionalCommunication", label: "Professional Communication" },
      { key: "confidenceDelivery", label: "Confidence and Delivery" }
    ],
    HOSA: [
      { key: "healthScienceKnowledge", label: "Health Science Knowledge" },
      { key: "medicalAccuracy", label: "Medical and Health Accuracy" },
      { key: "taskCompletion", label: "Task Completion" },
      { key: "scenarioResponse", label: "Scenario Response" },
      { key: "communication", label: "Communication" },
      { key: "professionalism", label: "Professionalism" }
    ],
    MOCK_TRIAL: [
      { key: "argument", label: "Case Theory" },
      { key: "refutation", label: "Witness Control" },
      { key: "organization", label: "Courtroom Organization" },
      { key: "delivery", label: "Courtroom Delivery" }
    ],
    PUBLIC_SPEAKING: [
      { key: "argument", label: "Central Message" },
      { key: "organization", label: "Speech Structure" },
      { key: "style", label: "Style" },
      { key: "delivery", label: "Delivery" }
    ]
  };

  return defaults[organization].map((category, index) => ({
    ...category,
    score: [76, 72, 78, 74, 80][index % 5],
    reason: `Local development estimate: ${category.label.toLowerCase()} is functional and ready for another practice rep.`
  }));
}

function fallbackSharedSpeaking(): SharedSpeakingScores {
  return {
    clarity: 78,
    confidence: 74,
    pacing: 72,
    volume: 76,
    organization: 80,
    vocabulary: 73,
    persuasion: 75,
    professionalism: 82
  };
}

function fallbackLessons(organization: Organization, eventType: string): LessonRecommendation[] {
  const lessonSlugs = Array.from(
    new Set(rubricFor(organization, eventType).flatMap((category) => category.lessonSlugs))
  );

  const defaults: Record<Organization, string[]> = {
    DEBATE: ["debate-claim-building-1", "debate-rebuttal-1", "debate-evidence-1"],
    MODEL_UN: ["model-un-resolution-writing-1", "model-un-diplomacy-1"],
    DECA: ["deca-roleplay-1", "deca-marketing-1", "deca-roleplay-2"],
    HOSA: ["hosa-medical-terminology-1", "hosa-patient-communication-1"],
    MOCK_TRIAL: ["mock-trial-case-theory-1"],
    PUBLIC_SPEAKING: ["public-speaking-delivery-1"]
  };

  return (lessonSlugs.length > 0 ? lessonSlugs : defaults[organization]).slice(0, 3).map((lessonSlug, index) => ({
    lessonSlug,
    reason: "Targets the most visible gap from this local development scoring pass.",
    priority: index === 0 ? "high" : index === 1 ? "medium" : "low"
  }));
}

function fallbackTopic(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  practiceMode?: PracticeMode;
  focusArea?: string;
}): TopicPackage {
  const eventType = input.eventType ?? "GENERAL";
  const focus = input.focusArea ?? "strategic communication";

  const topics: Record<Organization, string> = {
    DEBATE: "This House would require schools to teach practical AI literacy before graduation.",
    MODEL_UN: "A committee must design a regional agreement for responsible AI use in education.",
    DECA: "A local business needs a student-friendly launch strategy for a new tutoring subscription.",
    HOSA: "A community clinic needs a youth outreach plan to improve preventive health communication.",
    MOCK_TRIAL: "A trial team must argue whether a school policy reasonably protected student safety.",
    PUBLIC_SPEAKING: "Students should learn persuasive speaking as a core career-readiness skill."
  };

  return {
    topic: topics[input.organization],
    background: `Local ${input.level.toLowerCase()} development prompt for ${eventType.replaceAll("_", " ").toLowerCase()}. It is original practice content focused on ${focus}.`,
    affirmativePosition: "Defend the proposal by showing clear benefits, practical implementation, and why the status quo leaves students underprepared.",
    negativePosition: "Challenge the proposal by testing feasibility, tradeoffs, cost, unintended consequences, and whether a narrower solution is better.",
    suggestedEvidenceAngles: [
      "Define the stakeholders and success criteria.",
      "Use one concrete example and one measurable impact.",
      "Weigh feasibility against long-term educational value."
    ],
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function fallbackOpponent(input: {
  side: "AFFIRMATIVE" | "NEGATIVE";
  topic: string;
  round: number;
}): OpponentResponse {
  const isAffirmative = input.side === "AFFIRMATIVE";
  return {
    response: isAffirmative
      ? `I affirm the topic because the proposal gives students a concrete skill they can apply beyond the classroom. In round ${input.round}, my main pressure is that implementation can start small through existing advisory periods, so the negative must prove the tradeoff is larger than the preparedness benefit.`
      : `I negate the topic because the affirmative still needs to prove this plan is the best use of limited school time. In round ${input.round}, my main pressure is feasibility: schools already struggle to staff core requirements, and a narrower opt-in module could solve without a mandate.`,
    strategy: isAffirmative
      ? "Extend the clearest benefit, answer feasibility, and weigh long-term readiness."
      : "Pressure the mandate, offer a narrower alternative, and weigh opportunity cost.",
    pressurePoints: [
      `Clarify the mechanism behind: ${input.topic}`,
      "Ask for one measurable impact.",
      "Force comparison against a smaller alternative."
    ],
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function fallbackDebateJudge(input: {
  organization: Organization;
  eventType?: string;
  transcript: DebateTranscriptMessage[];
}): DebateJudgeResult {
  const eventType = input.eventType ?? "PARLIAMENTARY_DEBATE";
  const categories = fallbackCategories(input.organization, eventType);
  const affirmativeTurns = input.transcript.filter((message) => message.role === "AFFIRMATIVE").length;
  const negativeTurns = input.transcript.filter((message) => message.role === "NEGATIVE").length;
  const winner = affirmativeTurns >= negativeTurns ? "GOVERNMENT" : "OPPOSITION";

  return {
    overallScore: 76,
    categoryScores: categories,
    sharedSpeaking: fallbackSharedSpeaking(),
    speakerScores: [
      {
        speaker: "Government 1",
        team: "GOVERNMENT",
        score: 25,
        rank: 1,
        descriptor: "good",
        rationale: "Clear structure and usable offense, with room to sharpen weighing."
      },
      {
        speaker: "Opposition 1",
        team: "OPPOSITION",
        score: 24,
        rank: 2,
        descriptor: "good",
        rationale: "Direct responses and practical pressure, but needs deeper comparison."
      },
      {
        speaker: "Government 2",
        team: "GOVERNMENT",
        score: 23,
        rank: 3,
        descriptor: "competent",
        rationale: "Good signposting, though some claims need stronger examples."
      },
      {
        speaker: "Opposition 2",
        team: "OPPOSITION",
        score: 22,
        rank: 4,
        descriptor: "competent",
        rationale: "Understands the clash but should collapse to fewer decisive issues."
      }
    ],
    teamWinner: winner,
    reasonForDecision:
      "Local development judge: the winning side did the better job extending a clear impact and comparing it against the opponent's main answer.",
    strengths: ["Clear baseline structure", "Some direct clash", "Usable examples for the level"],
    weaknesses: ["Needs more explicit weighing", "Evidence should be tied to the claim earlier", "Final turns should collapse to fewer voters"],
    improvementAdvice: [
      "Name the main voting issue before giving supporting details.",
      "Compare your impact against the opponent's best impact.",
      "Use signposting before each rebuttal answer."
    ],
    recommendedLessons: fallbackLessons(input.organization, eventType),
    readinessForNextLevel: {
      ready: false,
      rationale: "This is a solid local practice result, but the student should show stronger weighing across multiple rounds before moving up.",
      nextMilestone: "Complete one more judged round with explicit voters and impact comparison."
    },
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function fallbackPerformanceJudge(input: {
  organization: Extract<Organization, "DECA" | "HOSA">;
  eventType: string;
}): PerformanceJudgeResult {
  const isDeca = input.organization === "DECA";

  return {
    overallScore: isDeca ? 78 : 77,
    categoryScores: fallbackCategories(input.organization, input.eventType),
    sharedSpeaking: fallbackSharedSpeaking(),
    strengths: isDeca
      ? ["Clear business recommendation", "Professional tone", "Practical first implementation step"]
      : ["Clear health communication", "Professional demeanor", "Good scenario prioritization"],
    weaknesses: isDeca
      ? ["Tie every recommendation to a performance indicator", "Add one measurable business metric"]
      : ["State safety assumptions clearly", "Use more precise health terminology"],
    improvementAdvice: isDeca
      ? ["Open with the business problem, then number your solution steps.", "Answer judge questions with a direct claim before explanation."]
      : ["Use plain-language patient explanations after technical terms.", "Close by summarizing the safest next action."],
    recommendedLessons: fallbackLessons(input.organization, input.eventType),
    judgeQuestionFeedback: isDeca ? ["Answer was organized; add a metric and risk tradeoff next time."] : undefined,
    accuracyFlags: isDeca ? undefined : ["Local fallback cannot verify medical accuracy; use instructor review for safety-critical content."],
    readinessForNextLevel: {
      ready: false,
      rationale: "Local development scoring shows a competitive foundation with one or two repeatable gaps.",
      nextMilestone: "Repeat the same event type and improve the weakest category by one point."
    },
    fallbackNotice: DEV_AI_FALLBACK_NOTICE
  };
}

function fallbackPracticeQuestions(input: {
  organization: Extract<Organization, "DECA" | "HOSA">;
  eventType: string;
  eventCluster?: string;
  difficulty: Level;
  count: 10 | 25 | 50;
}) {
  const focus = input.eventCluster ?? input.eventType;
  const skillTags =
    input.organization === "DECA"
      ? ["Performance indicators", "Business reasoning", "Marketing strategy", "Feasibility"]
      : ["Medical terminology", "Health science knowledge", "Patient communication", "Healthcare ethics"];

  return {
    fallbackNotice: DEV_AI_FALLBACK_NOTICE,
    questions: Array.from({ length: input.count }, (_, index) => {
      const skillTag = skillTags[index % skillTags.length];
      const number = index + 1;
      return {
        question:
          input.organization === "DECA"
            ? `Original local practice ${number}: A ${focus.toLowerCase()} team must improve customer engagement. Which first action best fits a ${input.difficulty.toLowerCase()} business roleplay?`
            : `Original local practice ${number}: In a ${focus.toLowerCase()} scenario, which response best demonstrates safe and professional health communication?`,
        choices:
          input.organization === "DECA"
            ? [
                "Identify the target customer, choose one measurable goal, and recommend a practical tactic.",
                "Start with a broad slogan before defining the business problem.",
                "Promise immediate results without mentioning resources or timeline.",
                "Avoid discussing risks so the recommendation sounds confident."
              ]
            : [
                "Use accurate terminology, confirm understanding, and recommend an appropriate next step.",
                "Give a definitive diagnosis without enough information.",
                "Use technical language only and move quickly to the next patient.",
                "Ignore patient concerns if the planned procedure is routine."
              ],
        correctAnswer:
          input.organization === "DECA"
            ? "Identify the target customer, choose one measurable goal, and recommend a practical tactic."
            : "Use accurate terminology, confirm understanding, and recommend an appropriate next step.",
        explanation:
          input.organization === "DECA"
            ? "The best answer defines the stakeholder, sets a measurable objective, and stays feasible."
            : "The best answer balances accuracy, communication, and safe next-step reasoning.",
        skillTag
      };
    })
  };
}

function fallbackLessonContent(input: { organization: Organization; level: Level; skillName: string }) {
  return {
    fallbackNotice: DEV_AI_FALLBACK_NOTICE,
    lesson: `Local development lesson for ${input.skillName}: define the skill, show one strong model, then practice it under a short timer at the ${input.level.toLowerCase()} level.`,
    examples: [
      `Strong ${input.skillName}: names the goal, uses specific evidence, and explains why it matters.`,
      `Developing ${input.skillName}: has a good idea but needs clearer structure and comparison.`
    ],
    guidedPractice: [
      "Write a one-sentence goal for the skill.",
      "Add one concrete example.",
      "Revise the response so the judge can see the scoring category."
    ],
    independentPractice: [
      "Set a three-minute timer and complete one full rep.",
      "Circle the sentence that would most help your judge understand your point."
    ],
    masteryQuiz: [
      {
        question: `What is the main purpose of ${input.skillName}?`,
        answer: "To make the performance easier to follow, score, and compare.",
        explanation: "Judges reward skills that are clear, intentional, and connected to the event criteria."
      }
    ]
  };
}

async function jsonCompletion<T>(system: string, prompt: string, fallback?: () => T): Promise<T> {
  if (!hasUsableOpenAIKey()) {
    if (canUseDevelopmentFallback(fallback)) {
      return fallback();
    }

    throw new OpenAIUnavailableError();
  }

  const openai = getOpenAIClient();

  try {
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
      throw new OpenAIUnavailableError("AI service unavailable. The model returned an empty response.");
    }

    return JSON.parse(content) as T;
  } catch (error) {
    if (canUseDevelopmentFallback(fallback)) {
      console.warn("[development-only AI fallback] OpenAI request failed. Using local fallback content.", error);
      return fallback();
    }

    if (isLikelyOpenAIUnavailableError(error)) {
      throw new OpenAIUnavailableError();
    }

    throw new OpenAIUnavailableError("AI service unavailable. Try again later.");
  }
}

export async function generateTopic(input: {
  organization: Organization;
  level: Level;
  eventType?: string;
  practiceMode?: PracticeMode;
  focusArea?: string;
}) {
  return jsonCompletion<TopicPackage>(
    "You generate original, age-appropriate competitive practice prompts. Avoid copyrighted prompts, past exams, judge packet wording, and real private student data. Return JSON only.",
    `Generate one ${input.level} ${input.organization} practice prompt.
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
Optional focus area: ${input.focusArea ?? "none"}.
Return JSON with topic, background, affirmativePosition, negativePosition, and suggestedEvidenceAngles.`,
    () => fallbackTopic(input)
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
  return jsonCompletion<OpponentResponse>(
    "You are a realistic debate sparring partner. Match the student's level, keep arguments educational, and never invent citations as real sources.",
    `Topic: ${input.topic}
Organization: ${input.organization}
Event type: ${input.eventType ?? "default"}
Practice mode: ${input.practiceMode ?? "DEBATE"}
Level: ${input.level}
Opponent side: ${input.side}
Round: ${input.round}
Transcript JSON: ${JSON.stringify(input.transcript)}

Return JSON with response, strategy, and pressurePoints.`,
    () => fallbackOpponent(input)
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

  return jsonCompletion<DebateJudgeResult>(
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

Return JSON with overallScore, categoryScores, sharedSpeaking, speakerScores, teamWinner, reasonForDecision, strengths, weaknesses, improvementAdvice, recommendedLessons, and readinessForNextLevel.`,
    () => fallbackDebateJudge(input)
  );
}

export async function judgeDecaRoleplay(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
}) {
  const rubric = rubricFor("DECA", input.eventType);

  return jsonCompletion<PerformanceJudgeResult>(
    "You are an educational DECA judge for original practice roleplays and case studies. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} DECA ${input.eventType} practice.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on business scenario understanding, performance indicators, solution quality, business reasoning, creativity, feasibility, professional communication, organization, judge questions, and delivery.
Return JSON with overallScore, categoryScores, sharedSpeaking, strengths, weaknesses, improvementAdvice, recommendedLessons, judgeQuestionFeedback, and readinessForNextLevel.`,
    () => fallbackPerformanceJudge({ organization: "DECA", eventType: input.eventType })
  );
}

export async function judgeHosaPerformance(input: {
  level: Level;
  eventType: string;
  scenario: string;
  transcript: DebateTranscriptMessage[];
}) {
  const rubric = rubricFor("HOSA", input.eventType);

  return jsonCompletion<PerformanceJudgeResult>(
    "You are an educational HOSA judge for original health science practice. Do not judge like debate. Return JSON only.",
    `Evaluate this ${input.level} HOSA ${input.eventType} performance.
Scenario: ${input.scenario}
Transcript JSON: ${JSON.stringify(input.transcript)}
Rubric JSON: ${JSON.stringify(rubric)}
Shared speaking skills to score from 0-100: ${SHARED_SPEAKING_SKILLS.join(", ")}.

Focus on health science knowledge, medical/health accuracy, event task completion, scenario response, communication, professionalism, presentation quality, and skill/performance quality when relevant.
Return JSON with overallScore, categoryScores, sharedSpeaking, strengths, weaknesses, improvementAdvice, recommendedLessons, accuracyFlags, and readinessForNextLevel.`,
    () => fallbackPerformanceJudge({ organization: "HOSA", eventType: input.eventType })
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
Questions should test transferable standards and concepts, not reproduce protected exam language.`,
    () => fallbackPracticeQuestions(input)
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
Return lesson, examples, guidedPractice, independentPractice, and masteryQuiz.`,
    () => fallbackLessonContent(input)
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

Return JSON recommendations with lessonSlug, reason, and priority.`,
    () => ({
      recommendations: input.availableLessons.slice(0, 3).map((lesson, index) => ({
        lessonSlug: lesson.slug,
        reason: `Development fallback recommendation for ${lesson.skill}: addresses one of the listed weak areas.`,
        priority: index === 0 ? "high" : index === 1 ? "medium" : "low"
      }))
    })
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

Return JSON with ready, confidence, rationale, and requiredEvidence.`,
    () => {
      const averageScore = input.recentScores.reduce((total, score) => total + score, 0) / input.recentScores.length;
      return {
        ready: averageScore >= 85 && input.weaknessSummary.length <= 1,
        confidence: Math.round(Math.min(95, Math.max(45, averageScore))),
        rationale:
          averageScore >= 85
            ? "Development fallback: recent scores suggest the student is close to readiness, pending consistent performance."
            : "Development fallback: keep practicing until recent scores are consistently above the readiness target.",
        requiredEvidence: [
          "Two recent scores above 85",
          "One judged round with clear improvement in the weakest skill",
          "A completed lesson tied to the current weakness summary"
        ]
      };
    }
  );
}
