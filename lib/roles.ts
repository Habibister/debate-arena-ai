// Single, server-authoritative definition of who may use coach tools. Keeping the check in one
// place (instead of inlining `role !== "COACH" && role !== "ADMIN"` in every guard) means the coach
// pages, coach APIs, and tests all agree, and a real COACH is never denied by a drifting copy.
export type AppRole = "STUDENT" | "COACH" | "ADMIN";

export function canAccessCoachTools(role: string | null | undefined): boolean {
  return role === "COACH" || role === "ADMIN";
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN";
}
