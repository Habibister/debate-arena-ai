import { createHash } from "node:crypto";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, Dumbbell, MessageSquare } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LessonPractice } from "@/components/lessons/lesson-practice";
import { LessonView } from "@/components/lessons/lesson-view";
import { RoleplayCourseFooter, RoleplayLessonView } from "@/components/lessons/roleplay-lesson-view";
import { RoleplayLessonPractice } from "@/components/lessons/roleplay-lesson-practice";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";
import { getLesson } from "@/lib/lessons";
import { getRoleplayLesson } from "@/lib/roleplay-lessons";
import { ConceptEducationLessonView } from "@/components/lessons/concept-education-lesson-view";
import { getEducationLesson, getEducationModule } from "@/lib/education/registry";
import { isConceptEducationLessonEntry } from "@/lib/education/types";

// Opaque, stable per-account namespace for DEVICE-LOCAL lesson resume (M5 Phase A).
//
// Derived from the account id with a one-way digest and truncated, so the browser never stores a raw
// database identifier — and never a name or email. It is only a namespace: it keeps two accounts
// sharing one browser from resuming each other's writing. Nothing is written server-side, and no new
// API is introduced — this reuses the same session read every other page in (app) already performs.
function localProgressScope(userId: string): string {
  return createHash("sha256").update(`authored-lesson-progress:${userId}`).digest("hex").slice(0, 16);
}

type LessonSection = { id: string; label: string };

/**
 * In-page contents (M12D3A).
 *
 * The authored lessons are long BY DESIGN — on the DECA lesson three required instructional sections
 * are 60% of the page and the practice itself is 3% — so nothing here shortens, collapses or hides a
 * single line of curriculum. It only makes what already exists reachable: native fragment links to
 * section ids that already existed and were already unique.
 *
 * Deliberately: server-rendered, no client handler, nothing sticky or fixed, no completion state, no
 * checkmarks. The strongest entry is the practice jump — but ONLY for a lesson whose practice is
 * really actionable. A lesson whose interaction is withdrawn gets a plain statement instead, so the
 * navigation can never imply an interaction the product does not offer.
 */
