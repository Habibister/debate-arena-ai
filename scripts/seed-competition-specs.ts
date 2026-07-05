/**
 * Seeds the Competition Specification Registry with 4 initial event specs.
 *
 * PROVENANCE MATTERS HERE. Every spec carries `fieldNotes` marking each field "sourced" (checked
 * against the official reference listed) or "placeholder" (structural stub that MUST be verified
 * against the official rules manual before being presented as authoritative). Verification status:
 *   - HOSA Medical Terminology: VERIFIED (2025-26 ILC guidelines PDF, hosa.org — note the format
 *     CHANGED this season to 50 questions / 60 minutes, from 100 / 90)
 *   - NSDA Public Forum: PARTIALLY_VERIFIED (times/prep sourced; ballot rubric is placeholder —
 *     PF is judged holistically, not on a fixed public point rubric)
 *   - DECA HLM: PARTIALLY_VERIFIED (prep/role-play/exam format sourced from deca.org; rubric
 *     point split is placeholder pending the official event guidelines PDF)
 *   - Model UN GA: PLACEHOLDER (no single governing spec exists; conference-dependent. UN4MUN
 *     referenced for procedure philosophy)
 *
 * Idempotent: upserts on (organization, eventName, season, version).
 * Run with: npm run specs:seed  (requires the CompetitionSpec table — run `npm run db:push` first)
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv(".env.local");
loadEnv(".env");

const prisma = new PrismaClient();

const SEASON = "2025-2026";

type SpecSeed = Omit<Prisma.CompetitionSpecUncheckedCreateInput, "id" | "createdAt" | "updatedAt">;

const specs: SpecSeed[] = [
  {
    organization: "DEBATE",
    season: SEASON,
    version: 1,
    isActive: true,
    eventName: "Public Forum Debate",
    eventCode: "PF",
    division: "High School",
    roundStructure: [
      { order: 1, name: "Team A Constructive", speaker: "First speaker, Team A", minutes: 4 },
      { order: 2, name: "Team B Constructive", speaker: "First speaker, Team B", minutes: 4 },
      { order: 3, name: "Crossfire", speaker: "First speakers", minutes: 3 },
      { order: 4, name: "Team A Rebuttal", speaker: "Second speaker, Team A", minutes: 4 },
      { order: 5, name: "Team B Rebuttal", speaker: "Second speaker, Team B", minutes: 4 },
      { order: 6, name: "Crossfire", speaker: "Second speakers", minutes: 3 },
      { order: 7, name: "Team A Summary", speaker: "First speaker, Team A", minutes: 3 },
      { order: 8, name: "Team B Summary", speaker: "First speaker, Team B", minutes: 3 },
      { order: 9, name: "Grand Crossfire", speaker: "All four debaters", minutes: 3 },
      { order: 10, name: "Team A Final Focus", speaker: "Second speaker, Team A", minutes: 2 },
      { order: 11, name: "Team B Final Focus", speaker: "Second speaker, Team B", minutes: 2 }
    ],
    prepTime: { perTeamMinutes: 3, notes: "Taken between speeches; some tournaments vary — confirm per invitation." },
    rubric: {
      totalPoints: null,
      categories: [
        { name: "Win/Loss decision", description: "Holistic judge decision on the resolution — no fixed public point rubric" },
        { name: "Speaker points", points: 30, description: "PLACEHOLDER: common 20-30 scale; varies by tournament/ballot" }
      ],
      notes: "PF is judged holistically. Do not present a point rubric as official NSDA scoring."
    },
    penalties: [
      { name: "New arguments in Final Focus", description: "New material in Final Focus is disallowed", consequence: "Judges disregard; may affect decision" }
    ],
    aiAssistanceRestrictions: {
      allowed: ["Pre-round research and practice"],
      forbidden: ["In-round AI assistance (internet/coaching access mid-round is tournament-restricted)"],
      notes: "PLACEHOLDER: NSDA/tournament AI policies evolve — verify against current NSDA unified manual before enforcement.",
      enforcedInApp: "Side Coach is practice-only and never writes into official transcripts."
    },
    stateVariations: [
      { scope: "tournament", name: "Prep time and summary length", differsHow: "Some circuits/invitationals still run 2-minute summaries or different prep amounts" }
    ],
    officialReferences: [
      { label: "NSDA Competition Events (governing org for PF)", url: "https://www.speechanddebate.org/topics/" },
      { label: "Public Forum structure overview", url: "https://en.wikipedia.org/wiki/Public_forum_debate" }
    ],
    fieldNotes: {
      roundStructure: "sourced (speech order + times cross-checked against NSDA-aligned references, 2025-26 format with 3-min summaries)",
      prepTime: "sourced (3 minutes per team is the NSDA standard)",
      rubric: "placeholder (PF has no fixed public point rubric; speaker-point scale varies)",
      penalties: "sourced (no-new-arguments-in-Final-Focus is standard)",
      aiAssistanceRestrictions: "placeholder (verify current NSDA AI policy)",
      stateVariations: "sourced (tournament variance is well documented)"
    },
    verificationStatus: "PARTIALLY_VERIFIED",
    lastVerifiedAt: new Date("2026-07-05")
  },
  {
    organization: "DECA",
    season: SEASON,
    version: 1,
    isActive: true,
    eventName: "Hotel and Lodging Management Series",
    eventCode: "HLM",
    division: "High School",
    roundStructure: [
      { order: 1, name: "Cluster Exam", speaker: "Individual participant", minutes: null, notes: "100-question multiple-choice Hospitality + Tourism cluster exam, administered separately" },
      { order: 2, name: "Role-play preparation", speaker: "Individual participant", minutes: 10, notes: "Review the situation and develop an approach" },
      { order: 3, name: "Role-play with judge", speaker: "Participant + judge", minutes: 10, notes: "Up to 10 minutes of interaction demonstrating the solution" }
    ],
    prepTime: { perCompetitorMinutes: 10, notes: "Role-play prep; exam is separate" },
    rubric: {
      totalPoints: 100,
      categories: [
        { name: "Performance indicators (primary instructional area)", points: null, description: "PLACEHOLDER split: each role-play evaluates PIs tied to the scenario's instructional area" },
        { name: "21st century skills", points: null, description: "PLACEHOLDER split: professional standards evaluated on every role-play" }
      ],
      notes: "100-point evaluation form is standard for series role-plays; exact category point split must be taken from the official HLM guidelines/evaluation form PDF."
    },
    aiAssistanceRestrictions: {
      allowed: ["Studying performance indicators", "Practice role-plays"],
      forbidden: ["Outside assistance during prep or role-play"],
      notes: "PLACEHOLDER: verify against current DECA guidelines.",
      enforcedInApp: "Role-play practice is simulation only; timed prep mirrors the 10-minute rule."
    },
    stateVariations: [
      { scope: "association", name: "District/association qualifiers", differsHow: "Some associations run modified formats or additional role-plays at districts" }
    ],
    officialReferences: [
      { label: "DECA HLM event page", url: "https://www.deca.org/compete/hotel-and-lodging-management-series" }
    ],
    fieldNotes: {
      roundStructure: "sourced (10-min prep, up-to-10-min judge interaction, 100-question cluster exam — deca.org event page)",
      prepTime: "sourced",
      rubric: "placeholder point split (100-pt total standard; category weights need the official evaluation form)",
      aiAssistanceRestrictions: "placeholder",
      stateVariations: "sourced (association-level variance is standard DECA structure)"
    },
    verificationStatus: "PARTIALLY_VERIFIED",
    lastVerifiedAt: new Date("2026-07-05")
  },
  {
    organization: "HOSA",
    season: SEASON,
    version: 1,
    isActive: true,
    eventName: "Medical Terminology",
    eventCode: "MT",
    division: "Secondary / Postsecondary-Collegiate",
    roundStructure: [
      { order: 1, name: "Round One written test", speaker: "Individual competitor", minutes: 60, notes: "50 multiple-choice items, maximum 60 minutes" },
      { order: 2, name: "Tiebreakers", speaker: "Individual competitor", minutes: null, notes: "Successive sets of 5 tiebreaker questions until resolved; correct spelling required" }
    ],
    rubric: {
      totalPoints: 50,
      categories: [{ name: "Test score", points: 50, description: "One point per correct item; ties broken by tiebreaker sets" }],
      notes: "Pure knowledge test — no judged presentation component."
    },
    penalties: [
      { name: "Missing photo ID / materials", description: "Competitors must present photo ID and #2 lead pencils (not mechanical)", consequence: "May be barred from testing per ILC registration rules" }
    ],
    aiAssistanceRestrictions: {
      allowed: ["Study and drill preparation"],
      forbidden: ["Any assistance during testing"],
      notes: "Closed written test; AI-integrity risk is prep-side only.",
      enforcedInApp: "Practice tests are clearly labeled as practice; no real ILC items are reproduced."
    },
    stateVariations: [
      { scope: "state", name: "State conference formats", differsHow: "PLACEHOLDER: some state associations adjust question counts/timing at regionals — verify per state" }
    ],
    officialReferences: [
      { label: "HOSA Medical Terminology ILC Guidelines (August 2025)", url: "https://hosa.org/wp-content/uploads/2025/08/25-26-MT-Aug30.pdf" }
    ],
    fieldNotes: {
      roundStructure: "sourced (official 2025-26 ILC guidelines: 50 items / 60 min — CHANGED this season from 100 items / 90 min)",
      rubric: "sourced (knowledge test, tiebreaker sets of 5 with spelling requirement)",
      penalties: "sourced (photo ID + #2 pencil requirements)",
      stateVariations: "placeholder"
    },
    verificationStatus: "VERIFIED",
    lastVerifiedAt: new Date("2026-07-05")
  },
  {
    organization: "MODEL_UN",
    season: SEASON,
    version: 1,
    isActive: true,
    eventName: "General Assembly Committee Session",
    eventCode: "GA",
    division: "High School",
    roundStructure: [
      { order: 1, name: "Roll call and agenda setting", speaker: "Chair + delegates", minutes: null, notes: "PLACEHOLDER timing — conference-dependent" },
      { order: 2, name: "Opening speeches (General Speakers List)", speaker: "Each delegation", minutes: 1.5, notes: "PLACEHOLDER: 60-90 seconds is common but set per conference" },
      { order: 3, name: "Moderated caucus", speaker: "Delegates, chair-moderated", minutes: null, notes: "Repeated blocks; duration/speaking time set by motion" },
      { order: 4, name: "Unmoderated caucus", speaker: "Delegates, informal", minutes: null, notes: "Bloc formation and draft-resolution work" },
      { order: 5, name: "Draft resolution introduction and amendments", speaker: "Sponsors", minutes: null },
      { order: 6, name: "Voting procedure", speaker: "Committee", minutes: null }
    ],
    prepTime: { notes: "Pre-conference: country/topic research and position paper. No standardized in-session prep time." },
    rubric: {
      totalPoints: null,
      categories: [
        { name: "Awards criteria", description: "PLACEHOLDER: Best Delegate/Outstanding/Honorable criteria are conference-specific (research, diplomacy, resolution work, procedure)" }
      ],
      notes: "No governing rubric exists across conferences. Never present a point rubric as official."
    },
    requiredUploads: [
      { name: "Position paper", format: "PDF/doc per conference", requiredBy: "Most conferences for award eligibility", notes: "PLACEHOLDER: requirements vary" }
    ],
    aiAssistanceRestrictions: {
      allowed: ["Research assistance in preparation (conference-dependent)"],
      forbidden: ["AI-written position papers at many conferences", "In-committee AI assistance"],
      notes: "PLACEHOLDER: each conference publishes its own academic-integrity policy — model this per conference.",
      enforcedInApp: "MUN practice is simulation only; position-paper drills label AI feedback as coaching, not authorship."
    },
    stateVariations: [
      { scope: "conference", name: "Rules of procedure", differsHow: "UNA-USA vs. THIMUN vs. UN4MUN procedure families differ substantially (speaking times, caucus types, voting)" }
    ],
    officialReferences: [
      { label: "UN4MUN (UN Department of Global Communications)", url: "https://www.un.org/en/mun" }
    ],
    fieldNotes: {
      roundStructure: "placeholder (flow shape is standard; every timing number needs a target-conference source)",
      rubric: "placeholder",
      requiredUploads: "placeholder",
      aiAssistanceRestrictions: "placeholder",
      stateVariations: "sourced (procedure-family differences are well documented)"
    },
    verificationStatus: "PLACEHOLDER",
    lastVerifiedAt: null
  }
];

async function main() {
  for (const spec of specs) {
    const result = await prisma.competitionSpec.upsert({
      where: {
        organization_eventName_season_version: {
          organization: spec.organization,
          eventName: spec.eventName,
          season: spec.season,
          version: spec.version ?? 1
        }
      },
      create: spec,
      update: spec
    });
    console.log(`[specs] upserted ${result.organization} · ${result.eventName} · ${result.season} v${result.version} (${result.verificationStatus})`);
  }
  console.log("Competition Specification Registry seeded: 4 specs.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
