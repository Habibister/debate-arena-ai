// Canonical slug-alias contract (M13E1A) — DATA ONLY.
//
// M13E1C consumes this map: `lib/education/skills-compat.ts` resolves `/skills/[slug]` through it,
// so every entry below now has real route behaviour and each status licenses a different outcome.
// It records, in one reviewable place, which previously published slugs still work and how.
//
// The four entries below are the lesson slugs the post-round debate judge recommends
// (`recommendationForStudent` in `lib/debate-judge-analysis.ts`). They are stored inside historical
// judge reports, so a future fix cannot simply stop emitting them.
//
// Status rule, applied strictly:
//
//   `active`               — the target resolves in the canonical registry -> 308 to /lessons.
//   `compatibility-active` — the target is a seeded record only -> honest compatibility page.
//   `planned`              — the target resolves nowhere.
//
// All four now resolve canonically. `debate-weighing` was the exception until Wave 1B: its authored
// catalog lesson was HELD (it presented weighing categories as required speech vocabulary), so the
// alias honestly rendered a compatibility page. The recorded correction was applied and the lesson
// is published, so the alias now redirects like the other three — the validator itself forbids a
// compatibility status once the target resolves canonically (ALIAS_COMPAT_SHADOWS_CANONICAL).

import type { EducationSlugAlias } from "@/lib/education/types";

export const EDUCATION_SLUG_ALIASES: readonly EducationSlugAlias[] = [
  {
    legacySlug: "debate-claim-warrant-impact-lesson",
    target: "debate-claim-building",
    targetKind: "skill",
    status: "active",
    note: "Post-round judge recommendation. Its skill is carried by the registered Claim/Warrant/Impact lesson, so this redirects there."
  },
  {
    legacySlug: "debate-refutation-lesson",
    target: "debate-rebuttal",
    targetKind: "skill",
    status: "active",
    note: "Post-round judge recommendation. The learner-visible `debate-refutation` lesson carries skillSlug `debate-rebuttal`, so this target resolves canonically and /skills/debate-refutation-lesson now redirects to it."
  },
  {
    legacySlug: "debate-weighing-lesson",
    target: "debate-weighing",
    targetKind: "skill",
    status: "active",
    note: "Post-round judge recommendation. Wave 1B published the corrected weighing lesson as `debate-weighing`, so this target now resolves canonically and the alias redirects there instead of rendering the old compatibility page."
  },
  {
    legacySlug: "debate-signposting-lesson",
    target: "debate-signposting",
    targetKind: "lesson",
    status: "active",
    note: "Post-round judge recommendation. M13E1A recorded this as a `skill` target — a guess at a skill that never existed. M13E1B published `debate-signposting` as a canonical LESSON, so the kind is corrected here rather than the status merely flipped, and the alias redirects to that lesson."
  }
] as const;
