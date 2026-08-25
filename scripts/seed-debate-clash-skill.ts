/**
 * Debate clash skill activation. Operational script — run deliberately, never by CI.
 *
 *   npm run debate:clash:activate              # dry run: prints the plan, touches NOTHING
 *   npm run debate:clash:activate -- --apply   # performs the write
 *
 * WHY THIS EXISTS. `lib/debate-drills.ts` maps the `clash` drill area to the `debate-clash` Skill,
 * but `prisma/seed.ts` does not create that row (deliberately — the bootstrap seed rewrites far
 * more than one row, and the database is shared with production). Until the row exists,
 * `recordDrillMasteryDetailed` returns `skill-missing` and a learner drilling clash correctly gets
 * told nothing was recorded. This script creates exactly that one row.
 *
 * Same contract as `scripts/seed-deca-drill-skills.ts`, the accepted precedent:
 *
 * 1. THE DRY RUN NEVER TOUCHES THE DATABASE. Not "does not write" — does not CONNECT. The Prisma
 *    client is imported DYNAMICALLY, below the dry-run return, so a default run cannot construct a
 *    client, open a connection, or issue a query. There is deliberately NO top-level database
 *    import anywhere in this file. The dry run reports purely from the static plan below, which is
 *    why it says `would create` regardless of what exists.
 *
 * 2. APPLY FAILS CLOSED. It creates a missing row and verifies an existing one; it NEVER updates.
 *    A field mismatch is reported by name (never by stored value) and exits non-zero, and nothing
 *    is written.
 *
 * SAFETY, deliberately:
 *   - dry run is the DEFAULT; `--apply` is required to write
 *   - exactly one row, written out in full below — no loop over a catalog, no backfill
 *   - only `Skill` is touched: no Lesson, User, MasteryProgress, XP, achievement, rubric or
 *     assignment. No delete, no rename, no data migration, no update of any kind.
 *   - safe to re-run: an exact existing row reports `already present` and exits zero
 *   - never imports `prisma/seed.ts`
 *   - never prints a connection string, credential or environment value
 *   - exits non-zero on any conflict or failure
 */

/** The exact fields this script owns. A row matches only if ALL of them match. */
export type ActivationSkill = {
  slug: string;
  name: string;
  description: string;
  organization: "DEBATE";
  track: "DEBATE";
  order: number;
};

/**
 * The one row, written out in full.
 *
 * The slug must match `DRILL_AREAS`' clash entry in `lib/debate-drills.ts`; slug and name must
 * match `ACTIVATION_PENDING_SKILLS` in `lib/education/skills-compat.ts`. Both correspondences are
 * asserted by `scripts/seed-debate-clash-skill-smoke.ts` against the real modules — but it is a
 * literal here so that reading this file tells you exactly what it will do. `order: 0` matches the
 * four seeded Debate skills, which `prisma/seed.ts` creates without an explicit order.
 */
export const ACTIVATION_SKILLS: readonly ActivationSkill[] = [
  {
    slug: "debate-clash",
    name: "Clash",
    description: "Identify the real point of disagreement and choose the response that directly engages it.",
    organization: "DEBATE",
    track: "DEBATE",
    order: 0
  }
] as const;

/** The shape read back from the database, limited to the fields this script owns. */
export type ExistingSkillRow = {
  slug: string;
  name: string;
  description: string;
  organization: string;
  track: string;
  order: number;
};

export type ActivationVerdict =
  | { action: "create" }
  | { action: "already-present" }
  | { action: "conflict"; fields: string[] };

/**
 * The whole decision, as a pure function — no database, no I/O, so the smoke suite exercises the
 * REAL rule rather than a copy of it.
 *
 * There is no "update" outcome on purpose. If a row exists under this slug but disagrees on any
 * owned field, that is someone else's row or a changed intent; either way this script is not
 * entitled to overwrite it.
 */
export function classifyActivationRow(approved: ActivationSkill, existing: ExistingSkillRow | null): ActivationVerdict {
  if (!existing) return { action: "create" };
  const fields: string[] = [];
  if (existing.slug !== approved.slug) fields.push("slug");
  if (existing.name !== approved.name) fields.push("name");
  if (existing.description !== approved.description) fields.push("description");
  if (existing.organization !== approved.organization) fields.push("organization");
  if (existing.track !== approved.track) fields.push("track");
  if (existing.order !== approved.order) fields.push("order");
  return fields.length === 0 ? { action: "already-present" } : { action: "conflict", fields };
}

