// Smoke for the debate-clash activation script — NO database, NO env, NO network.
//
// The script's decision rule and dry-run report are exported pure functions, so this suite
// exercises the REAL rule. Everything with side effects (the Prisma client) is proven unreachable
// on the default path by SOURCE inspection, not by trusting a description.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ACTIVATION_SKILLS,
  buildDryRunReport,
  classifyActivationRow,
  main,
  type ExistingSkillRow
} from "./seed-debate-clash-skill";
import { ACTIVATION_PENDING_SKILLS } from "../lib/education/skills-compat";
import { DRILL_AREAS } from "../lib/debate-drills";

async function run() {
  // ---- 1. exactly one approved row, with the exact owner-approved identity ----------------------
  assert.equal(ACTIVATION_SKILLS.length, 1, "1. exactly one activation row");
  const row = ACTIVATION_SKILLS[0];
  assert.deepEqual(
    [row.slug, row.name, row.organization, row.track, row.order],
    ["debate-clash", "Clash", "DEBATE", "DEBATE", 0],
    "1b. the row is the approved debate-clash identity"
  );
  assert.ok(row.description.trim().length > 0, "1c. it carries its approved description");
  assert.ok(
    /point of disagreement|directly engages/.test(row.description),
    "1d. the description states the narrow measured construct, not live-performance mastery"
  );

  // ---- 2. manifest agreement: script literal <-> compat inventory <-> drill catalog -------------
  const pending = ACTIVATION_PENDING_SKILLS.find((s) => s.slug === "debate-clash");
  assert.ok(pending, "2. debate-clash is declared activation-pending in the compat inventory");
  assert.equal(pending!.name, row.name, "2b. inventory name matches the script literal");
  assert.equal(pending!.track, "DEBATE", "2c. inventory track is DEBATE");
  assert.deepEqual([...pending!.lessonSlugs], [],
    "2d. no manifest lessonSlugs are invented — the canonical registry id owns the lesson route");
  const area = DRILL_AREAS.find((a) => a.id === "clash");
  assert.ok(area, "2e. the clash drill area exists");
  assert.equal(area!.skillSlug, row.slug, "2f. the clash area is scored against exactly this skill");

  // ---- 3. create-or-verify decision rule, exercised for real ------------------------------------
  assert.deepEqual(classifyActivationRow(row, null), { action: "create" },
    "3. a missing row is created");
  const exact: ExistingSkillRow = { ...row };
  assert.deepEqual(classifyActivationRow(row, exact), { action: "already-present" },
    "3b. an exact existing row is verified, not rewritten");
  for (const field of ["slug", "name", "description", "organization", "track", "order"] as const) {
    const drifted: ExistingSkillRow = { ...row, [field]: field === "order" ? 99 : "something-else" };
    const verdict = classifyActivationRow(row, drifted);
    assert.equal(verdict.action, "conflict", `3c. a ${field} mismatch is a conflict, never an update`);
    assert.ok(verdict.action === "conflict" && verdict.fields.includes(field),
      `3d. and the conflict names the ${field} field`);
  }

  // ---- 4. the dry run is pure and honest --------------------------------------------------------
  const report = buildDryRunReport();
  assert.ok(report.some((l) => l.includes("would create   debate-clash")),
    "4. the dry run plans the one row");
  assert.ok(report.some((l) => l.includes("Nothing was read and nothing was written")),
    "4b. and says plainly that it neither read nor wrote");
  assert.equal(await main([]), 0, "4c. the default (dry-run) invocation exits zero without a database");

  // ---- 5. source-level safety: the default path is STRUCTURALLY unable to connect ---------------
  const src = readFileSync("scripts/seed-debate-clash-skill.ts", "utf8");
  assert.ok(!/^import .*@prisma\/client/m.test(src),
    "5. no top-level Prisma import exists anywhere in the file");
  assert.ok(/await import\("@prisma\/client"\)/.test(src),
    "5b. the client is imported dynamically, inside the apply path only");
  const applyIndex = src.indexOf("async function applyActivation");
  const importIndex = src.indexOf('await import("@prisma/client")');
  assert.ok(applyIndex >= 0 && importIndex > applyIndex,
    "5c. and that dynamic import lives below the apply boundary");
  assert.ok(/argv\.includes\("--apply"\)/.test(src),
    "5d. a write requires the explicit --apply flag");
  for (const banned of [".delete(", ".deleteMany(", ".update(", ".updateMany(", ".upsert(", "$executeRaw", "$queryRaw"]) {
    assert.ok(!src.includes(banned), `5e. the script contains no destructive/overwriting call (${banned})`);
  }
  assert.ok(!src.includes("process.env"), "5f. the script never reads the environment itself");
  assert.ok(!/import[^\n]*["'].*prisma\/seed/.test(src), "5g. it never imports the bootstrap seed");

  // ---- 6. never wired into CI/build/deploy/package hooks ----------------------------------------
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = pkg.scripts ?? {};
  assert.equal(scripts["debate:clash:activate"], "tsx scripts/seed-debate-clash-skill.ts",
    "6. the manual alias exists and points at the script");
  for (const [name, command] of Object.entries(scripts)) {
    if (name === "debate:clash:activate") continue;
    assert.ok(!command.includes("seed-debate-clash-skill.ts"),
      `6b. no other script (${name}) invokes the activation itself — the smoke alias runs only the smoke`);
  }
  for (const hook of ["prebuild", "postbuild", "preinstall", "postinstall", "prepare", "predeploy", "postdeploy"]) {
    assert.ok(!(hook in scripts) || !scripts[hook].includes("seed-debate-clash-skill"),
      `6c. lifecycle hook ${hook} does not run the activation`);
  }

  console.log(
    "Debate-clash activation-script smoke passed: exactly one approved row (debate-clash / Clash / " +
      "DEBATE, order 0) whose identity agrees with the compat inventory and the clash drill area; the " +
      "create-or-verify rule creates a missing row, verifies an exact one, and reports every single-field " +
      "drift as a named conflict with no update path; the default dry run is pure (exit 0, no Prisma " +
      "reachable: no top-level client import, dynamic import only below the apply boundary, --apply " +
      "required to write); the file contains no delete/update/upsert/raw call and reads no environment; " +
      "and the only package.json reference is the manual debate:clash:activate alias — no CI, build, or " +
      "lifecycle hook can ever run it."
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
