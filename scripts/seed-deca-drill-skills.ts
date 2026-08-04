/**
 * DECA concept-drill skill activation (M13E1D). Operational script — run deliberately, never by CI.
 *
 *   npx tsx scripts/seed-deca-drill-skills.ts            # dry run: reports, writes NOTHING
 *   npx tsx scripts/seed-deca-drill-skills.ts --apply     # performs the writes
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
 * SAFETY, deliberately:
 *   - dry run is the DEFAULT; `--apply` is required to write
 *   - exactly three rows, named as literals below — no loop over a catalog, no backfill
 *   - `upsert` per row, independently: idempotent, and a partial run leaves the rest correct
 *   - only `Skill` is touched. No Lesson, no User, no MasteryProgress, no XP, no achievement, no
 *     rubric, no assignment. No delete, no rename, no data migration.
 *   - never imports `prisma/seed.ts`
 *   - never prints a connection string, credential or environment value
 *   - exits non-zero on any failure
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * The three rows, written out in full.
 *
 * Slugs must match `DECA_DRILL_AREAS[].skillSlug` in `lib/deca-drills.ts`; names must match
 * `ACTIVATION_PENDING_SKILLS` in `lib/education/skills-compat.ts`. Both correspondences are
 * asserted by `scripts/deca-mastery-smoke.ts` against the real modules, so this list cannot drift
 * away from what the application expects — but it is a literal here so that reading this file tells
 * you exactly what it will do.
 */
const SKILLS = [
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

async function main() {
  const apply = process.argv.includes("--apply");

  console.log(`DECA drill skill activation — ${apply ? "APPLY (writing)" : "DRY RUN (no writes)"}`);
  console.log(`Rows in scope: ${SKILLS.length}. Tables touched: Skill only.\n`);

  let created = 0;
  let present = 0;

  for (const skill of SKILLS) {
    const existing = await prisma.skill.findUnique({ where: { slug: skill.slug }, select: { id: true } });

    if (!apply) {
      console.log(`  ${existing ? "already present" : "would create  "}  ${skill.slug}  (${skill.name})`);
      if (existing) present += 1;
      else created += 1;
      continue;
    }

    // Idempotent and independent: re-running is safe, and one failure does not roll back the others.
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      update: {
        name: skill.name,
        description: skill.description,
        organization: skill.organization,
        track: skill.track
      },
      create: {
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        organization: skill.organization,
        track: skill.track,
        order: skill.order
      }
    });

    console.log(`  ${existing ? "already present" : "created       "}  ${skill.slug}  (${skill.name})`);
    if (existing) present += 1;
    else created += 1;
  }

  console.log(
    `\n${apply ? "Applied" : "Dry run"}: ${created} ${apply ? "created" : "would be created"}, ${present} already present.`
  );
  if (!apply) console.log("Nothing was written. Re-run with --apply to perform these writes.");
}

main()
  .catch((error) => {
    // Message only — never dump the error object, which can carry the connection string.
    console.error(`DECA drill skill activation FAILED: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
