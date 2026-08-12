import Link from "next/link";
import type { Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Archive, Info, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debateWritingPracticeSupported, resolveSkillsSlug } from "@/lib/education/skills-compat";
import { cn } from "@/lib/utils";

/**
 * Legacy `/skills/[slug]` (M13E1C).
 *
 * This page used to read `Lesson.content` out of the database and render it as instruction. All
 * thirty of those rows are `buildLessonContent` output — one template with two nouns substituted —
 * and any field the template omitted was replaced with a generic substitute written right here. It
 * also showed a "Mastery Path" percentage that was really the lesson's POSITION in its skill, and a
 * `+10 XP` badge on eighteen rows that had no way to earn it.
 *
 * None of that is rendered any more, and the page no longer touches the database at all. Every
 * legacy URL still resolves — coaches' assignments store these slugs with no foreign key behind
 * them — but it resolves to one of exactly two honest outcomes: a permanent redirect to the real
 * authored lesson, or a compatibility page that says plainly no authored lesson exists yet.
 */

const TRACK_LABEL: Record<string, string> = {
  DEBATE: "General Debate",
  DECA: "DECA",
  HOSA: "HOSA",
  MODEL_UN: "Model UN"
};

export default function SkillCompatibilityPage({ params }: { params: { slug: string } }) {
  const resolution = resolveSkillsSlug(params.slug);

  // Real authored instruction lives at ONE canonical URL. A permanent redirect keeps every stored
  // assignment, judge report and test recommendation working without a second copy of the lesson.
  if (resolution.kind === "canonical-redirect") {
    permanentRedirect(`/lessons/${resolution.lessonId}`);
  }

  // Fail closed. An unrecognised slug is not given a page that guesses what it might have been.
  if (resolution.kind === "unknown") {
    notFound();
  }

  const trackLabel = TRACK_LABEL[resolution.track] ?? resolution.track;
  const retired = resolution.track === "MODEL_UN";
  // Debate is the only track with a writing-practice implementation behind this route. Everything
  // else gets its own track's real tool rather than a debate motion.
  const practiceSupported = debateWritingPracticeSupported(params.slug);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Link
        href={"/lessons" as Route}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto min-h-11 min-w-11 px-3")}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Lessons
      </Link>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{trackLabel}</Badge>
          {/* The state is a WORD first — "Older record" — so it survives with every class removed. */}
          <Badge variant="outline">
            <Archive className="mr-1 h-3.5 w-3.5" aria-hidden />
            Older record
          </Badge>
        </div>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-tight">{resolution.title}</h1>
        {resolution.step ? (
          // Real seeded ordering, stated as a position and never converted into a percentage.
          <p className="mt-2 text-sm text-muted-foreground">
            {resolution.skillName} · Step {resolution.step.index} of {resolution.step.total}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{resolution.skillName}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            No written lesson here yet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-7 text-muted-foreground">
            This is an older record kept so existing assignments and links keep working. It does not
            have a written lesson behind it yet — so rather than show you filler, we are telling you
            plainly that there is nothing to read here.
            {retired ? " Model UN is also no longer one of the training tracks." : null}
          </p>
          <p className="leading-7 text-muted-foreground">
            {resolution.track === "DEBATE"
              ? "The Debate lessons that are written are on the Lessons page."
              : "Here is where this track's real training lives:"}
          </p>
          <Link
            href={resolution.destination.href as Route}
            className={cn(buttonVariants({ size: "sm" }), "h-auto min-h-11 min-w-11 whitespace-normal px-4 text-center")}
          >
            {resolution.destination.label}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </CardContent>
      </Card>

      {/* M15 S1A A1: Debate writing practice is FORMATIVE — its keyword-checklist grading is not
          trustworthy enough to write mastery or XP, so the route no longer does and this copy must
          not promise either. No branch of this page shows XP, because no branch can earn any. */}
      {practiceSupported ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              Practice writing for this skill
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="leading-7 text-muted-foreground">
              You can still practise this Debate skill in writing and get instant formative feedback on
              your response. This practice does not affect mastery or XP.
            </p>
            <Link
              href={`/skills/${params.slug}/practice` as Route}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-auto min-h-11 min-w-11 whitespace-normal px-4 text-center")}
            >
              Start writing practice
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
