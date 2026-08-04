// Canonical slug-alias contract (M13E1A) — DATA ONLY.
//
// Nothing consumes this file in E1A. No route resolves through it, no redirect exists, and no
// historical link is fixed by its presence. It records, in one reviewable place, which previously
// published slugs a future slice must keep working — and, just as importantly, which ones point at
// something that does not exist yet.
//
// The four entries below are the lesson slugs the post-round debate judge recommends
// (`recommendationForStudent` in `lib/debate-judge-analysis.ts`). They are stored inside historical
// judge reports, so a future fix cannot simply stop emitting them.
//
// Status rule, applied strictly:
//
//   `active`  — the target resolves inside the canonical registry TODAY.
//   `planned` — the target does not resolve yet. It is recorded, and it resolves nothing.
//
// Only `debate-claim-building` is currently carried by a registered lesson, so it is the only
// active alias. `debate-rebuttal` and `debate-weighing` are seeded skills but no registered lesson
// claims them yet; `debate-signposting` does not exist at all. All three are `planned`, and the
// validator will flag any of them the moment its target becomes resolvable, so promotion is a
// deliberate edit rather than a silent change of meaning.

import type { EducationSlugAlias } from "@/lib/education/types";

export const EDUCATION_SLUG_ALIASES: readonly EducationSlugAlias[] = [
  {
    legacySlug: "debate-claim-warrant-impact-lesson",
    target: "debate-claim-building",
    targetKind: "skill",
    status: "active",
    note: "Post-round judge recommendation. Its skill is carried by the registered Claim/Warrant/Impact lesson."
  },
  {
    legacySlug: "debate-refutation-lesson",
    target: "debate-rebuttal",
    targetKind: "skill",
    status: "active",
    note: "Post-round judge recommendation. The learner-visible `debate-refutation` lesson now carries skillSlug `debate-rebuttal`, so this target resolves. Still DATA ONLY: no route consumes this map, so the historical /skills/debate-refutation-lesson link is not repaired by this entry."
  },
  {
    legacySlug: "debate-weighing-lesson",
    target: "debate-weighing",
    targetKind: "skill",
    status: "planned",
    note: "Post-round judge recommendation. `debate-weighing` is a seeded skill, but no registered lesson carries it yet."
  },
  {
    legacySlug: "debate-signposting-lesson",
    target: "debate-signposting",
    targetKind: "skill",
    status: "planned",
    note: "Post-round judge recommendation. `debate-signposting` is not a seeded skill and not a registered lesson."
  }
] as const;
