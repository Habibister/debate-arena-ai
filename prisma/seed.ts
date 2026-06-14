import bcrypt from "bcryptjs";
import { PrismaClient, type Level, type Organization, type SkillTrack } from "@prisma/client";
import { RUBRIC_SEEDS } from "../lib/rubrics";

const prisma = new PrismaClient();

const skillCatalog: Array<{
  organization: Organization;
  track: SkillTrack;
  name: string;
  slug: string;
  description: string;
  lessons: string[];
}> = [
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Claim Building",
    slug: "debate-claim-building",
    description: "Build clear claims that can survive direct clash and judge scrutiny.",
    lessons: ["Claim, warrant, impact", "Turning a prompt into a position", "Writing concise contentions"]
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Evidence",
    slug: "debate-evidence",
    description: "Find, explain, and weigh credible evidence in competitive rounds.",
    lessons: ["Evidence quality signals", "Citation drills", "Weighing evidence against rebuttals"]
  },
  {
    organization: "DEBATE",
    track: "DEBATE",
    name: "Rebuttal",
    slug: "debate-rebuttal",
    description: "Answer opposing arguments with direct, organized, and strategic responses.",
    lessons: ["Flowing attacks", "Answering turns", "Collapsing to winning issues"]
  },
  {
    organization: "MODEL_UN",
    track: "MODEL_UN",
    name: "Resolution Writing",
    slug: "mun-resolution-writing",
    description: "Draft actionable clauses that reflect bloc priorities and committee rules.",
    lessons: ["Preambulatory clauses", "Operative clause design", "Sponsor and signatory strategy"]
  },
  {
    organization: "MODEL_UN",
    track: "MODEL_UN",
    name: "Diplomacy",
    slug: "mun-diplomacy",
    description: "Negotiate, build coalitions, and protect national interests in committee.",
    lessons: ["Opening caucus strategy", "Bloc leadership", "Conflict de-escalation"]
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Roleplay",
    slug: "deca-roleplay",
    description: "Structure roleplay presentations around performance indicators and business impact.",
    lessons: ["Reading performance indicators", "Executive framing", "Closing with measurable outcomes"]
  },
  {
    organization: "DECA",
    track: "DECA",
    name: "Marketing",
    slug: "deca-marketing",
    description: "Apply market segmentation, positioning, and campaign measurement to DECA scenarios.",
    lessons: ["Segmentation basics", "Campaign mix", "Metrics that matter"]
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Medical Terminology",
    slug: "hosa-medical-terminology",
    description: "Master prefixes, suffixes, roots, and clinical language for health science events.",
    lessons: ["Word roots", "Clinical abbreviations", "Terminology in patient scenarios"]
  },
  {
    organization: "HOSA",
    track: "HOSA",
    name: "Patient Communication",
    slug: "hosa-patient-communication",
    description: "Practice empathetic, accurate communication for healthcare settings.",
    lessons: ["Plain-language explanations", "Active listening", "Ethical patient conversations"]
  }
];

async function upsertUser(email: string, name: string, role: "STUDENT" | "COACH" | "ADMIN", password: string) {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: {
      email,
      name,
      role,
      passwordHash,
      organization: role === "STUDENT" ? "DEBATE" : null,
      level: "BEGINNER",
      ageGroup: role === "STUDENT" ? "High School" : null,
      xp: role === "STUDENT" ? 375 : 0,
      streak: role === "STUDENT" ? 8 : 0,
      wins: role === "STUDENT" ? 12 : 0,
      rank: role === "STUDENT" ? "SILVER" : "BRONZE"
    }
  });
}

