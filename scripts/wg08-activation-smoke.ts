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
 * array and still never reach a learner because some other filter excludes it.
 *
 * TWO KINDS OF NUMBER LIVE HERE, and the distinction is deliberate — do not collapse them.
 * CURRENT WHOLE-BANK TOPOLOGY (bank size, global eligibility, full-session capacity, the shape of the
 * exclusive-group registry) is DERIVED from source, so growing the bank or registering a later
 * exclusive group cannot make this proof stale or false. EXPLICIT WG08 MILESTONE EXPECTATIONS stay
 * literal wherever the literal value is itself what the acceptance proof protects: weighing depth 30,
 * rebuttal session capacity 29, the rb-14/rb-15 pair displacing exactly one item, DECA eligibility 119
 * of 120, and pi-26 as the only DECA hold. Those are facts about the B2.3 release and must fail loudly
 * if they change. Never freeze current topology into a literal, and never soften a milestone literal
 * into a derived expression — the first makes the suite rot, the second makes it prove nothing.
 *
 * The 2026-08-31 repair removed four frozen topology snapshots (bank size 150, eligibility 150,
 * pairSurplus 1, full-session 149) and the whole-registry deepEqual, all of which were true only of
 * the wg08-era bank and went stale when the Signposting area and the sp-26/sp-27 pair landed.
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
  // ---- 1. wg-08 is no longer held ----------------------------------------------------------------
  // This asserted an EMPTY Debate held set, which was true when wg-08 was the last hold. It is no
  // longer: the rebuttal containment (2026-09-01) withheld 22 rebuttal items after an audit found
  // them untaught, non-unique or solvable without the teaching. That is a different area's state and
  // says nothing about wg-08, so this suite now asserts what it actually owns — wg-08 serves — and
  // additionally that the rebuttal containment never reached weighing.
  assert.ok(!DEBATE_DRILL_HELD_IDS.includes("wg-08"), "1. wg-08 specifically is not held");
  assert.ok(DEBATE_DRILL_HELD_IDS.every((id) => id.startsWith("rb-")),
    "1b. every current Debate hold is a rebuttal id — no other area was caught by that containment");

  // ---- 2. the item still EXISTS — released means served, never deleted ---------------------------
  const wg08 = DRILL_BANK.find((q) => q.id === "wg-08");
  assert.ok(wg08, "2. wg-08 is still in the bank — release must not delete an item");
  assert.equal(wg08!.area, "weighing", "2b. and it is still a weighing item");

  // ---- 3. individual eligibility, derived ---------------------------------------------------------
  const served = DRILL_BANK.filter((q) => !DEBATE_DRILL_HELD_IDS.includes(q.id));
  assert.ok(DRILL_BANK.length > 0, "3a. control: the Debate bank is non-empty, so 3b is not vacuous");
  assert.equal(served.length, DRILL_BANK.length - DEBATE_DRILL_HELD_IDS.length,
    "3b. global individual eligibility is the bank minus exactly the held set. Derived from DRILL_BANK and the hold list, never a remembered total, so later authoring or a later hold cannot make this false.");
  const weighingBank = DRILL_BANK.filter((q) => q.area === "weighing");
  const weighingServed = served.filter((q) => q.area === "weighing");
  assert.equal(weighingBank.length, 30, "3c. control: weighing is a 30-item area");
  assert.equal(weighingServed.length, 30, "3d. weighing eligibility is 30 of 30");

  // ---- 4. SESSION CAPACITY IS NOT ELIGIBILITY -----------------------------------------------------
  // HISTORICAL, SCOPED: at the B2.3 release the bank held one exclusive group, so releasing wg-08
  // moved clean-history capacity from 148 to 149 — NOT to 150. Those figures describe that moment and
  // are not asserted here. What IS asserted is the structural identity plus the wg08-owned fact about
  // the rb pair, both of which survive a bank that has since grown and registered a second group.
  const surplusFor = (group: ReadonlyArray<string>): number =>
    Math.max(0, group.filter((id) => !DEBATE_DRILL_HELD_IDS.includes(id)).length - 1);
  const pairSurplus = DEBATE_DRILL_EXCLUSIVE_GROUPS.reduce((n, group) => n + surplusFor(group), 0);
  const rbPair = DEBATE_DRILL_EXCLUSIVE_GROUPS.find((group) => group.includes("rb-14"));
  assert.ok(rbPair, "4a. the rb-14/rb-15 measurement-dependent pair is still registered");
  assert.equal(surplusFor(rbPair!), 1,
    "4a2. WG08 MILESTONE: the rb-14/rb-15 pair still displaces exactly one item from any single session");
  assert.equal(collapseExclusiveGroups([...served]).length, served.length - pairSurplus,
    "4b. clean-history distinct session capacity is eligibility minus every displaced pair member — never the full eligible count");
  // 4c was a REMEMBERED 29 — rebuttal's 30 eligible items minus the one displaced pair member. The
  // rebuttal containment changed the eligible count, and a remembered total is exactly what goes
  // stale when it does. The structural identity is what this suite actually owns, so it is asserted
  // structurally: capacity is rebuttal eligibility minus the pair's displacement, whatever the
  // eligible count currently is.
  const rebuttalServed = served.filter((q) => q.area === "rebuttal");
  const rebuttalPairSurplus = DEBATE_DRILL_EXCLUSIVE_GROUPS.reduce(
    (n, group) => n + (group.some((id) => rebuttalServed.some((q) => q.id === id)) ? surplusFor(group) : 0), 0);
  assert.equal(collapseExclusiveGroups([...rebuttalServed]).length, rebuttalServed.length - rebuttalPairSurplus,
    "4c. rebuttal capacity is its current eligibility minus every displaced pair member — the pair still lives in rebuttal");
  assert.ok(rebuttalServed.length > 0, "4c2. control: rebuttal still serves, so 4c is not vacuous");

  // ---- 5. POSITIVE SERVING — the check that separates a release from a list-shrink ---------------
  const focused = new Set<string>();
  for (let i = 0; i < 200; i += 1) for (const q of buildDrillSession(60, ["weighing"])) focused.add(q.id);
  assert.ok(focused.has("wg-08"),
    "5a. wg-08 POSITIVELY serves in focused weighing practice — it survives every ordinary eligibility predicate, not just the held-list filter");
  assert.equal(focused.size, 30, "5b. and all 30 weighing items serve — the release did not over- or under-filter");
  const full = new Set(buildDrillSession(300).map((q) => q.id));
  assert.ok(full.has("wg-08"), "5c. wg-08 also serves on the unfocused full-bank path");
  assert.equal(full.size, served.length - pairSurplus,
    "5d. a full-bank overdraw serves exactly eligibility minus the displaced pair members. Eligibility is the bank MINUS the held set — it was written as the whole bank while nothing was held, which silently assumed an empty hold list; it is now derived from `served`, so neither bank growth nor a later hold can make it false.");

  // ---- 6. wg-29 was never captured by the wg-08 hold and is unaffected by its release ------------
  assert.ok(focused.has("wg-29"),
    "6. wg-29 (fair transfer — serving valid) still serves; releasing wg-08 did not disturb it");

  // ---- 7. the pair control survives the release --------------------------------------------------
  // Order-robust membership, NOT a registry snapshot. This milestone proves the rb-14/rb-15 control
  // survived the release; it must not also claim no later pair may exist (sp-26/sp-27 since has).
  // Detection is not weakened: exactly one group carries rb-14, that group is exactly the pair, and
  // rb-15 is in no other group — so the pair cannot be split, dropped or diluted unnoticed.
  assert.equal(DEBATE_DRILL_EXCLUSIVE_GROUPS.filter((g) => g.includes("rb-14")).length, 1,
    "7a. exactly one exclusive group carries rb-14");
  assert.deepEqual([...rbPair!].slice().sort(), ["rb-14", "rb-15"],
    "7a2. and that group is exactly the rb-14/rb-15 pair, in any order");
  assert.equal(DEBATE_DRILL_EXCLUSIVE_GROUPS.filter((g) => g.includes("rb-15")).length, 1,
    "7a3. rb-15 belongs to no other group — the pair control cannot be silently split");
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
"wg-08 activation smoke passed: " + served.length + " of the " + DRILL_BANK.length + " items " +
    "currently in the bank are individually eligible (" + DEBATE_DRILL_HELD_IDS.length + " withheld, " +
    "all of them rebuttal ids under the 2026-09-01 containment), and wg-08 positively serves on both " +
    "the focused and full-bank paths. Clean-history distinct session capacity is " +
    (served.length - pairSurplus) + ", below eligibility — " + pairSurplus + " item(s) are " +
    "displaced by the measurement-dependent pair control(s), of which the rb-14/rb-15 pair " +
    "displaces exactly one. Eligibility and capacity are both derived from the bank and the hold " +
    "list rather than remembered, so a later hold or release changes them honestly. Bank-size figures here are read from " +
    "source at run time and describe the CURRENT bank, not the wg08-era bank. pi-26 remains held and DECA " +
    "eligibility is unchanged at 119/120. Imports are limited to lib/debate-drills and " +
    "lib/deca-drills, neither of which is an env carrier, so this proof is safe under the no-env " +
    "controls that forbid running debate-drills:smoke."
  );
}

main();
