import type { Level } from "@prisma/client";
import { DECA_EVENT_CLUSTERS, HOSA_EVENT_CATEGORIES } from "@/lib/testing";

export type BankPracticeQuestion = {
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  skillTag: string;
  linkedSkill: string;
  difficulty: Level;
  eventCluster?: string;
  eventCategory?: string;
  performanceIndicatorTag?: string;
};

type QuestionInput = {
  organization: "DECA" | "HOSA";
  eventType: string;
  eventCluster?: string;
  difficulty: Level;
  count: 10 | 25 | 50 | 100;
};

const difficultyLens: Record<Level, string> = {
  BEGINNER: "focus on the most direct first step",
  INTERMEDIATE: "balance the goal, constraints, and measurable outcome",
  ELITE: "prioritize the option that best defends tradeoffs under judge questioning"
};

const decaClusterSpecs: Record<string, {
  scenarios: string[];
  roles: string[];
  metrics: string[];
  skills: string[];
  indicators: string[];
}> = {
  Marketing: {
    scenarios: ["a campus apparel store", "a local coffee shop", "a student-run fundraiser", "a neighborhood fitness studio"],
    roles: ["marketing associate", "brand manager", "customer insights analyst", "promotion planner"],
    metrics: ["repeat purchase rate", "conversion rate", "customer segment growth", "promotion redemption"],
    skills: ["Target market analysis", "Promotion strategy", "Customer behavior", "Marketing metrics"],
    indicators: ["identify target markets", "explain customer buying behavior", "choose promotional channels", "measure marketing effectiveness"]
  },
  "Business Management": {
    scenarios: ["a growing tutoring company", "a school supply retailer", "a small logistics team", "a youth sports organization"],
    roles: ["operations manager", "human resources assistant", "team lead", "business analyst"],
    metrics: ["employee retention", "cycle time", "training completion", "customer complaint rate"],
    skills: ["Operations planning", "Team communication", "Change management", "Performance measurement"],
    indicators: ["manage staff performance", "coordinate business operations", "communicate organizational policies", "use data to improve processes"]
  },
  Finance: {
    scenarios: ["a credit union youth program", "a small online retailer", "a family-owned restaurant", "a startup subscription service"],
    roles: ["financial analyst", "loan associate", "budget coordinator", "risk assistant"],
    metrics: ["cash flow", "debt-to-income ratio", "gross margin", "default risk"],
    skills: ["Financial analysis", "Risk management", "Credit decisions", "Budgeting"],
    indicators: ["interpret financial data", "explain credit terms", "assess financial risk", "recommend budget controls"]
  },
  "Hospitality and Tourism": {
    scenarios: ["a boutique hotel", "a city visitor center", "a conference venue", "a family entertainment attraction"],
    roles: ["guest services manager", "event coordinator", "front desk supervisor", "tourism marketer"],
    metrics: ["guest satisfaction", "occupancy rate", "average daily rate", "event rebooking"],
    skills: ["Service recovery", "Guest experience", "Revenue awareness", "Event operations"],
    indicators: ["handle guest concerns", "improve service quality", "support event logistics", "explain hospitality pricing decisions"]
  },
  Entrepreneurship: {
    scenarios: ["a student meal-prep startup", "a mobile car-detailing idea", "a campus resale marketplace", "a tutoring app"],
    roles: ["founder", "pitch presenter", "venture planner", "market validation lead"],
    metrics: ["startup cost", "break-even point", "customer acquisition cost", "minimum viable product feedback"],
    skills: ["Value proposition", "Market validation", "Business model", "Feasibility"],
    indicators: ["define a customer problem", "test a business idea", "estimate startup resources", "explain revenue models"]
  },
  "Sports and Entertainment Marketing": {
    scenarios: ["a minor league team", "a school esports tournament", "a concert venue", "a community 5K event"],
    roles: ["partnership coordinator", "fan engagement manager", "ticketing analyst", "event marketer"],
    metrics: ["ticket sales", "sponsor impressions", "fan engagement", "merchandise revenue"],
    skills: ["Sponsorship value", "Event promotion", "Fan engagement", "Ticketing strategy"],
    indicators: ["activate sponsorships", "segment entertainment audiences", "plan event promotions", "measure fan engagement"]
  },
  "Personal Financial Literacy": {
    scenarios: ["a first-year college student", "a part-time employee", "a family planning a car purchase", "a teen opening a bank account"],
    roles: ["financial coach", "banking advisor", "budget mentor", "consumer credit educator"],
    metrics: ["emergency savings", "credit utilization", "monthly cash flow", "insurance deductible"],
    skills: ["Budgeting", "Credit literacy", "Saving strategy", "Consumer decisions"],
    indicators: ["create a personal budget", "explain credit score factors", "compare financial products", "manage financial risk"]
  }
};

