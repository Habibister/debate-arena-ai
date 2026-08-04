// Deterministic education-registry validator (M13E1A).
//
// Same input always produces the same issues, in the same order. Pure: no React, no Prisma, no
// network, no filesystem, no environment, no database, no clock, no randomness. Registry in, issue
// list out — it never repairs, defaults, or guesses.
//
// It catches the class of defect that produced the current `/skills` surface: content that renders
// as if it taught something while carrying no authored teaching, no provenance, and no reachable
// mastery target. Each rule has a machine `code` so a test asserts on the code, never on wording.

import { presentSourceFreshness } from "@/lib/source-freshness";
import {
  EDUCATION_TRACKS,
  isConceptEducationLessonEntry,
  type EducationIssueCode,
  type EducationRegistryEntry,
  type EducationRegistryInput,
  type EducationValidationIssue
} from "@/lib/education/types";

// --- runtime guards -----------------------------------------------------------------------------
// Genuine runtime checks, so narrowing is sound rather than asserted.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sourceHasPractice(source: unknown): boolean {
  return isRecord(source) && isRecord(source.practice);
}

function sourceHasUnavailableNotice(source: unknown): boolean {
  return isRecord(source) && isRecord(source.practiceUnavailable);
}

function sourcePracticeStatus(source: unknown): string | null {
  if (!isRecord(source)) return null;
  return typeof source.practiceStatus === "string" ? source.practiceStatus : null;
}

/** Every string reachable from a value, for the anti-filler scan. Depth-bounded, cycle-safe. */
function collectStrings(value: unknown, out: string[], seen: Set<object>, depth: number): void {
  if (depth > 12) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    for (const item of value) collectStrings(item, out, seen, depth + 1);
    return;
  }
  if (isRecord(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    for (const item of Object.values(value)) collectStrings(item, out, seen, depth + 1);
  }
}

// --- generic-filler blocklist -------------------------------------------------------------------
//
// ANTI-FALLBACK SIGNATURES, NOT LEARNER CONTENT.
//
// These are the exact generated strings that `buildLessonContent` in `prisma/seed.ts` writes into
// all thirty seeded `Lesson.content` rows, plus the generic substitutes `app/(app)/skills/[slug]`
// renders when a content field is absent. They are reproduced here — and ONLY here — so the
// validator can prove that no such string ever enters the canonical registry. `prisma/seed.ts` is
// deliberately NOT imported: this module must stay free of Prisma and of the seed's side effects.
//
// Every phrase is long and distinctive on purpose. A rule keyed on a common word like "practice",
// "performance", or "mastery" would flag genuine authored teaching; the smoke suite pins that with
// a control asserting real lesson text containing those words passes cleanly.
export const EDUCATION_GENERIC_FILLER_SIGNATURES: readonly string[] = [
  // prisma/seed.ts -> buildLessonContent
  "performance in a timed competitive setting",
  "connects it back to the event criteria",
  "leave the judge to infer the business, health science, or debate impact",
  "Write one sentence that names the skill goal.",
  "Revise the response so the judge can see how it earns points.",
  "Set a three-minute timer and answer a fresh prompt using the same structure.",
  "Underline the sentence that creates the clearest score impact.",
  "Can you identify what the judge is scoring?",
  "Can you explain the skill without using filler?",
  "Can you apply it under time pressure?",
  "To make the response easier to score and more strategically connected to the event criteria.",
  "Mastery means the skill is visible, purposeful, and tied to how the performance is evaluated.",
  // app/(app)/skills/[slug]/page.tsx -> absent-field substitutes
  "Identify the skill in a realistic prompt.",
  "Explain why the stronger answer works.",
  "Revise a weaker response into a competitive version.",
  "Complete one rep slowly. Name the goal, write a response, then compare it to the score category this lesson supports.",
  "Set a short timer and produce the skill without notes.",
  "Log one weakness to target in your next practice test or judged round.",
  "Can you name the goal of this skill?",
  "Can you use it under time pressure?",
  "Can you explain how it improves your score?",
  "This lesson introduces the skill, shows what strong execution looks like, and gives you a repeatable pattern for practice."
] as const;

