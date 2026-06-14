import { z } from "zod";

export const organizationSchema = z.enum([
  "DEBATE",
  "MODEL_UN",
  "DECA",
  "HOSA",
  "MOCK_TRIAL",
  "PUBLIC_SPEAKING"
]);

export const levelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ELITE"]);

export const topicRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  focusArea: z.string().max(120).optional()
});

export const opponentRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  topic: z.string().min(8),
  side: z.enum(["AFFIRMATIVE", "NEGATIVE"]),
  round: z.number().int().min(1).max(10),
  transcript: z.array(
    z.object({
      role: z.enum(["AFFIRMATIVE", "NEGATIVE", "MODERATOR", "JUDGE", "SYSTEM"]),
      round: z.number().int().min(1),
      content: z.string().min(1)
    })
  )
});

export const judgeRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  topic: z.string().min(8),
  transcript: opponentRequestSchema.shape.transcript.min(3)
});

export const practiceQuestionRequestSchema = z.object({
  organization: z.enum(["DECA", "HOSA"]),
  difficulty: levelSchema,
  count: z.union([z.literal(10), z.literal(25), z.literal(50)])
});

export const lessonContentRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  skillName: z.string().min(2).max(80)
});

export const recommendationRequestSchema = z.object({
  organization: organizationSchema,
  weaknesses: z.array(z.string().min(2)).min(1),
  availableLessons: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      skill: z.string()
    })
  )
});

export const readinessRequestSchema = z.object({
  organization: organizationSchema,
  currentLevel: levelSchema,
  recentScores: z.array(z.number().min(0).max(100)).min(1),
  weaknessSummary: z.array(z.string()).default([])
});

export const debateCreateSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  topic: z.string().min(8),
  mode: z.enum(["AI", "REAL_STUDENT"]),
  opponentUserId: z.string().optional()
});

export const practiceTestCreateSchema = z.object({
  organization: z.enum(["DECA", "HOSA"]),
  difficulty: levelSchema,
  questionCount: z.union([z.literal(10), z.literal(25), z.literal(50)])
});

export const teamCreateSchema = z.object({
  name: z.string().min(2).max(80),
  organization: organizationSchema
});
