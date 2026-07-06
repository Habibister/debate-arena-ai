// Model UN practice sandbox.
//
// HONESTY IS THE POINT HERE. We have NO sourced conference specification for Model UN yet — the
// registry spec is explicitly PLACEHOLDER. So nothing in this module may claim official procedure
// accuracy or a real conference's rubric. Everything reads as "practice mode": the committee
// mechanics (speakers list, caucus timer, motions) are honest procedural tools with no fake
// specificity, and every AI-generated line (country policy, judge feedback) is labeled AI-inferred.

export const MUN_PRACTICE_DISCLAIMER =
  "Practice sandbox — not an official simulator. Procedure here follows common Model UN conventions, not any specific conference's certified rules, and all generated content is AI-inferred, not verified fact.";

export type CommitteeType = "general-assembly" | "crisis" | "historical" | "security-council" | "custom";

export const COMMITTEE_TYPES: Array<{ id: CommitteeType; label: string; blurb: string }> = [
  { id: "general-assembly", label: "General Assembly", blurb: "Large committee, one-country-one-vote, resolution-focused." },
  { id: "crisis", label: "Crisis", blurb: "Fast-moving, directive-driven, individual character roles." },
  { id: "historical", label: "Historical", blurb: "Set at a past moment; decisions play against real history." },
  { id: "security-council", label: "Security Council", blurb: "Small body, P5 veto dynamics, high-stakes votes." },
  { id: "custom", label: "Custom", blurb: "Your own committee — define the body and agenda yourself." }
];

export type RulesProfile = "un-style" | "conference-specific" | "coach-created" | "beginner-simplified";

export const RULES_PROFILES: Array<{ id: RulesProfile; label: string; blurb: string }> = [
  { id: "un-style", label: "UN-style", blurb: "General UN4MUN-flavored conventions. Practice approximation, not certified." },
  { id: "conference-specific", label: "Conference-specific", blurb: "Placeholder — no real conference rules are loaded yet." },
  { id: "coach-created", label: "Coach-created", blurb: "Rules your coach defines. Coach tooling arrives later." },
  { id: "beginner-simplified", label: "Beginner-simplified", blurb: "Fewer motions, gentler pace — for learning the flow." }
];

// The four MUN performance dimensions from the master plan — used by the practice judge instead of
// borrowing DECA/debate rubric categories. These are practice dimensions, NOT an official rubric.
export type MunDimensionKey = "policy-consistency" | "diplomacy" | "coalition-building" | "procedural-accuracy";

export const MUN_DIMENSIONS: Array<{ key: MunDimensionKey; label: string; description: string }> = [
  { key: "policy-consistency", label: "Policy consistency", description: "Do positions stay true to the assigned country's likely interests?" },
  { key: "diplomacy", label: "Diplomacy", description: "Tone, professionalism, and constructive engagement with other delegates." },
  { key: "coalition-building", label: "Coalition building", description: "Forming blocs, finding shared interests, building support for ideas." },
  { key: "procedural-accuracy", label: "Procedural accuracy", description: "Correct use of motions, points, and the committee flow." }
];

// --- Committee simulator mechanics (pure, no AI, no fake data) --------------------------------

export type MotionKind =
  | "moderated-caucus"
  | "unmoderated-caucus"
  | "open-speakers-list"
  | "introduce-working-paper"
  | "move-to-vote";

export const MOTIONS: Array<{ id: MotionKind; label: string; needsDuration: boolean; needsTopic: boolean }> = [
  { id: "open-speakers-list", label: "Open the General Speakers List", needsDuration: false, needsTopic: false },
  { id: "moderated-caucus", label: "Motion for a moderated caucus", needsDuration: true, needsTopic: true },
  { id: "unmoderated-caucus", label: "Motion for an unmoderated caucus", needsDuration: true, needsTopic: false },
  { id: "introduce-working-paper", label: "Introduce a working paper", needsDuration: false, needsTopic: false },
  { id: "move-to-vote", label: "Move to voting procedure", needsDuration: false, needsTopic: false }
];

export type SpeakerEntry = { id: string; delegation: string };

export type CountryPolicyBrief = {
  country: string;
  topic: string;
  // Labeled inference (we have no sourced voting-record data), never presented as verified fact.
  inferredPosition: string[];
  negotiationStances: string[];
  likelyAllies: string[];
  likelyOpposition: string[];
  talkingPoints: string[];
  disclaimer: string; // always the AI-inferred honesty label
  fallbackNotice?: string;
};

export type MunDimensionScore = { key: MunDimensionKey; label: string; score: number; reason: string };

export type MunJudgeResult = {
  overallScore: number;
  dimensionScores: MunDimensionScore[];
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  disclaimer: string; // practice-mode label — not an official conference score
  fallbackNotice?: string;
};

export function fallbackCountryPolicyBrief(country: string, topic: string): CountryPolicyBrief {
  return {
    country,
    topic,
    inferredPosition: [
      `${country} would likely weigh its national interests and regional relationships on "${topic}" — confirm against real sources before relying on this.`
    ],
    negotiationStances: [
      "Open to compromise language that protects core interests.",
      "Seeks partners with aligned priorities before committing to a bloc."
    ],
    likelyAllies: ["Regional neighbors and traditional partners (verify per topic)."],
    likelyOpposition: ["States with directly competing interests (verify per topic)."],
    talkingPoints: ["Acknowledge the problem, state a principle, propose one concrete step."],
    disclaimer: "AI-inferred practice brief — not based on verified voting records or official policy.",
    fallbackNotice: "AI is temporarily unavailable, so this is a generic backup brief."
  };
}

export function fallbackMunJudge(): MunJudgeResult {
  return {
    overallScore: 74,
    dimensionScores: MUN_DIMENSIONS.map((d) => ({
      key: d.key,
      label: d.label,
      score: 74,
      reason: "Backup practice estimate — AI scoring was unavailable."
    })),
    strengths: ["Engaged with the committee flow", "Stayed in the delegate role"],
    weaknesses: ["Tie positions more explicitly to the assigned country's interests", "Use one more procedural motion correctly"],
    improvementAdvice: ["Open speeches with your country's principle, then your proposal.", "Name a potential ally before caucus ends."],
    disclaimer: "Practice-mode feedback on Model UN dimensions — not an official conference rubric or score.",
    fallbackNotice: "AI is temporarily unavailable, so this is a generic backup evaluation."
  };
}