// --- validator ----------------------------------------------------------------------------------

function issue(
  code: EducationIssueCode,
  subject: string,
  message: string,
  severity: EducationValidationIssue["severity"] = "error"
): EducationValidationIssue {
  return { code, severity, subject, message };
}

function isBlank(value: string | null | undefined): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

// --- concept-education-lesson source integrity (M13E1B) -------------------------------------------
//
// Validated at RUNTIME, never on the strength of the declared type. A migrated lesson renders its
// source directly to a learner, so an empty objective or a question whose stored answer is not among
// its choices must be a named failure here rather than an empty section or an unanswerable check on
// the page.

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Returns the reasons this value is not a usable deterministic question. Empty means valid. */
function questionDefects(value: unknown): string[] {
  const defects: string[] = [];
  if (!isRecord(value)) return ["not an object"];
  if (!nonEmptyString(value.prompt)) defects.push("empty prompt");
  const choices = value.choices;
  if (!Array.isArray(choices) || choices.length < 2) {
    defects.push("fewer than two choices");
  } else if (!choices.every(nonEmptyString)) {
    defects.push("a choice is empty");
  }
  if (!nonEmptyString(value.correctAnswer)) {
    defects.push("no stored correct answer");
  } else if (Array.isArray(choices)) {
    const matches = choices.filter((choice) => choice === value.correctAnswer).length;
    if (matches === 0) defects.push("correct answer is not among the choices");
    if (matches > 1) defects.push("correct answer appears more than once among the choices");
  }
  if (!nonEmptyString(value.hint)) defects.push("empty hint");
  if (!nonEmptyString(value.explanation)) defects.push("empty explanation");
  if (!nonEmptyString(value.skillTag)) defects.push("empty skill tag");
  return defects;
}

/** Returns the missing structural fields of a concept source. Empty means complete. */
function conceptSourceGaps(source: unknown): string[] {
  if (!isRecord(source)) return ["source is not an object"];
  const gaps: string[] = [];
  const lesson = source.lesson;
  if (!isRecord(lesson)) return ["lesson"];
  if (!nonEmptyString(lesson.title)) gaps.push("lesson.title");
  const content = lesson.content;
  if (!isRecord(content)) return [...gaps, "lesson.content"];
  if (!nonEmptyString(content.objective)) gaps.push("objective");
  if (!nonEmptyString(content.explanation)) gaps.push("explanation");
  if (!nonEmptyString(content.whyMatters)) gaps.push("whyMatters");
  if (!Array.isArray(content.steps) || content.steps.length === 0 || !content.steps.every(nonEmptyString)) {
    gaps.push("steps");
  }
  const worked = content.workedExample;
  if (!isRecord(worked)) {
    gaps.push("workedExample");
  } else {
    for (const field of ["prompt", "weakAnswer", "strongAnswer", "whyItWorks"]) {
      if (!nonEmptyString(worked[field])) gaps.push(`workedExample.${field}`);
    }
  }
  if (!isRecord(content.guidedQuestion)) gaps.push("guidedQuestion");
  if (!Array.isArray(content.practiceQuestions) || content.practiceQuestions.length === 0) gaps.push("practiceQuestions");
  if (!Array.isArray(content.masteryCheck) || content.masteryCheck.length === 0) gaps.push("masteryCheck");
  return gaps;
}

/** Every deterministic question on a concept source, in render order. */
function conceptQuestions(source: unknown): Array<{ label: string; value: unknown }> {
  if (!isRecord(source) || !isRecord(source.lesson) || !isRecord(source.lesson.content)) return [];
  const content = source.lesson.content;
  const out: Array<{ label: string; value: unknown }> = [];
  if (content.guidedQuestion !== undefined) out.push({ label: "guided check", value: content.guidedQuestion });
  if (Array.isArray(content.practiceQuestions)) {
    content.practiceQuestions.forEach((q, i) => out.push({ label: `independent check ${i + 1}`, value: q }));
  }
  if (Array.isArray(content.masteryCheck)) {
    content.masteryCheck.forEach((q, i) => out.push({ label: `final check ${i + 1}`, value: q }));
  }
  return out;
}