/**
 * The dry-run report, built from the static plan ONLY.
 *
 * Pure and synchronous by design: it cannot read the database, so it cannot report what exists. It
 * says `would create`, which is the honest description of a plan formed without looking. Whether
 * the row already exists is answered by `--apply`, which reports `already present` after a real
 * read.
 */
export function buildDryRunReport(): string[] {
  return [
    "Debate clash skill activation — DRY RUN (no database connection, no query, no write)",
    `Rows in scope: ${ACTIVATION_SKILLS.length}. Tables touched by --apply: Skill only.`,
    "",
    ...ACTIVATION_SKILLS.map((skill) => `  would create   ${skill.slug}  (${skill.name})`),
    "",
    `Dry run: ${ACTIVATION_SKILLS.length} row planned. Nothing was read and nothing was written.`,
    "This run never opened a database connection, so it cannot say whether the row already exists.",
    "Re-run with:  npm run debate:clash:activate -- --apply"
  ];
}

/** The `Skill` columns this script reads back. Nothing else is selected. */
const SELECT_OWNED_FIELDS = {
  slug: true,
  name: true,
  description: true,
  organization: true,
  track: true,
  order: true
} as const;

async function applyActivation(): Promise<number> {
  // DYNAMIC import, below the dry-run return in main(). Nothing above this line can reach a
  // database client, which is what makes the default run structurally incapable of connecting.
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  let created = 0;
  let present = 0;
  let conflicts = 0;

  try {
    for (const approved of ACTIVATION_SKILLS) {
      const existing = (await prisma.skill.findUnique({
        where: { slug: approved.slug },
        select: SELECT_OWNED_FIELDS
      })) as ExistingSkillRow | null;

      const verdict = classifyActivationRow(approved, existing);

      if (verdict.action === "already-present") {
        console.log(`  already present   ${approved.slug}  (${approved.name})`);
        present += 1;
        continue;
      }

      if (verdict.action === "conflict") {
        // Field NAMES only — never the stored values, which are someone else's data.
        console.error(`  CONFLICT          ${approved.slug}  — differs on: ${verdict.fields.join(", ")}`);
        console.error("                    no write was made; this row belongs to something else or intent changed");
        conflicts += 1;
        break;
      }

      try {
        await prisma.skill.create({ data: { ...approved } });
        console.log(`  created           ${approved.slug}  (${approved.name})`);
        created += 1;
      } catch {
        // A concurrent run may have created the row between the read and the create. Re-read and
        // decide again from the same rule — accept only an exact match.
        const refetched = (await prisma.skill.findUnique({
          where: { slug: approved.slug },
          select: SELECT_OWNED_FIELDS
        })) as ExistingSkillRow | null;

        if (!refetched) {
          console.error(`  FAILED            ${approved.slug}  — create did not succeed and no row is present`);
          conflicts += 1;
          break;
        }
        const raceVerdict = classifyActivationRow(approved, refetched);
        if (raceVerdict.action === "already-present") {
          console.log(`  already present   ${approved.slug}  (${approved.name})  [created concurrently]`);
          present += 1;
          continue;
        }
        console.error(
          `  CONFLICT          ${approved.slug}  — created concurrently and differs on: ` +
            `${raceVerdict.action === "conflict" ? raceVerdict.fields.join(", ") : "unknown"}`
        );
        conflicts += 1;
        break;
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\nApplied: ${created} created, ${present} already present, ${conflicts} conflict(s).`);
  if (conflicts > 0) {
    console.error("Activation stopped at a conflict. Nothing was overwritten; re-running after the");
    console.error("conflict is resolved is safe and idempotent.");
    return 1;
  }
  return 0;
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  if (!argv.includes("--apply")) {
    for (const line of buildDryRunReport()) console.log(line);
    return 0;
  }
  return applyActivation();
}

// Invoked directly (tsx scripts/seed-debate-clash-skill.ts). Never wired into CI, build, deploy,
// or package lifecycle hooks — the npm script alias exists for humans only. The guard matches the
// exact entry filename so that IMPORTING this module (the smoke does) never runs it: an earlier
// substring match also matched the smoke's own path and made the smoke exit before asserting.
if (process.argv[1] && /seed-debate-clash-skill\.ts$/.test(process.argv[1])) {
  main().then((code) => process.exit(code));
}
