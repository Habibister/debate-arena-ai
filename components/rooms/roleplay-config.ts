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

// Rough time estimate shown in the room's orientation bar (scenario + a few turns + feedback).
export function roleplayEstimatedMinutes(level: Level): number {
  return level === "BEGINNER" ? 5 : level === "ELITE" ? 12 : 8;
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
/**
 * CompeteReady-authored practice roles, per career cluster (beginner QA R3, finding #12).
 *
 * The setup used to hold one flat list whose first pair was a hotel front desk, and nothing changed it
 * when the learner picked another cluster — so choosing Finance left a hotel guest whose suite was given
 * away, and the copy asked the beginner to repair the pairing themselves. A beginner picking Finance has
 * no way to know what a Finance role-play looks like; that is the product's job.
 *
 * These are OURS: plausible practice pairings written by CompeteReady, not DECA event roles, and no
 * entry here claims official coverage of anything. The cluster keys match `DECA_CLUSTERS` exactly, and
 * `decaRolePairsForCluster` falls back to the hospitality set only for an unrecognised cluster.
 */
export const DECA_CLUSTER_ROLE_PAIRS: Record<string, Array<{ student: string; judge: string }>> = {
  "Hospitality & Tourism": [
    { student: "front desk manager", judge: "hotel guest whose reserved suite was given away" },
    { student: "event coordinator", judge: "corporate client whose budget was just cut" },
    { student: "guest-services agent", judge: "wedding planner with last-minute changes" },
    { student: "night-shift duty manager", judge: "tour-group leader whose rooms aren't ready" }
  ],
  Marketing: [
    { student: "marketing associate", judge: "skeptical small-business owner" },
    { student: "brand manager", judge: "store owner who thinks advertising is wasted money" },
    { student: "promotion planner", judge: "campus club president with a small budget" },
    { student: "customer insights analyst", judge: "manager who wants one customer group chosen" }
  ],
  Finance: [
    { student: "financial analyst", judge: "owner deciding whether to take a loan" },
    { student: "budget coordinator", judge: "department head whose costs keep rising" },
    { student: "loan associate", judge: "first-time borrower asking what the terms mean" },
    { student: "credit assistant", judge: "customer whose application was declined" }
  ],
  "Business Management": [
    { student: "operations lead", judge: "department head questioning your cost estimate" },
    { student: "shift supervisor", judge: "employee who says the new schedule is unfair" },
    { student: "team lead", judge: "manager asking why complaints went up" },
    { student: "business analyst", judge: "owner who wants a slow process fixed" }
  ],
  Entrepreneurship: [
    { student: "founder", judge: "investor asking who exactly will buy this" },
    { student: "venture planner", judge: "mentor questioning your start-up costs" },
    { student: "pitch presenter", judge: "potential partner weighing the risk" },
    { student: "market validation lead", judge: "advisor asking what evidence you have" }
  ],
  "Personal Financial Literacy": [
    { student: "peer financial coach", judge: "student deciding between saving and spending" },
    { student: "credit-union youth associate", judge: "first-time account holder asking about fees" },
    { student: "budget workshop leader", judge: "parent helping a teen plan a first budget" },
    { student: "financial literacy volunteer", judge: "shopper weighing a buy-now-pay-later offer" }
  ]
};

/** The authored pairs for a cluster, falling back to hospitality for anything unrecognised. */
export function decaRolePairsForCluster(cluster: string | null | undefined): Array<{ student: string; judge: string }> {
  const pairs = cluster ? DECA_CLUSTER_ROLE_PAIRS[cluster] : undefined;
  return pairs ?? DECA_CLUSTER_ROLE_PAIRS["Hospitality & Tourism"];
}

/** The cluster's own starting pair — what a learner who changes cluster and types nothing should see. */
export function decaDefaultRolePairForCluster(cluster: string | null | undefined): { student: string; judge: string } {
  return decaRolePairsForCluster(cluster)[0];
}

/** Every authored pair, in cluster order. Kept for surfaces that shuffle across the whole set. */
export const DECA_ROLE_PAIRS: Array<{ student: string; judge: string }> = Object.values(DECA_CLUSTER_ROLE_PAIRS).flat();