function decaSpecFor(cluster: string) {
  const exact = decaClusterSpecs[cluster];

  if (exact) {
    return exact;
  }

  const normalized = cluster.toLowerCase();
  const theme = normalized.replace(/\s+basics$/, "");

  return {
    scenarios: [
      `a student business team facing a ${theme} decision`,
      `a small company reviewing its ${theme} strategy`,
      `a roleplay judge asking about ${theme} tradeoffs`,
      `a local organization trying to improve ${theme} outcomes`
    ],
    roles: ["business consultant", "student advisor", "operations analyst", "management trainee"],
    metrics: ["customer value", "cost control", "decision quality", "measurable improvement"],
    skills: [cluster, "Business reasoning", "Performance indicators", "Professional communication"],
    indicators: [
      `explain ${theme} decision factors`,
      `recommend a practical ${theme} action`,
      `connect ${theme} choices to measurable results`,
      `evaluate risks in a ${theme} recommendation`
    ]
  };
}

const hosaCategorySpecs: Record<string, {
  scenarios: string[];
  concepts: string[];
  skills: string[];
  safeActions: string[];
}> = {
  "Medical Terminology": {
    scenarios: ["a patient chart note", "a discharge instruction sheet", "a clinic intake form", "a medication education handout"],
    concepts: ["prefixes and suffixes", "body system roots", "abbreviation safety", "plain-language translation"],
    skills: ["Medical terminology", "Word parts", "Clinical vocabulary", "Patient-friendly language"],
    safeActions: ["translate the term into clear language", "separate the word root from the suffix", "ask for clarification on unsafe abbreviations", "connect the term to the correct body system"]
  },
  "Health Science Concepts": {
    scenarios: ["a wellness screening booth", "a health science classroom lab", "a community education table", "a basic vital-signs review"],
    concepts: ["homeostasis", "infection prevention", "nutrition basics", "body system function"],
    skills: ["Health science knowledge", "Safety reasoning", "Prevention", "Core biology"],
    safeActions: ["identify the body system involved", "apply a prevention principle", "connect the sign to a health concept", "choose the safest educational response"]
  },
  "Healthcare Ethics": {
    scenarios: ["a hallway conversation", "a social media post about a patient", "a consent question", "a patient privacy concern"],
    concepts: ["confidentiality", "informed consent", "scope of practice", "professional boundaries"],
    skills: ["Healthcare ethics", "Professionalism", "Privacy", "Scope awareness"],
    safeActions: ["protect patient privacy", "refer the decision to the licensed professional", "explain the need for consent", "avoid sharing identifiable information"]
  },
  "Patient Communication": {
    scenarios: ["a nervous patient before a procedure", "a parent asking for instructions", "a patient confused by medical terms", "a follow-up call"],
    concepts: ["active listening", "teach-back", "empathy", "plain language"],
    skills: ["Patient communication", "Empathy", "Teach-back", "Professional communication"],
    safeActions: ["acknowledge the concern and use teach-back", "slow down and check understanding", "use plain language", "invite questions before closing"]
  },
  "Anatomy and Physiology": {
    scenarios: ["a sports injury discussion", "a breathing-rate observation", "a digestion lesson", "a circulation review"],
    concepts: ["musculoskeletal function", "respiratory exchange", "digestive absorption", "cardiovascular transport"],
    skills: ["Anatomy and physiology", "Body systems", "Structure and function", "Physiology reasoning"],
    safeActions: ["match the structure to its function", "identify the system most involved", "connect symptom location to anatomy", "explain the normal function first"]
  },
  "Clinical Skills": {
    scenarios: ["taking a pulse", "preparing a room", "hand hygiene before care", "measuring temperature"],
    concepts: ["standard precautions", "measurement accuracy", "equipment preparation", "patient identification"],
    skills: ["Clinical skills", "Safety protocol", "Measurement", "Infection control"],
    safeActions: ["perform hand hygiene and identify the patient", "prepare equipment before beginning", "report abnormal findings to the appropriate supervisor", "follow the skill checklist in order"]
  },
  "Public Health": {
    scenarios: ["a vaccination awareness campaign", "a school wellness announcement", "a community nutrition program", "an outbreak prevention message"],
    concepts: ["population prevention", "risk communication", "health education", "community resources"],
    skills: ["Public health reasoning", "Prevention", "Community health", "Health education"],
    safeActions: ["focus on prevention and credible sources", "identify the at-risk population", "use clear risk communication", "connect people to appropriate resources"]
  }
};

