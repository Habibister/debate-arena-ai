/**
 * DECA concept-drill skill activation. Operational script — run deliberately, never by CI.
 *
 *   npm run deca:skills:activate              # dry run: prints the plan, touches NOTHING
 *   npm run deca:skills:activate -- --apply   # performs the writes
 *
 * WHY THIS EXISTS. `lib/deca-drills.ts` maps four drill areas to four Skill slugs, but only
 * `deca-marketing` was ever created by `prisma/seed.ts`. The other three have no row, so
 * `recordDrillMasteryDetailed` returns `skill-missing` and a learner drilling performance
 * indicators, business reasoning or customer relations correctly gets told nothing was recorded.
 * This creates exactly those three rows.
 *
 * WHY IT IS NOT IN `prisma/seed.ts`. That file is the demo/bootstrap seed and rewrites a great deal
 * more than three rows. The database is shared with production; this script touches `Skill` and
 * nothing else, so it can be read in full and reasoned about before anyone runs it.
 *
 * ── TWO PROPERTIES THIS FILE IS BUILT AROUND ────────────────────────────────────────────────────
 *
 * 1. THE DRY RUN NEVER TOUCHES THE DATABASE. Not "does not write" — does not CONNECT. The Prisma
 *    client is imported DYNAMICALLY, below the dry-run return, so a default run cannot construct a
 *    client, open a connection, or issue a query even if it wanted to. There is deliberately NO
 *    top-level database import anywhere in this file.
 *
 *    An earlier version read each row before checking the flag, so its "dry run" quietly issued
 *    three SELECTs against the shared production database and reported "already present" from live
 *    data. A rehearsal that contacts production is not a rehearsal. The dry run now reports purely
 *    from the static plan below, which is why it says `would create` for all three regardless of
 *    what exists.
 *
 * 2. APPLY FAILS CLOSED. It creates a missing row and verifies an existing one; it NEVER updates.
 *    An earlier version used `upsert`, whose update branch would have silently rewritten the name,
 *    description, organization and track of any row that already held one of these slugs — turning
 *    a real conflict (say, a row belonging to another track) into a silent reinterpretation. Now a
 *    field mismatch is reported and exits non-zero, and nothing is written.
 *
 * SAFETY, deliberately:
 *   - dry run is the DEFAULT; `--apply` is required to write
 *   - exactly three rows, written out in full below — no loop over a catalog, no backfill
 *   - each row is handled INDEPENDENTLY: no transaction, so one conflict cannot roll back a row
 *     that was already created correctly, and re-running remains safe
 *   - only `Skill` is touched: no Lesson, User, MasteryProgress, XP, achievement, rubric or
 *     assignment. No delete, no rename, no data migration, no update of any kind.
 *   - never imports `prisma/seed.ts`
 *   - never prints a connection string, credential or environment value
 *   - exits non-zero on any conflict or failure
 */

/** The exact fields this script owns. A row matches only if ALL of them match. */
export type ActivationSkill = {
  slug: string;
  name: string;
  description: string;
  organization: "DECA";
  track: "DECA";
  order: number;
};

/**
 * The three rows, written out in full.
 *
 * Slugs must match `DECA_DRILL_AREAS[].skillSlug` in `lib/deca-drills.ts`; slugs and names must
 * match `ACTIVATION_PENDING_SKILLS` in `lib/education/skills-compat.ts`. Both correspondences are
 * asserted by `scripts/deca-mastery-smoke.ts` against the real modules, so this list cannot drift
 * away from what the application expects — but it is a literal here so that reading this file tells
 * you exactly what it will do.
 */
export const ACTIVATION_SKILLS: readonly ActivationSkill[] = [
  {
    slug: "deca-performance-indicators",
    name: "Performance Indicators",
    description: "Identify what a performance indicator asks and address it explicitly.",
    organization: "DECA",
    track: "DECA",
    order: 20
  },
  {
    slug: "deca-business-reasoning",
    name: "Business Reasoning",
    description: "Reason about cost, feasibility, measurement, and ROI.",
    organization: "DECA",
    track: "DECA",
    order: 21
  },
  {
    slug: "deca-customer-relations",
    name: "Customer Relations",
    description: "Handle customers and service situations professionally.",
    organization: "DECA",
    track: "DECA",
    order: 22
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
 * There is no "update" outcome on purpose. If a row exists under one of these slugs but disagrees
 * on any owned field, that is someone else's row or a changed intent; either way this script is not
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
 * says `would create` for all three, which is the honest description of a plan formed without
 * looking. Whether a row already exists is answered by `--apply`, which reports `already present`
 * per row after a real read.
 */
export function buildDryRunReport(): string[] {
  return [
    "DECA drill skill activation — DRY RUN (no database connection, no query, no write)",
    `Rows in scope: ${ACTIVATION_SKILLS.length}. Tables touched by --apply: Skill only.`,
    "",
    ...ACTIVATION_SKILLS.map((skill) => `  would create   ${skill.slug}  (${skill.name})`),
    "",
    `Dry run: ${ACTIVATION_SKILLS.length} rows planned. Nothing was read and nothing was written.`,
    "This run never opened a database connection, so it cannot say which rows already exist.",
    "Re-run with:  npm run deca:skills:activate -- --apply"
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
    console.error("Activation stopped at a conflict. Rows created before it remain and are correct;");
    console.error("re-running after the conflict is resolved is safe and idempotent.");
    return 1;
  }
  return 0;
}

export async function main(argv: readonly string[]): Promise<number> {
  const apply = argv.includes("--apply");

  // ── THE DRY-RUN RETURN ────────────────────────────────────────────────────────────────────────
  // Everything above this point is argument parsing and a static array. No database client has been
  // imported or constructed, and none can be, because the only import that could is inside
  // applyActivation() below.
  if (!apply) {
    for (const line of buildDryRunReport()) console.log(line);
    return 0;
  }

  console.log("DECA drill skill activation — APPLY (writing)");
  console.log(`Rows in scope: ${ACTIVATION_SKILLS.length}. Tables touched: Skill only.\n`);
  return applyActivation();
}

// Run only when invoked as a script. Importing this file (as the smoke suite does, to exercise the
// real rule rather than a copy) must never start an activation.
const invokedDirectly = (process.argv[1] ?? "").includes("seed-deca-drill-skills");
if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      // Message only — never the error object, which can carry the connection string.
      console.error(`DECA drill skill activation FAILED: ${error instanceof Error ? error.message : "unknown error"}`);
      process.exitCode = 1;
    });
}
