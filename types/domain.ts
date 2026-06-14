import type { Level, Organization } from "@prisma/client";

export type DebateSetup = {
  organization: Organization;
  level: Level;
  topic?: string;
  mode: "AI" | "REAL_STUDENT";
};

export type JudgeScore = {
  label: string;
  score: number;
};

export type MasteryPoint = {
  skill: string;
  mastery: number;
  trend: "up" | "flat" | "down";
};
