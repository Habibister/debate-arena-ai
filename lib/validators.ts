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
export const practiceModeSchema = z.enum(["DEBATE", "ROLEPLAY", "TEST", "LESSON"]);
export const debateFormatSchema = z.enum(["PARLIAMENTARY", "QUICK_1V1", "PUBLIC_FORUM", "PRACTICE_REBUTTAL", "CUSTOM"]);
export const debateSideChoiceSchema = z.enum(["GOVERNMENT", "OPPOSITION", "FOR", "AGAINST", "RANDOM"]);

const transcriptSchema = z.array(
  z.object({
    role: z.enum(["AFFIRMATIVE", "NEGATIVE", "MODERATOR", "JUDGE", "SYSTEM"]),
    round: z.number().int().min(1),
    content: z.string().min(1)
  })
);

export const topicRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  eventType: z.string().min(2).max(120).optional(),
  practiceMode: practiceModeSchema.optional(),
  focusArea: z.string().max(120).optional(),
  previousTopics: z.array(z.string().min(1).max(300)).max(25).optional()
});

export const opponentRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  eventType: z.string().min(2).max(120).optional(),
  practiceMode: practiceModeSchema.optional(),
  topic: z.string().min(8),
  side: z.enum(["AFFIRMATIVE", "NEGATIVE"]),
  round: z.number().int().min(1).max(10),
  transcript: transcriptSchema
});

export const judgeRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  eventType: z.string().min(2).max(120).default("PARLIAMENTARY_DEBATE"),
  topic: z.string().min(8),
  transcript: transcriptSchema.min(3)
});

export const roleplayJudgeRequestSchema = z.object({
  organization: z.enum(["DECA", "HOSA"]),
  level: levelSchema,
  eventType: z.string().min(2).max(120),
  scenario: z.string().min(8),
  transcript: transcriptSchema.min(1)
});

export const practiceQuestionRequestSchema = z.object({
  organization: z.enum(["DECA", "HOSA"]),
  eventType: z.string().min(2).max(120),
  eventCluster: z.string().min(2).max(120).optional(),
  difficulty: levelSchema,
  count: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
});

export const lessonContentRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  skillName: z.string().min(2).max(80)
});

export const recommendationRequestSchema = z.object({
  organization: organizationSchema,
  eventType: z.string().min(2).max(120).optional(),
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
  eventType: z.string().min(2).max(120).optional(),
  currentLevel: levelSchema,
  recentScores: z.array(z.number().min(0).max(100)).min(1),
  weaknessSummary: z.array(z.string()).default([])
});

export const debateCreateSchema = z.object({
  organization: organizationSchema,
  eventType: z.string().min(2).max(120),
  practiceMode: practiceModeSchema,
  format: debateFormatSchema.default("PARLIAMENTARY"),
  category: z.string().min(2).max(80).default("Global"),
  level: levelSchema,
  topic: z.string().min(8),
  aiGeneratedTopic: z.boolean().default(false),
  turnTimeSeconds: z.number().int().min(30).max(600).optional(),
  prepTimeSeconds: z.number().int().min(0).max(900).optional(),
  side: debateSideChoiceSchema.default("GOVERNMENT"),
  mode: z.enum(["AI", "REAL_STUDENT"]),
  opponentUserId: z.string().optional(),
  aiPersona: z.string().min(2).max(80).optional()
});

export const practiceTestCreateSchema = z.object({
  organization: z.enum(["DECA", "HOSA"]),
  eventType: z.string().min(2).max(120),
  eventCluster: z.string().min(2).max(120).optional(),
  difficulty: levelSchema,
  questionCount: z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)])
});

export const practiceTestGradeSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedAnswer: z.string().min(1)
    })
  ).min(1)
});

export const teamCreateSchema = z.object({
  name: z.string().min(2).max(80),
  organization: organizationSchema
});

export const debateMessageCreateSchema = z.object({
  role: z.enum(["AFFIRMATIVE", "NEGATIVE", "MODERATOR", "JUDGE", "SYSTEM"]),
  round: z.number().int().min(1).max(10),
  speechKey: z.string().min(1).max(80).optional(),
  content: z.string().min(1).max(8000)
});

export const opponentTurnRequestSchema = z.object({
  side: z.enum(["AFFIRMATIVE", "NEGATIVE"]).default("NEGATIVE"),
  round: z.number().int().min(1).max(10),
  speechKey: z.string().min(1).max(80).optional()
});

export const matchmakingRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  ageGroup: z.string().max(80).optional()
});

const optionalCleanString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .transform((value) => (value.length > 0 ? value : null))
    .optional();

// Accepts either an uploaded avatar path ("/uploads/avatars/<file>") or a bounded hosted URL.
// Rejects data: URLs and oversized strings so avatar data never bloats the cookie/JWT (HTTP 431).
const AVATAR_UPLOAD_PATH = /^\/uploads\/avatars\/[A-Za-z0-9._-]+$/;
const avatarValueSchema = z
  .union([
    z.literal(""),
    z.string().trim().regex(AVATAR_UPLOAD_PATH, "Upload a valid image."),
    z
      .string()
      .trim()
      .max(300, "That image URL is too long.")
      .url("Use a valid image URL.")
      .refine((value) => !value.toLowerCase().startsWith("data:"), "Use a hosted image, not embedded image data.")
  ])
  .transform((value) => (value ? value : null))
  .optional();

export const profileUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Choose a username with at least 3 characters.")
    .max(24, "Keep usernames to 24 characters or fewer.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, and underscores.")
    .transform((value) => value.toLowerCase()),
  displayName: z
    .string()
    .trim()
    .min(2, "Add a display name.")
    .max(80, "Keep display names to 80 characters or fewer."),
  avatarUrl: avatarValueSchema,
  bio: optionalCleanString(280),
  schoolOrClub: optionalCleanString(120),
  preferredOrganization: organizationSchema.nullable().optional(),
  level: levelSchema
});

export const signupSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email address.").max(160).transform((value) => value.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters.").max(120),
    confirmPassword: z.string().min(8, "Confirm your password."),
    username: z
      .string()
      .trim()
      .min(3, "Choose a username with at least 3 characters.")
      .max(24, "Keep usernames to 24 characters or fewer.")
      .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, and underscores.")
      .transform((value) => value.toLowerCase()),
    displayName: z
      .string()
      .trim()
      .min(2, "Add a display name.")
      .max(80, "Keep display names to 80 characters or fewer."),
    avatarUrl: avatarValueSchema,
    schoolOrClub: optionalCleanString(120),
    preferredOrganization: organizationSchema.nullable().optional(),
    // Self-signup may only create a student or coach account — never an admin.
    accountType: z.enum(["STUDENT", "COACH"]).default("STUDENT")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });
