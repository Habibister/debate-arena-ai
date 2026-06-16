export const DECA_EVENT_CLUSTERS = [
  "Marketing",
  "Business Management",
  "Finance",
  "Hospitality and Tourism",
  "Entrepreneurship",
  "Sports and Entertainment Marketing",
  "Personal Financial Literacy",
  "Economics basics",
  "Promotion",
  "Pricing",
  "Distribution",
  "Market research",
  "Customer relations",
  "Operations",
  "Financial analysis",
  "Business law basics",
  "Ethics",
  "Human resources"
];

export const HOSA_EVENT_CATEGORIES = [
  "Medical Terminology",
  "Health Science Concepts",
  "Healthcare Ethics",
  "Patient Communication",
  "Anatomy and Physiology",
  "Clinical Skills",
  "Public Health",
  "Body Systems",
  "Infection Control",
  "Vital Signs",
  "Medical Abbreviations",
  "Emergency Care Basics",
  "Nutrition",
  "Epidemiology Basics",
  "Healthcare Careers",
  "Safety Procedures"
];

export function testingClustersForOrganization(organization: "DECA" | "HOSA") {
  return organization === "DECA" ? DECA_EVENT_CLUSTERS : HOSA_EVENT_CATEGORIES;
}
