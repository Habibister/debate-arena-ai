// Legacy `/skills` compatibility layer (M13E1C).
//
// `/skills` predates the canonical education system. Its detail page rendered `prisma/seed.ts`
// template text as if it were instruction, its index was a hardcoded nine-item fiction, and any
// slug at all — DECA, HOSA, retired Model UN, or a typo — fell through to Claim/Warrant/Impact
// debate writing practice. None of that could be deleted outright: coaches' assignments store a
// seeded lesson slug in `Assignment.targetId` with NO foreign key, stored judge reports carry four
// now-deprecated slugs, and practice-test recommendations and review links use the same space.
//
// So this module answers one question for every legacy URL: is there real authored instruction
// behind it, or not? If there is, the URL redirects to its canonical `/lessons` home. If there is
// not, it renders an honest compatibility page that says so — and never invents teaching to fill
// the gap.
//
// NO DATABASE. The manifest below is a static mirror of what `prisma/seed.ts` creates, so this
// layer resolves a slug without a query and without importing Prisma into a learner-facing module.
// `scripts/skills-compat-smoke.ts` parses `prisma/seed.ts` and proves exact set equality, so the
// mirror cannot drift silently.
//
// Pure: no React, no Prisma, no network, no filesystem, no environment, no browser API.

import { getEducationLesson, EDUCATION_LESSONS } from "@/lib/education/registry";
import { EDUCATION_SLUG_ALIASES } from "@/lib/education/slug-map";

/** The track a legacy record belongs to, including the soft-removed Model UN. */
export type CompatTrack = "DEBATE" | "DECA" | "HOSA" | "MODEL_UN";

export type CompatSkill = {
  slug: string;
  name: string;
  track: CompatTrack;
  /** Lesson slugs seeded under this skill, in `prisma/seed.ts` order. */
  lessonSlugs: readonly string[];
  lessonTitles: readonly string[];
};

/**
 * STATIC MIRROR of `prisma/seed.ts` — ten skills, thirty lessons.
 *
 * Names and titles are the seed's own, so a compatibility page can say what a record actually is
 * rather than guessing. No `content` is mirrored: the seed's generated teaching text is exactly
 * what this milestone removes from the learner's view.
 */
export const SEEDED_SKILLS: readonly CompatSkill[] = [
  {
    slug: "debate-claim-building", name: "Claim Building", track: "DEBATE",
    lessonSlugs: ["debate-claim-building-1", "debate-claim-building-2", "debate-claim-building-3"],
    lessonTitles: ["Claim, warrant, impact", "Turning a prompt into a position", "Writing concise contentions"]
  },
  {
    slug: "debate-evidence", name: "Evidence", track: "DEBATE",
    lessonSlugs: ["debate-evidence-1", "debate-evidence-2", "debate-evidence-3"],
    lessonTitles: ["Evidence quality signals", "Citation drills", "Weighing evidence against rebuttals"]
  },
  {
    slug: "debate-rebuttal", name: "Rebuttal", track: "DEBATE",
    lessonSlugs: ["debate-rebuttal-1", "debate-rebuttal-2", "debate-rebuttal-3"],
    lessonTitles: ["Flowing attacks", "Answering turns", "Collapsing to winning issues"]
  },
  {
    slug: "debate-weighing", name: "Weighing", track: "DEBATE",
    lessonSlugs: ["debate-weighing-1", "debate-weighing-2", "debate-weighing-3"],
    lessonTitles: ["Magnitude vs. probability", "Timeframe and reversibility", "Framework before impacts"]
  },
  {
    slug: "mun-resolution-writing", name: "Resolution Writing", track: "MODEL_UN",
    lessonSlugs: ["mun-resolution-writing-1", "mun-resolution-writing-2", "mun-resolution-writing-3"],
    lessonTitles: ["Preambulatory clauses", "Operative clause design", "Sponsor and signatory strategy"]
  },
  {
    slug: "mun-diplomacy", name: "Diplomacy", track: "MODEL_UN",
    lessonSlugs: ["mun-diplomacy-1", "mun-diplomacy-2", "mun-diplomacy-3"],
    lessonTitles: ["Opening caucus strategy", "Bloc leadership", "Conflict de-escalation"]
  },
  {
    slug: "deca-roleplay", name: "Roleplay", track: "DECA",
    lessonSlugs: ["deca-roleplay-1", "deca-roleplay-2", "deca-roleplay-3"],
    lessonTitles: ["Reading performance indicators", "Executive framing", "Closing with measurable outcomes"]
  },
  {
    slug: "deca-marketing", name: "Marketing", track: "DECA",
    lessonSlugs: ["deca-marketing-1", "deca-marketing-2", "deca-marketing-3"],
    lessonTitles: ["Segmentation basics", "Campaign mix", "Metrics that matter"]
  },
  {
    slug: "hosa-medical-terminology", name: "Medical Terminology", track: "HOSA",
    lessonSlugs: ["hosa-medical-terminology-1", "hosa-medical-terminology-2", "hosa-medical-terminology-3"],
    lessonTitles: ["Word roots", "Clinical abbreviations", "Terminology in patient scenarios"]
  },
  {
    slug: "hosa-patient-communication", name: "Patient Communication", track: "HOSA",
    lessonSlugs: ["hosa-patient-communication-1", "hosa-patient-communication-2", "hosa-patient-communication-3"],
    lessonTitles: ["Plain-language explanations", "Active listening", "Ethical patient conversations"]
  }
] as const;

