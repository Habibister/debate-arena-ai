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
export const assignmentTypeSchema = z.enum([
  "DEBATE_ROUND",
  "REBUTTAL_PRACTICE",
  "FLASHCARD_DECK",
  "REVIEW_GAME",
  "PRACTICE_TEST",
  "LESSON"
]);

export const MAX_TRANSCRIPT_MESSAGES = 40;
export const MAX_TRANSCRIPT_CONTENT_CHARS = 8_000;
export const MAX_TRANSCRIPT_TOTAL_CHARS = 48_000;
export const MAX_TOPIC_CHARS = 1_000;
export const MAX_SCENARIO_CHARS = 4_000;

function transcriptTotal(messages: Array<{ content: string }>) {
  return messages.reduce((total, message) => total + message.content.length, 0);
}

function transcriptSchema(options?: { min?: number }) {
  let schema = z
    .array(
      z.object({
        role: z.enum(["AFFIRMATIVE", "NEGATIVE", "MODERATOR", "JUDGE", "SYSTEM"]),
        round: z.number().int().min(1),
        content: z.string().min(1).max(MAX_TRANSCRIPT_CONTENT_CHARS)
      })
    )
    .max(MAX_TRANSCRIPT_MESSAGES);

  if (options?.min) {
    schema = schema.min(options.min);
  }

  return schema.superRefine((messages, ctx) => {
    if (transcriptTotal(messages) > MAX_TRANSCRIPT_TOTAL_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Transcript is too large. Keep it under ${MAX_TRANSCRIPT_TOTAL_CHARS.toLocaleString()} characters.`
      });
    }
  });
}

const sideCoachTranscriptSchema = z
  .array(
    z.object({
      role: z.string().max(20),
      content: z.string().min(1).max(MAX_TRANSCRIPT_CONTENT_CHARS)
    })
  )
  .max(MAX_TRANSCRIPT_MESSAGES)
  .superRefine((messages, ctx) => {
    if (transcriptTotal(messages) > MAX_TRANSCRIPT_TOTAL_CHARS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Transcript is too large. Keep it under ${MAX_TRANSCRIPT_TOTAL_CHARS.toLocaleString()} characters.`
      });
    }
  });

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
  topic: z.string().min(8).max(MAX_TOPIC_CHARS),
  side: z.enum(["AFFIRMATIVE", "NEGATIVE"]),
  round: z.number().int().min(1).max(10),
  transcript: transcriptSchema()
});

export const sideCoachRequestSchema = z.object({
  organization: organizationSchema,
  // When present, the owning student's debate is marked assistedPractice (real coach use, not the toggle).
  debateId: z.string().optional(),
  eventType: z.string().max(120).optional(),
  studentSide: z.enum(["AFFIRMATIVE", "NEGATIVE"]).optional(),
  stage: z.string().max(120).optional(),
  level: levelSchema.optional(),
  // Public transcript only — never judge reasoning or private coaching.
  transcript: sideCoachTranscriptSchema.default([]),
  latestStudentSpeech: z.string().max(MAX_TRANSCRIPT_CONTENT_CHARS).optional(),
  requestType: z.enum(["turn-feedback", "ask"]).default("turn-feedback"),
  askKind: z.string().max(80).optional(),
  guidanceLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional()
});

export const judgeRequestSchema = z.object({
  organization: organizationSchema,
  level: levelSchema,
  eventType: z.string().min(2).max(120).default("PARLIAMENTARY_DEBATE"),
  topic: z.string().min(8).max(MAX_TOPIC_CHARS),
  transcript: transcriptSchema({ min: 3 })
});

export const roleplayJudgeRequestSchema = z.object({
  organization: z.enum(["DECA", "HOSA"]),
  level: levelSchema,
  eventType: z.string().min(2).max(120),
  scenario: z.string().min(8).max(MAX_SCENARIO_CHARS),
  transcript: transcriptSchema({ min: 1 })
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
  weaknesses: z.array(z.string().min(2).max(500)).min(1).max(20),
  availableLessons: z.array(
    z.object({
      slug: z.string().min(1).max(120),
      title: z.string().min(1).max(160),
      skill: z.string().min(1).max(120)
    })
  ).max(50)
});

export const readinessRequestSchema = z.object({
  organization: organizationSchema,
  eventType: z.string().min(2).max(120).optional(),
  currentLevel: levelSchema,
  recentScores: z.array(z.number().min(0).max(100)).min(1).max(20),
  weaknessSummary: z.array(z.string().max(500)).max(20).default([])
});

export const debateCreateSchema = z.object({
  organization: organizationSchema,
  eventType: z.string().min(2).max(120),
  practiceMode: practiceModeSchema,
  format: debateFormatSchema.default("PARLIAMENTARY"),
  category: z.string().min(2).max(80).default("Global"),
  level: levelSchema,
  topic: z.string().min(8).max(MAX_TOPIC_CHARS),
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
  name: z.string().trim().min(2, "Team name must be at least 2 characters.").max(80, "Keep team names to 80 characters or fewer."),
  organization: organizationSchema.default("DEBATE"),
  schoolOrClub: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(160).transform((value) => value.toLowerCase())
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(10, "That reset link is invalid."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(120),
    confirmPassword: z.string().min(8, "Confirm your password.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

export const teamJoinSchema = z.object({
  joinCode: z.string().trim().min(3, "Enter a join code.").max(40, "That join code is too long.")
});

export const teamLeaveSchema = z.object({
  teamId: z.string().min(1, "Missing team.")
});

// Accept whatever the browser sends: a `datetime-local` value ("2026-07-10T14:30", no seconds/zone),
// a date ("2026-07-10"), a full ISO string, empty, or null. Empty → no due date; a non-empty value
// that does not parse to a real date is a clear, specific validation error (not "Invalid request body").
const dueDateSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid due date." });
      return z.NEVER;
    }
    return parsed;
  });

export const assignmentCreateSchema = z
  .object({
    teamId: z.string().min(1, "Choose a team."),
    type: assignmentTypeSchema,
    title: z.string().trim().min(3, "Assignment title must be at least 3 characters.").max(120, "Keep titles to 120 characters or fewer."),
    instructions: z.string().trim().min(8, "Add clear instructions for students.").max(2000, "Keep instructions to 2,000 characters or fewer."),
    dueDate: dueDateSchema,
    targetAllTeam: z.boolean().default(true),
    studentIds: z.array(z.string().min(1)).max(200).default([]),
    targetId: z
      .string()
      .trim()
      .max(180)
      .transform((value) => (value.length > 0 ? value : null))
      .nullable()
      .optional(),
    points: z.number().int().min(0).max(1000).nullable().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.targetAllTeam && value.studentIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["studentIds"],
        message: "Select at least one student or assign the whole team."
      });
    }
  });

export const assignmentSubmitSchema = z.object({
  evidenceType: z
    .string()
    .trim()
    .max(80)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional(),
  evidenceId: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .optional()
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
