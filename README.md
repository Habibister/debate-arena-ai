# DebateArena AI

AI-powered training for Debate, Model UN, DECA, HOSA, Mock Trial, and public speaking.

DebateArena AI is designed to become the "Khan Academy + Duolingo for Debate and Competitive Organizations": students train through AI debates, AI judging, adaptive skill lessons, original practice tests, XP, streaks, mastery analytics, and coach dashboards.

## Phase 1 Status

This repository contains the production foundation:

- Next.js 14 App Router with TypeScript
- Tailwind CSS and shadcn-style UI primitives
- Prisma schema for PostgreSQL
- NextAuth credentials authentication
- OpenAI service functions and API routes
- Student, coach, and admin UI shells
- Responsive startup-quality landing page and product surfaces
- Seed data for demo users, skills, lessons, team, practice test, XP, and achievements
- Vercel-ready environment configuration

Feature depth such as realtime debate rounds, live matchmaking queues, attempt submission, lesson completion, and coach assignment workflows should be implemented in Phase 2 on top of this foundation.

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
      lesson/
      opponent/
      practice-questions/
      readiness/
      recommendations/
      topic/
    auth/[...nextauth]/
    debates/
    teams/
    tests/
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

It also includes NextAuth tables and small supporting join tables for team membership and lesson assignments.

## AI Functions

The OpenAI-powered functions live in `lib/ai.ts`:

- `generateTopic()`
- `generateOpponentResponse()`
- `judgeDebate()`
- `generatePracticeQuestions()`
- `generateLessonContent()`
- `recommendLessons()`
- `evaluateReadiness()`

Each function returns JSON and is exposed through an API route under `app/api/ai/*`.

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
