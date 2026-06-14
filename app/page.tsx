import Link from "next/link";
import {
  BarChart3,
  BookOpenCheck,
  Bot,
  GraduationCap,
  Medal,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { HeroArena } from "@/components/app/hero-arena";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { ORGANIZATIONS } from "@/lib/constants";

const featureCards = [
  {
    title: "AI Debate System",
    description: "Three-round AI debates, real-student matchmaking, and AI fallback opponents.",
    icon: MessageSquareText
  },
  {
    title: "Skill Development",
    description: "Khan Academy style lessons with examples, guided practice, independent reps, and quizzes.",
    icon: BookOpenCheck
  },
  {
    title: "AI Judging",
    description: "Separate scoring engines for debate, DECA, HOSA, and shared speaking-skill growth.",
    icon: Medal
  },
  {
    title: "Coach Dashboard",
    description: "Teams, assignments, debate review, and analytics for coaches.",
    icon: Users
  }
];

export default function HomePage() {
  return (
    <main className="bg-background">
      <section className="arena-grid border-b">
        <div className="container grid min-h-[calc(100svh-96px)] items-center gap-10 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:py-14">
          <div>
            <Badge variant="secondary">Khan Academy + Duolingo for competitive speaking</Badge>
            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">DebateArena AI</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Train students for Debate, Model UN, DECA, HOSA, Mock Trial, and public speaking with AI opponents,
              AI judging, adaptive lessons, practice tests, mastery tracking, and coach visibility.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                <Sparkles className="h-5 w-5" aria-hidden />
                Open dashboard
              </Link>
              <Link href="/debate" className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Bot className="h-5 w-5" aria-hidden />
                Start AI debate
              </Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-2xl font-bold">+25</p>
                <p className="text-xs font-semibold text-muted-foreground">Debate XP</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-2xl font-bold">6</p>
                <p className="text-xs font-semibold text-muted-foreground">Org tracks</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-2xl font-bold">AI</p>
                <p className="text-xs font-semibold text-muted-foreground">Judge</p>
              </div>
            </div>
          </div>
          <HeroArena />
        </div>
      </section>

      <section className="container py-12">
        <SectionHeading
          eyebrow="Phase 1 architecture"
          title="A production-ready foundation for the full training platform"
          description="The scaffold includes app routes, Prisma schema, NextAuth, OpenAI service functions, API routes, seed data, and responsive UI surfaces for every major product area."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardContent className="p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="container grid gap-8 py-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="Supported tracks"
            title="One training system for every competitive organization"
            description="Each organization can carry its own skills, lessons, AI prompts, practice tests, rubrics, and coach analytics without forking the product architecture."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {ORGANIZATIONS.map((org) => (
              <div key={org.value} className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="font-semibold">{org.label}</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{org.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container grid gap-4 py-12 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <BarChart3 className="h-6 w-6 text-accent" aria-hidden />
          <h3 className="mt-4 font-semibold">Analytics</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Growth, weaknesses, win rate, and test performance.</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          <h3 className="mt-4 font-semibold">Admin-ready</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Roles, teams, XP logs, achievements, and database-ready permissions.</p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <Bot className="h-6 w-6 text-secondary" aria-hidden />
          <h3 className="mt-4 font-semibold">OpenAI-powered</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Topic, lesson, judging, recommendation, and test generation functions.</p>
        </div>
      </section>
    </main>
  );
}
