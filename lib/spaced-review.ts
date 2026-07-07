import { prisma } from "@/lib/prisma";

// Spaced Reassessment v1 (Study Arcade review loop). Deliberately simple and honest:
// - passing practice advances an expanding-interval ladder (1d -> 3d -> 7d -> 14d, then stays 14d)
// - failing resets the ladder to 1 day
// - a skill only KEEPS its mastery if it survives reviews; the practice route knocks mastery down
//   when a due review is failed
// Every read/write is defensive: if the SkillReviewSchedule table is missing (fresh environment
// before db push), the review system degrades to "nothing due" instead of breaking pages.

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14] as const;

export function intervalDaysFor(reviewCount: number): number {
  return REVIEW_INTERVALS_DAYS[Math.min(Math.max(reviewCount, 0), REVIEW_INTERVALS_DAYS.length - 1)];
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// True when this skill's review was due at practice time — the practice route uses this to apply
// review semantics (failed due review = mastery knock-down) instead of normal practice semantics.
export async function isReviewDue(userId: string, skillId: string): Promise<boolean> {
  try {
    const row = await prisma.skillReviewSchedule.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { nextReviewAt: true }
    });
    return Boolean(row && row.nextReviewAt <= new Date());
  } catch {
    return false;
  }
}

// Called after every graded practice for a skill. Passing advances the ladder; failing resets it.
export async function recordPracticeOutcome(params: { userId: string; skillId: string; passed: boolean }): Promise<void> {
  const { userId, skillId, passed } = params;
  try {
    const existing = await prisma.skillReviewSchedule.findUnique({ where: { userId_skillId: { userId, skillId } } });
    const reviewCount = passed ? (existing?.reviewCount ?? 0) + 1 : 0;
    const nextReviewAt = daysFromNow(intervalDaysFor(reviewCount));
    const lastOutcome = passed ? "passed" : "failed";

    if (existing) {
      await prisma.skillReviewSchedule.update({
        where: { id: existing.id },
        data: { reviewCount, nextReviewAt, lastOutcome }
      });
    } else {
      await prisma.skillReviewSchedule.create({
        data: { userId, skillId, reviewCount, nextReviewAt, lastOutcome }
      });
    }
  } catch {
    // table not pushed yet — scheduling silently unavailable, never breaks practice
  }
}

export async function countDueReviews(userId: string): Promise<number> {
  try {
    return await prisma.skillReviewSchedule.count({ where: { userId, nextReviewAt: { lte: new Date() } } });
  } catch {
    return 0;
  }
}

export type DueReview = {
  skillId: string;
  skillName: string;
  skillSlug: string;
  organization: string;
  nextReviewAt: Date;
  reviewCount: number;
  masteryPercent: number;
  masteryLevel: string;
};

// Due reviews joined with skill + current mastery, for the review session page.
export async function getDueReviews(userId: string): Promise<DueReview[]> {
  try {
    const rows = await prisma.skillReviewSchedule.findMany({
      where: { userId, nextReviewAt: { lte: new Date() } },
      orderBy: { nextReviewAt: "asc" },
      take: 50
    });
    if (rows.length === 0) return [];

    const skillIds = rows.map((row) => row.skillId);
    const [skills, mastery] = await Promise.all([
      prisma.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true, name: true, slug: true, organization: true } }),
      prisma.masteryProgress.findMany({
        where: { userId, skillId: { in: skillIds } },
        select: { skillId: true, masteryPercent: true, masteryLevel: true }
      })
    ]);
    const skillById = new Map(skills.map((skill) => [skill.id, skill]));
    const masteryBySkill = new Map(mastery.map((m) => [m.skillId, m]));

    return rows.flatMap((row) => {
      const skill = skillById.get(row.skillId);
      if (!skill) return [];
      const progress = masteryBySkill.get(row.skillId);
      return [
        {
          skillId: row.skillId,
          skillName: skill.name,
          skillSlug: skill.slug,
          organization: skill.organization,
          nextReviewAt: row.nextReviewAt,
          reviewCount: row.reviewCount,
          masteryPercent: progress?.masteryPercent ?? 0,
          masteryLevel: progress?.masteryLevel ?? "NOT_STARTED"
        }
      ];
    });
  } catch {
    return [];
  }
}

// --- Drill mastery write (shared by concept-drill submit routes) ------------------------------
// Writes real MasteryProgress AND spaced review for one skill, consistently and honestly:
// - masteryPercent rises toward the demonstrated score, but a FAILED due review knocks it DOWN to
//   what was actually shown (mastery must survive review — no ratcheting past a failed reassessment)
// - resolves the skill by slug and no-ops gracefully if the skill isn't seeded yet (never fakes it)
// Returns whether it actually wrote (skill existed), so callers can report honestly.

function masteryLevelFor(score: number): "MASTERED" | "PRACTICING" | "LEARNING" {
  if (score >= 85) return "MASTERED";
  if (score >= 70) return "PRACTICING";
  return "LEARNING";
}

export async function recordDrillMastery(params: {
  userId: string;
  skillSlug: string;
  scorePercent: number;
  passed: boolean;
}): Promise<boolean> {
  const { userId, skillSlug, scorePercent, passed } = params;
  try {
    const skill = await prisma.skill.findUnique({ where: { slug: skillSlug }, select: { id: true } });
    if (!skill) return false; // skill not seeded — do not fabricate progress

    const dueForReview = await isReviewDue(userId, skill.id);
    const existing = await prisma.masteryProgress.findUnique({
      where: { userId_skillId: { userId, skillId: skill.id } },
      select: { id: true, masteryPercent: true }
    });
    // Failed DUE review => honest knock-down to the demonstrated score; otherwise ratchet up.
    const nextMastery =
      dueForReview && !passed
        ? Math.min(existing?.masteryPercent ?? 0, scorePercent)
        : Math.min(100, Math.max(existing?.masteryPercent ?? 0, scorePercent));

    if (existing) {
      await prisma.masteryProgress.update({
        where: { id: existing.id },
        data: {
          masteryLevel: masteryLevelFor(nextMastery),
          masteryPercent: nextMastery,
          correctCount: { increment: passed ? 1 : 0 },
          incorrectCount: { increment: passed ? 0 : 1 },
          lastPracticedAt: new Date()
        }
      });
    } else {
      await prisma.masteryProgress.create({
        data: {
          userId,
          skillId: skill.id,
          masteryLevel: masteryLevelFor(nextMastery),
          masteryPercent: nextMastery,
          correctCount: passed ? 1 : 0,
          incorrectCount: passed ? 0 : 1,
          lastPracticedAt: new Date()
        }
      });
    }

    await recordPracticeOutcome({ userId, skillId: skill.id, passed });
    return true;
  } catch {
    // never break practice if the write fails
    return false;
  }
}
