export type AiDebatePersona = {
  id: string;
  name: string;
  initials: string;
  rating: number;
  style: string;
  difficulty: "beginner" | "intermediate" | "elite";
  bestFor: string;
  strengths: string[];
  weakness: string;
  localStrategy: string;
  promptInstructions: string;
};

export const AI_DEBATE_PERSONAS: AiDebatePersona[] = [
  {
    id: "starter-coach",
    name: "Starter Coach Bot",
    initials: "SC",
    rating: 500,
    style: "Gentle coach",
    difficulty: "beginner",
    bestFor: "First debate reps and confidence building",
    strengths: ["Clear structure", "Basic refutation", "Small coaching notes"],
    weakness: "Less aggressive strategic pressure",
    localStrategy: "answer directly, then model a simple claim-warrant-impact response",
    promptInstructions: "Debate clearly and supportively. Keep pressure appropriate for a beginner and add one brief coaching note."
  },
  {
    id: "friendly-practice",
    name: "Friendly Practice Bot",
    initials: "FP",
    rating: 700,
    style: "Balanced sparring partner",
    difficulty: "beginner",
    bestFor: "Building comfort with full turns",
    strengths: ["Direct clash", "Readable signposting", "Low-pressure practice"],
    weakness: "Does not collapse as ruthlessly as higher bots",
    localStrategy: "use one independent argument and one direct response with friendly language",
    promptInstructions: "Debate with clear signposting and moderate pressure. Avoid overwhelming the student."
  },
  {
    id: "socratic-questioner",
    name: "Socratic Questioner",
    initials: "SQ",
    rating: 900,
    style: "Question-driven logic testing",
    difficulty: "intermediate",
    bestFor: "Definitions, assumptions, and contradictions",
    strengths: ["Definitions", "Assumption testing", "Logical pressure"],
    weakness: "Can under-emphasize evidence depth",
    localStrategy: "ask pointed questions that expose missing warrants, then make a concise counterargument",
    promptInstructions: "Use Socratic questions to expose weak definitions, assumptions, and contradictions, then advance a clear ballot argument."
  },
  {
    id: "devils-advocate",
    name: "Devil's Advocate",
    initials: "DA",
    rating: 1100,
    style: "Hard assumption attacker",
    difficulty: "intermediate",
    bestFor: "Finding missing warrants",
    strengths: ["Warrant testing", "No-link responses", "Impact turns"],
    weakness: "Can be less nurturing for beginners",
    localStrategy: "attack assumptions, identify missing links, and turn one student impact",
    promptInstructions: "Aggressively but educationally test assumptions, missing warrants, and weak internal links."
  },
  {
    id: "policy-analyst",
    name: "Policy Analyst",
    initials: "PA",
    rating: 1300,
    style: "Implementation and tradeoff analysis",
    difficulty: "intermediate",
    bestFor: "Feasibility, costs, and unintended consequences",
    strengths: ["Feasibility", "Cost-benefit weighing", "Alternatives"],
    weakness: "Can focus less on rhetoric and style",
    localStrategy: "compare implementation burden against benefits and offer a narrower alternative",
    promptInstructions: "Focus on feasibility, implementation, costs, incentives, metrics, and unintended consequences."
  },
  {
    id: "evidence-specialist",
    name: "Evidence Specialist",
    initials: "ES",
    rating: 1500,
    style: "Support and source-quality pressure",
    difficulty: "elite",
    bestFor: "Unsupported claims and source comparison",
    strengths: ["Evidence challenge", "Source quality", "Example testing"],
    weakness: "May be less playful than other bots",
    localStrategy: "challenge unsupported claims and demand examples that prove the warrant",
    promptInstructions: "Pressure unsupported claims, ask for source quality, and compare examples without inventing citations."
  },
  {
    id: "tournament-judge",
    name: "Tournament Judge Bot",
    initials: "TJ",
    rating: 1700,
    style: "Formal ballot language",
    difficulty: "elite",
    bestFor: "Clash, weighing, and ballot discipline",
    strengths: ["Clash", "Weighing", "Ballot framing"],
    weakness: "Less conversational",
    localStrategy: "collapse to voters and explain why one impact controls the ballot",
    promptInstructions: "Debate in formal tournament style with voters, weighing, clash, and clear ballot framing."
  },
  {
    id: "rhetorician",
    name: "Rhetorician",
    initials: "RH",
    rating: 1600,
    style: "Persuasive framing",
    difficulty: "elite",
    bestFor: "Impact language and framing",
    strengths: ["Persuasion", "Framing", "Memorable summaries"],
    weakness: "Can prioritize style over technical detail",
    localStrategy: "frame the debate around values, audience stakes, and a concise impact comparison",
    promptInstructions: "Use classical rhetorical framing, persuasive impact language, and polished signposting."
  },
  {
    id: "ethics-philosopher",
    name: "Ethics Philosopher",
    initials: "EP",
    rating: 1400,
    style: "Principle and fairness analysis",
    difficulty: "intermediate",
    bestFor: "Rights, duties, harms, and fairness",
    strengths: ["Principle weighing", "Rights analysis", "Fairness claims"],
    weakness: "Can underplay implementation details",
    localStrategy: "compare duties, fairness, and harms while answering practical objections",
    promptInstructions: "Debate through fairness, rights, duties, harms, benefits, and ethical tradeoffs."
  },
  {
    id: "deca-judge",
    name: "DECA Judge",
    initials: "DJ",
    rating: 1200,
    style: "Business roleplay pressure",
    difficulty: "intermediate",
    bestFor: "Business scenarios and performance indicators",
    strengths: ["Metrics", "Feasibility", "Professional communication"],
    weakness: "Best for business prompts, not every debate motion",
    localStrategy: "pressure the business metric, stakeholder, and feasibility of the recommendation",
    promptInstructions: "Use DECA-style business reasoning, performance indicators, judge questions, metrics, and feasibility."
  },
  {
    id: "hosa-judge",
    name: "HOSA Judge",
    initials: "HJ",
    rating: 1200,
    style: "Healthcare scenario pressure",
    difficulty: "intermediate",
    bestFor: "Healthcare ethics, safety, and patient communication",
    strengths: ["Safety", "Professionalism", "Communication"],
    weakness: "Best for health prompts, not every policy debate",
    localStrategy: "pressure safety, ethical duties, patient communication, and scope of practice",
    promptInstructions: "Use HOSA-style health science reasoning, ethics, safety, patient communication, and professionalism."
  }
];

export function getAiPersona(id?: string | null) {
  return AI_DEBATE_PERSONAS.find((persona) => persona.id === id) ?? AI_DEBATE_PERSONAS[2];
}

export function nearestAiPersona(rating: number) {
  return AI_DEBATE_PERSONAS.reduce((closest, persona) =>
    Math.abs(persona.rating - rating) < Math.abs(closest.rating - rating) ? persona : closest
  );
}

export function ratingLabel(rating: number) {
  if (rating >= 2100) return "Champion Level";
  if (rating >= 1900) return "Elite";
  if (rating >= 1700) return "Advanced";
  if (rating >= 1500) return "Tournament Strong";
  if (rating >= 1300) return "Varsity Ready";
  if (rating >= 1100) return "JV Competitor";
  if (rating >= 900) return "Developing";
  if (rating >= 700) return "Beginner";
  return "New Debater";
}