function hosaSpecFor(category: string) {
  const exact = hosaCategorySpecs[category];

  if (exact) {
    return exact;
  }

  const theme = category.toLowerCase();

  return {
    scenarios: [
      `a health science classroom prompt about ${theme}`,
      `a patient education moment involving ${theme}`,
      `a clinical safety scenario connected to ${theme}`,
      `a HOSA-style judge question about ${theme}`
    ],
    concepts: [`${theme} fundamentals`, `${theme} safety`, `${theme} communication`, `${theme} accuracy`],
    skills: [category, "Health science knowledge", "Professional communication", "Safety reasoning"],
    safeActions: [
      `apply the safest ${theme} principle`,
      `explain the ${theme} idea in plain language`,
      `connect ${theme} to patient safety`,
      `ask for clarification and stay within scope`
    ]
  };
}

export const DECA_ROLEPLAY_SCENARIOS = [
  {
    cluster: "Marketing",
    scenario: "A local retailer has strong foot traffic but weak repeat purchases.",
    role: "Marketing associate",
    task: "Recommend a loyalty strategy with one measurable goal.",
    performanceIndicators: ["identify target market needs", "choose promotional tactics", "measure customer retention"],
    judgeQuestions: ["How will you know the loyalty strategy worked?", "What risk should the owner watch first?"],
    answerGuidance: "Open with the business problem, name the target customer, recommend a feasible tactic, and close with a retention metric."
  },
  {
    cluster: "Finance",
    scenario: "A student-run store wants to add a new product line but has limited cash.",
    role: "Financial analyst",
    task: "Recommend whether to test, delay, or finance the new line.",
    performanceIndicators: ["interpret cash flow", "assess financial risk", "recommend budget controls"],
    judgeQuestions: ["What information would you request before deciding?", "How would you reduce risk?"],
    answerGuidance: "Compare expected margin, startup cost, and cash flow before choosing a small pilot or delay."
  },
  {
    cluster: "Hospitality and Tourism",
    scenario: "A hotel receives repeated complaints about slow check-in during weekend events.",
    role: "Guest services manager",
    task: "Create a service recovery and operations plan.",
    performanceIndicators: ["handle guest concerns", "improve service quality", "support event logistics"],
    judgeQuestions: ["How would staff communicate delays?", "Which metric tracks improvement?"],
    answerGuidance: "Acknowledge guests, add queue support, communicate wait expectations, and track satisfaction plus check-in time."
  },
  {
    cluster: "Entrepreneurship",
    scenario: "A founder wants to launch a tutoring app before validating demand.",
    role: "Market validation lead",
    task: "Recommend a low-cost validation plan.",
    performanceIndicators: ["define a customer problem", "test a business idea", "estimate startup resources"],
    judgeQuestions: ["What would prove the idea is worth building?", "How would you gather feedback ethically?"],
    answerGuidance: "Define the customer, run interviews or a landing-page pilot, measure sign-ups, and limit costs before development."
  },
  {
    cluster: "Sports and Entertainment Marketing",
    scenario: "A school esports event needs sponsors but cannot promise large attendance.",
    role: "Partnership coordinator",
    task: "Build a sponsor package around realistic value.",
    performanceIndicators: ["activate sponsorships", "segment entertainment audiences", "measure fan engagement"],
    judgeQuestions: ["What value can you offer besides attendance?", "How will sponsors see results?"],
    answerGuidance: "Offer digital mentions, booth presence, community goodwill, and engagement reporting instead of inflated attendance claims."
  }
];

