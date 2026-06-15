export type StudyOrganization = "DECA" | "HOSA" | "DEBATE";

export type Flashcard = {
  id: string;
  organization: Exclude<StudyOrganization, "DEBATE">;
  deck: string;
  deckSlug: string;
  term: string;
  definition: string;
  beginnerExplanation: string;
  example: string;
  commonMistake: string;
  quickCheck: string;
  quickCheckAnswer: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  tags: string[];
  relatedSkills: string[];
};

export type ResourceVideo = {
  id: string;
  title: string;
  topic: string;
  sourceName: string;
  estimatedDuration: string;
  url: string;
  organization: StudyOrganization | "GENERAL";
  skillTags: string[];
  followUp: "flashcards" | "quick quiz" | "writing practice" | "explain it back" | "mastery check";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const decaTerms: Record<string, string[]> = {
  Marketing: [
    "target market",
    "customer segment",
    "value proposition",
    "brand positioning",
    "promotion mix",
    "conversion rate",
    "customer journey",
    "market research",
    "competitive advantage",
    "product differentiation",
    "customer retention",
    "loyalty program",
    "channel strategy",
    "market share",
    "call to action"
  ],
  "Business Management": [
    "operations plan",
    "key performance indicator",
    "employee onboarding",
    "workflow",
    "organizational culture",
    "change management",
    "stakeholder",
    "process improvement",
    "quality control",
    "customer service standard",
    "delegation",
    "risk mitigation",
    "training plan",
    "resource allocation",
    "performance review"
  ],
  Finance: [
    "cash flow",
    "gross margin",
    "net income",
    "budget variance",
    "credit utilization",
    "interest rate",
    "liquidity",
    "break-even point",
    "return on investment",
    "risk tolerance",
    "collateral",
    "debt-to-income ratio",
    "compound interest",
    "financial statement",
    "opportunity cost"
  ],
  "Hospitality and Tourism": [
    "guest experience",
    "service recovery",
    "occupancy rate",
    "average daily rate",
    "front-of-house",
    "event logistics",
    "revenue management",
    "reservation system",
    "customer satisfaction",
    "brand standard",
    "concierge",
    "upselling",
    "destination marketing",
    "tourism demand",
    "hospitality operations"
  ],
  Entrepreneurship: [
    "minimum viable product",
    "customer discovery",
    "business model",
    "startup cost",
    "pitch",
    "market validation",
    "revenue stream",
    "scalability",
    "prototype",
    "customer acquisition cost",
    "early adopter",
    "unit economics",
    "founder-market fit",
    "problem-solution fit",
    "lean experiment"
  ],
  "Sports and Entertainment Marketing": [
    "sponsorship activation",
    "fan engagement",
    "ticket bundle",
    "merchandise revenue",
    "event promotion",
    "audience segment",
    "brand partnership",
    "in-game experience",
    "impressions",
    "media rights",
    "community outreach",
    "venue operations",
    "promotional calendar",
    "season ticket holder",
    "experience economy"
  ],
  "Personal Financial Literacy": [
    "emergency fund",
    "credit score",
    "deductible",
    "checking account",
    "savings goal",
    "automatic transfer",
    "simple interest",
    "compound interest",
    "needs vs wants",
    "insurance premium",
    "net pay",
    "spending plan",
    "identity theft",
    "secured credit card",
    "financial goal"
  ],
  "Economics basics": [
    "scarcity",
    "supply",
    "demand",
    "equilibrium price",
    "opportunity cost",
    "incentive",
    "competition",
    "consumer surplus",
    "producer surplus",
    "economic utility"
  ],
  Promotion: [
    "advertising objective",
    "public relations",
    "sales promotion",
    "earned media",
    "paid media",
    "owned media",
    "message consistency",
    "promotion calendar",
    "brand awareness",
    "campaign reach"
  ],
  Pricing: [
    "price elasticity",
    "cost-plus pricing",
    "value-based pricing",
    "penetration pricing",
    "premium pricing",
    "break-even price",
    "discount strategy",
    "price sensitivity",
    "margin protection",
    "competitive pricing"
  ],
  Distribution: [
    "supply chain",
    "channel partner",
    "inventory turnover",
    "last-mile delivery",
    "wholesaler",
    "retailer",
    "direct distribution",
    "logistics cost",
    "fulfillment",
    "stockout"
  ],
  "Market research": [
    "survey bias",
    "sample size",
    "focus group",
    "primary research",
    "secondary research",
    "customer insight",
    "data validity",
    "research objective",
    "trend analysis",
    "competitive scan"
  ],
  "Customer relations": [
    "customer lifetime value",
    "service recovery",
    "complaint resolution",
    "customer satisfaction",
    "net promoter score",
    "relationship marketing",
    "customer touchpoint",
    "loyalty driver",
    "retention tactic",
    "customer expectation"
  ],
  Operations: [
    "standard operating procedure",
    "capacity planning",
    "bottleneck",
    "quality assurance",
    "process map",
    "cycle time",
    "resource constraint",
    "vendor reliability",
    "continuous improvement",
    "operational risk"
  ],
  "Financial analysis": [
    "profit margin",
    "cash conversion cycle",
    "liability",
    "asset",
    "working capital",
    "variance analysis",
    "forecast",
    "fixed cost",
    "variable cost",
    "solvency"
  ],
  "Business law basics": [
    "contract",
    "liability",
    "warranty",
    "intellectual property",
    "employment law",
    "consumer protection",
    "disclosure",
    "compliance",
    "negligence",
    "terms of service"
  ],
  Ethics: [
    "conflict of interest",
    "transparency",
    "fair dealing",
    "privacy",
    "stakeholder trust",
    "ethical sourcing",
    "truthful advertising",
    "data responsibility",
    "professional integrity",
    "accountability"
  ],
  "Human resources": [
    "recruitment",
    "onboarding",
    "employee engagement",
    "performance feedback",
    "workplace policy",
    "training needs",
    "retention",
    "workplace culture",
    "conflict resolution",
    "compensation"
  ]
};

const hosaTerms: Record<string, string[]> = {
  "Medical Terminology": [
    "tachycardia",
    "bradycardia",
    "hypertension",
    "hypoglycemia",
    "hyperthermia",
    "dermatology",
    "neurology",
    "cardiology",
    "hematology",
    "gastroenterology",
    "respiration",
    "triage",
    "contraindication",
    "prognosis",
    "asepsis"
  ],
  "Health Science Concepts": [
    "homeostasis",
    "pathogen",
    "infection control",
    "vital signs",
    "nutrition",
    "hydration",
    "immunity",
    "inflammation",
    "metabolism",
    "body system",
    "prevention",
    "screening",
    "health literacy",
    "risk factor",
    "wellness"
  ],
  "Anatomy and Physiology": [
    "circulatory system",
    "respiratory system",
    "skeletal system",
    "muscular system",
    "nervous system",
    "digestive system",
    "renal system",
    "endocrine system",
    "joint",
    "alveoli",
    "neuron",
    "artery",
    "vein",
    "ligament",
    "tendon"
  ],
  "Patient Communication": [
    "active listening",
    "teach-back",
    "plain language",
    "empathy",
    "open-ended question",
    "nonverbal cue",
    "confidentiality",
    "rapport",
    "patient education",
    "informed question",
    "cultural humility",
    "clarifying question",
    "emotional validation",
    "health instruction",
    "communication barrier"
  ],
  "Healthcare Ethics": [
    "confidentiality",
    "informed consent",
    "scope of practice",
    "professional boundary",
    "patient autonomy",
    "beneficence",
    "nonmaleficence",
    "justice",
    "privacy",
    "mandatory reporting",
    "conflict of interest",
    "documentation",
    "ethical dilemma",
    "respect",
    "accountability"
  ],
  "Public Health": [
    "population health",
    "epidemiology",
    "prevention",
    "risk communication",
    "vaccination",
    "community resource",
    "health campaign",
    "incidence",
    "prevalence",
    "social determinant",
    "outbreak",
    "screening program",
    "health equity",
    "surveillance",
    "credible source"
  ],
  "Clinical Skills": [
    "hand hygiene",
    "standard precautions",
    "patient identification",
    "pulse",
    "respiratory rate",
    "temperature",
    "blood pressure",
    "personal protective equipment",
    "sterile field",
    "measurement accuracy",
    "room preparation",
    "documentation",
    "safety checklist",
    "equipment cleaning",
    "reporting abnormal findings"
  ],
  "Body Systems": [
    "cardiovascular system",
    "respiratory system",
    "integumentary system",
    "endocrine system",
    "lymphatic system",
    "urinary system",
    "reproductive system",
    "immune response",
    "homeostatic balance",
    "organ system interaction"
  ],
  "Infection Control": [
    "chain of infection",
    "hand hygiene",
    "standard precautions",
    "transmission-based precautions",
    "personal protective equipment",
    "disinfection",
    "sterilization",
    "pathogen reservoir",
    "exposure control",
    "isolation protocol"
  ],
  "Vital Signs": [
    "pulse",
    "respiration",
    "blood pressure",
    "temperature",
    "oxygen saturation",
    "pain scale",
    "normal range",
    "baseline",
    "abnormal finding",
    "measurement technique"
  ],
  "Medical Abbreviations": [
    "BP",
    "HR",
    "RR",
    "PRN",
    "NPO",
    "BID",
    "TID",
    "STAT",
    "SOB",
    "ROM"
  ],
  "Emergency Care Basics": [
    "scene safety",
    "primary assessment",
    "airway",
    "breathing",
    "circulation",
    "bleeding control",
    "shock",
    "activation of EMS",
    "triage priority",
    "recovery position"
  ],
  Nutrition: [
    "macronutrient",
    "micronutrient",
    "hydration",
    "calorie",
    "balanced diet",
    "fiber",
    "protein",
    "electrolyte",
    "portion size",
    "dietary restriction"
  ],
  "Epidemiology Basics": [
    "incidence",
    "prevalence",
    "risk factor",
    "outbreak",
    "surveillance",
    "case definition",
    "transmission rate",
    "prevention strategy",
    "population sample",
    "public health data"
  ],
  "Healthcare Careers": [
    "scope of practice",
    "licensed professional",
    "medical assistant",
    "nurse",
    "physician",
    "pharmacist",
    "physical therapist",
    "public health worker",
    "interprofessional team",
    "professional credential"
  ],
  "Safety Procedures": [
    "patient identification",
    "fall prevention",
    "hazard communication",
    "sharps safety",
    "fire safety",
    "body mechanics",
    "incident report",
    "emergency exit",
    "equipment check",
    "safe transfer"
  ]
};

function decaDefinition(term: string, deck: string) {
  return `${term} is a ${deck.toLowerCase()} concept used to make a business recommendation more specific, measurable, and judge-ready.`;
}

function hosaDefinition(term: string, deck: string) {
  return `${term} is a ${deck.toLowerCase()} concept students should explain accurately, safely, and in plain language during health science practice.`;
}

function decaCardVariants(deck: string, term: string, index: number): Flashcard[] {
  const baseId = `deca-${slugify(deck)}-${slugify(term)}`;
  const shared = {
    organization: "DECA" as const,
    deck,
    deckSlug: `deca-${slugify(deck)}`,
    relatedSkills: [deck, index % 2 === 0 ? "Professional communication" : "Evidence-based reasoning"],
    tags: [deck, term, index % 2 === 0 ? "roleplay" : "case study"]
  };

  return [
    {
      ...shared,
      id: `${baseId}-concept`,
      term,
      definition: decaDefinition(term, deck),
      beginnerExplanation: `Use ${term} to make a ${deck} answer sound specific instead of generic.`,
      example: `In a ${deck} roleplay, mention ${term} when explaining the problem, recommendation, or metric.`,
      commonMistake: `Dropping the term without explaining how it changes the business decision.`,
      quickCheck: `How would ${term} help a judge see that your DECA answer is practical?`,
      quickCheckAnswer: `It connects the recommendation to a clear business purpose, audience, or measurable outcome.`,
      difficulty: "BEGINNER"
    },
    {
      ...shared,
      id: `${baseId}-application`,
      term: `${term} application`,
      definition: `Applying ${term} means using it to justify a specific recommendation, not just naming it.`,
      beginnerExplanation: `Judges reward the connection between the concept and the action you recommend.`,
      example: `If the prompt asks for a pricing plan, explain how ${term} changes the price, customer response, or margin.`,
      commonMistake: `Making a recommendation first and only adding ${term} afterward as decoration.`,
      quickCheck: `What should come after naming ${term} in a roleplay answer?`,
      quickCheckAnswer: `Explain the business effect, tradeoff, or metric that proves the recommendation works.`,
      difficulty: "INTERMEDIATE"
    },
    {
      ...shared,
      id: `${baseId}-mistake`,
      term: `${term} common mistake`,
      definition: `A common mistake with ${term} is using it too broadly without a measurable business outcome.`,
      beginnerExplanation: `A strong answer turns the term into a decision the judge can score.`,
      example: `Instead of saying "${term} matters," say which stakeholder it affects and what result should improve.`,
      commonMistake: `Overpromising results or ignoring cost, risk, timing, or customer fit.`,
      quickCheck: `How can you make a weak ${term} answer stronger?`,
      quickCheckAnswer: `Add the stakeholder, the action, the reason, and one metric or tradeoff.`,
      difficulty: "ELITE"
    }
  ];
}

function hosaCardVariants(deck: string, term: string, index: number): Flashcard[] {
  const baseId = `hosa-${slugify(deck)}-${slugify(term)}`;
  const shared = {
    organization: "HOSA" as const,
    deck,
    deckSlug: `hosa-${slugify(deck)}`,
    relatedSkills: [deck, index % 2 === 0 ? "Patient communication" : "Professionalism"],
    tags: [deck, term, index % 2 === 0 ? "scenario" : "safety"]
  };

  return [
    {
      ...shared,
      id: `${baseId}-concept`,
      term,
      definition: hosaDefinition(term, deck),
      beginnerExplanation: `Start by explaining ${term} accurately, then connect it to safe communication or care.`,
      example: `In a ${deck} scenario, use ${term} only when it improves accuracy and patient understanding.`,
      commonMistake: `Using clinical vocabulary without translating it into plain language when the patient needs clarity.`,
      quickCheck: `How would you explain ${term} to a patient or judge in one clear sentence?`,
      quickCheckAnswer: `Use plain language, avoid overclaiming, and connect the term to the safest next step.`,
      difficulty: "BEGINNER"
    },
    {
      ...shared,
      id: `${baseId}-application`,
      term: `${term} application`,
      definition: `Applying ${term} means choosing the safest next action while staying within your role.`,
      beginnerExplanation: `HOSA scenarios often test whether you can use knowledge professionally, not just define it.`,
      example: `If ${term} appears in a scenario, explain what it means and what a student competitor should do next.`,
      commonMistake: `Jumping to diagnosis or treatment instead of communication, safety, or escalation.`,
      quickCheck: `What makes a ${term} response professional?`,
      quickCheckAnswer: `It is accurate, clear, safe, respectful, and within the competitor's scope.`,
      difficulty: "INTERMEDIATE"
    },
    {
      ...shared,
      id: `${baseId}-mistake`,
      term: `${term} common mistake`,
      definition: `A common mistake with ${term} is being technically correct but unsafe or unclear in the scenario.`,
      beginnerExplanation: `The best answer balances knowledge with patient safety and professionalism.`,
      example: `Name the concern, explain it simply, and refer to the appropriate licensed professional when needed.`,
      commonMistake: `Ignoring patient understanding, privacy, hand hygiene, consent, or escalation steps.`,
      quickCheck: `How can you improve a weak ${term} answer?`,
      quickCheckAnswer: `Add a safety step, plain-language explanation, and appropriate referral or follow-up.`,
      difficulty: "ELITE"
    }
  ];
}

function buildFlashcards() {
  const decaCards = Object.entries(decaTerms).flatMap(([deck, terms]) =>
    terms.flatMap((term, index) => decaCardVariants(deck, term, index))
  );

  const hosaCards = Object.entries(hosaTerms).flatMap(([deck, terms]) =>
    terms.flatMap((term, index) => hosaCardVariants(deck, term, index))
  );

  return [...decaCards, ...hosaCards];
}

export const FLASHCARDS = buildFlashcards();

export const RESOURCE_VIDEOS: ResourceVideo[] = [
  {
    id: "official-deca-competitive-events",
    title: "Official DECA competitive events hub",
    topic: "Event families, exam blueprints, roleplays, case studies, and preparation resources",
    sourceName: "DECA",
    estimatedDuration: "Reference page",
    url: "https://www.deca.org/compete",
    organization: "DECA",
    skillTags: ["Performance indicators", "Roleplay", "Exam blueprint", "Business Management", "Marketing", "Finance"],
    followUp: "mastery check"
  },
  {
    id: "official-deca-performance-indicators",
    title: "Official DECA performance indicators",
    topic: "Performance indicator language for roleplays and case recommendations",
    sourceName: "DECA",
    estimatedDuration: "Reference page",
    url: "https://www.deca.org/compete/performance-indicators",
    organization: "DECA",
    skillTags: ["Performance indicators", "Professional communication", "Roleplay"],
    followUp: "explain it back"
  },
  {
    id: "official-hosa-guidelines",
    title: "Official HOSA event guidelines",
    topic: "Event guideline reference for HOSA categories and competition expectations",
    sourceName: "HOSA",
    estimatedDuration: "Reference page",
    url: "https://hosa.org/guidelines/",
    organization: "HOSA",
    skillTags: ["Clinical Skills", "Medical Terminology", "Healthcare Ethics", "Patient Communication"],
    followUp: "mastery check"
  },
  {
    id: "ka-economics",
    title: "Khan Academy economics and finance unit",
    topic: "Economics, finance, market reasoning",
    sourceName: "Khan Academy",
    estimatedDuration: "Self-paced unit",
    url: "https://www.khanacademy.org/economics-finance-domain",
    organization: "DECA",
    skillTags: ["Finance", "Business Management", "Personal Financial Literacy"],
    followUp: "quick quiz"
  },
  {
    id: "ka-personal-finance",
    title: "Khan Academy personal finance unit",
    topic: "Budgeting, credit, saving, financial choices",
    sourceName: "Khan Academy",
    estimatedDuration: "Self-paced unit",
    url: "https://www.khanacademy.org/college-careers-more/personal-finance",
    organization: "DECA",
    skillTags: ["Personal Financial Literacy", "Finance"],
    followUp: "flashcards"
  },
  {
    id: "yt-deca-marketing",
    title: "Search: DECA marketing performance indicators",
    topic: "Marketing roleplay vocabulary and indicators",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+marketing+performance+indicators+roleplay",
    organization: "DECA",
    skillTags: ["Marketing", "Performance indicators", "Roleplay"],
    followUp: "explain it back"
  },
  {
    id: "yt-deca-entrepreneurship",
    title: "Search: DECA entrepreneurship roleplay practice",
    topic: "Entrepreneurship case structure",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+entrepreneurship+roleplay+practice",
    organization: "DECA",
    skillTags: ["Entrepreneurship", "Feasibility", "Pitch"],
    followUp: "mastery check"
  },
  {
    id: "yt-deca-finance",
    title: "Search: DECA finance roleplay practice",
    topic: "Cash flow, margins, credit, and financial reasoning",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+finance+roleplay+practice+cash+flow+margin",
    organization: "DECA",
    skillTags: ["Finance", "Financial analysis", "Personal Financial Literacy"],
    followUp: "quick quiz"
  },
  {
    id: "yt-deca-management",
    title: "Search: DECA business management case study",
    topic: "Operations, HR, customer relations, and business reasoning",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=DECA+business+management+case+study+roleplay",
    organization: "DECA",
    skillTags: ["Business Management", "Operations", "Human resources"],
    followUp: "explain it back"
  },
  {
    id: "ka-health",
    title: "Khan Academy health and medicine unit",
    topic: "Human body systems and health science foundations",
    sourceName: "Khan Academy",
    estimatedDuration: "Self-paced unit",
    url: "https://www.khanacademy.org/science/health-and-medicine",
    organization: "HOSA",
    skillTags: ["Anatomy and Physiology", "Health Science Concepts"],
    followUp: "quick quiz"
  },
  {
    id: "yt-hosa-medical-terms",
    title: "Search: medical terminology basics",
    topic: "Prefixes, suffixes, and common clinical terms",
    sourceName: "YouTube",
    estimatedDuration: "6-12 min videos",
    url: "https://www.youtube.com/results?search_query=medical+terminology+basics+prefix+suffix+root",
    organization: "HOSA",
    skillTags: ["Medical Terminology"],
    followUp: "flashcards"
  },
  {
    id: "yt-hosa-patient-communication",
    title: "Search: patient communication teach-back",
    topic: "Patient communication and plain-language checks",
    sourceName: "YouTube",
    estimatedDuration: "6-12 min videos",
    url: "https://www.youtube.com/results?search_query=patient+communication+teach+back+healthcare",
    organization: "HOSA",
    skillTags: ["Patient Communication", "Healthcare Ethics"],
    followUp: "explain it back"
  },
  {
    id: "yt-hosa-anatomy",
    title: "Search: anatomy and physiology body systems overview",
    topic: "Body systems, structure/function, and physiology reasoning",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=anatomy+and+physiology+body+systems+overview",
    organization: "HOSA",
    skillTags: ["Anatomy and Physiology", "Body Systems", "Vital Signs"],
    followUp: "quick quiz"
  },
  {
    id: "yt-hosa-public-health",
    title: "Search: public health basics epidemiology",
    topic: "Outbreaks, prevention, incidence, prevalence, and risk communication",
    sourceName: "YouTube",
    estimatedDuration: "8-15 min videos",
    url: "https://www.youtube.com/results?search_query=public+health+basics+epidemiology+incidence+prevalence",
    organization: "HOSA",
    skillTags: ["Public Health", "Epidemiology Basics", "Prevention"],
    followUp: "explain it back"
  },
  {
    id: "yt-hosa-ethics",
    title: "Search: healthcare ethics patient privacy consent",
    topic: "Confidentiality, consent, boundaries, and professional communication",
    sourceName: "YouTube",
    estimatedDuration: "6-12 min videos",
    url: "https://www.youtube.com/results?search_query=healthcare+ethics+patient+privacy+consent+communication",
    organization: "HOSA",
    skillTags: ["Healthcare Ethics", "Patient Communication", "Professionalism"],
    followUp: "mastery check"
  },
  {
    id: "yt-debate-refutation",
    title: "Search: debate refutation drills",
    topic: "Refutation, rebuttal, and clash",
    sourceName: "YouTube",
    estimatedDuration: "5-12 min videos",
    url: "https://www.youtube.com/results?search_query=debate+refutation+rebuttal+clash+tutorial",
    organization: "DEBATE",
    skillTags: ["Refutation", "Clash", "Rebuttal"],
    followUp: "writing practice"
  },
  {
    id: "yt-debate-weighing",
    title: "Search: weighing arguments in debate",
    topic: "Impact comparison and ballot writing",
    sourceName: "YouTube",
    estimatedDuration: "5-12 min videos",
    url: "https://www.youtube.com/results?search_query=weighing+arguments+debate+magnitude+probability+timeframe",
    organization: "DEBATE",
    skillTags: ["Weighing", "Persuasion", "Organization"],
    followUp: "writing practice"
  },
  {
    id: "yt-debate-signposting",
    title: "Search: signposting in debate speeches",
    topic: "Speech structure and flow clarity",
    sourceName: "YouTube",
    estimatedDuration: "5-10 min videos",
    url: "https://www.youtube.com/results?search_query=signposting+debate+speech+organization",
    organization: "DEBATE",
    skillTags: ["Signposting", "Organization"],
    followUp: "mastery check"
  }
];

export function deckSummaries() {
  const decks = new Map<string, { deck: string; deckSlug: string; organization: "DECA" | "HOSA"; count: number }>();

  for (const card of FLASHCARDS) {
    const existing = decks.get(card.deckSlug);
    decks.set(card.deckSlug, {
      deck: card.deck,
      deckSlug: card.deckSlug,
      organization: card.organization,
      count: (existing?.count ?? 0) + 1
    });
  }

  return Array.from(decks.values());
}

export function flashcardsForDeck(deckSlug: string) {
  return FLASHCARDS.filter((card) => card.deckSlug === deckSlug);
}

export function recommendedResources(input: { organization?: StudyOrganization; skillTags?: string[]; limit?: number }) {
  const tags = (input.skillTags ?? []).map((tag) => tag.toLowerCase());
  const matches = RESOURCE_VIDEOS.filter((resource) => {
    const organizationMatches = !input.organization || resource.organization === input.organization || resource.organization === "GENERAL";
    const tagMatches =
      tags.length === 0 ||
      resource.skillTags.some((tag) => tags.some((requested) => tag.toLowerCase().includes(requested) || requested.includes(tag.toLowerCase())));

    return organizationMatches && tagMatches;
  });

  return (matches.length > 0 ? matches : RESOURCE_VIDEOS).slice(0, input.limit ?? 3);
}

export function studyDeckForSkill(skillTag: string, organization: "DECA" | "HOSA") {
  const normalized = skillTag.toLowerCase();
  const match = deckSummaries().find(
    (deck) => deck.organization === organization && (deck.deck.toLowerCase().includes(normalized) || normalized.includes(deck.deck.toLowerCase()))
  );

  return match ?? deckSummaries().find((deck) => deck.organization === organization);
}
