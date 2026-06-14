# DebateArena AI

AI-powered training for Debate, Model UN, DECA, HOSA, Mock Trial, and public speaking.

DebateArena AI is designed to become the "Khan Academy + Duolingo for Debate and Competitive Organizations": students train through AI debates, AI judging, adaptive skill lessons, original practice tests, XP, streaks, mastery analytics, and coach dashboards.

## Build Status

Phase 1 contains the production foundation:

- Next.js 14 App Router with TypeScript
- Tailwind CSS and shadcn-style UI primitives
- Prisma schema for PostgreSQL
- NextAuth credentials authentication
- OpenAI service functions and API routes
- Student, coach, and admin UI shells
- Responsive startup-quality landing page and product surfaces
- Seed data for demo users, skills, lessons, team, practice test, XP, and achievements
- Vercel-ready environment configuration

Phase 2 has started with the AI Debate System:

- Live debate room at `/debate`
- Organization, level, and opponent setup
- AI topic generation
- Debate creation and message persistence
- Three-turn minimum round progress
- AI opponent response route
- AI judge route with rubric scoring
- XP, streak, wins, and rank updates after judging
- Matchmaking endpoint with automatic AI fallback

This phase also adds organization-specific scoring engines transformed from uploaded reference rubrics:

- Parliamentary debate judging with argument/refutation/content/organization/style/delivery/case/clash/rules/time categories
- 19-30 parliamentary speaker points, 1-4 speaker ranks, team winner, and reason for decision
- DECA roleplay and case-study judging with business scenario, performance indicator, solution, feasibility, and professional communication scoring
- HOSA performance judging with health science knowledge, medical accuracy, task completion, scenario response, and professionalism scoring
- Shared speaking-skill tracking across clarity, confidence, pacing, volume, organization, vocabulary, persuasion, and professionalism
- Flexible Prisma rubric models for categories, score ranges, descriptors, and lesson recommendations

Remaining Phase 2 depth includes realtime student-to-student rooms, timers, speech/audio support, richer judge explainability, and durable availability queues.

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui-style local primitives
- Prisma
- PostgreSQL
- OpenAI API
- NextAuth
- Vercel

## Folder Structure

```txt
app/
  (app)/
    admin/
    coach/
    dashboard/
    debate/
    skills/
    tests/
  (auth)/
    signin/
  api/
    ai/
      judge/
      judge-deca/
      judge-hosa/
      lesson/
      opponent/
      practice-questions/
      readiness/
      recommendations/
      topic/
    auth/[...nextauth]/
    debates/
      [debateId]/
        judge/
        messages/
        opponent/
    matchmaking/
    teams/
    tests/
      [testId]/
        grade/
components/
  analytics/
  app/
  auth/
  coach/
  debate/
  skills/
  tests/
  ui/
lib/
  ai.ts
  api.ts
  auth.ts
  constants.ts
  openai.ts
  prisma.ts
  utils.ts
  validators.ts
  xp.ts
prisma/
  schema.prisma
  seed.ts
types/
  domain.ts
  next-auth.d.ts
```

## Core Data Models

The Prisma schema includes the requested product models:

- `User`
- `Debate`
- `DebateMessage`
- `Skill`
- `Lesson`
- `PracticeTest`
- `PracticeQuestion`
- `PracticeAnswer`
- `Coach`
- `Team`
- `Achievement`
- `XPLog`
- `Rubric`
- `RubricCategory`
- `RubricDescriptor`
- `SpeakingSkillSnapshot`

It also includes NextAuth tables and small supporting join tables for team membership and lesson assignments.

## AI Functions

The OpenAI-powered functions live in `lib/ai.ts`:

- `generateTopic()`
- `generateOpponentResponse()`
- `judgeDebate()`
- `judgeDecaRoleplay()`
- `judgeHosaPerformance()`
- `generatePracticeQuestions()`
- `generateLessonContent()`
- `recommendLessons()`
- `evaluateReadiness()`

Each function returns JSON and is exposed through an API route under `app/api/ai/*`.

## AI Debate API

The live debate system uses:

- `POST /api/ai/topic`
- `POST /api/debates`
- `GET /api/debates`
- `GET /api/debates/:debateId/messages`
- `POST /api/debates/:debateId/messages`
- `POST /api/debates/:debateId/opponent`
- `POST /api/debates/:debateId/judge`
- `POST /api/matchmaking`
- `POST /api/ai/judge-deca`
- `POST /api/ai/judge-hosa`
- `POST /api/tests`
- `POST /api/tests/:testId/grade`

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4o-mini"
```

4. Generate Prisma client and push the schema:

```bash
npm run db:generate
npm run db:push
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

Demo credentials after seeding:

```txt
student@debatearena.ai / password123
coach@debatearena.ai / password123
admin@debatearena.ai / password123
```

## Vercel Deployment

1. Create a PostgreSQL database, such as Vercel Postgres, Neon, Supabase, or Railway.
2. Add these Vercel environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
3. Run the Prisma migration or push command against production:

```bash
npx prisma db push
```

4. Deploy with:

```bash
vercel
```

For production, replace demo credentials with invited users or OAuth providers, add rate limits to AI routes, and persist detailed AI usage logs for cost and safety monitoring.

## Phase 2 Build Plan

1. Live debate room with timer, round composer, message persistence, and judge submission.
2. Matchmaking queue by organization, level, and age group with AI fallback.
3. Practice test attempt flow with generated questions, answer scoring, explanations, and weak-area extraction.
4. Lesson completion, XP events, streak updates, rank progression, and achievement unlocks.
5. Coach team CRUD, lesson assignments, student drill review, and debate feedback.
6. Admin usage analytics, moderation, organization content controls, and AI cost dashboards.