/**
 * The ONLY legacy slugs that redirect to authored instruction.
 *
 * Hand-audited one at a time, never derived. `debate-claim-building-1` is titled "Claim, warrant,
 * impact" — it IS the canonical lesson's topic — and the two skill slugs are mapped because the
 * canonical registry itself records those `skillSlug` associations.
 *
 * Deliberately ABSENT: `debate-claim-building-2` ("Turning a prompt into a position"),
 * `-3` ("Writing concise contentions"), and all three `debate-rebuttal-*` ("Flowing attacks",
 * "Answering turns", "Collapsing to winning issues"). Each is a different subject from the
 * canonical lesson it sits nearest. A coach who assigned "Lesson 3" and a learner who opened a
 * silently different lesson would both be misled, and the URL would still look like it worked —
 * which is worse than saying plainly that the authored version does not exist yet.
 */
export const CANONICAL_REDIRECTS: Readonly<Record<string, string>> = {
  "debate-claim-building": "claim-warrant-impact",
  "debate-claim-building-1": "claim-warrant-impact",
  "debate-rebuttal": "debate-refutation"
};

/** Where a learner is sent when a legacy record has no authored instruction behind it. */
export const COMPAT_TRACK_DESTINATION: Readonly<Record<CompatTrack, { href: string; label: string }>> = {
  DEBATE: { href: "/lessons?track=debate", label: "See the Debate lessons" },
  DECA: { href: "/training/deca/practice", label: "Go to DECA role-play practice" },
  HOSA: { href: "/training/hosa/events", label: "Find your HOSA event" },
  // Model UN is soft-removed. The honest destination is the track chooser, never MUN content.
  MODEL_UN: { href: "/training", label: "Choose a training track" }
};

// --- lookups ------------------------------------------------------------------------------------

const SKILL_BY_SLUG = new Map(SEEDED_SKILLS.map((skill) => [skill.slug, skill]));
const LESSON_INDEX = new Map<string, { skill: CompatSkill; title: string; step: number }>();
for (const skill of SEEDED_SKILLS) {
  skill.lessonSlugs.forEach((slug, index) => {
    LESSON_INDEX.set(slug, { skill, title: skill.lessonTitles[index], step: index + 1 });
  });
}

/** Every slug the static manifest knows — the exact set `prisma/seed.ts` creates. */
export const SEEDED_SKILL_SLUGS: readonly string[] = SEEDED_SKILLS.map((s) => s.slug);
export const SEEDED_LESSON_SLUGS: readonly string[] = SEEDED_SKILLS.flatMap((s) => [...s.lessonSlugs]);

export function seededSkillBySlug(slug: string): CompatSkill | undefined {
  return SKILL_BY_SLUG.get(slug);
}

/** True when the slug is a seeded skill OR a seeded lesson — the compatibility-alias target space. */
export function isSeededSlug(slug: string): boolean {
  return SKILL_BY_SLUG.has(slug) || LESSON_INDEX.has(slug);
}

/** The canonical lesson id a slug resolves to, or null. Consulted before any compatibility state. */
function canonicalIdFor(slug: string): string | null {
  if (getEducationLesson(slug)) return slug;
  const entry = EDUCATION_LESSONS.find((candidate) => candidate.legacySlugs.includes(slug));
  if (entry) return entry.id;
  return CANONICAL_REDIRECTS[slug] ?? null;
}

// --- resolution ---------------------------------------------------------------------------------

