/**
 * Shared source-ordering assertion for the route-resolution / gating controls
 * (M15 S1B Batch IV — IDX-16, IDX-45, IDX-46, IDX-47).
 *
 * WHY THIS EXISTS. `indexOf(a) < indexOf(b)` passes vacuously when `a` is absent,
 * because `indexOf` returns -1 and `-1 < n` still holds; the mirror shape
 * `indexOf(a) > indexOf(b)` passes vacuously when `b` is absent (`n > -1`). The
 * vulnerability follows the OPERAND, not the first anchor. Four controls in this
 * family repeated that pattern, so the fix is one helper that takes an explicit
 * direction and fails closed when EITHER anchor is missing.
 *
 * WHAT IT PROVES — exactly two things, and nothing more:
 *   presence  both anchors occur in the scanned source
 *   order     the FIRST occurrence of `left` is before/after the FIRST
 *             occurrence of `right`
 *
 * WHAT IT DOES NOT PROVE: containment, uniqueness, that no later occurrence
 * exists, or anything at all about runtime behaviour. These are source-ordering
 * test controls. Do not widen the messages to claim more than the two facts above.
 */
import assert from "node:assert/strict";

export type SourceOrder = "before" | "after";

export function assertSourceOrder(options: {
  /** the exact string the caller scans — pass the same receiver the control used */
  source: string;
  /** the anchor whose first occurrence must come before/after `right` */
  left: string;
  /** the anchor `left` is ordered against */
  right: string;
  /** "before" asserts leftAt < rightAt; "after" asserts leftAt > rightAt */
  direction: SourceOrder;
  /** the control id, e.g. "21c" — used to name the presence failure "21c-anchors" */
  label: string;
  /** the control's original ordering message, preserved verbatim */
  message: string;
}): void {
  const { source, left, right, direction, label, message } = options;
  const leftAt = source.indexOf(left);
  const rightAt = source.indexOf(right);
  assert.ok(
    leftAt >= 0 && rightAt >= 0,
    `${label}-anchors. both ${left} and ${right} occur in the scanned source`
  );
  assert.ok(direction === "before" ? leftAt < rightAt : leftAt > rightAt, message);
}
