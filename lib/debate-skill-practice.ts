import type { Level } from "@prisma/client";

export type DebateSkillScenario = {
  skillSlug: string;
  skillName: string;
  level: Level;
  prompt: string;
  motion: string;
  side: "FOR" | "AGAINST" | "GOVERNMENT" | "OPPOSITION";
  hint: string;
  modelExample: string;
  rubricFocus: string[];
};

export type DebateWritingFeedback = {
  score: number;
  rubric: Array<{ label: string; score: number; note: string }>;
  strengths: string[];
  missing: string[];
  sentenceSuggestions: string[];
  improvedVersion: string;
  modelExample: string;
  nextPrompt: string;
  weakSkills: string[];
};

type DebateWritingScenarioAlias = { name: string; focus: string[]; cue: string; weakSkill: string };

/**
 * One scenario per SKILL, then mapped onto every slug that names that skill.
 *
 * Writing practice is a property of the SKILL, not of an individual lesson step, which is why the
 * three `-1/-2/-3` lesson slugs of a skill share its scenario. Before this was made explicit, only
 * some slugs carried a key and `aliasFor` silently substituted the claim-building scenario for the
 * rest — so a learner practising Evidence, Refutation or Weighing was handed a claim-building
 * prompt. Every slug below now names its OWN skill; nothing is a stand-in for another skill.
 */
const CLAIM_BUILDING_SCENARIO: DebateWritingScenarioAlias = {
  name: "Claim, warrant, impact",
  focus: ["claim", "reasoning/warrant", "impact", "relevance"],
  cue: "Write one complete argument with a clear claim, warrant, and impact.",
  weakSkill: "Claim building"
};
const EVIDENCE_SCENARIO: DebateWritingScenarioAlias = {
  name: "Evidence and support",
  focus: ["evidence/support", "reasoning/warrant", "impact", "persuasiveness"],
  cue: "Support the argument with a realistic example, statistic type, or stakeholder impact.",
  weakSkill: "Evidence"
};
const REFUTATION_SCENARIO: DebateWritingScenarioAlias = {
  name: "Refutation",
  focus: ["refutation", "reasoning/warrant", "impact", "organization"],
  cue: "Use they say, but, because, therefore.",
  weakSkill: "Refutation"
};
const WEIGHING_SCENARIO: DebateWritingScenarioAlias = {
  name: "Weighing arguments",
  focus: ["impact", "persuasiveness", "comparison", "clarity"],
  cue: "Compare two impacts using magnitude, probability, timeframe, or reversibility.",
  weakSkill: "Weighing"
};

const skillAliases: Record<string, DebateWritingScenarioAlias> = {
  "debate-claim-building": CLAIM_BUILDING_SCENARIO,
  "debate-claim-building-1": CLAIM_BUILDING_SCENARIO,
  "debate-claim-building-2": CLAIM_BUILDING_SCENARIO,
  "debate-claim-building-3": CLAIM_BUILDING_SCENARIO,
  "debate-claim-warrant-impact": CLAIM_BUILDING_SCENARIO,
  "debate-evidence": EVIDENCE_SCENARIO,
  "debate-evidence-1": EVIDENCE_SCENARIO,
  "debate-evidence-2": EVIDENCE_SCENARIO,
  "debate-evidence-3": EVIDENCE_SCENARIO,
  "debate-signposting": {
    name: "Signposting",
    focus: ["organization/signposting", "clarity", "relevance", "flow"],
    cue: "Write a short response that clearly labels where the judge should put each point.",
    weakSkill: "Signposting"
  },
  "debate-clash": {
    name: "Clash",
    focus: ["relevance to motion", "refutation", "direct comparison", "persuasiveness"],
    cue: "Answer the opponent's main claim directly instead of repeating your case.",
    weakSkill: "Clash"
  },
  "debate-rebuttal": REFUTATION_SCENARIO,
  "debate-rebuttal-1": REFUTATION_SCENARIO,
  "debate-rebuttal-2": REFUTATION_SCENARIO,
  "debate-rebuttal-3": REFUTATION_SCENARIO,
  "debate-refutation": REFUTATION_SCENARIO,
  "debate-weighing": WEIGHING_SCENARIO,
  "debate-weighing-1": WEIGHING_SCENARIO,
  "debate-weighing-2": WEIGHING_SCENARIO,
  "debate-weighing-3": WEIGHING_SCENARIO,
  "debate-constructive-speeches": {
    name: "Constructive speeches",
    focus: ["organization", "claim", "contentions", "definitions"],
    cue: "Build a mini constructive with definitions and two contentions.",
    weakSkill: "Speech structure"
  },
  "debate-rebuttal-speeches": {
    name: "Rebuttal speeches",
    focus: ["refutation", "weighing", "organization", "no new arguments"],
    cue: "Collapse to the biggest voter and avoid new contentions.",
    weakSkill: "Rebuttal"
  },
  "debate-parliamentary-roles": {
    name: "Parliamentary debate roles",
    focus: ["role awareness", "organization", "clash", "rule awareness"],
    cue: "Write a role-appropriate speech move for Government or Opposition.",
    weakSkill: "Role awareness"
  },
  "debate-case-topic-definitions": {
    name: "Case topic and definitions",
    focus: ["definitions", "contentions", "fair clash", "organization"],
    cue: "Turn a broad resolution into a fair case topic with definitions and contentions.",
    weakSkill: "Definitions"
  }
};

