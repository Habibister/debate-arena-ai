/**
 * Where a post-round diagnosis sends a learner.
 *
 * COMPETE -> LEARN, resolved in one place. The Debate judge names a weak area and recommends lesson
 * slugs (`recommendationForStudent` in `app/api/debates/[debateId]/judge/route.ts`). Those slugs are
 * stored inside historical judge reports, so they can never simply stop being emitted — they have to
 * keep resolving.
 *
 * They previously resolved into `/skills/<slug>/practice`, which serves ONLY a legacy compatibility
 * slug. Every canonical judge slug resolves as a redirect instead, so the post-round "practice weak
 * skill" action answered 404 for exactly the learner the diagnosis was written for. That is the
 * Compete-to-Learn return path failing at its only step.
 *
 * The educational fix is not a different practice URL. A learner who has just been told their
 * refutation was weak needs the lesson that TEACHES refutation; the lesson then offers targeted
 * practice at its end, after the teaching, which is the order the whole curriculum is built on.
 * So a diagnosis resolves to a canonical, learner-visible LESSON, or to nothing at all.
 *
 * FAIL CLOSED. An unmapped slug, a slug whose target is not registered, and a slug whose target is
 * not learner-visible all return `null`. A caller with `null` shows the learner no personalised
 * destination rather than a link that 404s or opens material the product has withheld.
 *
 * PURE. Registry data only — no session, no database, no network, no environment. Safe to import
 * from a client component and from a strict-safe test.
 */
import { EDUCATION_SLUG_ALIASES } from "@/lib/education/slug-map";
import { getEducationLesson, EDUCATION_LESSONS } from "@/lib/education/registry";

export type DiagnosisDestination = {
  /** The canonical registry id, which is also the `/lessons/<id>` route segment. */
  lessonId: string;
  title: string;
  href: string;
};

/** The lesson title as the registry holds it, whatever source shape the entry wraps. */
function titleFor(entry: (typeof EDUCATION_LESSONS)[number]): string | null {
  const source = entry.source as { lesson?: { title?: unknown }; title?: unknown } | undefined;
  const nested = source?.lesson?.title;
  if (typeof nested === "string" && nested.trim().length > 0) return nested;
  const flat = source?.title;
  if (typeof flat === "string" && flat.trim().length > 0) return flat;
  return null;
}

/**
 * A registered, learner-visible lesson by id — or null. Held and unregistered ids never resolve.
 *
 * EXPORTED (P1-D) because the DECA simulation prep path needs exactly this rule and must not clone
 * it. Both surfaces answer the same question — "may I send a learner here?" — and both must fail
 * closed on the same three cases: not registered, not learner-visible, no title. A second copy would
 * be a second place for that rule to drift.
 */
export function learnerVisibleLesson(lessonId: string): DiagnosisDestination | null {
  const entry = getEducationLesson(lessonId);
  if (!entry || entry.visibility !== "learner") return null;
  const title = titleFor(entry);
  if (!title) return null;
  return { lessonId: entry.id, title, href: `/lessons/${entry.id}` };
}

/**
 * The canonical lesson a judge diagnosis should open, or `null` when none can be proven.
 *
 * Resolution order, each step deliberate:
 *   1. the slug IS a canonical lesson id (a future judge could emit one directly);
 *   2. an ACTIVE alias naming a lesson -> that lesson;
 *   3. an ACTIVE alias naming a skill  -> the learner-visible lesson that claims that skill;
 *   4. nothing.
 * A `compatibility-active` or `planned` alias is deliberately not followed: neither licenses a
 * canonical teaching destination, and inventing one would be the fabricated-destination failure this
 * module exists to end.
 */
export function debateDiagnosisLesson(judgeSlug: string | null | undefined): DiagnosisDestination | null {
  if (typeof judgeSlug !== "string" || judgeSlug.trim().length === 0) return null;
  const slug = judgeSlug.trim();

  const direct = learnerVisibleLesson(slug);
  if (direct) return direct;

  const alias = EDUCATION_SLUG_ALIASES.find((candidate) => candidate.legacySlug === slug);
  if (!alias || alias.status !== "active") return null;

  if (alias.targetKind === "lesson") return learnerVisibleLesson(alias.target);

  // A skill target: find the learner-visible lesson that CLAIMS that skill. Exactly one may, and a
  // second would be an authoring decision this function must not make silently — so an ambiguous
  // skill resolves to nothing rather than to a guess.
  const claiming = EDUCATION_LESSONS.filter(
    (entry) => entry.visibility === "learner" && entry.skillSlug === alias.target
  );
  if (claiming.length !== 1) return null;
  return learnerVisibleLesson(claiming[0].id);
}
