export const DECA_EVENT_CLUSTERS = [
  "Marketing",
  "Business Management",
  "Finance",
  "Hospitality and Tourism",
  "Entrepreneurship",
  "Sports and Entertainment Marketing",
  "Personal Financial Literacy"
];

export const HOSA_EVENT_CATEGORIES = [
  "Medical Terminology",
  "Health Science Concepts",
  "Healthcare Ethics",
  "Patient Communication",
  "Anatomy and Physiology",
  "Clinical Skills",
  "Public Health"
];

export function testingClustersForOrganization(organization: "DECA" | "HOSA") {
  return organization === "DECA" ? DECA_EVENT_CLUSTERS : HOSA_EVENT_CATEGORIES;
}