const motions = [
  "Schools should require financial literacy before graduation.",
  "Students should be allowed to use AI tools after completing responsible-use training.",
  "Cities should prioritize youth public transit discounts over downtown parking subsidies.",
  "Public schools should replace some homework with supervised practice labs.",
  "Social media platforms should default teen accounts to stricter privacy settings.",
  "Community service should be required for graduation.",
  "Governments should fund preventive healthcare campaigns before expanding penalties for unhealthy behavior.",
  "Schools should teach legal rights and responsibilities as a required course.",
  "Local governments should include youth advisory councils in major policy decisions.",
  "Debate programs should prioritize beginner access over elite travel opportunities."
];

/**
 * Every slug that has a real, skill-appropriate Debate writing scenario.
 *
 * This is the single source of truth for WRITING-practice capability. It is deliberately NOT the
 * same question as "is this a known Debate skill" or "can this skill be drilled securely" — a skill
 * can be known and persisted and securely drillable while having no writing scenario at all.
 */
export const DEBATE_WRITING_SCENARIO_SLUGS: readonly string[] = Object.keys(skillAliases);

export function hasDebateWritingScenario(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(skillAliases, slug);
}

/**
 * FAIL CLOSED. A slug with no scenario of its own is a configuration error, never a silent
 * substitution: serving one skill's prompt under another skill's name is fake practice. Callers
 * must gate on `hasDebateWritingScenario` (which `debateWritingPracticeSupported` does) before
 * reaching here, so this throw is unreachable in a correctly configured tree — that is the point.
 */
function aliasFor(slug: string): DebateWritingScenarioAlias {
  const alias = skillAliases[slug];
  if (!alias) {
    throw new Error(
      `No Debate writing scenario is defined for "${slug}". Writing practice must not fall back to ` +
        `another skill's scenario. Either add a scenario for this slug or leave it unsupported.`
    );
  }
  return alias;
}

export function getDebateSkillScenario(slug: string, level: Level = "BEGINNER", scenarioIndex = 0): DebateSkillScenario {
  const alias = aliasFor(slug);
  const motion = motions[scenarioIndex % motions.length];
  const side = scenarioIndex % 2 === 0 ? "FOR" : "AGAINST";
  const levelPrompt: Record<Level, string> = {
    BEGINNER: "Keep it to 3-5 sentences and focus on clarity.",
    INTERMEDIATE: "Add comparison against the other side's best response.",
    ELITE: "Make the response ballot-ready with weighing and precise phrasing."
  };

  return {
    skillSlug: slug,
    skillName: alias.name,
    level,
    motion,
    side,
    prompt: `You are arguing ${side} the motion: ${motion} ${alias.cue} ${levelPrompt[level]}`,
    hint: `Start with a label. Then use the core move for ${alias.name}: ${alias.cue}`,
    modelExample: buildModelExample(alias.name, motion, side),
    rubricFocus: alias.focus
  };
}

