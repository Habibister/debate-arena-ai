import type { Level, Organization, Rank } from "@prisma/client";

export const ORGANIZATIONS: Array<{
  value: Organization;
  label: string;
  description: string;
}> = [
  {
    value: "DEBATE",
    label: "Debate",
    description: "Case writing, clash, weighing, cross examination, and judge persuasion."
  },
  {
    value: "MODEL_UN",
    label: "Model UN",
    description: "Diplomacy, position papers, resolutions, caucus strategy, and speeches."
  },
  {
    value: "DECA",
    label: "DECA",
    description: "Business roleplays, marketing, entrepreneurship, and exam readiness."
  },
  {
    value: "HOSA",
    label: "HOSA",
    description: "Medical terminology, health science, patient communication, and ethics."
  },
  {
    value: "MOCK_TRIAL",
    label: "Mock Trial",
    description: "Directs, crosses, objections, case theory, and courtroom delivery."
  },
  {
    value: "PUBLIC_SPEAKING",
    label: "Public Speaking",
    description: "Structure, delivery, clarity, confidence, and audience adaptation."
  }
];

export const LEVELS: Array<{
  value: Level;
  label: string;
  description: string;
}> = [
  {
    value: "BEGINNER",
    label: "Beginner",
    description: "Learn the structure, vocabulary, and baseline reps."
  },
  {
    value: "INTERMEDIATE",
    label: "Intermediate",
    description: "Build strategic depth, timing, adaptation, and consistency."
  },
  {
    value: "ELITE",
    label: "Elite",
    description: "Train national-level precision, speed, weighing, and polish."
  }
];

export const JUDGE_RUBRIC = [
  "Logic",
  "Evidence",
  "Rebuttal",
  "Persuasion",
  "Clarity",
  "Communication"
];

export const RANK_THRESHOLDS: Array<{ rank: Rank; minXp: number }> = [
  { rank: "BRONZE", minXp: 0 },
  { rank: "SILVER", minXp: 300 },
  { rank: "GOLD", minXp: 900 },
  { rank: "PLATINUM", minXp: 1800 },
  { rank: "DIAMOND", minXp: 3200 },
  { rank: "MASTER", minXp: 5000 }
];

export const XP_REWARDS = {
  debateCompleted: 25,
  debateWon: 50,
  lessonCompleted: 10,
  practiceTest: 20
} as const;
