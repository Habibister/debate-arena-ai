import type { Level } from "@prisma/client";

// Config handed from a setup form to the dedicated room via sessionStorage (client-state only —
// these role-play sessions are not persisted yet; the room says so honestly). Keyed per track so a
// stale HOSA config can never drive a DECA room.
export const ROLEPLAY_CONFIG_KEY = "competeready_roleplay_config";

export type DecaRoomConfig = {
  track: "deca";
  level: Level;
  cluster: string;
  studentRole: string;
  judgeRole: string;
  simulation: boolean;
};

export type HosaRoomConfig = {
  track: "hosa";
  level: Level;
  category: string;
  studentRole: string;
  characterRole: string;
};

export type RoleplayConfig = DecaRoomConfig | HosaRoomConfig;

// Difficulty changes the number of back-and-forth turns (Beginner is short, Elite is a longer grind).
// Client-safe (no server imports) so both the room and setup can use it.
export function roleplayTurnCap(level: Level): number {
  return level === "BEGINNER" ? 4 : level === "ELITE" ? 8 : 6;
}

export function writeRoleplayConfig(config: RoleplayConfig) {
  try {
    window.sessionStorage.setItem(ROLEPLAY_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // sessionStorage unavailable (rare) — the room will redirect back to setup.
  }
}

export function readRoleplayConfig(track: "deca" | "hosa"): RoleplayConfig | null {
  try {
    const raw = window.sessionStorage.getItem(ROLEPLAY_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoleplayConfig;
    return parsed.track === track ? parsed : null;
  } catch {
    return null;
  }
}

// "Surprise me" role pairs (shared by the DECA setup and quick-start). Both fields stay editable.
export const DECA_ROLE_PAIRS: Array<{ student: string; judge: string }> = [
  { student: "front desk manager", judge: "hotel guest whose reserved suite was given away" },
  { student: "assistant restaurant manager", judge: "diner whose allergy request was mishandled" },
  { student: "event coordinator", judge: "corporate client whose budget was just cut" },
  { student: "marketing associate", judge: "skeptical small-business owner" },
  { student: "customer-service lead", judge: "regular customer demanding a policy exception" },
  { student: "retail floor supervisor", judge: "vendor rep pushing an aggressive restock deal" },
  { student: "operations intern", judge: "department head questioning your cost estimate" },
  { student: "franchise trainee", judge: "mystery shopper revealing their findings" },
  { student: "guest-services agent", judge: "wedding planner with last-minute changes" },
  { student: "night-shift duty manager", judge: "tour-group leader whose rooms aren't ready" }
];

export const HOSA_ROLE_PAIRS: Array<{ student: string; character: string }> = [
  { student: "health science student", character: "patient who is anxious about a new diagnosis" },
  { student: "clinic volunteer", character: "parent worried about a child's fever" },
  { student: "pharmacy technician trainee", character: "senior confused about a dosing schedule" },
  { student: "nursing assistant student", character: "post-op patient afraid to start walking" },
  { student: "EMT trainee", character: "shaken bystander at a minor accident" },
  { student: "school health aide", character: "teen embarrassed to describe symptoms" },
  { student: "community-health presenter", character: "audience member citing online misinformation" },
  { student: "dental assistant student", character: "patient with severe dental anxiety" },
  { student: "physical-therapy aide", character: "athlete pushing to return too soon" },
  { student: "telehealth support trainee", character: "caller unsure whether symptoms are urgent" }
];
