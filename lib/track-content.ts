import type { AssignmentType, Organization } from "@prisma/client";

// Assignment track compatibility: the SELECTED TEAM's organization/track — not the coach's personal
// UI preference — decides which assignment types and content are valid. A General Debate team can't
// be assigned DECA/HOSA decks or tests; a Model UN team has no decks/tests; etc. Enforced on both the
// form and the server so a hand-crafted mismatched request is rejected.

// Which assignment types make sense for a team's organization.
const TYPES_BY_ORG: Record<string, AssignmentType[]> = {
  DEBATE: ["DEBATE_ROUND", "REBUTTAL_PRACTICE", "LESSON"],
  MODEL_UN: ["LESSON"],
  DECA: ["FLASHCARD_DECK", "REVIEW_GAME", "PRACTICE_TEST", "LESSON"],
  HOSA: ["FLASHCARD_DECK", "REVIEW_GAME", "PRACTICE_TEST", "LESSON"],
  MOCK_TRIAL: ["LESSON"],
  PUBLIC_SPEAKING: ["LESSON"]
};

export function assignmentTypesForOrganization(organization: Organization | string): AssignmentType[] {
  return TYPES_BY_ORG[organization] ?? ["LESSON"];
}

export function assignmentTypeAllowedForOrganization(type: AssignmentType, organization: Organization | string): boolean {
  return assignmentTypesForOrganization(organization).includes(type);
}

// Content (deck / lesson) belongs to a team's track if it shares the organization, or if it is an
// explicitly shared foundation (Public Speaking). Everything else is cross-track and disallowed.
const SHARED_CONTENT_ORG = "PUBLIC_SPEAKING";

export function contentAllowedForOrganization(contentOrg: string, teamOrg: Organization | string): boolean {
  return contentOrg === teamOrg || contentOrg === SHARED_CONTENT_ORG;
}
