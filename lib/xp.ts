import type { Rank } from "@prisma/client";
import { RANK_THRESHOLDS, XP_REWARDS } from "@/lib/constants";
import { ratingLabel } from "@/lib/ai-personas";

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

export function calculateDebateRating(input: { xp?: number | null; wins?: number | null; judgedDebates?: number | null }) {
  const xp = input.xp ?? 0;
  const wins = input.wins ?? 0;
  const judgedDebates = input.judgedDebates ?? 0;
  return Math.max(400, Math.min(2300, Math.round(600 + xp / 6 + wins * 18 + judgedDebates * 6)));
}

export function debateRatingProgress(rating: number) {
  const floors = [400, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300];
  const current = floors.reduce((floor, value) => (rating >= value ? value : floor), 400);
  const next = floors.find((floor) => floor > rating) ?? 2300;
  const percent = current === next ? 100 : Math.round(((rating - current) / (next - current)) * 100);

  return {
    label: ratingLabel(rating),
    currentLabel: ratingLabel(current),
    nextLabel: ratingLabel(next),
    current,
    next,
    pointsToNext: Math.max(next - rating, 0),
    percent: Math.max(0, Math.min(100, percent))
  };
}
