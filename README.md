# DebateArena AI

AI-powered training for Debate, Model UN, DECA, HOSA, Mock Trial, and public speaking.

DebateArena AI is designed to become the "Khan Academy + Duolingo for Debate and Competitive Organizations": students train through AI debates, AI judging, adaptive skill lessons, original practice tests, XP, streaks, mastery analytics, and coach dashboards.

## Current Product

- Student dashboard with XP, ranks, streaks, mastery bars, weak-skill detection, and recommended next steps
- AI debate and roleplay room with topic generation, AI opponents, AI judging, XP awards, and speaking-skill analytics
- Organization-specific judging engines for parliamentary debate, DECA, and HOSA
- DECA and HOSA original practice test generator with grading, explanations, weak areas, and recommended lessons
- Khan Academy-style skill pages with lessons, examples, guided practice, independent practice, and mastery checks
- Coach/admin shells, team models, seed data, and deployment-ready Next.js/Prisma architecture

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local primitives
- Prisma
- PostgreSQL
- OpenAI API
- NextAuth credentials authentication
- Vercel-ready build setup

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL database, local or hosted
- OpenAI API key

The repo includes `.nvmrc` with Node `20`.

```bash
nvm use
```

## Environment Variables

Copy the example file:

```bash
cp .env.example .env.local
```

Required variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
OPENAI_API_KEY="sk-proj-replace-me"
OPENAI_MODEL="gpt-4o-mini"
```

Generate a strong NextAuth secret:

```bash
openssl rand -base64 32
```

Optional seed-user variables:

```bash
SEED_ADMIN_EMAIL="admin@debatearena.ai"
SEED_ADMIN_PASSWORD="password123"
SEED_COACH_EMAIL="coach@debatearena.ai"
SEED_COACH_PASSWORD="password123"
SEED_STUDENT_EMAIL="student@debatearena.ai"
SEED_STUDENT_PASSWORD="password123"
```

Never prefix secrets with `NEXT_PUBLIC_`.

## Database Setup

### Local PostgreSQL

Create a local database named `debatearena_ai`, then set:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/debatearena_ai?schema=public"
```

Push the Prisma schema and generate the client:

```bash
npm run db:generate
npm run db:push
```

Seed demo data:

```bash
npm run db:seed
```

### Neon PostgreSQL

1. Create a Neon project and database.
2. Copy the PostgreSQL connection string.
3. Add `?sslmode=require` if it is not already included.
4. Put that value in `DATABASE_URL`.
5. Run `npm run db:push` and `npm run db:seed` from your local machine with the Neon `DATABASE_URL`.

### Supabase PostgreSQL

1. Create a Supabase project.
2. Use the project database connection string with `sslmode=require`.
3. Prefer the direct/session connection for Prisma schema pushes and migrations.
4. Put that value in `DATABASE_URL`.
5. Run `npm run db:push` and `npm run db:seed`.

If you later switch to pooled runtime connections, keep Prisma migrations on a direct database connection.

## OpenAI Setup

1. Create an OpenAI API key.
2. Set `OPENAI_API_KEY` in `.env.local` and in Vercel.
3. Keep `OPENAI_MODEL="gpt-4o-mini"` unless you intentionally choose another model.

AI-powered routes return a `503` if `OPENAI_API_KEY` is missing.

## Local Setup

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run db:generate
```

Push schema:

```bash
npm run db:push
```

Seed demo users, lessons, rubrics, teams, XP, and practice tests:

```bash
npm run db:seed
```

Run the app:

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

## Validation Commands

Run these before committing or deploying:

```bash
npm run lint
npm run typecheck
npm run validate
npm run build
```

Useful Prisma checks:

```bash
npm run db:generate
npm run db:push
```

Health endpoint:

```bash
curl http://localhost:3000/api/health
```

The health endpoint reports whether required server-side environment variables are configured without exposing secret values.

## Vercel Deployment

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Set Node.js version to 20 if prompted.
4. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - optional seed-user variables
5. Set `NEXTAUTH_URL` to your production URL, for example:

```bash
NEXTAUTH_URL="https://your-app.vercel.app"
```

6. Use the default install command:

```bash
npm install
```

7. Use the default build command:

```bash
npm run build
```

The build script runs `prisma generate` before `next build`, and `postinstall` also runs Prisma generation.

For first production setup, run the schema push against the production database:

```bash
DATABASE_URL="your-production-postgres-url" npm run db:push
```

Seed production only if you explicitly want demo accounts:

```bash
DATABASE_URL="your-production-postgres-url" npm run db:seed
```

For a real launch, replace seeded password accounts with invited users or OAuth providers.

## API Error Handling

The shared API helper in `lib/api.ts` handles:

- malformed JSON request bodies
- Zod validation failures
- unauthorized and forbidden responses
- common Prisma unique/not-found errors
- missing OpenAI key responses
- generic server errors without leaking production internals

Most API routes use the helper through `parseJson()` and `apiError()`.

## Folder Structure

```txt
app/
  (app)/
    admin/
    coach/
    dashboard/
    debate/
    skills/[slug]/
    tests/[testId]/results/
  (auth)/signin/
  api/
    ai/
    auth/[...nextauth]/
    debates/[debateId]/
    matchmaking/
    teams/
    tests/[testId]/
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
  rubrics.ts
  testing.ts
  validators.ts
  xp.ts
prisma/
  schema.prisma
  seed.ts
types/
  next-auth.d.ts
```

## Core Data Models

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

## Important Notes

- Practice questions must be original AI-generated content. Do not paste copyrighted past exams unless legally provided.
- Keep `.env.local` out of Git.
- Use `npm run validate` before deployment.
- Use `/api/health` after deployment to confirm required configuration is present.
