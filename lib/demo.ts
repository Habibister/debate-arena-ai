// Demo/sample stats are only allowed for demo accounts. Every other (real) account must show stats
// derived from real database activity, starting at zero for a brand-new user.
//
// All seeded demo accounts use the @debatearena.ai domain (student@, coach@, admin@, and the sample
// students), so a single domain check cleanly separates demo from real users.
export function isDemoUser(email?: string | null): boolean {
  if (!email) {
    return false;
  }
  return email.trim().toLowerCase().endsWith("@debatearena.ai");
}
