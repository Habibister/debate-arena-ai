/**
 * Which seeded competition specs retire an older active row of the same event.
 *
 * THIS IS DELIBERATELY NOT A GENERAL RULE. Nothing in the product establishes "one active spec per
 * event" as an invariant:
 *
 *   - the schema's only unique key is (organization, eventName, season, version), with no constraint
 *     of any kind on isActive, so the database will hold as many active rows as it is given;
 *   - every runtime read of an active spec is an ordered `findFirst` (season desc, version desc) that
 *     tolerates several active rows and simply picks the newest;
 *   - the admin create/update routes set isActive with no supersession of any kind.
 *
 * Exactly ONE duplicate-active case has actually been established, in phase H4-B.1: seeding Medical
 * Terminology's 2026-27 spec leaves the 2025-26 row active, so the registry holds two rows both
 * claiming to be current. That case, and only that case, is retired here. Applying it to Public Forum
 * Debate, Hotel and Lodging Management and the Model UN General Assembly would invent a rule for three
 * tracks out of one HOSA discovery, and would change what an ordinary future seed run does to them.
 *
 * Widen this only when a global invariant is positively proven — not because a second event happens to
 * look similar.
 */

export const SUPERSEDING_ORGANIZATION = "HOSA";
export const SUPERSEDING_EVENT_NAME = "Medical Terminology";

/**
 * True when writing this spec should retire other active rows for the same event.
 * The caller still keys its own query on the row it just wrote — this decides *whether*, never *which*.
 */
export function supersedesActiveSpecs(spec: { organization: string; eventName: string }): boolean {
  return spec.organization === SUPERSEDING_ORGANIZATION && spec.eventName === SUPERSEDING_EVENT_NAME;
}