function buildModelExample(skillName: string, motion: string, side: string) {
  if (skillName.toLowerCase().includes("weighing")) {
    return `This round turns on timeframe and reversibility. Even if the ${side === "FOR" ? "Against" : "For"} side wins a small short-term tradeoff, our impact happens sooner and is harder to reverse, so it should control the ballot on ${motion.toLowerCase()}`;
  }

  if (skillName.toLowerCase().includes("refutation")) {
    return `They say the plan is unrealistic, but that assumes schools must create a new class. Because the proposal can fit into existing advisory time, the implementation burden is smaller than their objection. Therefore, the judge should prefer our practical benefit on ${motion.toLowerCase()}`;
  }

  if (skillName.toLowerCase().includes("signposting")) {
    return `I have two answers on feasibility. First, on staffing: the plan uses existing advisory blocks. Second, on cost: reusable lesson modules keep implementation limited. That means the main objection does not outweigh the preparedness benefit.`;
  }

  return `We ${side.toLowerCase()} this motion because it gives students a practical skill they will use outside the classroom. The warrant is that students already make decisions in this area without enough guidance. The impact is fewer costly mistakes and stronger preparation for adult life.`;
}

function includesAny(response: string, terms: string[]) {
  const normalized = response.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function gradeDebateWritingResponse(input: {
  slug: string;
  level: Level;
  response: string;
  scenarioIndex?: number;
}): DebateWritingFeedback {
  const scenario = getDebateSkillScenario(input.slug, input.level, input.scenarioIndex ?? 0);
  const response = input.response.trim();
  const wordCount = response.split(/\s+/).filter(Boolean).length;
  const hasClaim = wordCount >= 8 && includesAny(response, ["should", "because", "therefore", "we ", "our "]);
  const hasWarrant = includesAny(response, ["because", "since", "this means", "the reason", "as a result"]);
  const hasImpact = includesAny(response, ["impact", "matters", "therefore", "outweigh", "benefit", "harm", "consequence"]);
  const hasEvidence = includesAny(response, ["for example", "data", "study", "students", "schools", "community", "metric"]);
  const hasOrganization = includesAny(response, ["first", "second", "on ", "therefore", "voter", "contention"]);
  const hasPersuasion = includesAny(response, ["outweigh", "prefer", "judge", "ballot", "more likely", "larger"]);
  const checks = [
    { label: "clarity", passed: wordCount >= 20 },
    { label: "claim", passed: hasClaim },
    { label: "reasoning/warrant", passed: hasWarrant },
    { label: "impact", passed: hasImpact },
    { label: "evidence/support", passed: hasEvidence },
    { label: "organization/signposting", passed: hasOrganization },
    { label: "persuasiveness", passed: hasPersuasion }
  ];
  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.min(96, Math.max(42, Math.round((passedCount / checks.length) * 100)));
  const weakSkills = checks.filter((check) => !check.passed).map((check) => check.label);

  return {
    score,
    rubric: checks.map((check) => ({
      label: check.label,
      score: check.passed ? 4 : 2,
      note: check.passed ? "Visible in the response." : "Needs a more explicit sentence."
    })),
    strengths: [
      hasClaim ? "You gave the judge a clear direction." : "You attempted a direct response to the prompt.",
      hasOrganization ? "Your structure is easy to follow." : "Your idea can become much stronger with labels."
    ],
    missing: weakSkills.length > 0 ? weakSkills.map((skill) => `Make ${skill} explicit.`) : ["No major missing elements detected."],
    sentenceSuggestions: [
      "Add one sentence that starts with 'Because...' to make the warrant visible.",
      "Add one sentence that starts with 'Therefore, the judge should...' to explain the impact.",
      "Use a signpost such as 'First, on feasibility' before your answer."
    ],
    improvedVersion: buildImprovedVersion(response, scenario),
    modelExample: scenario.modelExample,
    nextPrompt: getDebateSkillScenario(input.slug, input.level, (input.scenarioIndex ?? 0) + 1).prompt,
    weakSkills
  };
}

function buildImprovedVersion(response: string, scenario: DebateSkillScenario) {
  if (response.length > 40) {
    return `${response.replace(/\s+/g, " ").trim()} Therefore, this matters because it gives the judge a concrete reason to prefer our side on the central clash.`;
  }

  return scenario.modelExample;
}
