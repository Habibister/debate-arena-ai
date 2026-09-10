import { createHash } from "node:crypto";
import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { decaCourseEndAction } from "@/lib/education/deca-simulation-prep";
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
import { roleplayCourseMap } from "@/lib/education/course-map";
import { resolveActiveTrack } from "@/lib/track-server";
import { isTrackRetired, trackById, trackBySlug, type TrackInfo } from "@/lib/training-tracks";

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
    next: nextEntry && nextTitle ? { id: nextEntry.id, title: nextTitle } : null,
    // Only where a course chain actually terminates, and only where that course names an onward
    // action. Null everywhere else, so every other lesson renders exactly what it did before.
    courseEndAction: decaCourseEndAction(entry.id)
  };
}

export default async function LessonPage({ params, searchParams }: { params: { slug: string }; searchParams?: { track?: string | string[] } }) {
  const lesson = getLesson(params.slug);
  const roleplay = getRoleplayLesson(params.slug);
  const concept = lesson || roleplay ? null : conceptEducationLesson(params.slug);
  if (!lesson && !roleplay && !concept) {
    notFound();
  }

  // CONTENT-OWNED CONTEXT (Owner QA Repair 2). A lesson belongs to exactly one track, and that track
  // is the context of this render — the doctrine in lib/track-precedence.ts names "the entity's own
  // track" as the first source. The three lesson sources spell it differently (a slug, a slug, an id),
  // so it is normalised here once. Every lesson has one; a lesson without one cannot render.
  const owner: TrackInfo | undefined = lesson
    ? trackBySlug(lesson.track)
    : roleplay
      ? trackBySlug(roleplay.track)
      : concept
        ? trackById(concept.entry.track)
        : undefined;
  // A retired owner could never satisfy the redirect below (the resolver never returns a retired
  // track), so it is refused outright rather than looping. No published lesson is owned by one.
  if (!owner || isTrackRetired(owner.id)) {
    notFound();
  }
  // The URL must say the same thing the content does. If this render would otherwise resolve to a
  // different track than the lesson's own — a DECA learner opening a HOSA lesson link, or a bare URL
  // under another selection — redirect once to the canonical `?track=<owner>` form, so the shell,
  // which reads `?track=` on lesson routes, paints THIS lesson's track and links into it. A URL that
  // already names the owner, or a learner whose current track already is the owner, never redirects.
  // A repeated `?track=` is not a track: exactly one string value counts, as the shell also requires.
  const rawTrack = searchParams?.track;
  const trackParam = typeof rawTrack === "string" ? rawTrack : undefined;
  const effective = await resolveActiveTrack(trackParam);
  if (effective.track?.id !== owner.id) {
    redirect(`/lessons/${params.slug}?track=${owner.slug}` as Route);
  }

  // No session id → no safe namespace → the practice does not persist at all and says so honestly,
  // rather than risking cross-account resume on a shared browser.
  const session = await getServerSession(authOptions);
  const userScope = session?.user?.id ? localProgressScope(session.user.id) : null;

  // Back goes to the catalog of the track this lesson BELONGS to — never to a bare `/lessons`, which
  // resolved the learner's default track and sent a DECA reader to the Debate catalog.
  const back = (
    <Link
      href={`/lessons?track=${owner.slug}` as Route}
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
    // Owner QA Repair 3A: the DECA course map and next step come from the registry, not from the
    // lesson's hand-written outline, so a published lesson can never be shown as "Coming soon" and
    // the orientation continues into the actual next published lesson. HOSA is out of scope and
    // keeps its own outline unchanged.
    const course = roleplay.track === "deca" ? roleplayCourseMap(roleplay.slug) ?? undefined : undefined;
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
      { id: "next", label: course ? (course.next ? course.next.title : "End of this course so far") : roleplay.nextLesson.label },
      { id: "coursemap", label: `Your ${roleplay.organization} role-play course` }
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
        <RoleplayCourseFooter lesson={roleplay} course={course} />
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
          courseEndAction={concept.courseEndAction ?? undefined}
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
        // TEACH BEFORE DURABLE PRACTICE. This carried a prominent primary "Jump to practice" button
        // directly under the title, above every teaching section — and this lesson's practice is the
        // only lesson practice that writes durable mastery (`LessonPractice` posts to the Debate
        // drills submit route). A bright control inviting a learner to skip instruction and go
        // straight into recorded assessment is the product recommending the exact bypass the
        // teach-first rule exists to prevent, so the promoted jump is gone.
        //
        // Navigation is NOT reduced: `DEBATE_SECTIONS` still ends with Practice, so the section list
        // reaches it in one click and keyboard users keep the same destinations. What changed is the
        // emphasis — practice is now one entry among the lesson's sections rather than the page's
        // loudest action. The bottom-of-lesson practice section is untouched.
        nav={<OnThisPage sections={DEBATE_SECTIONS} />}
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