function buildLessonContent(skillName: string, title: string) {
  return {
    objective: title,
    lesson: `Use ${title.toLowerCase()} to strengthen ${skillName.toLowerCase()} performance in a timed competitive setting. Start by naming the goal, show the judge the reasoning, then close with the impact or decision standard.`,
    examples: [
      `A strong ${skillName.toLowerCase()} response states the point, explains why it matters, and connects it back to the event criteria.`,
      `A developing response may name the right idea but leave the judge to infer the business, health science, or debate impact.`
    ],
    guidedPractice: [
      "Write one sentence that names the skill goal.",
      "Add one sentence that explains the reasoning.",
      "Revise the response so the judge can see how it earns points."
    ],
    independentPractice: [
      "Set a three-minute timer and answer a fresh prompt using the same structure.",
      "Underline the sentence that creates the clearest score impact."
    ],
    checks: [
      "Can you identify what the judge is scoring?",
      "Can you explain the skill without using filler?",
      "Can you apply it under time pressure?"
    ],
    masteryQuiz: [
      {
        question: `What is the main purpose of ${title.toLowerCase()}?`,
        answer: "To make the response easier to score and more strategically connected to the event criteria.",
        explanation: "Mastery means the skill is visible, purposeful, and tied to how the performance is evaluated."
      }
    ]
  };
}

async function seedSkills() {
  for (const skill of skillCatalog) {
    const dbSkill = await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {
        name: skill.name,
        description: skill.description,
        organization: skill.organization,
        track: skill.track
      },
      create: {
        name: skill.name,
        slug: skill.slug,
        description: skill.description,
        organization: skill.organization,
        track: skill.track
      }
    });

    for (const [index, title] of skill.lessons.entries()) {
      const lessonSlug = `${skill.slug}-${index + 1}`;
      const content = buildLessonContent(skill.name, title);
      await prisma.lesson.upsert({
        where: { slug: lessonSlug },
        update: {
          title,
          order: index,
          summary: `Practice ${title.toLowerCase()} with examples, guided reps, and a mastery check.`,
          content
        },
        create: {
          skillId: dbSkill.id,
          title,
          slug: lessonSlug,
          type: index === 0 ? "LESSON" : index === 1 ? "GUIDED_PRACTICE" : "MASTERY_QUIZ",
          order: index,
          summary: `Practice ${title.toLowerCase()} with examples, guided reps, and a mastery check.`,
          content
        }
      });
    }
  }
}

async function seedRubrics() {
  for (const rubric of RUBRIC_SEEDS) {
    const dbRubric = await prisma.rubric.upsert({
      where: {
        organization_eventType_version: {
          organization: rubric.organization,
          eventType: rubric.eventType,
          version: 1
        }
      },
      update: {
        name: rubric.name,
        description: rubric.description,
        scoreMin: rubric.scoreMin,
        scoreMax: rubric.scoreMax,
        isActive: true
      },
      create: {
        organization: rubric.organization,
        eventType: rubric.eventType,
        name: rubric.name,
        description: rubric.description,
        scoreMin: rubric.scoreMin,
        scoreMax: rubric.scoreMax,
        isActive: true
      }
    });

    for (const [order, category] of rubric.categories.entries()) {
      const dbCategory = await prisma.rubricCategory.upsert({
        where: {
          rubricId_key: {
            rubricId: dbRubric.id,
            key: category.key
          }
        },
        update: {
          label: category.label,
          description: category.description,
          scoreMin: category.scoreMin,
          scoreMax: category.scoreMax,
          weight: category.weight,
          order,
          lessonSlugs: category.lessonSlugs,
          sharedSpeakingSkill: category.sharedSpeakingSkill ?? false
        },
        create: {
          rubricId: dbRubric.id,
          key: category.key,
          label: category.label,
          description: category.description,
          scoreMin: category.scoreMin,
          scoreMax: category.scoreMax,
          weight: category.weight,
          order,
          lessonSlugs: category.lessonSlugs,
          sharedSpeakingSkill: category.sharedSpeakingSkill ?? false
        }
      });

      await prisma.rubricDescriptor.deleteMany({
        where: { categoryId: dbCategory.id }
      });

      await prisma.rubricDescriptor.createMany({
        data: category.descriptors.map((descriptor) => ({
          categoryId: dbCategory.id,
          label: descriptor.label,
          minScore: descriptor.minScore,
          maxScore: descriptor.maxScore,
          description: descriptor.description
        }))
      });
    }
  }
}

