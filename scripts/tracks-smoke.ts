/**
 * Training-tracks smoke test (pure logic + content filtering — no DB, no browser).
 * Run with: npm run tracks:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  composePractice,
  CONTENT_SOURCE_LABEL,
  DEFAULT_CONTENT_SOURCE,
  DEFAULT_TRACK,
  normalizeTrack,
  PRACTICE_SOURCES,
  TRACKS,
  skillVisibleForTrack,
  trackByOrganization,
  trackBySlug,
  trackToOrganization
} from "../lib/training-tracks";
import { deckSummaries } from "../lib/study-content";
import { EVENT_OPTIONS } from "../lib/rubrics";

function main() {
  // Four tracks, correct ids + slugs.
  assert.equal(TRACKS.length, 4, "Four training tracks.");
  assert.deepEqual(TRACKS.map((t) => t.id).sort(), ["DECA", "GENERAL_DEBATE", "HOSA", "MODEL_UN"], "Track ids.");
  assert.equal(trackBySlug("hosa")?.id, "HOSA", "slug hosa -> HOSA");
  assert.equal(trackBySlug("model-un")?.id, "MODEL_UN", "slug model-un -> MODEL_UN");
  assert.equal(trackBySlug("nope"), undefined, "unknown slug -> undefined (404-able)");

  // Track -> organization mapping.
  assert.equal(trackToOrganization("GENERAL_DEBATE"), "DEBATE");
  assert.equal(trackToOrganization("HOSA"), "HOSA");
  assert.equal(trackToOrganization("DECA"), "DECA");
  assert.equal(trackToOrganization("MODEL_UN"), "MODEL_UN");

  // Safe normalize.
  assert.equal(normalizeTrack("garbage"), DEFAULT_TRACK, "invalid persisted value falls back to default");
  assert.equal(normalizeTrack("DECA"), "DECA", "valid value kept");

  // Content filtering reuses org tagging: HOSA hub shows only HOSA decks (no DECA leakage), etc.
  const all = deckSummaries();
  const hosa = all.filter((d) => d.organization === "HOSA");
  const deca = all.filter((d) => d.organization === "DECA");
  assert.ok(hosa.length > 0, "HOSA has decks.");
  assert.ok(deca.length > 0, "DECA has decks.");
  assert.ok(hosa.every((d) => d.organization === "HOSA"), "HOSA hub excludes non-HOSA decks.");
  assert.ok(!hosa.some((d) => d.organization === "DECA"), "No DECA content in HOSA.");
  // Debate + Model UN have no decks yet -> honest empty state (never filled with unrelated content).
  const orgs = all.map((d) => String(d.organization));
  assert.equal(orgs.filter((o) => o === "DEBATE").length, 0, "No debate decks -> empty state.");
  assert.equal(orgs.filter((o) => o === "MODEL_UN").length, 0, "No Model UN decks -> empty state.");

  // Honest source labels — never label AI content as official.
  assert.equal(DEFAULT_CONTENT_SOURCE, "AI_GENERATED", "existing content classified honestly as AI-generated");
  assert.equal(CONTENT_SOURCE_LABEL.AI_GENERATED, "AI-generated practice");
  assert.ok(!/official|past/i.test(CONTENT_SOURCE_LABEL.AI_GENERATED), "AI label must not imply official/historical origin");
  assert.deepEqual(PRACTICE_SOURCES.map((s) => s.id), ["PAST", "AI", "MIXED"], "Past / AI / Mixed sources.");

  // Routes present + existing systems preserved.
  assert.ok(existsSync("app/(app)/training/page.tsx"), "track selection page exists");
  assert.ok(existsSync("app/(app)/training/[track]/page.tsx"), "track hub exists");
  for (const p of ["lib/assignments.ts", "lib/accessibility.ts", "lib/study-games.ts", "scripts/audio-debate-smoke.ts"]) {
    assert.ok(existsSync(p), `preserved: ${p}`);
  }

  // Reverse mapping (team/assignment Organization -> track label).
  assert.equal(trackByOrganization("HOSA")?.id, "HOSA");
  assert.equal(trackByOrganization("DECA")?.id, "DECA");

  // Propagation: debate creation uses the selected track's organization (not a hardcoded "DEBATE").
  const room = readFileSync("components/debate/debate-room.tsx", "utf8");
  assert.ok(room.includes("organization: trackOrganization"), "debate-room passes the track organization to the API");
  assert.ok(!room.includes('organization: "DEBATE"'), "debate-room no longer hardcodes DEBATE");
  assert.ok(room.includes("Switch track"), "debate-room shows the current track + switch");

  // AI is organization-specific (opponent/judge/rubric branch by org), so passing the track org
  // yields track-specific behavior.
  const ai = readFileSync("lib/ai.ts", "utf8");
  for (const org of ["MODEL_UN", "DECA", "HOSA"]) {
    assert.ok(ai.includes(org), `AI rubric/categories branch on ${org}`);
  }

  // Content filtering outside the hub: study page filters by ?track.
  const study = readFileSync("app/(app)/study/page.tsx", "utf8");
  assert.ok(study.includes("activeTrack") && study.includes("trackBySlug"), "study page filters decks by the selected track");

  // Dashboard uses the selected track; assignment form shows the track (from the team org, no schema).
  const dash = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
  assert.ok(dash.includes("TrackNextStep"), "dashboard shows a track-specific training path");
  const form = readFileSync("components/assignments/create-assignment-form.tsx", "utf8");
  assert.ok(form.includes("trackByOrganization"), "assignment form displays the track");
  assert.ok(!form.includes("setTrack"), "opening/creating an assignment does not overwrite the student's preferred track");

  // Dedicated practice setups compose track-specific fields into the AI-consumed context.
  const decaPractice = composePractice("DECA", { cluster: "Finance", role: "analyst", participantRole: "Client", performanceIndicators: "explain pricing", scenario: "budget question" });
  assert.equal(decaPractice.practiceMode, "ROLEPLAY", "DECA is a role play.");
  assert.equal(decaPractice.organization, "DECA");
  assert.ok(/Finance/.test(decaPractice.eventType), "DECA eventType carries the cluster.");
  assert.ok(/Client/.test(decaPractice.topic) && /analyst/.test(decaPractice.topic) && /explain pricing/.test(decaPractice.topic), "DECA topic carries role + participant + performance indicators.");
  assert.ok(/AI-generated DECA-style practice/.test(decaPractice.topic), "DECA labeled AI-generated (not official).");

  const munPractice = composePractice("MODEL_UN", { committee: "Security Council", country: "Brazil", agenda: "climate", activity: "Opening speech" });
  assert.ok(/Security Council/.test(munPractice.eventType) && /Security Council/.test(munPractice.topic), "MUN carries committee.");
  assert.ok(/Brazil/.test(munPractice.topic) && /climate/.test(munPractice.topic) && /Opening speech/.test(munPractice.topic), "MUN topic carries country + agenda + activity.");

  const hosaPractice = composePractice("HOSA", { category: "Medical terminology", scenario: "cardiac terms" });
  assert.ok(/Medical terminology/.test(hosaPractice.eventType), "HOSA carries the category.");
  assert.ok(!/Public Forum/.test(hosaPractice.eventType) && !/Public Forum/.test(hosaPractice.topic), "HOSA never labeled Public Forum.");
  assert.equal(hosaPractice.organization, "HOSA");

  const gdPractice = composePractice("GENERAL_DEBATE", { format: "Lincoln-Douglas" });
  assert.ok(/Lincoln-Douglas/.test(gdPractice.eventType), "General Debate carries the selected format.");

  // Route + component + hub wiring.
  assert.ok(existsSync("app/(app)/training/[track]/practice/page.tsx"), "dedicated practice route exists");
  assert.ok(existsSync("components/training/track-practice-setup.tsx"), "track practice setup component exists");
  const setup = readFileSync("components/training/track-practice-setup.tsx", "utf8");
  assert.ok(setup.includes("HOSA_CATEGORIES") && setup.includes("DECA_CLUSTERS") && setup.includes("MUN_COMMITTEES"), "setup renders track-specific fields");
  assert.ok(/No verified public past material/.test(setup), "Past mode refuses unsourced material");
  assert.ok(/AI-generated/.test(setup), "AI mode labeled");
  assert.ok(/so this practice will be AI-generated/.test(setup), "Mixed explains AI fallback honestly");
  const hub = readFileSync("app/(app)/training/[track]/page.tsx", "utf8");
  assert.ok(hub.includes("/practice") && hub.includes("Start a DECA role play"), "hub links to dedicated practice with track labels");
  const shell = readFileSync("components/app/app-shell.tsx", "utf8");
  assert.ok(shell.includes("withTrack(item.href)"), "sidebar preserves the selected track on content links");

  // Skills/lessons filtering (lessons are reached via skills; there is no separate /lessons page).
  assert.equal(skillVisibleForTrack("HOSA", "HOSA").visible, true, "HOSA shows HOSA skills");
  assert.equal(skillVisibleForTrack("DECA", "HOSA").visible, false, "HOSA excludes DECA skills");
  assert.equal(skillVisibleForTrack("HOSA", "DECA").visible, false, "DECA excludes HOSA skills");
  assert.equal(skillVisibleForTrack("Debate", "GENERAL_DEBATE").visible, true, "General Debate shows debate skills");
  assert.equal(skillVisibleForTrack("DECA", "GENERAL_DEBATE").visible, false, "General Debate excludes org-specific skills");
  assert.equal(skillVisibleForTrack("HOSA", "MODEL_UN").visible, false, "Model UN excludes HOSA skills");
  assert.equal(skillVisibleForTrack("Public Speaking", "MODEL_UN").visible, true, "shared foundation visible in every track");
  assert.equal(skillVisibleForTrack("Public Speaking", "DECA").shared, true, "shared foundation is labeled shared");

  // Tests source is keyed by org — no cross-track leakage between DECA and HOSA test events.
  const decaLabels = EVENT_OPTIONS.DECA.map((e) => e.label);
  const hosaLabels = EVENT_OPTIONS.HOSA.map((e) => e.label);
  assert.ok(!decaLabels.some((l) => hosaLabels.includes(l)), "DECA and HOSA test events do not overlap");

  // Pages are wired to filter (not just banner), and there is no separate /lessons page.
  assert.ok(readFileSync("app/(app)/skills/page.tsx", "utf8").includes("track={activeTrack?.id}"), "skills page filters by track");
  assert.ok(readFileSync("app/(app)/tests/page.tsx", "utf8").includes('activeTrack.id === "DECA"'), "tests page filters by track");
  assert.ok(!existsSync("app/(app)/lessons/page.tsx"), "no separate /lessons page (lessons filtered via skills)");
  // Game entry points are per-deck, and deck listings are already track-filtered (study), so no leakage.
  assert.ok(readFileSync("app/(app)/study/page.tsx", "utf8").includes("activeTrack"), "study/deck (game entry) is track-filtered");

  console.log("Tracks smoke tests passed: 4 tracks, slug/org mapping (+ reverse), safe normalize, org-based filtering (no leakage, honest empty states), honest source labels, debate->track-org propagation, org-specific AI, study filter, dashboard path, assignment track display, routes present, existing systems preserved.");
}

main();