export const HOSA_SCENARIO_SETS = [
  {
    category: "Patient Communication",
    scenario: "A patient says they are afraid to ask questions because the clinic seems busy.",
    task: "Respond with empathy and check understanding.",
    skills: ["active listening", "teach-back", "plain language"],
    feedback: "A strong response slows down, validates the concern, invites questions, and asks the patient to repeat the plan in their own words."
  },
  {
    category: "Healthcare Ethics",
    scenario: "A classmate asks you to share details about a patient you observed during a shadowing experience.",
    task: "Protect privacy while maintaining professionalism.",
    skills: ["confidentiality", "professional boundaries", "scope awareness"],
    feedback: "A strong response refuses to share identifiable details and redirects to general learning points."
  },
  {
    category: "Clinical Skills",
    scenario: "You are preparing to take a pulse but have not confirmed the patient's identity.",
    task: "Choose the safest next step.",
    skills: ["patient identification", "standard precautions", "measurement accuracy"],
    feedback: "A strong response follows the checklist: hand hygiene, identify the patient, explain the skill, then measure."
  },
  {
    category: "Public Health",
    scenario: "A school wants a health message about preventing seasonal illness.",
    task: "Create a prevention-focused message using credible sources.",
    skills: ["prevention", "risk communication", "health education"],
    feedback: "A strong response names the audience, uses plain language, and points to credible public-health guidance."
  },
  {
    category: "Medical Terminology",
    scenario: "A patient does not understand a term used in their discharge instructions.",
    task: "Translate the term without changing medical meaning.",
    skills: ["word parts", "plain-language translation", "communication"],
    feedback: "A strong response explains the term simply and checks whether the patient understands the instruction."
  }
];

function rotateChoices(choices: string[], seed: number) {
  const offset = seed % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}

function decaDistractors(metric: string, role: string) {
  return [
    `Use a broad slogan and postpone defining the customer until after launch.`,
    `Promise immediate improvement in ${metric} without a timeline or resource check.`,
    `Avoid discussing risks so the ${role} sounds more confident.`
  ];
}

function hosaDistractors() {
  return [
    "Give a definitive diagnosis without enough information.",
    "Use technical language only and move quickly to the next task.",
    "Ignore the concern if the planned action is routine."
  ];
}

function buildDecaQuestion(cluster: string, difficulty: Level, index: number): BankPracticeQuestion {
  const spec = decaSpecFor(cluster);
  const scenario = spec.scenarios[index % spec.scenarios.length];
  const role = spec.roles[index % spec.roles.length];
  const metric = spec.metrics[index % spec.metrics.length];
  const skill = spec.skills[index % spec.skills.length];
  const indicator = spec.indicators[index % spec.indicators.length];
  const correctAnswer = `Define the stakeholder, connect the recommendation to ${indicator}, and measure ${metric}.`;
  const promptStyle = index % 4;
  const question =
    promptStyle === 0
      ? `In a DECA ${cluster} roleplay, you are the ${role} for ${scenario}. Which response best fits the performance indicator "${indicator}"?`
      : promptStyle === 1
        ? `${scenario} needs a practical recommendation from a ${role}. Which first step would make the judge's score sheet easiest to support?`
        : promptStyle === 2
          ? `A judge asks how your ${cluster} recommendation will be evaluated. Which answer is strongest?`
          : `For an original ${cluster} case prompt, which plan is most feasible at the ${difficulty.toLowerCase()} level?`;

  const choices = rotateChoices([correctAnswer, ...decaDistractors(metric, role)], index);

  return {
    question,
    choices,
    correctAnswer,
    explanation: `The correct choice states the stakeholder, ties the action to "${indicator}", and uses ${metric} as a measurable business outcome. The other choices are too vague, overpromise results, or avoid risk analysis.`,
    skillTag: skill,
    linkedSkill: skill,
    difficulty,
    eventCluster: cluster,
    performanceIndicatorTag: indicator
  };
}

