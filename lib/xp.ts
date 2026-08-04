import type { Prisma, Rank } from "@prisma/client";
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

/**
 * Award XP inside an existing transaction, atomically (M13E2 Phase C1).
 *
 * Every XP writer in this codebase currently reads `User.xp`, adds to it in JavaScript, and writes
 * the sum back as an absolute value. Two of those reads are unlocked, so a row lock elsewhere does
 * NOT protect them: a plain SELECT never blocks under MVCC, so a writer can read 100, wait for
 * another transaction to commit 110, and then write 150 — erasing the other award. Ordering the
 * write does not repair a value that was already stale when it was read.
 *
 * `{ increment }` re-reads the row at write time under a row-exclusive lock, so no stale value can
 * be written at all, and rank is derived from the value the increment RETURNED rather than from
 * anything read earlier. That lock is held to commit, so nothing can change the row between the two
 * statements. Both must therefore live in one transaction — a failed rank update rolls back the
 * increment with it.
 *
 * Deliberately does NOT touch `wins` or `streak`: those are route-specific policy, and their own
 * staleness is a separate pre-existing defect that this helper does not claim to fix.
 * No XP amount changes here — callers pass the amount their route already awarded.
 */
export async function awardXpInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number
): Promise<{ xp: number; rank: Rank }> {
  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: amount } },
    select: { xp: true }
  });

  const rank = calculateRank(updatedUser.xp);

  await tx.user.update({
    where: { id: userId },
    data: { rank }
  });

  return { xp: updatedUser.xp, rank };
}
