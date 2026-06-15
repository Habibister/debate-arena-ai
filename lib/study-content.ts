export type StudyOrganization = "DECA" | "HOSA" | "DEBATE";

export type Flashcard = {
  id: string;
  organization: Exclude<StudyOrganization, "DEBATE">;
  deck: string;
  deckSlug: string;
  term: string;
  definition: string;
  example: string;
  quickCheck: string;
  quickCheckAnswer: string;
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
  ]
};

function decaDefinition(term: string, deck: string) {
  return `${term} is a ${deck.toLowerCase()} concept used to make a business recommendation more specific, measurable, and judge-ready.`;
}

function hosaDefinition(term: string, deck: string) {
  return `${term} is a ${deck.toLowerCase()} concept students should explain accurately, safely, and in plain language during health science practice.`;
}

function buildFlashcards() {
  const decaCards = Object.entries(decaTerms).flatMap(([deck, terms]) =>
    terms.map((term, index): Flashcard => ({
      id: `deca-${slugify(deck)}-${slugify(term)}`,
      organization: "DECA",
      deck,
      deckSlug: `deca-${slugify(deck)}`,
      term,
      definition: decaDefinition(term, deck),
      example: `In a ${deck} roleplay, mention ${term} when explaining the problem, recommendation, or metric.`,
      quickCheck: `How would ${term} help a judge see that your DECA answer is practical?`,
      quickCheckAnswer: `It connects the recommendation to a clear business purpose, audience, or measurable outcome.`,
      relatedSkills: [deck, index % 2 === 0 ? "Professional communication" : "Evidence-based reasoning"]
    }))
  );

  const hosaCards = Object.entries(hosaTerms).flatMap(([deck, terms]) =>
    terms.map((term, index): Flashcard => ({
      id: `hosa-${slugify(deck)}-${slugify(term)}`,
      organization: "HOSA",
      deck,
      deckSlug: `hosa-${slugify(deck)}`,
      term,
      definition: hosaDefinition(term, deck),
      example: `In a ${deck} scenario, use ${term} only when it improves accuracy and patient understanding.`,
      quickCheck: `How would you explain ${term} to a patient or judge in one clear sentence?`,
      quickCheckAnswer: `Use plain language, avoid overclaiming, and connect the term to the safest next step.`,
      relatedSkills: [deck, index % 2 === 0 ? "Patient communication" : "Professionalism"]
    }))
  );

  return [...decaCards, ...hosaCards];
}

export const FLASHCARDS = buildFlashcards();

export const RESOURCE_VIDEOS: ResourceVideo[] = [
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