function buildHosaQuestion(category: string, difficulty: Level, index: number): BankPracticeQuestion {
  const spec = hosaSpecFor(category);
  const scenario = spec.scenarios[index % spec.scenarios.length];
  const concept = spec.concepts[index % spec.concepts.length];
  const skill = spec.skills[index % spec.skills.length];
  const safeAction = spec.safeActions[index % spec.safeActions.length];
  const correctAnswer = `Use ${safeAction} while staying within the student's role and communicating clearly.`;
  const promptStyle = index % 4;
  const question =
    promptStyle === 0
      ? `In an original HOSA-style ${category} practice item involving ${scenario}, which action best demonstrates ${concept}?`
      : promptStyle === 1
        ? `A competitor is explaining ${concept} during a ${category} scenario. Which response is safest and most professional?`
        : promptStyle === 2
          ? `Which answer best applies ${skill.toLowerCase()} in a ${scenario}?`
          : `For a ${difficulty.toLowerCase()} ${category} practice question, which option best protects safety, accuracy, and communication?`;

  const choices = rotateChoices([correctAnswer, ...hosaDistractors()], index);

  return {
    question,
    choices,
    correctAnswer,
    explanation: `The correct choice applies ${concept} with a safe, professional action: ${safeAction}. The other choices either exceed scope, reduce patient understanding, or ignore a safety/communication concern.`,
    skillTag: skill,
    linkedSkill: skill,
    difficulty,
    eventCategory: category,
    performanceIndicatorTag: concept
  };
}

function buildBaseBank(organization: "DECA" | "HOSA", focus: string, difficulty: Level) {
  if (organization === "DECA") {
    const cluster = DECA_EVENT_CLUSTERS.includes(focus) ? focus : "Marketing";
    const focusedQuestions = Array.from({ length: 20 }, (_, index) => buildDecaQuestion(cluster, difficulty, index));
    const mixedQuestions = DECA_EVENT_CLUSTERS.flatMap((mixedCluster, clusterIndex) =>
      Array.from({ length: 15 }, (_, index) => buildDecaQuestion(mixedCluster, difficulty, index + clusterIndex * 20))
    );

    return [...focusedQuestions, ...mixedQuestions];
  }

  const category = HOSA_EVENT_CATEGORIES.includes(focus) ? focus : "Health Science Concepts";
  const focusedQuestions = Array.from({ length: 20 }, (_, index) => buildHosaQuestion(category, difficulty, index));
  const mixedQuestions = HOSA_EVENT_CATEGORIES.flatMap((mixedCategory, categoryIndex) =>
    Array.from({ length: 15 }, (_, index) => buildHosaQuestion(mixedCategory, difficulty, index + categoryIndex * 20))
  );

  return [...focusedQuestions, ...mixedQuestions];
}

function adaptQuestion(question: BankPracticeQuestion, index: number, difficulty: Level): BankPracticeQuestion {
  if (index < 20) {
    return question;
  }

  const cycle = Math.floor(index / 20) + 1;
  return {
    ...question,
    difficulty,
    question: `${question.question} Practice variation ${cycle}: ${difficultyLens[difficulty]}.`,
    explanation: `${question.explanation} This variation is original local practice and is not copied from an official exam.`
  };
}

export function buildFallbackPracticeQuestions(input: QuestionInput) {
  const focus = input.eventCluster ?? (input.organization === "DECA" ? "Marketing" : "Health Science Concepts");
  const base = buildBaseBank(input.organization, focus, input.difficulty);

  return Array.from({ length: input.count }, (_, index) => adaptQuestion(base[index % base.length], index, input.difficulty));
}
