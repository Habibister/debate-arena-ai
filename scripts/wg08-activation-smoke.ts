/**
 * WG-08 ACTIVATION SMOKE — strict-safe release proof for the B2.3 reactivation.
 *
 * WHY THIS FILE EXISTS. The assertions that mirror the Debate held set live in
 * `scripts/debate-drills-smoke.ts`, which is transitively env-tainted: its closure reaches
 * `@prisma/client` and dotenv-reads `<repo>/.env` at module scope, so it MUST NOT run during an
 * education/docs integrity audit. Its expectations were updated by this commit, but it was NOT
 * executed, and nothing here claims it passed. This suite exists so the release has an executable
 * proof that is safe under the accepted no-env controls.
 *
 * WHAT IT IMPORTS, AND WHY THAT IS SAFE. Only `lib/debate-drills` and `lib/deca-drills`. Neither
 * imports anything — no `@prisma/client`, no `lib/api`, no `lib/prisma` — so neither is an env
 * carrier. `scripts/seed-debate-clash-skill-smoke.ts`, a member of the accepted no-env set, already
 * imports `lib/debate-drills` on the same basis.
 *
 * WHAT IT PROVES. That the release is REAL rather than list-shrink: an item can vanish from the held
 * array and still never reach a learner because some other filter excludes it. Every count is derived
 * from source, never hardcoded against a remembered number.
 */
import assert from "node:assert/strict";

import {
  DRILL_BANK,
  DEBATE_DRILL_HELD_IDS,
  DEBATE_DRILL_EXCLUSIVE_GROUPS,
  collapseExclusiveGroups,
  buildDrillSession
} from "../lib/debate-drills";
import { DECA_DRILL_BANK, DECA_DRILL_HELD_IDS } from "../lib/deca-drills";

function main(): void {
  // ---- 1. wg-08 is no longer held, and nothing else in Debate is either ---------------------------
  assert.deepEqual([...DEBATE_DRILL_HELD_IDS], [],
    "1. the Debate held set is empty — wg-08 was the last hold and B2.3 released it");
  assert.ok(!DEBATE_DRILL_HELD_IDS.includes("wg-08"), "1b. wg-08 specifically is not held");

  // ---- 2. the item still EXISTS — released means served, never deleted ---------------------------
  const wg08 = DRILL_BANK.find((q) => q.id === "wg-08");
  assert.ok(wg08, "2. wg-08 is still in the bank — release must not delete an item");
  assert.equal(wg08!.area, "weighing", "2b. and it is still a weighing item");

  // ---- 3. individual eligibility, derived ---------------------------------------------------------
  const served = DRILL_BANK.filter((q) => !DEBATE_DRILL_HELD_IDS.includes(q.id));
  assert.equal(DRILL_BANK.length, 150, "3a. control: the Debate bank is 150 items");
  assert.equal(served.length, 150, "3b. global individual eligibility is 150 of 150 — nothing is held");
  const weighingBank = DRILL_BANK.filter((q) => q.area === "weighing");
  const weighingServed = served.filter((q) => q.area === "weighing");
  assert.equal(weighingBank.length, 30, "3c. control: weighing is a 30-item area");
  assert.equal(weighingServed.length, 30, "3d. weighing eligibility is 30 of 30");

  // ---- 4. SESSION CAPACITY IS NOT ELIGIBILITY -----------------------------------------------------
  // The pair control still displaces exactly one item from any single session, so releasing wg-08
  // moved clean-history capacity from 148 to 149 — NOT to 150. Derived, so a future hold or a future
  // pair changes it honestly instead of failing arbitrarily.
  const pairSurplus = DEBATE_DRILL_EXCLUSIVE_GROUPS.reduce((n, group) => {
    const eligibleMembers = group.filter((id) => !DEBATE_DRILL_HELD_IDS.includes(id));
    return n + Math.max(0, eligibleMembers.length - 1);
  }, 0);
  assert.equal(pairSurplus, 1, "4a. exactly one item is displaced per session by the measurement-dependent pair");
  assert.equal(collapseExclusiveGroups([...served]).length, served.length - pairSurplus,
    "4b. clean-history distinct session capacity is 149 — eligibility minus the displaced pair member, never 150");
  const rebuttalServed = served.filter((q) => q.area === "rebuttal");
  assert.equal(collapseExclusiveGroups([...rebuttalServed]).length, 29,
    "4c. rebuttal capacity is still 29 — the pair lives in rebuttal, and releasing wg-08 did not change it");

  // ---- 5. POSITIVE SERVING — the check that separates a release from a list-shrink ---------------
  const focused = new Set<string>();
  for (let i = 0; i < 200; i += 1) for (const q of buildDrillSession(60, ["weighing"])) focused.add(q.id);
  assert.ok(focused.has("wg-08"),
    "5a. wg-08 POSITIVELY serves in focused weighing practice — it survives every ordinary eligibility predicate, not just the held-list filter");
  assert.equal(focused.size, 30, "5b. and all 30 weighing items serve — the release did not over- or under-filter");
  const full = new Set(buildDrillSession(300).map((q) => q.id));
  assert.ok(full.has("wg-08"), "5c. wg-08 also serves on the unfocused full-bank path");
  assert.equal(full.size, 149, "5d. a full-bank overdraw serves 149 distinct, matching derived capacity");

  // ---- 6. wg-29 was never captured by the wg-08 hold and is unaffected by its release ------------
  assert.ok(focused.has("wg-29"),
    "6. wg-29 (fair transfer — serving valid) still serves; releasing wg-08 did not disturb it");

  // ---- 7. the pair control survives the release --------------------------------------------------
  assert.deepEqual(DEBATE_DRILL_EXCLUSIVE_GROUPS.map((g) => [...g]), [["rb-14", "rb-15"]],
    "7a. the measurement-dependent pair control is intact");
  for (let i = 0; i < 200; i += 1) {
    const s = buildDrillSession(60, ["rebuttal"]);
    const both = s.some((q) => q.id === "rb-14") && s.some((q) => q.id === "rb-15");
    assert.ok(!both, "7b. rb-14 and rb-15 never co-serve, across 200 real builds");
  }

  // ---- 8. DECA is untouched ----------------------------------------------------------------------
  assert.deepEqual([...DECA_DRILL_HELD_IDS], ["pi-26"],
    "8a. pi-26 remains HELD — this release is Debate-only and B2.4 is unaffected");
  assert.equal(DECA_DRILL_BANK.filter((q) => !DECA_DRILL_HELD_IDS.includes(q.id)).length, 119,
    "8b. DECA individual eligibility is unchanged at 119 of 120");

  console.log(
    "wg-08 activation smoke passed: the Debate held set is empty, all 150 items are individually " +
    "eligible, and wg-08 positively serves on both the focused and full-bank paths. Clean-history " +
    "distinct session capacity is 149, NOT 150 — the rb-14/rb-15 pair control still displaces one " +
    "item from every session, and rebuttal capacity stays 29. pi-26 remains held and DECA " +
    "eligibility is unchanged at 119/120. Imports are limited to lib/debate-drills and " +
    "lib/deca-drills, neither of which is an env carrier, so this proof is safe under the no-env " +
    "controls that forbid running debate-drills:smoke."
  );
}

main();
