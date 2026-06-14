import type { Organization } from "@prisma/client";

export type PracticeModeValue = "DEBATE" | "ROLEPLAY" | "TEST" | "LESSON";

export type EventOption = {
  value: string;
  label: string;
  description: string;
  allowedModes: PracticeModeValue[];
};

export type RubricDescriptorSeed = {
  label: string;
  minScore: number;
  maxScore: number;
  description: string;
};

export type RubricCategorySeed = {
  key: string;
  label: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
  weight: number;
  lessonSlugs: string[];
  sharedSpeakingSkill?: boolean;
  descriptors: RubricDescriptorSeed[];
};

export type RubricSeed = {
  organization: Organization;
  eventType: string;
  name: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
  categories: RubricCategorySeed[];
};

export const PRACTICE_MODES: Array<{
  value: PracticeModeValue;
  label: string;
  description: string;
}> = [
  {
    value: "DEBATE",
    label: "Debate",
    description: "Structured argument rounds with opponent responses and adjudication."
  },
  {
    value: "ROLEPLAY",
    label: "Roleplay",
    description: "Scenario-based performance practice with judge interaction."
  },
  {
    value: "TEST",
    label: "Test",
    description: "Original multiple-choice practice with explanations."
  },
  {
    value: "LESSON",
    label: "Lesson",
    description: "Targeted lesson, examples, guided practice, and mastery checks."
  }
];

export const EVENT_OPTIONS: Record<Organization, EventOption[]> = {
  DEBATE: [
    {
      value: "PARLIAMENTARY_DEBATE",
      label: "Parliamentary Debate",
      description: "Government and opposition case debate with speaker points and team decision.",
      allowedModes: ["DEBATE", "LESSON"]
    },
    {
      value: "PUBLIC_FORUM",
      label: "Public Forum",
      description: "Accessible evidence debate with clash, weighing, and summary focus.",
      allowedModes: ["DEBATE", "LESSON"]
    }
  ],
  MODEL_UN: [
    {
      value: "COMMITTEE_SPEECH",
      label: "Committee Speech",
      description: "Position-driven speech with diplomacy, coalition strategy, and resolution fit.",
      allowedModes: ["DEBATE", "LESSON"]
    },
    {
      value: "RESOLUTION_DEFENSE",
      label: "Resolution Defense",
      description: "Explain, defend, and refine operative ideas under delegate pressure.",
      allowedModes: ["DEBATE", "LESSON"]
    }
  ],
  DECA: [
    {
      value: "ROLEPLAY",
      label: "Roleplay",
      description: "Business scenario response using performance indicators and judge questions.",
      allowedModes: ["ROLEPLAY", "TEST", "LESSON"]
    },
    {
      value: "CASE_STUDY",
      label: "Case Study",
      description: "Analyze a business problem, recommend an action plan, and defend feasibility.",
      allowedModes: ["ROLEPLAY", "TEST", "LESSON"]
    }
  ],
  HOSA: [
    {
      value: "HEALTH_SCIENCE_EVENT",
      label: "Health Science Event",
      description: "Health knowledge, accuracy, scenario response, and professional communication.",
      allowedModes: ["ROLEPLAY", "TEST", "LESSON"]
    },
    {
      value: "PREPARED_SPEAKING",
      label: "Prepared Speaking",
      description: "Healthcare-focused presentation with accuracy, structure, and delivery.",
      allowedModes: ["ROLEPLAY", "LESSON"]
    }
  ],
  MOCK_TRIAL: [
    {
      value: "TRIAL_ADVOCACY",
      label: "Trial Advocacy",
      description: "Case theory, witness control, objections, and courtroom delivery.",
      allowedModes: ["DEBATE", "LESSON"]
    }
  ],
  PUBLIC_SPEAKING: [
    {
      value: "PREPARED_SPEECH",
      label: "Prepared Speech",
      description: "Speech structure, delivery, audience fit, and persuasive impact.",
      allowedModes: ["ROLEPLAY", "LESSON"]
    }
  ]
};

const fivePointDescriptors: RubricDescriptorSeed[] = [
  {
    label: "Needs focused growth",
    minScore: 1,
    maxScore: 1,
    description: "Core expectations are mostly missing or unclear."
  },
  {
    label: "Developing",
    minScore: 2,
    maxScore: 3,
    description: "Some fundamentals are present, but consistency and precision need work."
  },
  {
    label: "Strong",
    minScore: 4,
    maxScore: 5,
    description: "The performance is clear, purposeful, and competitive for the level."
  }
];

export const SHARED_SPEAKING_SKILLS = [
  "clarity",
  "confidence",
  "pacing",
  "volume",
  "organization",
  "vocabulary",
  "persuasion",
  "professionalism"
] as const;