/** Walks `prerequisiteId` from `startId` and reports whether it re-enters a module already seen. */
function prerequisiteCycleFrom(
  startId: string,
  prerequisiteById: ReadonlyMap<string, string | null>
): boolean {
  const visited = new Set<string>();
  let current: string | null = startId;
  while (current !== null) {
    if (visited.has(current)) return true;
    visited.add(current);
    const next: string | null | undefined = prerequisiteById.get(current);
    if (next === undefined) return false; // unknown prerequisite — reported by its own rule
    current = next;
  }
  return false;
}

export function validateEducationRegistry(input: EducationRegistryInput): EducationValidationIssue[] {
  const issues: EducationValidationIssue[] = [];
  const { courses, modules, lessons, aliases } = input;

  const courseById = new Map(courses.map((course) => [course.id, course]));
  const moduleById = new Map(modules.map((entry) => [entry.id, entry]));
  const lessonById = new Map(lessons.map((entry) => [entry.id, entry]));

  // ---- 1-3. duplicate ids ----------------------------------------------------------------------
  const seenCourseIds = new Set<string>();
  for (const course of courses) {
    if (seenCourseIds.has(course.id)) {
      issues.push(issue("DUPLICATE_COURSE_ID", course.id, `Course id "${course.id}" is registered more than once.`));
    }
    seenCourseIds.add(course.id);
    if (isBlank(course.label)) {
      issues.push(issue("EMPTY_METADATA", course.id, `Course "${course.id}" has no label.`));
    }
    if (!EDUCATION_TRACKS.includes(course.track)) {
      issues.push(issue("UNSUPPORTED_TRACK", course.id, `Course "${course.id}" names unsupported track "${course.track}".`));
    }
  }

  const seenModuleIds = new Set<string>();
  for (const entry of modules) {
    if (seenModuleIds.has(entry.id)) {
      issues.push(issue("DUPLICATE_MODULE_ID", entry.id, `Module id "${entry.id}" is registered more than once.`));
    }
    seenModuleIds.add(entry.id);
    if (isBlank(entry.outcome)) {
      issues.push(issue("EMPTY_METADATA", entry.id, `Module "${entry.id}" has no outcome.`));
    }
    if (!EDUCATION_TRACKS.includes(entry.track)) {
      issues.push(issue("UNSUPPORTED_TRACK", entry.id, `Module "${entry.id}" names unsupported track "${entry.track}".`));
    }
    const course = courseById.get(entry.courseId);
    if (!course) {
      issues.push(issue("UNKNOWN_COURSE", entry.id, `Module "${entry.id}" references unknown course "${entry.courseId}".`));
    } else if (course.track !== entry.track) {
      issues.push(
        issue("MODULE_TRACK_MISMATCH", entry.id, `Module "${entry.id}" is ${entry.track} but its course "${course.id}" is ${course.track}.`)
      );
    }
  }

  // ---- 8-9. prerequisites ----------------------------------------------------------------------
  const prerequisiteById = new Map<string, string | null>(modules.map((entry) => [entry.id, entry.prerequisiteId]));
  for (const entry of modules) {
    if (entry.prerequisiteId !== null && !moduleById.has(entry.prerequisiteId)) {
      issues.push(
        issue("UNKNOWN_PREREQUISITE", entry.id, `Module "${entry.id}" requires unknown module "${entry.prerequisiteId}".`)
      );
      continue;
    }
    if (prerequisiteCycleFrom(entry.id, prerequisiteById)) {
      issues.push(issue("PREREQUISITE_CYCLE", entry.id, `Module "${entry.id}" is part of a prerequisite cycle.`));
    }
  }

  // ---- course -> module back-reference ---------------------------------------------------------
  for (const course of courses) {
    for (const moduleId of course.moduleIds) {
      if (!moduleById.has(moduleId)) {
        issues.push(issue("UNKNOWN_MODULE", course.id, `Course "${course.id}" lists unknown module "${moduleId}".`));
      }
    }
  }

  // ---- lessons ---------------------------------------------------------------------------------
  const seenLessonIds = new Set<string>();
  const sourceObjects = new Set<object>();
  const skillSlugByModule = new Map<string, Set<string>>();

  for (const entry of lessons) {
    if (seenLessonIds.has(entry.id)) {
      issues.push(issue("DUPLICATE_LESSON_ID", entry.id, `Lesson id "${entry.id}" is registered more than once.`));
    }
    seenLessonIds.add(entry.id);

    if (isBlank(entry.id)) {
      issues.push(issue("EMPTY_METADATA", entry.id, "A lesson entry has an empty id."));
    }
    if (!EDUCATION_TRACKS.includes(entry.track)) {
      issues.push(issue("UNSUPPORTED_TRACK", entry.id, `Lesson "${entry.id}" names unsupported track "${entry.track}".`));
    }

    // ---- 24-25. source object ------------------------------------------------------------------
    if (!isRecord(entry.source)) {
      issues.push(issue("MISSING_SOURCE", entry.id, `Lesson "${entry.id}" has no source lesson object.`));
    } else {
      if (sourceObjects.has(entry.source)) {
        issues.push(
          issue("DUPLICATE_SOURCE_OBJECT", entry.id, `Lesson "${entry.id}" registers a source object already registered by another entry.`)
        );
      }
      sourceObjects.add(entry.source);
    }

    // ---- 4-7. course / module references -------------------------------------------------------
    const course = courseById.get(entry.courseId);
    if (!course) {
      issues.push(issue("UNKNOWN_COURSE", entry.id, `Lesson "${entry.id}" references unknown course "${entry.courseId}".`));
    } else if (course.track !== entry.track) {
      issues.push(
        issue("COURSE_TRACK_MISMATCH", entry.id, `Lesson "${entry.id}" is ${entry.track} but course "${course.id}" is ${course.track}.`)
      );
    }

    const moduleEntry = moduleById.get(entry.moduleId);
    if (!moduleEntry) {
      issues.push(issue("UNKNOWN_MODULE", entry.id, `Lesson "${entry.id}" references unknown module "${entry.moduleId}".`));
    } else if (moduleEntry.track !== entry.track) {
      issues.push(
        issue("MODULE_TRACK_MISMATCH", entry.id, `Lesson "${entry.id}" is ${entry.track} but module "${moduleEntry.id}" is ${moduleEntry.track}.`)
      );
    }

    // ---- 10-11. next lesson --------------------------------------------------------------------
    if (entry.nextLessonId !== null) {
      const next = lessonById.get(entry.nextLessonId);
      if (!next) {
        issues.push(issue("UNKNOWN_NEXT_LESSON", entry.id, `Lesson "${entry.id}" points at unknown next lesson "${entry.nextLessonId}".`));
      } else if (next.track !== entry.track) {
        issues.push(
          issue("NEXT_LESSON_TRACK_MISMATCH", entry.id, `Lesson "${entry.id}" (${entry.track}) points at "${next.id}" (${next.track}).`)
        );
      }
    }

    // ---- 12-13. provenance ---------------------------------------------------------------------
    if (!isRecord(entry.provenance) || typeof entry.provenance.authority !== "string") {
      issues.push(issue("MISSING_PROVENANCE", entry.id, `Lesson "${entry.id}" carries no usable provenance metadata.`));
    } else if (entry.visibility === "learner") {
      // The production decision layer is the authority — not a mirrored copy of its rules.
      const presented = presentSourceFreshness(entry.provenance);
      if (presented.degraded) {
        issues.push(
          issue(
            "INVALID_LEARNER_PROVENANCE",
            entry.id,
            `Lesson "${entry.id}" is learner-visible but its provenance degrades to "${presented.authority}".`
          )
        );
      }
    }

    // ---- 14-16. practice evidence --------------------------------------------------------------
    if (entry.variant === "concept" && entry.practiceState !== "available") {
      issues.push(
        issue("CONCEPT_WITHOUT_PRACTICE", entry.id, `Concept lesson "${entry.id}" declares practiceState "${entry.practiceState}".`)
      );
    }
    // What counts as practice evidence depends on the source kind. A legacy authored lesson carries
    // a `practice` object; a migrated catalog lesson carries its own deterministic questions.
    if (entry.variant === "concept" && entry.practiceState === "available") {
      const hasEvidence = isConceptEducationLessonEntry(entry)
        ? conceptQuestions(entry.source).length > 0
        : sourceHasPractice(entry.source);
      if (!hasEvidence) {
        issues.push(issue("CONCEPT_WITHOUT_PRACTICE", entry.id, `Concept lesson "${entry.id}" has no practice definition on its source.`));
      }
    }
    if (entry.practiceState === "available" && entry.variant === "performance") {
      const status = sourcePracticeStatus(entry.source);
      if (!sourceHasPractice(entry.source) || status !== "available") {
        issues.push(
          issue(
            "AVAILABLE_WITHOUT_PRACTICE_EVIDENCE",
            entry.id,
            `Lesson "${entry.id}" claims available practice, but its source has practiceStatus "${String(status)}" and ${sourceHasPractice(entry.source) ? "a" : "no"} practice definition.`
          )
        );
      }
    }
    if (entry.practiceState === "temporarily-unavailable") {
      if (sourceHasPractice(entry.source)) {
        issues.push(
          issue(
            "UNAVAILABLE_WITH_INTERACTIVE_PRACTICE",
            entry.id,
            `Lesson "${entry.id}" is withdrawn but its source still carries an interactive practice definition.`
          )
        );
      }
      if (!sourceHasUnavailableNotice(entry.source)) {
        issues.push(
          issue(
            "UNAVAILABLE_WITH_INTERACTIVE_PRACTICE",
            entry.id,
            `Lesson "${entry.id}" is withdrawn but its source carries no learner-facing unavailable notice.`
          )
        );
      }
    }

    // ---- concept-education-lesson source integrity (M13E1B) ------------------------------------
    if (isConceptEducationLessonEntry(entry)) {
      const source: unknown = entry.source;
      const slug = isRecord(source) && typeof source.slug === "string" ? source.slug : null;
      if (slug !== entry.id) {
        issues.push(
          issue(
            "CONCEPT_SOURCE_SLUG_MISMATCH",
            entry.id,
            `Lesson "${entry.id}" wraps a catalog entry whose slug is "${String(slug)}".`
          )
        );
      }
      const gaps = conceptSourceGaps(source);
      if (gaps.length > 0) {
        issues.push(
          issue("CONCEPT_SOURCE_INCOMPLETE", entry.id, `Lesson "${entry.id}" is missing ${gaps.join(", ")}.`)
        );
      }
      for (const { label, value } of conceptQuestions(source)) {
        const defects = questionDefects(value);
        if (defects.length > 0) {
          issues.push(
            issue("CONCEPT_QUESTION_INVALID", entry.id, `Lesson "${entry.id}" ${label}: ${defects.join(", ")}.`)
          );
        }
      }
    }

    // ---- 17. rung cap --------------------------------------------------------------------------
    if (course && course.maxRung !== undefined && entry.maximumRung !== undefined && entry.maximumRung > course.maxRung) {
      issues.push(
        issue("MAX_RUNG_EXCEEDED", entry.id, `Lesson "${entry.id}" allows rung ${entry.maximumRung} but course "${course.id}" caps at ${course.maxRung}.`)
      );
    }

    // ---- 18. skill-slug uniqueness -------------------------------------------------------------
    // Uniqueness is required PER MODULE: one module is one outcome, so a skill may not be claimed
    // twice inside it. Different modules may legitimately drill the same skill at different rungs,
    // so this is deliberately not a registry-wide rule.
    if (entry.skillSlug !== undefined && entry.visibility === "learner") {
      const claimed = skillSlugByModule.get(entry.moduleId) ?? new Set<string>();
      if (claimed.has(entry.skillSlug)) {
        issues.push(
          issue("DUPLICATE_SKILL_SLUG", entry.id, `Skill "${entry.skillSlug}" is claimed twice inside module "${entry.moduleId}".`)
        );
      }
      claimed.add(entry.skillSlug);
      skillSlugByModule.set(entry.moduleId, claimed);
    }

    // ---- 19. generic filler --------------------------------------------------------------------
    const strings: string[] = [];
    collectStrings(entry.source, strings, new Set<object>(), 0);
    const haystack = strings.join("\n");
    for (const signature of EDUCATION_GENERIC_FILLER_SIGNATURES) {
      if (haystack.includes(signature)) {
        issues.push(
          issue("GENERIC_FILLER_TEXT", entry.id, `Lesson "${entry.id}" contains generated seed-template text: "${signature}".`)
        );
      }
    }
  }

  // ---- 20-21 + alias integrity -----------------------------------------------------------------
  const resolvableLessonIds = new Set<string>();
  const resolvableSkillSlugs = new Set<string>();
  for (const entry of lessons) {
    resolvableLessonIds.add(entry.id);
    for (const legacy of entry.legacySlugs) resolvableLessonIds.add(legacy);
    if (entry.skillSlug !== undefined) resolvableSkillSlugs.add(entry.skillSlug);
  }

  const targetByLegacySlug = new Map<string, string>();
  for (const alias of aliases) {
    if (isBlank(alias.legacySlug)) {
      issues.push(issue("EMPTY_METADATA", alias.target, "An alias has an empty legacy slug."));
      continue;
    }
    if (isBlank(alias.target)) {
      issues.push(issue("ALIAS_EMPTY_TARGET", alias.legacySlug, `Alias "${alias.legacySlug}" has an empty target.`));
      continue;
    }
    if (alias.legacySlug === alias.target) {
      issues.push(issue("ALIAS_SELF_CYCLE", alias.legacySlug, `Alias "${alias.legacySlug}" points at itself.`));
    }
    const existing = targetByLegacySlug.get(alias.legacySlug);
    if (existing !== undefined) {
      issues.push(
        existing === alias.target
          ? issue("ALIAS_COLLISION", alias.legacySlug, `Alias "${alias.legacySlug}" is registered more than once.`)
          : issue("ALIAS_CONFLICTING_TARGET", alias.legacySlug, `Alias "${alias.legacySlug}" targets both "${existing}" and "${alias.target}".`)
      );
    }
    targetByLegacySlug.set(alias.legacySlug, alias.target);

    if (resolvableLessonIds.has(alias.legacySlug)) {
      issues.push(
        issue("ALIAS_COLLISION", alias.legacySlug, `Alias "${alias.legacySlug}" shadows a canonical lesson id.`)
      );
    }

    const resolves =
      alias.targetKind === "lesson" ? resolvableLessonIds.has(alias.target) : resolvableSkillSlugs.has(alias.target);

    if (alias.status === "active" && !resolves) {
      issues.push(
        issue("ALIAS_UNKNOWN_TARGET", alias.legacySlug, `Active alias "${alias.legacySlug}" targets unknown ${alias.targetKind} "${alias.target}".`)
      );
    }
    // A planned alias whose target has since landed must be promoted deliberately, never resolved
    // by accident. Reported so the promotion is an explicit edit in the slice that lands the target.
    if (alias.status === "planned" && resolves) {
      issues.push(
        issue(
          "ALIAS_PLANNED_RESOLVABLE",
          alias.legacySlug,
          `Planned alias "${alias.legacySlug}" now resolves to ${alias.targetKind} "${alias.target}" and should be promoted to active.`,
          "warning"
        )
      );
    }
  }

  return issues;
}

/** Throws a deterministic, fully enumerated error when any error-severity issue is present. */
export function assertEducationRegistryValid(input: EducationRegistryInput): void {
  const issues = validateEducationRegistry(input);
  const errors = issues.filter((item) => item.severity === "error");
  if (errors.length > 0) {
    const detail = errors.map((item) => `${item.code} [${item.subject}] ${item.message}`).join("\n  ");
    throw new Error(`Education registry is invalid (${errors.length} error(s)):\n  ${detail}`);
  }
}