async function seedPracticeSkeleton(studentId: string) {
  const test = await prisma.practiceTest.create({
    data: {
      userId: studentId,
      organization: "DECA",
      eventType: "ROLEPLAY",
      eventCluster: "Marketing",
      difficulty: "BEGINNER" as Level,
      questionCount: 10,
      status: "COMPLETED",
      score: 80,
      weakAreas: ["Pricing strategy", "Promotion metrics"],
      recommendations: {
        lessons: [
          {
            lessonSlug: "deca-marketing-3",
            title: "Metrics that matter",
            reason: "Targets marketing measurement, which appears in the missed-question pattern."
          }
        ],
        note: "Review marketing metrics before attempting an intermediate exam."
      }
    }
  });

  await prisma.practiceQuestion.create({
    data: {
      testId: test.id,
      difficulty: "BEGINNER",
      skillTag: "Marketing",
      question: "A local retailer wants to measure whether a weekend promotion increased customer visits. Which metric is most directly aligned?",
      choices: ["Foot traffic", "Inventory turnover", "Gross margin", "Employee retention"],
      correctAnswer: "Foot traffic",
      explanation: "Foot traffic measures customer visits and is the most direct metric for this promotion goal."
    }
  });
}

async function main() {
  const admin = await upsertUser(
    process.env.SEED_ADMIN_EMAIL ?? "admin@debatearena.ai",
    "DebateArena Admin",
    "ADMIN",
    process.env.SEED_ADMIN_PASSWORD ?? "password123"
  );

  const coachUser = await upsertUser(
    process.env.SEED_COACH_EMAIL ?? "coach@debatearena.ai",
    "Maya Chen",
    "COACH",
    process.env.SEED_COACH_PASSWORD ?? "password123"
  );

  const student = await upsertUser(
    process.env.SEED_STUDENT_EMAIL ?? "student@debatearena.ai",
    "Alex Rivera",
    "STUDENT",
    process.env.SEED_STUDENT_PASSWORD ?? "password123"
  );

  const coach = await prisma.coach.upsert({
    where: { userId: coachUser.id },
    update: { title: "Head Speech and Debate Coach" },
    create: {
      userId: coachUser.id,
      title: "Head Speech and Debate Coach",
      bio: "Builds structured training plans for debate, Model UN, DECA, and health science competitors."
    }
  });

  const team = await prisma.team.upsert({
    where: {
      coachId_name: {
        coachId: coach.id,
        name: "Varsity Debate Lab"
      }
    },
    update: { organization: "DEBATE" },
    create: {
      coachId: coach.id,
      name: "Varsity Debate Lab",
      organization: "DEBATE"
    }
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: student.id
      }
    },
    update: {},
    create: {
      teamId: team.id,
      userId: student.id,
      role: "STUDENT"
    }
  });

  await seedSkills();
  await seedRubrics();

  const existingTests = await prisma.practiceTest.count({ where: { userId: student.id } });
  if (existingTests === 0) {
    await seedPracticeSkeleton(student.id);
  }

  const existingAchievement = await prisma.achievement.findFirst({
    where: { userId: student.id, name: "Eight Day Streak" }
  });

  if (!existingAchievement) {
    await prisma.achievement.create({
      data: {
        userId: student.id,
        type: "XP_STREAK",
        name: "Eight Day Streak",
        description: "Completed training for eight days in a row.",
        metadata: { streak: 8 }
      }
    });
  }

  const existingXPLog = await prisma.xPLog.findFirst({
    where: { userId: student.id, reason: "Completed demo debate" }
  });

  if (!existingXPLog) {
    await prisma.xPLog.create({
      data: {
        userId: student.id,
        amount: 25,
        reason: "Completed demo debate",
        sourceType: "DEBATE"
      }
    });
  }

  console.log(`Seeded DebateArena AI with admin ${admin.email}, coach ${coachUser.email}, and student ${student.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
