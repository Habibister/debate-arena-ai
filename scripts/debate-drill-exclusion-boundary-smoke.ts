/**
 * DEBATE DRILL PAIR-EXCLUSION BOUNDARY SMOKE — strict-safe.
 *
 * Exercises DEBATE_DRILL_EXCLUSIVE_GROUPS and its two enforcement points directly, without
 * importing Prisma, provider code, env loaders, fs credential paths, or shared-state writers.
 * Transitive runtime closure is lib/debate-drills.ts alone (zero bare runtime packages), so this
 * runs where debate-drills:smoke cannot. It does NOT substitute for that suite; it proves only the
 * deterministic pair-selection layer.
 *
 * It exists because sp-26/sp-27 were classified a MATERIAL measurement dependency after four
 * structural repair attempts failed to remove serve-order transfer. The group prevents the
 * dependency from being exercised; it does not remove it.
 */
import assert from "node:assert/strict";
import {
  DRILL_BANK,
  DEBATE_DRILL_EXCLUSIVE_GROUPS,
  collapseExclusiveGroups,
  siblingExclusionsFor,
} from "../lib/debate-drills";

const byId = (id: string) => {
  const q = DRILL_BANK.find((x) => x.id === id);
  assert.ok(q, `fixture requires ${id} to exist in the bank`);
  return q!;
};
const ids = (qs: { id: string }[]) => qs.map((q) => q.id).sort();
let checks = 0;
const check = (label: string, fn: () => void) => { fn(); checks += 1; console.log("  ok  " + label); };

// The checked-in record of which pairs are controlled. Deleting a group in source fails here
// rather than silently disabling the control.
const EXPECTED_GROUPS = [["rb-14", "rb-15"], ["sp-26", "sp-27"]];
check("G0. exclusive groups match the checked-in record", () => {
  assert.deepEqual(
    DEBATE_DRILL_EXCLUSIVE_GROUPS.map((g) => [...g].sort()).sort((a, b) => a[0].localeCompare(b[0])),
    EXPECTED_GROUPS,
    "DEBATE_DRILL_EXCLUSIVE_GROUPS drifted from the record"
  );
});

// CASE 1 — a pool holding both siblings can never yield both.
check("CASE 1. same-session pool cannot retain both sp-26 and sp-27", () => {
  const pool = [byId("sp-25"), byId("sp-26"), byId("sp-27"), byId("sp-28")];
  for (const keepFirst of [true, false]) {
    const out = collapseExclusiveGroups(pool, DEBATE_DRILL_EXCLUSIVE_GROUPS, (m) => (keepFirst ? m[0] : m[m.length - 1]));
    const kept = out.filter((q) => q.id === "sp-26" || q.id === "sp-27");
    assert.equal(kept.length, 1, "exactly one sibling must survive the collapse");
  }
});

// CASE 2 / CASE 3 — exposure-driven exclusion, both directions.
check("CASE 2. sp-26 exposed excludes sp-27", () => {
  assert.deepEqual(siblingExclusionsFor(["sp-26"]).sort(), ["sp-27"]);
});
check("CASE 3. sp-27 exposed excludes sp-26", () => {
  assert.deepEqual(siblingExclusionsFor(["sp-27"]).sort(), ["sp-26"]);
});

// CASE C (charter requirement C) — control keys on ISSUANCE, not on answering. The API takes
// exposed ids and has no notion of correctness or submission, so an unanswered issue still excludes.
check("CASE C. exclusion is exposure-driven, with no answer/correctness input", () => {
  assert.equal(siblingExclusionsFor([]).length, 0, "no exposure, no exclusion");
  assert.deepEqual(siblingExclusionsFor(["sp-26"]), ["sp-27"], "issuance alone must exclude the sibling");
  assert.equal(siblingExclusionsFor.length, 1, "the only REQUIRED input is exposed ids — no answer, score or submission state");
});

// CASE 4 — unrelated Signposting items stay servable.
check("CASE 4. unrelated Signposting items are untouched", () => {
  const excluded = new Set(siblingExclusionsFor(["sp-26"]));
  const others = DRILL_BANK.filter((q) => q.area === "signposting" && q.id !== "sp-26" && q.id !== "sp-27");
  assert.equal(others.length, 28, "expected 28 other Signposting items");
  for (const q of others) assert.ok(!excluded.has(q.id), `${q.id} must remain servable`);
});

// CASE 5 — the pre-existing rb-14/rb-15 control is unchanged by the addition.
check("CASE 5. rb-14/rb-15 behaviour is unchanged", () => {
  assert.deepEqual(siblingExclusionsFor(["rb-14"]).sort(), ["rb-15"]);
  assert.deepEqual(siblingExclusionsFor(["rb-15"]).sort(), ["rb-14"]);
  const pool = [byId("rb-14"), byId("rb-15"), byId("rb-16")];
  const out = collapseExclusiveGroups(pool, DEBATE_DRILL_EXCLUSIVE_GROUPS, (m) => m[0]);
  assert.equal(out.filter((q) => q.id === "rb-14" || q.id === "rb-15").length, 1);
  assert.ok(ids(out).includes("rb-16"), "unrelated rebuttal item must survive");
});

// CASE 6 — dropping one sibling must not empty or corrupt an otherwise valid pool.
check("CASE 6. removing one sibling neither empties nor corrupts the pool", () => {
  const pool = [byId("sp-23"), byId("sp-24"), byId("sp-26"), byId("sp-27")];
  const out = collapseExclusiveGroups(pool, DEBATE_DRILL_EXCLUSIVE_GROUPS, (m) => m[0]);
  assert.equal(out.length, 3, "pool loses exactly one member");
  assert.ok(ids(out).includes("sp-23") && ids(out).includes("sp-24"), "unrelated members survive intact");
  assert.equal(new Set(ids(out)).size, out.length, "no duplication introduced");
  const lone = collapseExclusiveGroups([byId("sp-26")], DEBATE_DRILL_EXCLUSIVE_GROUPS, (m) => m[0]);
  assert.deepEqual(ids(lone), ["sp-26"], "a pool with one sibling is left alone");
});

// MUTATION KILLS — each proves the assertions above are load-bearing.
check("M1. deleting the sp-26/sp-27 group would fail these tests", () => {
  const without = DEBATE_DRILL_EXCLUSIVE_GROUPS.filter((g) => !g.includes("sp-26"));
  const pool = [byId("sp-26"), byId("sp-27")];
  assert.equal(collapseExclusiveGroups(pool, without, (m) => m[0]).length, 2, "control: both survive without the group");
  assert.equal(siblingExclusionsFor(["sp-26"], without).length, 0, "control: no exclusion without the group");
});
check("M2. a one-directional group would fail CASE 3", () => {
  const oneWay = [["sp-26"]];
  assert.equal(siblingExclusionsFor(["sp-27"], oneWay).length, 0, "control: reverse direction unprotected");
});
check("M3. unrelated ids are never excluded", () => {
  for (const id of ["sp-01", "sp-15", "sp-30", "cw-01", "ev-20"]) {
    assert.ok(!siblingExclusionsFor([id]).length, `${id} must trigger no exclusion`);
  }
});
check("M4. both siblings exposed excludes both from fresh serving", () => {
  assert.deepEqual(siblingExclusionsFor(["sp-26", "sp-27"]).sort(), ["sp-26", "sp-27"]);
});

console.log(`\nPAIR-EXCLUSION BOUNDARY SMOKE PASS — ${checks} checks.`);
console.log("Scope: deterministic pair-selection layer only. Concurrency/session-persistence behaviour is");
console.log("unchanged and remains covered by the existing (unexecuted) debate-drills suite.");