export const SPEAKER_POINT_SCALE = [
  { score: "19", label: "Poor" },
  { score: "20-21", label: "Developing" },
  { score: "22-23", label: "Competent" },
  { score: "24-26", label: "Good" },
  { score: "27-28", label: "Excellent" },
  { score: "29", label: "Outstanding" },
  { score: "30", label: "Exceptional" }
];

export const RUBRIC_SEEDS: RubricSeed[] = [
  {
    organization: "DEBATE",
    eventType: "PARLIAMENTARY_DEBATE",
    name: "DebateArena Parliamentary Debate Engine",
    description:
      "Original parliamentary debate scoring model inspired by judge training concepts: case design, clash, response quality, structure, speaking, rules, and time discipline.",
    scoreMin: 1,
    scoreMax: 5,
    categories: [
      {
        key: "argument",
        label: "Argument",
        description: "Measures whether claims are clear, logically linked, and strategically important.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 2,
        lessonSlugs: ["debate-claim-building-1", "debate-claim-building-2"],
        descriptors: fivePointDescriptors
      },
      {
        key: "refutation",
        label: "Refutation",
        description: "Measures direct answers to the other side and the ability to reduce opposing offense.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 2,
        lessonSlugs: ["debate-rebuttal-1", "debate-rebuttal-2"],
        descriptors: fivePointDescriptors
      },
      {
        key: "contentEvidence",
        label: "Content and Evidence",
        description: "Credits examples, support, depth, and responsible use of general knowledge.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 2,
        lessonSlugs: ["debate-evidence-1", "debate-evidence-3"],
        descriptors: fivePointDescriptors
      },
      {
        key: "organization",
        label: "Organization",
        description: "Assesses structure, sequencing, signposting, and ease of following the flow.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-claim-building-3"],
        sharedSpeakingSkill: true,
        descriptors: fivePointDescriptors
      },
      {
        key: "style",
        label: "Style",
        description: "Assesses word choice, audience connection, confidence, and persuasive tone.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-claim-building-3"],
        sharedSpeakingSkill: true,
        descriptors: fivePointDescriptors
      },
      {
        key: "delivery",
        label: "Delivery",
        description: "Measures voice control, pace, volume, presence, and clarity under pressure.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-claim-building-3"],
        sharedSpeakingSkill: true,
        descriptors: fivePointDescriptors
      },
      {
        key: "governmentCaseQuality",
        label: "Government Case Quality",
        description: "Evaluates the case topic, definitions, contentions, and internal coherence.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 2,
        lessonSlugs: ["debate-claim-building-1", "debate-claim-building-3"],
        descriptors: fivePointDescriptors
      },
      {
        key: "oppositionResponseQuality",
        label: "Opposition Response Quality",
        description: "Evaluates the opposition strategy, counter-case pressure, and ability to expose weak links.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 2,
        lessonSlugs: ["debate-rebuttal-1", "debate-rebuttal-3"],
        descriptors: fivePointDescriptors
      },
      {
        key: "clash",
        label: "Clash",
        description: "Measures whether the teams create and resolve meaningful disagreement.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 2,
        lessonSlugs: ["debate-rebuttal-3"],
        descriptors: fivePointDescriptors
      },
      {
        key: "definitions",
        label: "Definitions",
        description: "Assesses whether key terms are bounded fairly and used to clarify the debate.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-claim-building-2"],
        descriptors: fivePointDescriptors
      },
      {
        key: "contentions",
        label: "Contentions",
        description: "Reviews the quality, distinction, and support of major lines of argument.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-claim-building-3"],
        descriptors: fivePointDescriptors
      },
      {
        key: "signposting",
        label: "Signposting",
        description: "Measures whether speakers make the structure and transitions easy to follow.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-rebuttal-3"],
        sharedSpeakingSkill: true,
        descriptors: fivePointDescriptors
      },
      {
        key: "rebuttalEffectiveness",
        label: "Rebuttal Effectiveness",
        description: "Credits focused final responses, weighing, and big-picture issue selection.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 2,
        lessonSlugs: ["debate-rebuttal-2", "debate-rebuttal-3"],
        descriptors: fivePointDescriptors
      },
      {
        key: "ruleAwareness",
        label: "Rule Awareness",
        description: "Measures format control, procedural awareness, and respect for round boundaries.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-claim-building-1"],
        descriptors: fivePointDescriptors
      },
      {
        key: "timeUsage",
        label: "Time Usage",
        description: "Assesses whether speeches use time intentionally without rushing or padding.",
        scoreMin: 1,
        scoreMax: 5,
        weight: 1,
        lessonSlugs: ["debate-rebuttal-3"],
        descriptors: fivePointDescriptors
      }
    ]
  },
  {
    organization: "DECA",
    eventType: "ROLEPLAY",
    name: "DebateArena DECA Roleplay Engine",
    description:
      "Original DECA scoring model for roleplays and case studies, focused on business scenario analysis, performance indicators, solution quality, feasibility, and professional communication.",
    scoreMin: 1,
    scoreMax: 5,
    categories: [
      ["scenarioUnderstanding", "Understanding of the Business Scenario", "Identifies the central business issue, stakeholder needs, constraints, and success criteria.", ["deca-roleplay-1"]],
      ["performanceIndicators", "Use of Performance Indicators", "Addresses relevant indicators directly and turns them into judge-visible actions.", ["deca-roleplay-1"]],
      ["solutionQuality", "Quality of Proposed Solution", "Presents a coherent recommendation with clear steps and measurable outcomes.", ["deca-roleplay-2"]],
      ["businessReasoning", "Business Reasoning", "Uses sound marketing, finance, operations, or entrepreneurship logic.", ["deca-marketing-1", "deca-marketing-3"]],
      ["creativity", "Creativity", "Adds thoughtful differentiation without losing practicality.", ["deca-marketing-2"]],
      ["feasibility", "Feasibility", "Considers budget, staffing, timeline, risk, and implementation realities.", ["deca-roleplay-3"]],
      ["professionalCommunication", "Professional Communication", "Uses clear executive presence, business vocabulary, and audience awareness.", ["deca-roleplay-2"]],
      ["organization", "Organization", "Frames the response with a clear opening, body, transitions, and closing.", ["deca-roleplay-2"]],
      ["judgeQuestions", "Response to Judge Questions", "Answers questions directly while defending tradeoffs and adapting under pressure.", ["deca-roleplay-3"]],
      ["confidenceDelivery", "Confidence and Delivery", "Communicates with poise, pacing, volume, and credibility.", ["deca-roleplay-2"]]
    ].map(([key, label, description, lessonSlugs], order) => ({
      key: key as string,
      label: label as string,
      description: description as string,
      scoreMin: 1,
      scoreMax: 5,
      weight: order < 6 ? 2 : 1,
      lessonSlugs: lessonSlugs as string[],
      sharedSpeakingSkill: ["professionalCommunication", "organization", "confidenceDelivery"].includes(key as string),
      descriptors: fivePointDescriptors
    }))
  },
  {
    organization: "HOSA",
    eventType: "HEALTH_SCIENCE_EVENT",
    name: "DebateArena HOSA Performance Engine",
    description:
      "Original HOSA scoring model for health science knowledge, task completion, scenario reasoning, accuracy, professionalism, and presentation quality.",
    scoreMin: 1,
    scoreMax: 5,
    categories: [
      ["healthScienceKnowledge", "Health Science Knowledge", "Shows command of relevant concepts, terminology, and event expectations.", ["hosa-medical-terminology-1"]],
      ["medicalAccuracy", "Accuracy of Medical and Health Information", "Provides precise, safe, and appropriately qualified health information.", ["hosa-medical-terminology-2"]],
      ["taskCompletion", "Event-Specific Task Completion", "Completes required event actions with attention to sequence and criteria.", ["hosa-patient-communication-3"]],
      ["scenarioResponse", "Scenario Response", "Responds to the given situation with judgment, prioritization, and appropriate next steps.", ["hosa-patient-communication-1"]],
      ["communication", "Communication", "Explains clearly, listens actively, and adapts language to the audience.", ["hosa-patient-communication-1"]],
      ["professionalism", "Professionalism", "Demonstrates composure, respect, ethical awareness, and healthcare-appropriate demeanor.", ["hosa-patient-communication-3"]],
      ["presentationQuality", "Presentation Quality", "Uses structure, clarity, pacing, and presence to make the response easy to follow.", ["hosa-patient-communication-2"]],
      ["skillPerformance", "Skill or Performance Quality", "Executes relevant procedures, demonstrations, or performance elements accurately when applicable.", ["hosa-medical-terminology-3"]]
    ].map(([key, label, description, lessonSlugs], order) => ({
      key: key as string,
      label: label as string,
      description: description as string,
      scoreMin: 1,
      scoreMax: 5,
      weight: order < 4 ? 2 : 1,
      lessonSlugs: lessonSlugs as string[],
      sharedSpeakingSkill: ["communication", "professionalism", "presentationQuality"].includes(key as string),
      descriptors: fivePointDescriptors
    }))
  }
];

export function getEventOptions(organization: Organization) {
  return EVENT_OPTIONS[organization];
}

export function getDefaultEventType(organization: Organization) {
  return EVENT_OPTIONS[organization][0].value;
}

export function getRubricSeed(organization: Organization, eventType: string) {
  return RUBRIC_SEEDS.find((rubric) => rubric.organization === organization && rubric.eventType === eventType);
}
