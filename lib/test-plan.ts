/**
 * Official written-test blueprints — what a test is made of.
 *
 * Kept deliberately apart from rubric code. A rubric says how a performance is SCORED; a test plan
 * says what the questions are ABOUT. HOSA Medical Terminology publishes both and they say different
 * numbers: its rubric is a single 50-point row ("Test score"), while its test plan is twelve rows
 * totalling 100 percent. Rendering one through the other would claim a 50-point test is worth 100
 * points, or that "45%" is 45 points. Neither is true, and both would be shown as official.
 *
 * Weights here are whole published percentages. They are informational and never feed scoring.
 */

/** A weighted content area exactly as a source registry publishes it, before ordering. */
export type TestPlanSourceRow = {
  id: string;
  label: string;
  weight: number;
};

/** A stored/renderable plan row. `order` is the published sequence, 1-based. */
export type TestPlanRow = {
  key: string;
  label: string;
  order: number;
  weightPercent: number;
};

/** Published order is the guideline's own order — never sorted by weight, which would rewrite it. */
export function testPlanRows(plan: readonly TestPlanSourceRow[]): TestPlanRow[] {
  return plan.map((row, index) => ({
    key: row.id,
    label: row.label,
    order: index + 1,
    weightPercent: row.weight
  }));
}

export function testPlanTotalWeight(rows: readonly TestPlanRow[]): number {
  return rows.reduce((total, row) => total + row.weightPercent, 0);
}

/**
 * Everything wrong with a plan, as human-readable problems. A plan that does not total 100 is not a
 * transcription of an official blueprint — it is a partial reading of one, and presenting it as
 * official would overstate what we actually verified.
 */
export function testPlanProblems(rows: readonly TestPlanRow[]): string[] {
  const problems: string[] = [];
  if (rows.length === 0) return ["plan has no rows"];

  const seenKeys = new Set<string>();
  for (const row of rows) {
    const where = `row ${row.order} (${row.key || "<no key>"})`;
    if (!row.key.trim()) problems.push(`${where}: missing key`);
    else if (seenKeys.has(row.key)) problems.push(`${where}: duplicate key`);
    seenKeys.add(row.key);

    if (!row.label.trim()) problems.push(`${where}: missing label`);
    if (!Number.isInteger(row.weightPercent) || row.weightPercent <= 0) {
      problems.push(`${where}: weightPercent must be a positive whole percent, got ${row.weightPercent}`);
    }
  }

  const orders = rows.map((row) => row.order);
  const expected = rows.map((_, index) => index + 1);
  if (orders.join(",") !== expected.join(",")) {
    problems.push(`orders must be 1..${rows.length} in published sequence, got ${orders.join(",")}`);
  }

  const total = testPlanTotalWeight(rows);
  if (total !== 100) problems.push(`weights total ${total}, expected 100`);

  return problems;
}

/** A plan may only be stored or shown as official when nothing is wrong with it. */
export function testPlanIsUsable(rows: readonly TestPlanRow[]): boolean {
  return testPlanProblems(rows).length === 0;
}
