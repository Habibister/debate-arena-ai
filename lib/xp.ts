import type { Rank } from "@prisma/client";
import { RANK_THRESHOLDS, XP_REWARDS } from "@/lib/constants";

export type XPRewardKey = keyof typeof XP_REWARDS;

export function calculateRank(xp: number): Rank {
  return RANK_THRESHOLDS.reduce<Rank>((current, threshold) => {
    return xp >= threshold.minXp ? threshold.rank : current;
  }, "BRONZE");
}

export function nextRankProgress(xp: number) {
  let currentIndex = 0;

  for (let index = 0; index < RANK_THRESHOLDS.length; index += 1) {
    if (xp >= RANK_THRESHOLDS[index].minXp) {
      currentIndex = index;
    }
  }

  const current = RANK_THRESHOLDS[Math.max(currentIndex, 0)];
  const next = RANK_THRESHOLDS[Math.min(currentIndex + 1, RANK_THRESHOLDS.length - 1)];

  if (current.rank === next.rank) {
    return { current, next, percent: 100 };
  }

  const percent = Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100);
  return { current, next, percent: Math.max(0, Math.min(percent, 100)) };
}