function OnThisPage({ jump, unavailable, sections }: {
  jump?: { label: string; href: string };
  unavailable?: string;
  sections: LessonSection[];
}) {
  return (
    <nav aria-label="On this page" className="rounded-lg border bg-card p-4">
      <p className="eyebrow">On this page</p>
      <ul className="mt-3 flex flex-wrap items-center gap-2">
        {jump ? (
          <li className="w-full sm:w-auto">
            <a
              href={jump.href}
              className={cn(buttonVariants({ size: "sm" }), "h-auto min-h-11 w-full min-w-11 whitespace-normal px-4 py-2 text-center sm:w-auto")}
            >
              {jump.label}
            </a>
          </li>
        ) : null}
        {unavailable ? (
          // Not a link and not a disabled control — a statement of where the product stands.
          <li className="w-full sm:w-auto">
            <StatusChip variant="unavailable" className="min-h-11 w-full px-3 py-2 sm:w-auto">{unavailable}</StatusChip>
          </li>
        ) : null}
        {sections.map((section) => (
          <li key={section.id} className="min-w-0">
            <a
              href={`#${section.id}`}
              className="focus-ring inline-flex min-h-11 min-w-11 max-w-full items-center rounded-md border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// The Debate lesson's section headings are static strings in LessonView, so these labels are the one
// place they are restated. The M12D3A harness asserts every label equals the visible text of the
// heading it targets, so a future reword cannot let the two drift apart silently.
const DEBATE_SECTIONS: LessonSection[] = [
  { id: "what-it-is", label: "What it is" },
  { id: "video-slot", label: "Video walkthrough" },
  { id: "contrast", label: "See the difference on one claim" },
  { id: "revise", label: "Revise it, one pass at a time" },
  { id: "evidence", label: "Make your evidence specific" },
  { id: "misconception", label: "The mental model to fix" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "practice", label: "Practice" }
];

/**
 * Resolves a MIGRATED concept lesson (M13E1B), or null.
 *
 * Third in the lookup order, behind both legacy registries, so the three shipped lessons resolve
 * exactly as before. Narrowing is by the `sourceKind` discriminant — never by probing for an
 * optional property — and an `internal` entry resolves to null so it can never render.
 */
function conceptEducationLesson(slug: string) {
  const entry = getEducationLesson(slug);
  if (!entry || entry.visibility !== "learner" || !isConceptEducationLessonEntry(entry)) return null;
  const moduleEntry = getEducationModule(entry.moduleId);
  const nextEntry = entry.nextLessonId ? getEducationLesson(entry.nextLessonId) : null;
  const nextTitle = nextEntry && isConceptEducationLessonEntry(nextEntry) ? nextEntry.source.lesson.title : null;
  return {
    entry,
    // Fail closed rather than inventing a label for a module that is not registered.
    moduleLabel: moduleEntry ? moduleEntry.label : "Lesson",
    next: nextEntry && nextTitle ? { id: nextEntry.id, title: nextTitle } : null
  };
}

export default async function LessonPage({ params }: { params: { slug: string } }) {
  const lesson = getLesson(params.slug);
  const roleplay = getRoleplayLesson(params.slug);
  const concept = lesson || roleplay ? null : conceptEducationLesson(params.slug);
  if (!lesson && !roleplay && !concept) {
    notFound();
  }

  // No session id → no safe namespace → the practice does not persist at all and says so honestly,
  // rather than risking cross-account resume on a shared browser.
  const session = await getServerSession(authOptions);
  const userScope = session?.user?.id ? localProgressScope(session.user.id) : null;

  const back = (
    <Link
      href={"/lessons" as Route}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-auto min-h-11 min-w-11 px-3")}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Lessons
    </Link>
  );

  // Centres the reading column on wide screens; w-full keeps the FULL usable width on mobile, where
  // this constrains nothing. Measured at 1280px and 1440px: the lesson prose ran ~178 characters per
  // line before, and runs 78 (16px body) / 89 (14px) after — max-w-3xl was tried first and left the
  // 14px text at 103. Nothing is clamped, truncated, collapsed or hidden; only line length changes.
  const column = "mx-auto w-full max-w-2xl space-y-6";

  // Role-play lesson (DECA/HOSA): authored teaching + an interactive mini role-play whose feedback
  // reuses the Side Coach route (no mastery/record) + the course-map footer.
  if (roleplay) {
    const available = roleplay.practiceStatus === "available";
    // Only the sections this lesson actually renders. `scenario` and `worked` exist solely on an
    // available lesson, and the branch below is the same `practiceStatus` discriminant the view uses.
    const sections: LessonSection[] = [
      { id: "what", label: "What it is" },
      { id: "timeline", label: roleplay.timelineLabel ?? "The event, start to finish" },
      { id: "framework", label: roleplay.framework.name },
      ...(available
        ? [
            { id: "scenario", label: roleplay.scenario.title },
            { id: "worked", label: "One scenario, performed two ways" }
          ]
        : []),
      { id: "mistakes", label: "Common mistakes" },
      ...(available ? [{ id: "practice", label: "Practice" }] : []),
      { id: "next", label: roleplay.nextLesson.label },
      { id: "coursemap", label: `Your ${roleplay.organization} Performance Course` }
    ];
    return (
      <div className={column}>
        {back}
        <RoleplayLessonView
          lesson={roleplay}
          nav={
            <OnThisPage
              jump={available ? { label: "Jump to guided practice", href: "#practice" } : undefined}
              unavailable={available ? undefined : "Interactive scenario unavailable"}
              sections={sections}
            />
          }
        />
        <section aria-labelledby="practice" className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            {/* tabIndex={-1} is what makes a fragment jump move KEYBOARD FOCUS here, not just the
                scroll position; scroll-mt-24 keeps the heading off the very top edge. */}
            <h2 id="practice" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">Practice</h2>
          </div>
          <RoleplayLessonPractice lesson={roleplay} userScope={userScope} />
        </section>
        <RoleplayCourseFooter lesson={roleplay} />
      </div>
    );
  }

  // Migrated Debate concept lesson (M13E1B). Its own canonical renderer; the legacy view below is
  // untouched. Its checks save nothing — no mastery, no progress, no XP, no API, no AI.
  if (concept) {
    return (
      <div className={column}>
        {back}
        <ConceptEducationLessonView
          source={concept.entry.source}
          provenance={concept.entry.provenance}
          moduleLabel={concept.moduleLabel}
          next={concept.next}
          practiceDrill={concept.entry.practiceDrill}
        />
      </div>
    );
  }

  // Debate concept lesson (Claim/Warrant/Impact) — practice records real mastery via the drills pipeline.
  return (
    <div className={column}>
      {back}
      <LessonView
        lesson={lesson!}
        nav={<OnThisPage jump={{ label: "Jump to practice", href: "#practice" }} sections={DEBATE_SECTIONS} />}
      />
      <section aria-labelledby="practice" className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="practice" tabIndex={-1} className="scroll-mt-24 text-xl font-bold">Practice</h2>
        </div>
        <LessonPractice
          drillArea={lesson!.drillArea}
          skillSlug={lesson!.skillSlug}
          skillLabel={lesson!.skillLabel}
          questionCount={lesson!.practice.questionCount}
          intro={lesson!.practice.intro}
        />
      </section>
    </div>
  );
}
