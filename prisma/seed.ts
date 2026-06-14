import bcrypt from "bcryptjs";
import { PrismaClient, type Level, type Organization, type SkillTrack } from "@prisma/client";

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
      await prisma.lesson.upsert({
        where: { slug: lessonSlug },
        update: {
          title,
          order: index,
          summary: `Practice ${title.toLowerCase()} with examples, guided reps, and a mastery check.`
        },
        create: {
          skillId: dbSkill.id,
          title,
          slug: lessonSlug,
          type: index === 0 ? "LESSON" : index === 1 ? "GUIDED_PRACTICE" : "MASTERY_QUIZ",
          order: index,
          summary: `Practice ${title.toLowerCase()} with examples, guided reps, and a mastery check.`,
          content: {
            objective: title,
            lesson: "Phase 1 seed content. Phase 2 will replace this with AI-generated lesson bodies.",
            examples: [],
            checks: []
          }
        }
      });
    }
  }
}

async function seedPracticeSkeleton(studentId: string) {
  const test = await prisma.practiceTest.create({
    data: {
      userId: studentId,
      organization: "DECA",
      difficulty: "BEGINNER" as Level,
      questionCount: 10,
      status: "COMPLETED",
      score: 80,
      weakAreas: ["Pricing strategy", "Promotion metrics"],
      recommendations: {
        lessons: ["deca-marketing"],
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