export type SkillsCompatResolution =
  /** Authored instruction exists. The route sends a permanent redirect to its canonical home. */
  | { kind: "canonical-redirect"; lessonId: string; via: "direct" | "allowlist" | "alias" }
  /** A real seeded record with no authored instruction yet. The route renders the honest state. */
  | {
      kind: "compatibility";
      track: CompatTrack;
      /** The seeded record's own name — a skill name, or a lesson title. */
      title: string;
      skillName: string;
      /** Present only for a lesson slug: its 1-based position in the seeded skill. */
      step: { index: number; total: number } | null;
      /** True only for Debate, where `/skills/[slug]/practice` is genuinely supported. */
      debatePracticeSupported: boolean;
      destination: { href: string; label: string };
    }
  /** Nothing in the canonical registry, the alias map, or the seed manifest. */
  | { kind: "unknown" };

/**
 * The single resolution order for `/skills/[slug]`, in priority order:
 *
 *   1. canonical lesson id (or a canonical entry's own legacySlug) -> redirect
 *   2. `active` alias, whose target must resolve canonically        -> redirect
 *   3. `compatibility-active` alias, whose target is seeded only    -> compatibility state
 *   4. seeded lesson or skill slug (allowlisted redirect, else)     -> compatibility state
 *   5. anything else                                                -> unknown (the route 404s)
 *
 * A `planned` alias is deliberately NOT a resolution rule. It resolves only if the slug happens to
 * satisfy one of the other rules on its own, which is what keeps "planned" from quietly behaving
 * like "active".
 */
export function resolveSkillsSlug(slug: string): SkillsCompatResolution {
  // 1. canonical, directly.
  if (getEducationLesson(slug)) return { kind: "canonical-redirect", lessonId: slug, via: "direct" };
  const byLegacy = EDUCATION_LESSONS.find((entry) => entry.legacySlugs.includes(slug));
  if (byLegacy) return { kind: "canonical-redirect", lessonId: byLegacy.id, via: "direct" };

  // 2-3. aliases, by status. An alias never invents a destination its status does not license.
  const alias = EDUCATION_SLUG_ALIASES.find((candidate) => candidate.legacySlug === slug);
  if (alias && alias.status === "active") {
    const canonical = canonicalIdFor(alias.target);
    if (canonical) return { kind: "canonical-redirect", lessonId: canonical, via: "alias" };
  }
  if (alias && alias.status === "compatibility-active") {
    const compat = compatibilityFor(alias.target);
    if (compat) return compat;
  }

  // 4. the seed manifest, allowlisted redirect first.
  const allowlisted = CANONICAL_REDIRECTS[slug];
  if (allowlisted) return { kind: "canonical-redirect", lessonId: allowlisted, via: "allowlist" };
  const compat = compatibilityFor(slug);
  if (compat) return compat;

  // 5. fail closed.
  return { kind: "unknown" };
}

function compatibilityFor(slug: string): SkillsCompatResolution | null {
  const skill = SKILL_BY_SLUG.get(slug);
  if (skill) {
    return {
      kind: "compatibility",
      track: skill.track,
      title: skill.name,
      skillName: skill.name,
      step: null,
      debatePracticeSupported: skill.track === "DEBATE",
      destination: COMPAT_TRACK_DESTINATION[skill.track]
    };
  }
  const lesson = LESSON_INDEX.get(slug);
  if (lesson) {
    return {
      kind: "compatibility",
      track: lesson.skill.track,
      title: lesson.title,
      skillName: lesson.skill.name,
      step: { index: lesson.step, total: lesson.skill.lessonSlugs.length },
      debatePracticeSupported: lesson.skill.track === "DEBATE",
      destination: COMPAT_TRACK_DESTINATION[lesson.skill.track]
    };
  }
  return null;
}

/**
 * Whether `/skills/[slug]/practice` may serve Debate writing practice.
 *
 * Before M13E1C this route had no gate at all: `getDebateSkillScenario` fell back to
 * `debate-claim-building-1` for ANY input, so a HOSA learner clicking a due review was handed a
 * debate motion. Support is now decided here, by resolved track, and never by a default.
 */
export function debateWritingPracticeSupported(slug: string): boolean {
  const resolution = resolveSkillsSlug(slug);
  return resolution.kind === "compatibility" && resolution.debatePracticeSupported;
}

/** The track of a seeded slug, for callers that only need the safe destination. */
export function compatTrackForSlug(slug: string): CompatTrack | null {
  const resolution = resolveSkillsSlug(slug);
  return resolution.kind === "compatibility" ? resolution.track : null;
}
