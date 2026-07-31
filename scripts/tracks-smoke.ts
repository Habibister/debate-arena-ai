/**
 * Training-tracks smoke test (pure logic + content filtering — no DB, no browser).
 * Run with: npm run tracks:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { hosaEventById, hosaEventsByFamily, presentHosaEvent, HOSA_EVENTS } from "../lib/hosa-events";
import {
  composePractice,
  CONTENT_SOURCE_LABEL,
  DEFAULT_CONTENT_SOURCE,
  DEFAULT_TRACK,
  normalizeTrack,
  PRACTICE_SOURCES,
  resolveTrackFromSlugs,
  TRACK_COOKIE,
  TRACKS,
  isSharedOrgTag,
  orgVisibleForResolvedTrack,
  skillSharedOnly,
  skillVisibleForTrack,
  trackAllowsOrganization,
  trackByOrganization,
  trackBySlug,
  trackToOrganization
} from "../lib/training-tracks";
import { deckSummaries, recommendedResources } from "../lib/study-content";
import { EVENT_OPTIONS } from "../lib/rubrics";
import { buildDecaFormatConfig, buildHosaFormatConfig, buildModelUnFormatConfig, FORMAT_CARDS, MODEL_UN_EVENT_TYPE, trackPracticeConfigForOrganization } from "../lib/debate-formats";
import { nextStepsForTrack, resourceOrgForTrack } from "../lib/dashboard-actions";
import { isLegacyPracticeRecord, practiceTypeLabel, showsOpponentMeta } from "../lib/debate-history";
import { assignmentTypeAllowedForOrganization, assignmentTypesForOrganization, contentAllowedForOrganization } from "../lib/track-content";
import { AUTHORED_LESSONS, getLesson } from "../lib/lessons";
import { DRILL_AREAS } from "../lib/debate-drills";
import { weakAreasForTrack } from "../lib/track-recommendations";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
import type { AvailableRoleplayLesson, UnavailableRoleplayLesson } from "../lib/roleplay-lessons";
import type { Organization } from "@prisma/client";

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
  // Progressive disclosure: a Quick start / Customize toggle gates the advanced controls, but the
  // motion + create-room path and every advanced default stay intact (additive only).
  assert.ok(room.includes("Quick start") && room.includes("Customize"), "debate-room offers Quick start + Customize");
  assert.ok(room.includes('setupMode === "custom"') && room.includes('useState<"quick" | "custom">("quick")'), "advanced setup is gated behind Customize, defaulting to Quick start");
  assert.ok(room.includes("startDebate") && room.includes("Generate motion"), "the motion + create-room path is always available (not hidden by the toggle)");

  // Guided lessons: authored teaching content with a weak-vs-strong contrast, real mistakes, and
  // practice wired to the EXISTING mastery pipeline (never a parallel scorekeeper).
  const cwi = getLesson("claim-warrant-impact");
  assert.ok(cwi, "the Claim/Warrant/Impact lesson exists");
  if (cwi) {
    // Practice maps to a real, seeded skill via the drill-area map (so recordDrillMastery can write).
    const area = DRILL_AREAS.find((a) => a.id === cwi.drillArea);
    assert.ok(area, "lesson drillArea resolves to a real drill area");
    assert.equal(area?.skillSlug, cwi.skillSlug, "lesson skillSlug matches the drill area's mastery skill");
    assert.equal(cwi.skillSlug, "debate-claim-building", "CWI maps to the seeded debate-claim-building skill");
    // Weak vs strong is a real contrast on the same claim, with reasons for each.
    assert.ok(cwi.weak.text.trim() !== cwi.strong.text.trim(), "weak and strong examples are genuinely different");
    assert.ok(cwi.weak.reasons.length >= 2 && cwi.strong.reasons.length >= 2, "each example explains why it fails/works");
    assert.ok(cwi.commonMistakes.length >= 2 && cwi.commonMistakes.length <= 3, "2-3 real common mistakes");
    assert.ok(cwi.commonMistakes.every((m) => m.fix.trim().length > 0), "every mistake has a concrete fix");
    // Incremental revision: at least three distinct passes, each with its own warrant + note.
    assert.ok(cwi.revisionLadder.steps.length >= 3, "revision ladder shows the warrant improving incrementally");
    assert.ok(cwi.revisionLadder.steps.every((s) => s.warrant.trim().length > 0 && s.note.trim().length > 0), "each revision step has a warrant and a note");
    assert.ok(cwi.revisionLadder.steps[0].warrant.trim() !== cwi.revisionLadder.steps[cwi.revisionLadder.steps.length - 1].warrant.trim(), "the first and last drafts genuinely differ");
    // Show, don't tell: a vague stat becomes a specific one, with what changed + an honesty note.
    assert.ok(cwi.evidenceUpgrade.vague.trim() !== cwi.evidenceUpgrade.specific.trim(), "evidence upgrade shows vague vs specific, not the same line twice");
    assert.ok(cwi.evidenceUpgrade.whatChanged.length >= 3, "evidence upgrade explains what made it specific");
    assert.ok(/illustrat/i.test(cwi.evidenceUpgrade.honestyNote), "illustrative figures are labeled honestly, not presented as verified");
    // Misconception repair: names the wrong model and corrects it (not just a restated tip).
    assert.ok(cwi.misconception.name.trim().length > 0 && cwi.misconception.wrongModel.trim().length > 0, "misconception is named with its wrong mental model");
    assert.ok(cwi.misconception.rightModel.trim().length > 0 && cwi.misconception.wrongModel.trim() !== cwi.misconception.rightModel.trim(), "misconception is corrected with a different, right model");
    // Optional video slot is an EMPTY placeholder — never a fake embed.
    assert.equal(cwi.video.url, null, "video slot is an empty placeholder, not a fake embed");
    // Honest framing: it explicitly disclaims official status (never presents teaching as official rules).
    assert.ok(/not official/i.test(cwi.provenanceNote), "lesson explicitly disclaims being official competition content");
  }
  assert.ok(AUTHORED_LESSONS.every((l) => l.track === "debate"), "authored lessons are General Debate only for now (honest scope)");
  // Practice reuses the existing drills endpoints + pipeline; it never re-implements mastery writes.
  const practice = readFileSync("components/lessons/lesson-practice.tsx", "utf8");
  assert.ok(practice.includes("/api/debate/drills/session") && practice.includes("/api/debate/drills/submit"), "lesson practice reuses the existing drills endpoints");
  // It must not import the mastery-writing lib or prisma directly — mastery is written only server-side
  // by the existing submit route. (Mentioning recordDrillMastery in a comment is fine; importing isn't.)
  assert.ok(!/from \"@\/lib\/spaced-review\"/.test(practice) && !/from \"@\/lib\/prisma\"/.test(practice), "lesson practice does not build a parallel mastery scorekeeper");
  assert.ok(practice.includes("wroteSkills"), "lesson practice reports mastery honestly from the server's confirmation");
  // Entry point lives under Train.
  const trackHub = readFileSync("app/(app)/training/[track]/page.tsx", "utf8");
  assert.ok(trackHub.includes("/lessons?track=") && trackHub.includes("Guided lessons"), "Train hub links to guided lessons");
  // Guided lessons live in the authenticated app group — the middleware must gate them like /skills.
  const middleware = readFileSync("middleware.ts", "utf8");
  assert.ok(middleware.includes('"/lessons"') && middleware.includes('"/lessons/:path*"'), "middleware gates /lessons behind auth");

  // AI is organization-specific (opponent/judge/rubric branch by org), so passing the track org
  // yields track-specific behavior.
  const ai = readFileSync("lib/ai.ts", "utf8");
  for (const org of ["MODEL_UN", "DECA", "HOSA"]) {
    assert.ok(ai.includes(org), `AI rubric/categories branch on ${org}`);
  }

  // Content filtering outside the hub: study page filters by ?track.
  const study = readFileSync("app/(app)/study-arcade/page.tsx", "utf8");
  assert.ok(study.includes("activeTrack") && study.includes("getActiveTrack"), "study arcade page filters decks by the selected track (cookie-aware resolver)");
  const studyRedirect = readFileSync("app/(app)/study/page.tsx", "utf8");
  assert.ok(studyRedirect.includes("redirect") && studyRedirect.includes("/study-arcade"), "old /study route redirects to /study-arcade (nothing breaks)");

  // Dashboard uses the selected track; assignment form shows the track (from the team org, no schema).
  const dash = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
  assert.ok(dash.includes("<LearningPath"), "dashboard shows a track-specific training path");
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

  // Pages are wired to filter (not just banner). The guided-lessons index is its own /lessons page now,
  // but it stays track-scoped (lessonsForTrack) with an honest empty state for tracks without lessons.
  assert.ok(readFileSync("app/(app)/skills/page.tsx", "utf8").includes("track={activeTrack?.id}"), "skills page filters by track");
  assert.ok(readFileSync("app/(app)/tests/page.tsx", "utf8").includes('activeTrack.id === "DECA"'), "tests page filters by track");
  const lessonsIndex = readFileSync("app/(app)/lessons/page.tsx", "utf8");
  assert.ok(lessonsIndex.includes("lessonsForTrack") && lessonsIndex.includes("getActiveTrack"), "guided-lessons index is track-scoped");
  assert.ok(lessonsIndex.includes("No guided lessons here yet"), "guided-lessons index has an honest empty state for tracks without lessons");
  // Game entry points are per-deck, and deck listings are already track-filtered (study), so no leakage.
  assert.ok(readFileSync("app/(app)/study-arcade/page.tsx", "utf8").includes("activeTrack"), "study arcade (game entry) is track-filtered");

  // ----------------------------------------------------------------------------------------------
  // Phase-1 repair coverage: global track mode, Model UN practice, dashboard filtering, focus mode,
  // accessibility overlay, and removed placeholders.
  // ----------------------------------------------------------------------------------------------

  // 1. Selected track survives navigation without relying only on ?track= — a preference cookie is the
  // fallback, and the URL param overrides it on a track-specific route.
  assert.equal(resolveTrackFromSlugs("hosa", undefined)?.id, "HOSA", "?track= resolves the track");
  assert.equal(resolveTrackFromSlugs(undefined, "hosa")?.id, "HOSA", "HOSA stays HOSA via cookie when ?track= is absent");
  assert.equal(resolveTrackFromSlugs("deca", "hosa")?.id, "DECA", "URL track overrides the cookie on a track-specific route");
  // Soft-removed (retired) tracks: MUN never resolves as the active selection — a stale retired URL
  // falls back to the cookie, a stale retired cookie falls back to browse-all, and a stored retired
  // track normalizes to the default. Code and data stay retained; only the selection is refused.
  assert.equal(resolveTrackFromSlugs("model-un", "hosa")?.id, "HOSA", "retired URL track falls back to the cookie");
  assert.equal(resolveTrackFromSlugs("model-un", "model-un"), undefined, "retired URL + retired cookie -> browse-all");
  assert.equal(resolveTrackFromSlugs(undefined, "model-un"), undefined, "stale retired cookie -> browse-all, never MUN content");
  assert.equal(normalizeTrack("MODEL_UN"), "GENERAL_DEBATE", "stored retired track falls back to the default track");
  assert.equal(resolveTrackFromSlugs(undefined, undefined), undefined, "no query + no cookie -> no track (browse-all allowed)");
  assert.equal(resolveTrackFromSlugs(undefined, "garbage"), undefined, "unknown cookie slug -> no track (never a wrong track)");
  assert.equal(TRACK_COOKIE, "debatearena_track", "track cookie name is stable");
  const ctx = readFileSync("components/training/training-track-context.tsx", "utf8");
  assert.ok(ctx.includes("TRACK_COOKIE") && ctx.includes("document.cookie"), "track context mirrors the selection into the server-readable cookie");

  // 2 + 3. HOSA content isolation on the consuming pages (server components read the resolver).
  const studyPage = readFileSync("app/(app)/study-arcade/page.tsx", "utf8");
  assert.ok(studyPage.includes("getActiveTrack"), "study arcade resolves the active track (cookie fallback)");
  assert.ok(studyPage.includes("organization={activeTrack?.organization}"), "study arcade resource shelf is scoped to the track");
  const hosaResources = recommendedResources({ organization: "HOSA" });
  assert.ok(hosaResources.every((r) => r.organization !== "DECA"), "HOSA resources exclude DECA resources");
  const decaResources = recommendedResources({ organization: "DECA" });
  assert.ok(decaResources.every((r) => r.organization !== "HOSA"), "DECA resources exclude HOSA resources");
  // No fallback-to-all when an organization filter yields nothing (honest empty state, no leakage).
  const noneResources = recommendedResources({ organization: "MODEL_UN" });
  assert.ok(noneResources.every((r) => r.organization !== "DECA" && r.organization !== "HOSA"), "Model UN never surfaces DECA/HOSA resources");

  // ===== C5B1: fail-closed track-context & isolation foundation =====
  // Recommendations never leak across tracks, and an UNRESOLVED track shows shared-only (never all).
  const decaShelf = recommendedResources({ organization: "DECA", limit: 50 });
  assert.ok(decaShelf.length > 0 && decaShelf.every((r) => r.organization === "DECA" || isSharedOrgTag(r.organization)), "DECA shelf is DECA/shared only");
  assert.ok(!decaShelf.some((r) => r.organization === "HOSA"), "DECA never surfaces HOSA (e.g. Medical Terminology) resources");
  const hosaShelf = recommendedResources({ organization: "HOSA", limit: 50 });
  assert.ok(!hosaShelf.some((r) => r.organization === "DECA"), "HOSA never surfaces DECA finance/PI resources");
  const debateShelf = recommendedResources({ organization: "DEBATE", limit: 50 });
  assert.ok(!debateShelf.some((r) => r.organization === "DECA" || r.organization === "HOSA"), "Debate never surfaces DECA/HOSA resources");
  // The old fail-open: NO organization used to return every track's resources. Now it fails closed.
  const unresolvedShelf = recommendedResources({ limit: 50 });
  assert.ok(unresolvedShelf.every((r) => isSharedOrgTag(r.organization)), "unresolved track shows shared-only resources");
  assert.ok(!unresolvedShelf.some((r) => ["DECA", "HOSA", "DEBATE"].includes(r.organization)), "unresolved track never leaks track-specific resources (fail-open removed)");

  // The single fail-closed predicate.
  assert.ok(orgVisibleForResolvedTrack("GENERAL", undefined) && orgVisibleForResolvedTrack("DECA", "DECA"), "shared shows everywhere; own-track content shows in its track");
  assert.ok(!orgVisibleForResolvedTrack("HOSA", "DECA") && !orgVisibleForResolvedTrack("DECA", undefined) && !orgVisibleForResolvedTrack("DECA", null), "cross-track hidden; unresolved hides track-specific content");
  assert.ok(isSharedOrgTag("GENERAL") && isSharedOrgTag("SHARED") && !isSharedOrgTag("DECA"), "only GENERAL/SHARED are shared tags");

  // Skills: DECA hides Debate/HOSA skills; shared foundation shows everywhere; no-track = shared only.
  assert.ok(!skillVisibleForTrack("Debate", "DECA").visible && !skillVisibleForTrack("HOSA", "DECA").visible, "DECA hides Debate-only and HOSA-only skills");
  assert.ok(skillVisibleForTrack("Public Speaking", "DECA").visible, "shared foundation shows in DECA");
  assert.ok(skillSharedOnly("Public Speaking") && !skillSharedOnly("HOSA") && !skillSharedOnly("Debate"), "no-track skill list fails closed to shared foundations only");

  // Resolution priority + deep-link-vs-preference separation.
  assert.equal(resolveTrackFromSlugs("deca", "hosa")?.id, "DECA", "explicit route track wins over saved preference (deep link controls context)");
  assert.equal(resolveTrackFromSlugs(undefined, "hosa")?.id, "HOSA", "saved preference used when no route track");
  assert.equal(resolveTrackFromSlugs(undefined, undefined), undefined, "unresolved when neither route nor preference (caller fails closed / onboarding)");

  // Contract centralized in one resolver that only READS the preference cookie (deep link cannot overwrite it).
  const trackServer = readFileSync("lib/track-server.ts", "utf8");
  assert.ok(trackServer.includes("export function resolveActiveTrack") && /getActiveTrack[\s\S]*resolveActiveTrack\(/.test(trackServer), "getActiveTrack delegates to the single resolveActiveTrack contract");
  assert.ok(trackServer.includes("cookies().get(TRACK_COOKIE)") && !trackServer.includes(".set("), "resolver only reads the preference cookie, never writes it");
  const trackCtx = readFileSync("components/training/training-track-context.tsx", "utf8");
  assert.ok(trackCtx.includes("writeTrackCookie") && trackCtx.includes("setTrack"), "the saved track preference is owned solely by the explicit switcher");

  // Hardcoded mixed-track fallback removed and NOT replaced by another broad list.
  const dashIsolationSrc = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
  assert.ok(!dashIsolationSrc.includes('"Medical Terminology"') && !dashIsolationSrc.includes('"Finance"'), "dashboard no longer hardcodes a mixed-track recommendation fallback");

  // C5B1 regression: the exact production failure — a prior HOSA Medical Terminology test must NOT
  // become the "Recommended next" weak area when the active track is Debate. Weak-area recommendations
  // are scoped to the resolved track's own graded tests; an unresolved track surfaces none.
  const priorTests = [
    { organization: "HOSA" as Organization, weakAreas: ["Medical Terminology", "Patient Communication"] },
    { organization: "DECA" as Organization, weakAreas: ["Finance"] }
  ];
  assert.deepEqual(weakAreasForTrack(priorTests, "DEBATE"), [], "Debate Home never recommends a HOSA/DECA weak area (Medical Terminology leak fixed)");
  assert.deepEqual(weakAreasForTrack(priorTests, "HOSA"), ["Medical Terminology", "Patient Communication"], "HOSA shows its own weak areas");
  assert.deepEqual(weakAreasForTrack(priorTests, "DECA"), ["Finance"], "DECA shows its own weak areas");
  assert.deepEqual(weakAreasForTrack(priorTests, undefined), [], "unresolved track surfaces no weak-area recommendation (fail closed)");
  assert.deepEqual(weakAreasForTrack(priorTests, null), [], "null track surfaces no weak-area recommendation (fail closed)");
  // The DB query itself must fail closed: an unresolved track runs NO practiceTest query (never an
  // all-org fetch that gets filtered afterward). Assert the guarded ternary on both surfaces.
  const homeSrc = readFileSync("app/(app)/home/page.tsx", "utf8");
  const failClosedQuery = /activeOrg && session[\s\S]*?\? await prisma\.practiceTest\.findMany\([\s\S]*?organization: activeOrg[\s\S]*?: \[\]/;
  assert.ok(failClosedQuery.test(homeSrc), "Home only queries practiceTests when a track is resolved (fail-closed query, not post-filter)");
  assert.ok(failClosedQuery.test(dashIsolationSrc), "Dashboard only queries practiceTests when a track is resolved (fail-closed query, not post-filter)");
  // No unscoped nested include may remain, and both keep weakAreasForTrack as display-layer defense.
  assert.ok(!/practiceTests: \{/.test(homeSrc) && !/practiceTests: \{/.test(dashIsolationSrc), "no unscoped practiceTests include remains on Home or Dashboard");
  assert.ok(homeSrc.includes("weakAreasForTrack") && dashIsolationSrc.includes("weakAreasForTrack"), "both surfaces use weakAreasForTrack as defense-in-depth at the display layer");

  // Preservation: approved lesson + Debate internals untouched by C5B1.
  assert.equal(getLesson("claim-warrant-impact")?.skillSlug, "debate-claim-building", "CWI lesson + mastery slug unchanged");
  assert.ok(!readFileSync("components/debate/debate-arena.tsx", "utf8").includes("orgVisibleForResolvedTrack"), "Debate arena internals untouched by the isolation change");
  // ===== end C5B1 =====

  // ===== C5B2A: Debate launches directly to /debate; Compete is track-aware =====
  // Every "start debating" action opens /debate directly (no General Debate hub in between).
  assert.ok(homeSrc.includes('label: "Debate Now"') && homeSrc.includes("/debate?track="), "Home 'Debate Now' -> /debate");
  assert.ok(/GENERAL_DEBATE" \? `\/debate/.test(homeSrc), "Home 'Practice' launches Debate straight into /debate");
  const hubSrc2 = readFileSync("app/(app)/training/[track]/page.tsx", "utf8");
  assert.ok(/isDebate \? "\/debate"/.test(hubSrc2), "Training hub Debate start-action -> /debate directly");
  assert.ok(readFileSync("lib/dashboard-actions.ts", "utf8").includes('href: "/debate"'), "dashboard next-step for Debate -> /debate");
  // Compete is track-aware: Debate gets a direct /debate round; DECA/HOSA never see 'Debate Now'.
  const competeSrc = readFileSync("app/(app)/compete/page.tsx", "utf8");
  assert.ok(!competeSrc.includes('"Debate Now"'), "Compete no longer shows a track-generic 'Debate Now'");
  assert.ok(/GENERAL_DEBATE[\s\S]*?Full Debate Round[\s\S]*?\/debate\?track=/.test(competeSrc), "Compete Debate -> Full Debate Round at /debate");
  assert.ok(/DECA[\s\S]*?Guided DECA Role-Play[\s\S]*?\/training\/deca\/practice/.test(competeSrc), "Compete DECA opens the DECA role-play setup (not /debate)");
  assert.ok(/HOSA[\s\S]*?Guided HOSA Role-Play[\s\S]*?\/training\/hosa\/practice/.test(competeSrc), "Compete HOSA opens the HOSA role-play setup (not /debate)");
  assert.ok(/Full HOSA Simulation[\s\S]*?comingSoon: true/.test(competeSrc), "HOSA Full Simulation is an honest coming-soon (it does not exist yet)");
  assert.ok(competeSrc.includes("Choose your track first"), "Compete fails closed to a track picker when no track is resolved");
  // The persistent track switcher only changes the active track — it never launches an activity/room.
  const switcherSrc = readFileSync("components/training/track-controls.tsx", "utf8");
  assert.ok(switcherSrc.includes("setTrack") && !/router\.(push|replace)/.test(switcherSrc), "track switcher changes context only — it does not launch a room");
  // ===== end C5B2A =====

  // ===== C5C1: DECA/HOSA beginner role-play lessons =====
  const decaLesson = getRoleplayLesson("how-deca-roleplay-works");
  const hosaLesson = getRoleplayLesson("how-hosa-scenario-interaction-works");
  assert.ok(decaLesson && hosaLesson, "both pilot role-play lessons exist");
  if (decaLesson && hosaLesson) {
    assert.equal(decaLesson.organization, "DECA", "DECA lesson is DECA");
    assert.equal(hosaLesson.organization, "HOSA", "HOSA lesson is HOSA");
    // DECA Learn begins with lesson 0; HOSA sits BENEATH the Event Navigator (no universal
    // role-play claim — HOSA has many event formats).
    assert.ok(decaLesson.courseMap[0].includes("How a DECA Role-Play Works"), "DECA Performance Course begins with 'How a DECA Role-Play Works'");
    // M3: HOSA lesson retitled to the corrected scope. Slug/lesson ID deliberately UNCHANGED.
    assert.equal(hosaLesson.title, "Patient Communication in HOSA Clinical Skill Events", "HOSA lesson retitled — communication layer inside clinical skill events");
    assert.equal(hosaLesson.slug, "how-hosa-scenario-interaction-works", "HOSA lesson ID (slug) preserved across the M3 retitle");
    assert.ok(!/scenario interaction/i.test(hosaLesson.title) && !/scenario interaction/i.test(hosaLesson.subtitle), "the withdrawn 'scenario interaction' framing is gone from the learner-facing title/subtitle");
    assert.ok(hosaLesson.courseMap[0].includes("HOSA Event Navigator"), "HOSA course map begins with the Event Navigator");
    assert.ok(hosaLesson.courseMap[1].includes("Patient Communication in HOSA Clinical Skill Events"), "HOSA lesson sits beneath the Event Navigator under its corrected title");
    assert.equal(hosaLesson.courseMapCurrentIndex, 1, "HOSA lesson marks itself (not the Navigator) as the current lesson");
    assert.ok(hosaLesson.intro[0].includes("written tests, clinical skill performances"), "HOSA lesson opens by naming HOSA's many event formats");
    // The lesson is scoped to the communication LAYER and disclaims complete-event readiness.
    const hosaIntro = hosaLesson.intro.join(" ");
    assert.ok(/no separate 'patient conversation' event/i.test(hosaIntro), "HOSA lesson states there is no standalone patient-conversation event");
    assert.ok(/does not teach the physical clinical skill/i.test(hosaIntro) && /does not make you ready for your complete event/i.test(hosaIntro), "HOSA lesson disclaims teaching the physical skill and complete-event readiness");
    for (const l of [decaLesson, hosaLesson]) {
      // Ends with exactly one clear next lesson, and it is NOT terminology.
      assert.ok(l.nextLesson.label.length > 0 && !/terminolog/i.test(l.nextLesson.label), "ends with one next lesson that is not terminology");
      assert.ok(!l.supportingLink || /optional/i.test(l.supportingLink.note), "terminology (if present) is optional support, not the required path");
      // A lesson may never define interactive practice without the scenario its payload depends on.
      assert.ok(!l.practice || !!l.scenario, "practice is never defined without the scenario its Side Coach payload requires");
    }
    // ===== M3A: practice availability is an EXPLICIT, discriminated state =====
    // DECA is explicitly available, and the discriminant narrows the type so every scenario-dependent
    // field is reachable without a non-null assertion — that is the point of the union.
    assert.equal(decaLesson.practiceStatus, "available", "DECA lesson is explicitly marked available");
    if (decaLesson.practiceStatus === "available") {
      assert.ok(decaLesson.scenario.title.length > 0 && decaLesson.scenario.text.length > 0, "DECA retains its complete scenario");
      assert.ok(decaLesson.prepOutline.items.length >= 3, "DECA retains its preparation outline");
      assert.ok(decaLesson.weakExample.lines.length >= 3 && decaLesson.strongExample.lines.length >= 4, "DECA retains a complete weak + strong worked role-play");
      assert.ok(decaLesson.strongExample.lines.filter((ln) => ln.note).length >= 3, "DECA worked role-play has line-by-line annotations");
      assert.ok(decaLesson.practice.identify.length >= 3 && decaLesson.practice.write.rubric.length >= 3 && decaLesson.practice.followUp.question.length > 0, "DECA retains dual-response practice: identify + write + follow-up");
      assert.equal(decaLesson.practiceUnavailable, undefined, "an available lesson carries no unavailable notice");
    }
    // Track-specific method + vocabulary — no generic cross-track language.
    const decaText = JSON.stringify(decaLesson).toLowerCase();
    const hosaText = JSON.stringify(hosaLesson).toLowerCase();
    assert.ok(decaText.includes("performance indicator") && decaText.includes("recommendation") && !decaText.includes("patient"), "DECA lesson uses DECA method (PIs/recommendations), never patient language");
    assert.ok(hosaText.includes("patient") && hosaText.includes("rating sheet") && !hosaText.includes("performance indicator"), "HOSA lesson uses HOSA method (patient/rating sheet/boundaries), never DECA PI language");
    // DECA content fixes: the weak-example typo is gone; timing defers to the selected event.
    assert.ok(decaText.includes("late checkout") && !decaText.includes("a later start would really help"), "DECA weak example uses a relevant intentionally weak line (typo fixed)");
    assert.ok(decaText.includes("depends on the selected deca event"), "DECA timing defers to the selected event's current official timing");
    // ===== M3: HOSA clinic-privacy scenario DISABLED BY DEFAULT (no clinical/legal approval) =====
    // Everything the scenario carried is gone together — nothing orphaned, nothing reachable.
    assert.equal(hosaLesson.practiceStatus, "temporarily-unavailable", "HOSA lesson is explicitly marked temporarily unavailable (not merely missing content)");
    assert.equal(hosaLesson.scenario, undefined, "HOSA clinic-privacy scenario is removed");
    assert.equal(hosaLesson.prepOutline, undefined, "HOSA scenario prep outline is removed with it");
    assert.equal(hosaLesson.weakExample, undefined, "HOSA privacy weak worked example is removed");
    assert.equal(hosaLesson.strongExample, undefined, "HOSA privacy strong worked example is removed");
    assert.equal(hosaLesson.practice, undefined, "HOSA interactive practice (identify/write/follow-up/rubric) is removed");
    // No privacy/legal content survives anywhere in the lesson payload.
    for (const banned of ["privacy officer", "generally protected", "hipaa", "covered entit", "employer finding out", "medical information"]) {
      assert.ok(!hosaText.includes(banned), `withdrawn privacy content absent from the HOSA lesson: ${banned}`);
    }
    // The learner sees an honest unavailable state that claims no completion.
    if (hosaLesson.practiceStatus === "temporarily-unavailable") {
      assert.ok(/temporarily unavailable/i.test(hosaLesson.practiceUnavailable.title), "unavailable notice is stated plainly to the learner");
      assert.ok(!/legal|lawyer|counsel|liabilit/i.test(hosaLesson.practiceUnavailable.message), "unavailable notice does not expose internal review details");
    }
    // ===== M3A compile-time guarantee =====
    // These are checked by `tsc --noEmit`, not at runtime. Each @ts-expect-error FAILS THE BUILD if
    // the annotated line stops being an error — i.e. if the type ever starts accepting a malformed
    // lesson. That is what makes "incomplete available lesson" a compile error rather than something
    // that silently renders like an intentionally withdrawn one.
    {
      // An "available" lesson missing its scenario/examples/practice must NOT type-check.
      // @ts-expect-error - an available lesson requires scenario, prepOutline, weakExample, strongExample and practice
      const missingContent: AvailableRoleplayLesson = { ...hosaLesson, practiceStatus: "available" as const, practiceUnavailable: undefined };
      void missingContent;
      // A withdrawn lesson must NOT be able to carry scenario content.
      // @ts-expect-error - scenario is forbidden on the temporarily-unavailable variant
      const withdrawnWithScenario: UnavailableRoleplayLesson = { ...hosaLesson, scenario: { title: "x", text: "y" } };
      void withdrawnWithScenario;
      // A withdrawn lesson must carry a learner-facing message (it is required, not optional).
      // @ts-expect-error - practiceUnavailable is required on the temporarily-unavailable variant
      const withdrawnWithoutNotice: UnavailableRoleplayLesson = { ...hosaLesson, practiceUnavailable: undefined };
      void withdrawnWithoutNotice;
    }
    // Corrected HOSA safety wording: the rejected sentence never appears; the official distinction does.
    assert.ok(!/never real procedures on real people/i.test(hosaText), "rejected HOSA safety sentence is absent");
    assert.ok(hosaText.includes("manikins, training arms, or medication trainers") && hosaText.includes("live patient or an actor"), "HOSA lesson states the official simulation-equipment vs live-patient distinction");
    assert.ok(/policy, not a hosa rule/i.test(hosaText), "supervision guidance is labelled CompeteReady policy, not a HOSA rule");
    assert.ok(/does not create clinical readiness/i.test(hosaText) || /not create clinical readiness/i.test(hosaText), "HOSA lesson denies that app practice creates clinical readiness");
    // Verbalization nuance is taught, not the community oversimplification.
    assert.ok(/does not replace performing it/i.test(hosaText), "HOSA lesson teaches that verbalization does not replace required action");
  }
  // ===== M5: device-local resume is scoped to AVAILABLE lessons only =====
  {
    const rp = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
    // Only the available lesson mounts persistence; the unavailable branch touches no storage.
    const unavailable = rp.slice(rp.indexOf("function PracticeUnavailable"), rp.indexOf("function ActiveRoleplayPractice"));
    assert.ok(!/localStorage|AuthoredLessonProgress/.test(unavailable), "the unavailable HOSA practice performs no device-local storage access");
    // Local resume never becomes progress data.
    assert.ok(!/recordDrillMastery|@\/lib\/prisma|@\/lib\/spaced-review|completedAt/.test(rp), "device-local resume writes no mastery, DB record, or completion fact");
    // Honest, text-based labelling (never colour alone).
    assert.ok(rp.includes("Saved on this device") && rp.includes("Progress is not being saved on this device"), "both honest persistence labels exist");
    assert.ok(rp.includes("Start this practice over"), "a local reset action exists for the available lesson");
  }

  // Interactive practice reuses the Side Coach route; no mastery/record/scoring pipeline; retries on failure.
  const rpPractice = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
  assert.ok(rpPractice.includes("/api/ai/side-coach"), "role-play practice reuses the existing Side Coach route");
  assert.ok(!/recordDrillMastery|from \"@\/lib\/prisma\"|from \"@\/lib\/spaced-review\"/.test(rpPractice), "role-play practice records no mastery/competition result");
  // M7A: the rubric now travels as stable "id \u2014 label" pairs, alongside the machine IDs the coach
  // must key its verdicts to. The coach note still rides at the end of goals.
  assert.ok(rpPractice.includes("Retry") && rpPractice.includes("goals: [...p.write.rubric.map((r) => `${r.id} \u2014 ${r.label}`), COACH_NOTE]"), "role-play practice retries on failure and validates against the authored rubric (+ coach note)");
  assert.ok(rpPractice.includes("rubricIds: p.write.rubric.map((r) => r.id)"), "the authored rubric's stable IDs are sent so feedback can be keyed to them");
  // ===== C5C1a: feedback evaluates BOTH responses; nonsense can't unlock coaching =====
  // Both learner responses travel in the field the coach is explicitly instructed to evaluate.
  assert.ok(rpPractice.includes("INITIAL RESPONSE:") && rpPractice.includes("RESPONSE TO FOLLOW-UP:") && /latestStudentSpeech: `INITIAL RESPONSE:/.test(rpPractice), "both initial + follow-up responses are included in the evaluation input");
  // The stage explicitly requests evaluation of both against every rubric item.
  assert.ok(rpPractice.includes("evaluate the learner's initial response AND follow-up against every lesson-rubric item"), "stage explicitly requests evaluation of both responses");
  // Honest no-strength handling: never invent praise for empty-quality responses.
  assert.ok(rpPractice.includes("No rubric-aligned strength is demonstrated yet."), "coach note forbids invented praise and provides the honest no-strength line");
  // Meaningful-response gate on BOTH the continue and feedback actions (blocks blank/nonsense, allows weak answers).
  // The 8-word gate now lives in lib/authored-lesson-progress.ts so the practice UI and resume
  // normalization share one source of truth — a restored state can never satisfy one and break the other.
  const progressHelper = readFileSync("lib/authored-lesson-progress.ts", "utf8");
  assert.ok(progressHelper.includes("MIN_MEANINGFUL_RESPONSE_WORDS = 8"), "the 8-word meaningful-response gate is defined once, in the shared helper");
  assert.ok(rpPractice.includes("MIN_RESPONSE_WORDS = MIN_MEANINGFUL_RESPONSE_WORDS"), "the practice UI consumes the shared gate rather than redefining it");
  assert.ok(rpPractice.includes("Write at least one complete sentence so the coach has something meaningful to evaluate."), "learner-facing short-response hint exists");
  assert.ok(rpPractice.includes("normalizeRestoredProgress"), "restored progress is normalized before it is applied");
  assert.ok(/disabled=\{wordCount\(writeText\) < MIN_RESPONSE_WORDS\}/.test(rpPractice) && /disabled=\{busy \|\| wordCount\(writeText\) < MIN_RESPONSE_WORDS \|\| wordCount\(followText\) < MIN_RESPONSE_WORDS\}/.test(rpPractice), "short/nonsense responses cannot unlock the follow-up or coaching");
  // The authored DECA/HOSA rubrics themselves are unchanged by C5C1a.
  if (decaLesson && hosaLesson) {
    if (decaLesson.practiceStatus === "available") {
      assert.equal(decaLesson.practice.write.rubric.length, 4, "DECA rubric still has its 4 authored items");
      assert.ok(decaLesson.practice.write.rubric[0].label.includes("specific recommendation"), "DECA rubric content passed through unchanged");
    }
    // M3: the HOSA rubric is withdrawn with its scenario — no orphaned rubric remains active.
    assert.equal(hosaLesson.practice, undefined, "no HOSA rubric remains active after the scenario withdrawal");
  }
  // ===== end C5C1a =====
  // Integrity: a 200-with-fallback (`unavailable: true`) is treated as a FAILED coaching request —
  // canned text is never shown as feedback on the learner's words.
  assert.ok(rpPractice.includes("data.unavailable") && /if \(data\.unavailable\) throw/.test(rpPractice), "role-play practice rejects the unavailable fallback instead of displaying it");
  // The coach is labeled as coaching feedback, never as live character role-play.
  assert.ok(rpPractice.includes("Get coaching feedback") && !rpPractice.includes("reaction") && !rpPractice.includes("react as"), "practice is labeled coaching feedback; the coach is never asked to role-play the character");
  // The main written response is required before the follow-up unlocks; no placeholder submission.
  assert.ok(rpPractice.includes("Continue to the follow-up") && rpPractice.includes("followUnlocked") && !rpPractice.includes("(no first response)"), "first written response is required before the follow-up; no placeholder submission");
  // Debate concept lesson + its mastery wiring remain unchanged.
  assert.equal(getLesson("claim-warrant-impact")?.skillSlug, "debate-claim-building", "CWI lesson + mastery slug unchanged by C5C1");
  // ===== end C5C1 =====

  // 4. Model UN tests hide the DECA/HOSA generator (gated by track, honest empty state otherwise).
  const testsPage = readFileSync("app/(app)/tests/page.tsx", "utf8");
  assert.ok(testsPage.includes("showGenerator"), "tests page gates the generator by track");
  assert.ok(testsPage.includes("showGenerator ?"), "generator is only rendered when the track supports tests");
  assert.ok(testsPage.includes("lockedOrganization"), "generator organization is locked to the selected track");

  // 5. Model UN practice uses Model UN terminology only — never parliamentary labels.
  const mun = buildModelUnFormatConfig();
  const munText = [
    mun.label,
    mun.description,
    mun.sides.affirmativeLabel,
    mun.sides.negativeLabel,
    ...mun.speeches.flatMap((s) => [s.label, s.shortLabel, s.guidance])
  ].join(" | ");
  assert.ok(!/government|opposition|affirmative|negative|\bpm\b|\blo\b|\bmg\b|\bmo\b|motion/i.test(munText), "Model UN practice shows no Government/Opposition/PM-LO-MG-MO/motion labels");
  assert.equal(mun.sides.affirmativeLabel, "Student Delegate", "Model UN uses Student Delegate");
  assert.equal(mun.sides.negativeLabel, "AI Delegate / Chair", "Model UN uses AI Delegate / Chair");
  assert.ok(mun.speeches.every((s) => s.side === "FOR"), "Model UN stages are all Student Delegate turns (no parliamentary AI opponent invoked)");
  const munStages = mun.speeches.map((s) => s.label);
  for (const stage of ["Opening Speech", "Moderated Caucus Response", "Negotiation Response", "Resolution Explanation"]) {
    assert.ok(munStages.includes(stage), `Model UN includes the ${stage} activity`);
  }
  assert.equal(mun.eventType, MODEL_UN_EVENT_TYPE, "Model UN has its own event type");
  assert.ok(!/PARLIAMENTARY/.test(mun.eventType), "Model UN is never labeled parliamentary");
  // Server keys the practice config off the organization, not the parliamentary format enum.
  const debatesApi = readFileSync("app/api/debates/route.ts", "utf8");
  assert.ok(debatesApi.includes("trackPracticeConfigForOrganization"), "debate API builds an organization-specific (non-parliamentary) config for org-based tracks");
  assert.equal(trackPracticeConfigForOrganization("DEBATE"), null, "General Debate uses the real debate formats (no track-practice override)");

  // 6. Model UN practice receives committee, country, agenda, and activity context (composePractice).
  const munCtx = composePractice("MODEL_UN", { committee: "ECOSOC", country: "Kenya", agenda: "water access", activity: "Negotiation" });
  assert.ok(/ECOSOC/.test(munCtx.topic) && /Kenya/.test(munCtx.topic) && /water access/.test(munCtx.topic) && /Negotiation/.test(munCtx.topic), "Model UN carries committee + country + agenda + activity");

  // 7. Model UN dashboard excludes DECA/HOSA actions and resources.
  const munSteps = nextStepsForTrack(trackBySlug("model-un"));
  assert.ok(munSteps.every((s) => s.key !== "tests" && s.key !== "study"), "Model UN dashboard omits the DECA/HOSA test + deck actions");
  assert.ok(munSteps.some((s) => s.key === "practice" && s.href.includes("/training/model-un/practice")), "Model UN dashboard links to Model UN practice");
  assert.ok(munSteps.every((s) => !/DECA|HOSA/.test(`${s.title} ${s.description}`)), "Model UN dashboard actions never mention DECA/HOSA");
  assert.equal(resourceOrgForTrack(trackBySlug("model-un")), "MODEL_UN", "Model UN resource shelf is scoped to MODEL_UN");

  // 8. General Debate excludes organization-specific content (no exam generator, no DECA/HOSA decks).
  const gdSteps = nextStepsForTrack(trackBySlug("debate"));
  assert.ok(gdSteps.every((s) => s.key !== "tests" && s.key !== "study"), "General Debate dashboard omits organization-specific exam/deck actions");
  // DECA/HOSA keep their real activities.
  const decaSteps = nextStepsForTrack(trackBySlug("deca"));
  assert.ok(decaSteps.some((s) => s.key === "tests") && decaSteps.some((s) => s.key === "study"), "DECA keeps its test + study actions");

  // 9 + 10. Starting an active practice activates full-screen focus mode that hides the app sidebar.
  const shellSrc = readFileSync("components/app/app-shell.tsx", "utf8");
  assert.ok(shellSrc.includes("focusMode"), "app shell computes a focus mode");
  assert.ok(shellSrc.includes("/^\\/debate\\/[^/]+$/"), "focus mode triggers on an active debate/practice room route");
  assert.ok(/if \(focusMode\)/.test(shellSrc), "focus mode short-circuits the normal shell (sidebar/nav hidden)");
  assert.ok(shellSrc.includes("Exit practice") && shellSrc.includes("window.confirm"), "focus mode keeps a clear Exit control that confirms before leaving");
  // The debate arena keeps its own header but adds an orientation strip (breadcrumb + Back to track) so
  // a learner always knows where they are and how to get back to their track.
  const arenaOrient = readFileSync("components/debate/debate-arena.tsx", "utf8");
  assert.ok(arenaOrient.includes("<RoomOrientation"), "debate arena mounts the additive orientation strip");
  assert.ok(arenaOrient.includes("backLabel") && arenaOrient.includes("orientationCrumbs"), "orientation strip supplies a breadcrumb + Back-to-track");
  const orientSrc = readFileSync("components/rooms/room-chrome.tsx", "utf8");
  assert.ok(orientSrc.includes("RoomOrientation") && orientSrc.includes('aria-label="Breadcrumb"'), "RoomOrientation renders an accessible breadcrumb");

  // 11 + 12. Accessibility controls are an overlay/drawer (never inline), and larger text is supported.
  const a11yPanel = readFileSync("components/debate/accessibility/accessibility-panel.tsx", "utf8");
  assert.ok(a11yPanel.includes("fixed") && a11yPanel.includes('aria-modal="true"'), "accessibility controls open as a fixed overlay/drawer (do not shrink the room)");
  assert.ok(a11yPanel.includes("Larger text"), "larger text control remains available");
  assert.ok(readFileSync("lib/accessibility.ts", "utf8").includes("largerText"), "larger text is still supported by the accessibility model");

  // 15. Misleading placeholders removed from the production UI.
  assert.ok(!FORMAT_CARDS.some((c) => c.format === "CUSTOM"), "Custom-format card is gone");
  assert.ok(!FORMAT_CARDS.some((c) => /coming soon/i.test(`${c.label} ${c.summary} ${c.detail}`)), "no 'coming soon' format cards");
  assert.ok(!/coming soon/i.test(readFileSync("components/debate/debate-room.tsx", "utf8")), "debate room shows no 'coming soon' placeholder");
  assert.ok(!/Live students coming soon/.test(readFileSync("components/debate/debate-arena.tsx", "utf8")), "arena 'Live students coming soon' placeholder removed");

  // ----------------------------------------------------------------------------------------------
  // Video-verified addendum coverage.
  // ----------------------------------------------------------------------------------------------

  // A1. Direct-URL track isolation: a HOSA user cannot open a DECA deck just by knowing the URL.
  assert.equal(trackAllowsOrganization(trackBySlug("hosa"), "DECA"), false, "HOSA track disallows a DECA deck via direct URL");
  assert.equal(trackAllowsOrganization(trackBySlug("hosa"), "HOSA"), true, "HOSA track allows HOSA decks");
  assert.equal(trackAllowsOrganization(trackBySlug("deca"), "HOSA"), false, "DECA track disallows a HOSA deck via direct URL");
  assert.equal(trackAllowsOrganization(undefined, "DECA"), true, "no selected track -> browse-all allowed");
  const deckPage = readFileSync("app/(app)/study/[deck]/page.tsx", "utf8");
  assert.ok(deckPage.includes("trackAllowsOrganization") && deckPage.includes("redirect"), "study deck route validates the deck against the active track and redirects on mismatch");
  const deckGamesPage = readFileSync("app/(app)/study/[deck]/games/page.tsx", "utf8");
  assert.ok(deckGamesPage.includes("trackAllowsOrganization") && deckGamesPage.includes("redirect"), "study deck games route enforces the same isolation");

  // A2. DECA (and other non-general tracks) must not route into or render parliamentary debate.
  const debatePage = readFileSync("app/(app)/debate/page.tsx", "utf8");
  assert.ok(debatePage.includes('activeTrack.id !== "GENERAL_DEBATE"') && debatePage.includes("/practice"), "debate page redirects non-general tracks to their real practice (no parliamentary debate as DECA/HOSA/MUN)");
  // DECA practice is a role play with DECA labels/stages — never Government/Opposition/PM-LO-MG-MO/motion.
  const decaConfig = buildDecaFormatConfig();
  const decaText = [decaConfig.label, decaConfig.description, decaConfig.sides.affirmativeLabel, decaConfig.sides.negativeLabel, ...decaConfig.speeches.flatMap((s) => [s.label, s.shortLabel, s.guidance])].join(" | ");
  assert.ok(!/government|opposition|affirmative|negative|\bpm\b|\blo\b|\bmg\b|\bmo\b|motion|parliamentary/i.test(decaText), "DECA role play shows no parliamentary labels");
  assert.equal(decaConfig.sides.affirmativeLabel, "You (participant)", "DECA uses a participant label, not a debate side");
  assert.ok(decaConfig.speeches.every((s) => s.side === "FOR"), "DECA stages are the competitor's (parliamentary AI opponent never invoked)");
  assert.ok(decaConfig.speeches.some((s) => /role.?play/i.test(s.label)), "DECA includes a role-play presentation stage");
  assert.equal(trackPracticeConfigForOrganization("DECA")?.eventType, "ROLEPLAY", "DECA practice uses the DECA role-play event type");
  // HOSA practice is likewise a non-debate event practice.
  const hosaConfig = buildHosaFormatConfig();
  const hosaText = [hosaConfig.label, hosaConfig.description, ...hosaConfig.speeches.flatMap((s) => [s.label, s.shortLabel, s.guidance])].join(" | ");
  assert.ok(!/government|opposition|\bpm\b|\blo\b|\bmg\b|\bmo\b|motion|parliamentary|rebuttal/i.test(hosaText), "HOSA event practice shows no debate labels");
  // DECA dashboard routes to DECA role play, not the parliamentary debate room.
  const decaPracticeAction = decaSteps.find((s) => s.key === "practice");
  assert.ok(decaPracticeAction && decaPracticeAction.href.includes("/training/deca/practice") && !decaPracticeAction.href.includes("/debate"), "DECA dashboard practice action routes to the DECA role play, not /debate");
  // (The DECA practice hub → /training/deca/practice with "Start a DECA role play" is asserted above.)

  // A3. Unfinished practice is filtered by the selected track (records still kept in history).
  const mixedDebates = [{ organization: "DEBATE" }, { organization: "MODEL_UN" }, { organization: "HOSA" }];
  const gdOnly = mixedDebates.filter((d) => trackAllowsOrganization(trackBySlug("debate"), d.organization));
  assert.deepEqual(gdOnly.map((d) => d.organization), ["DEBATE"], "General Debate dashboard shows only General Debate unfinished sessions");
  const munOnly = mixedDebates.filter((d) => trackAllowsOrganization(trackBySlug("model-un"), d.organization));
  assert.deepEqual(munOnly.map((d) => d.organization), ["MODEL_UN"], "Model UN dashboard shows only Model UN unfinished sessions");
  const dashSrc = readFileSync("app/(app)/dashboard/page.tsx", "utf8");
  assert.ok(dashSrc.includes("trackAllowsOrganization(activeTrack, debate.organization)"), "dashboard filters unfinished sessions by the active track");

  // A5. HOSA mastery path shows no debate-only 'rebuttal' prerequisite text. The lock/progression copy
  // is now track-neutral, and Debate-org skills (the only place "rebuttal" appears, as a slug) are
  // filtered out of the HOSA path entirely — so a HOSA user never sees a rebuttal prerequisite.
  const skillPath = readFileSync("components/skills/skill-path.tsx", "utf8");
  assert.ok(!/Unlock after rebuttal/.test(skillPath), "the 'Unlock after rebuttal' lock text is gone");
  assert.ok(skillPath.includes("Complete the earlier lessons to unlock"), "lock text is track-neutral progression copy");
  assert.equal(skillVisibleForTrack("Debate", "HOSA").visible, false, "HOSA path excludes Debate skills (no rebuttal prerequisite reaches HOSA)");

  // A6. Coach dashboards follow the same track isolation: the shared dashboard actions/resources are
  // track-filtered (and NOT student-only), and coach pages render no organization-specific generator
  // or resource shelf, so a Model UN coach never sees DECA/HOSA actions.
  assert.ok(dashSrc.includes("nextStepsForTrack(activeTrack)") && dashSrc.includes("resourceOrgForTrack(activeTrack)"), "dashboard actions + resources are track-filtered for every role");
  const coachPage = readFileSync("app/(app)/coach/page.tsx", "utf8");
  assert.ok(!/PracticeTestGenerator|RecommendedVideos/.test(coachPage), "coach page renders no organization-specific generator or resource shelf");

  // ==============================================================================================
  // QA completion pass coverage.
  // ==============================================================================================

  // C1. Study hero + totals are track-aware (computed from allowed content, no global "410+ cards").
  const studySrc = readFileSync("app/(app)/study-arcade/page.tsx", "utf8");
  assert.ok(studySrc.includes("cardCount") && studySrc.includes("activeTrack.label"), "study arcade computes track-aware totals + hero copy");
  assert.ok(!studySrc.includes("FLASHCARDS.length") && !/\b410\b/.test(studySrc), "study arcade never advertises the global card total");
  assert.ok(/does not use flashcard decks/.test(studySrc), "General Debate / Model UN get an honest empty-state study copy");
  // General Debate + Model UN genuinely have zero decks (so their computed totals are 0).
  const allStudyDecks = deckSummaries();
  assert.equal(allStudyDecks.filter((d) => String(d.organization) === "DEBATE").length, 0, "General Debate has no decks (0-card hero)");
  assert.equal(allStudyDecks.filter((d) => String(d.organization) === "MODEL_UN").length, 0, "Model UN has no decks (0-card hero)");

  // C2. Non-debate practice shell hides debate-only UI; Side Coach prompts are organization-specific.
  const arenaSrc = readFileSync("components/debate/debate-arena.tsx", "utf8");
  assert.ok(arenaSrc.includes("isTrackPractice") && arenaSrc.includes("Practice context"), "arena shows a Practice Context card for non-debate practice");
  assert.ok(arenaSrc.includes("!isTrackPractice ?"), "opponent side card is gated to real debates only");
  const coachPanel = readFileSync("components/debate/side-coach-panel.tsx", "utf8");
  assert.ok(coachPanel.includes("ASK_OPTIONS_BY_ORG") && coachPanel.includes("askOptionsForOrganization"), "Side Coach prompts are organization-specific");
  for (const prompt of ["Help organize my opening speech", "What am I missing?", "Show a sample response"]) {
    assert.ok(coachPanel.includes(prompt), `Side Coach includes the org-specific prompt: ${prompt}`);
  }
  // Non-debate configs contain none of the debate-only shell terms.
  for (const cfg of [buildModelUnFormatConfig(), buildDecaFormatConfig(), buildHosaFormatConfig()]) {
    const text = [cfg.label, cfg.description, cfg.sides.affirmativeLabel, cfg.sides.negativeLabel, ...cfg.speeches.flatMap((s) => [s.label, s.shortLabel, s.guidance])].join(" | ");
    assert.ok(!/matchup|\bvs\b|rebuttal|weigh|government|opposition|\bpm\b|\blo\b|\bmg\b|\bmo\b/i.test(text), `${cfg.label} config has no debate-only shell terms`);
  }

  // C3. Session metadata is user-facing (org + eventType), never the carrier enum or opponent for practice.
  assert.equal(practiceTypeLabel({ organization: "MODEL_UN", eventType: MODEL_UN_EVENT_TYPE }), "Model UN Committee Session", "Model UN session label");
  assert.equal(practiceTypeLabel({ organization: "DECA", eventType: "ROLEPLAY" }), "DECA Role Play", "DECA session label");
  assert.equal(practiceTypeLabel({ organization: "HOSA", eventType: "HEALTH_SCIENCE_EVENT" }), "HOSA Event Practice", "HOSA session label");
  assert.equal(practiceTypeLabel({ organization: "DEBATE", eventType: "PARLIAMENTARY_DEBATE" }), "Parliamentary Debate", "Debate session label (readable, not the enum)");
  // Legacy/conflicting record: MODEL_UN org but a parliamentary eventType -> honest "Legacy practice".
  assert.equal(isLegacyPracticeRecord({ organization: "MODEL_UN", eventType: "PARLIAMENTARY_DEBATE" }), true, "legacy MUN record detected");
  assert.equal(practiceTypeLabel({ organization: "MODEL_UN", eventType: "PARLIAMENTARY_DEBATE" }), "Legacy practice", "legacy record shown honestly");
  assert.equal(isLegacyPracticeRecord({ organization: "MODEL_UN", eventType: MODEL_UN_EVENT_TYPE }), false, "a correct Model UN record is not legacy");
  assert.equal(showsOpponentMeta({ organization: "DEBATE", eventType: "PARLIAMENTARY_DEBATE" }), true, "debates show opponent/side meta");
  assert.equal(showsOpponentMeta({ organization: "MODEL_UN", eventType: MODEL_UN_EVENT_TYPE }), false, "solo practice hides opponent/side meta");
  const resumeSrc = readFileSync("components/debate/resume-debates-card.tsx", "utf8");
  assert.ok(resumeSrc.includes("typeLabel") && !resumeSrc.includes("formatLabel"), "resume card renders the user-facing type label, not the carrier format");
  assert.ok(resumeSrc.includes("Continue unfinished practice"), "resume card uses practice wording for non-debate tracks");
  assert.ok(dashSrc.includes("isLegacyPracticeRecord(debate)") && dashSrc.includes("practiceTypeLabel(debate)"), "dashboard excludes legacy records + renders user-facing labels");

  // C4. A COACH landing on /dashboard goes to the Coach dashboard (never "Student dashboard").
  assert.ok(dashSrc.includes('session?.user?.role === "COACH"') && dashSrc.includes('redirect("/coach")'), "coach is redirected off the student dashboard");
  const coachPageSrc = readFileSync("app/(app)/coach/page.tsx", "utf8");
  assert.ok(coachPageSrc.includes("Coach Dashboard") && !coachPageSrc.includes("Student dashboard"), "coach page is clearly a coach dashboard");

  // C5. Assignment track compatibility (UI filters + server enforcement).
  assert.deepEqual(assignmentTypesForOrganization("MODEL_UN"), ["LESSON"], "Model UN teams: lessons only");
  assert.ok(!assignmentTypesForOrganization("DEBATE").includes("FLASHCARD_DECK") && !assignmentTypesForOrganization("DEBATE").includes("PRACTICE_TEST"), "General Debate teams get no decks/tests");
  assert.ok(assignmentTypesForOrganization("DECA").includes("PRACTICE_TEST") && assignmentTypesForOrganization("DECA").includes("FLASHCARD_DECK"), "DECA teams keep tests + decks");
  assert.equal(assignmentTypeAllowedForOrganization("FLASHCARD_DECK", "DEBATE"), false, "FLASHCARD_DECK invalid for a DEBATE team");
  assert.equal(contentAllowedForOrganization("DECA", "HOSA"), false, "DECA content not allowed for a HOSA team");
  assert.equal(contentAllowedForOrganization("HOSA", "DECA"), false, "HOSA content not allowed for a DECA team");
  assert.equal(contentAllowedForOrganization("PUBLIC_SPEAKING", "MODEL_UN"), true, "shared foundation content allowed for any team");
  const formSrc = readFileSync("components/assignments/create-assignment-form.tsx", "utf8");
  assert.ok(formSrc.includes("assignmentTypesForOrganization") && formSrc.includes("contentAllowedForOrganization"), "assignment form filters types + content by the team's track");
  assert.ok(formSrc.includes("noContentAvailable"), "assignment form shows an unavailable state + disables submit when the team's track has no content");
  const assignLib = readFileSync("lib/assignments.ts", "utf8");
  assert.ok(assignLib.includes("assignmentTypeAllowedForOrganization") && assignLib.includes("contentAllowedForOrganization"), "server enforces assignment track compatibility");
  // Assigned activities open under the assignment's context, not the student's personal track.
  assert.ok(deckPage.includes("searchParams.assignmentId"), "assigned deck activity bypasses the personal-track redirect");
  assert.ok(testsPage.includes("assignmentId"), "assigned practice test always shows the generator");

  // C8 (M8A). HOSA Event Navigator: track-scoped and fail-closed.
  const navPage = readFileSync("app/(app)/training/[track]/events/page.tsx", "utf8");
  assert.ok(existsSync("app/(app)/training/[track]/events/page.tsx"), "the Event Navigator route exists");
  assert.ok(navPage.includes('if (track.id !== "HOSA") notFound()'), "the Navigator is HOSA-only — DECA and Debate 404 exactly as before");
  // An unknown or absent event never resolves to a real event, and never to the first entry.
  for (const bad of ["", "  ", "unknown-event", "deca-hotel-lodging", "public-forum"]) {
    assert.equal(hosaEventById(bad), undefined, `Navigator fails closed on "${bad}"`);
  }
  assert.equal(hosaEventById(undefined), undefined, "a missing event id selects nothing at all");
  assert.notEqual(hosaEventById("unknown-event"), HOSA_EVENTS[0], "an unknown id never falls through to the first event");
  // Exactly one event may show official structure; every other event shows an honest partial card.
  const verifiedEvents = HOSA_EVENTS.filter((e) => presentHosaEvent(e).verified);
  assert.deepEqual(verifiedEvents.map((e) => e.id), ["medical-terminology"], "only the sourced event shows official structure");
  for (const e of HOSA_EVENTS.filter((e) => e.id !== "medical-terminology")) {
    assert.deepEqual(presentHosaEvent(e).facts, {}, `${e.name} shows no borrowed structural detail`);
  }
  // Track isolation: the Navigator carries HOSA events only, and no other track's content.
  const navSrc = readFileSync("components/training/hosa-event-navigator.tsx", "utf8");
  assert.ok(!/Public Forum|Hotel and Lodging|performance indicator/i.test(navSrc), "the Navigator surfaces no Debate or DECA event content");
  assert.ok(hosaEventsByFamily().every((g) => g.events.every((e) => e.family === g.family.id)), "events never appear under another family");
  // The withdrawn HOSA practice is never reachable as available through the Navigator.
  assert.ok(!navSrc.includes("/training/hosa/practice"), "the Navigator never routes to the withdrawn interactive practice");

  // C7. CompeteReady branding replaces DebateArena AI in user-facing surfaces.
  for (const file of ["components/app/app-shell.tsx", "app/(auth)/signin/page.tsx", "app/layout.tsx", "app/page.tsx"]) {
    const src = readFileSync(file, "utf8");
    assert.ok(!src.includes("DebateArena AI"), `no 'DebateArena AI' branding in ${file}`);
  }
  assert.ok(readFileSync("components/app/app-shell.tsx", "utf8").includes("CompeteReady"), "app shell uses the CompeteReady name");

  console.log("Tracks smoke tests passed: 4 tracks, slug/org mapping (+ reverse), safe normalize, org-based filtering (no leakage, honest empty states), honest source labels, debate->track-org propagation, org-specific AI, study filter, dashboard path, assignment track display, routes present, existing systems preserved, PLUS global track cookie resolver, HOSA resource isolation, Model UN practice, Model UN + General Debate dashboard filtering, full-screen focus mode, accessibility overlay, removed placeholders, direct-URL deck isolation, DECA-not-parliamentary redirect + role-play config, track-filtered unfinished sessions, HOSA rebuttal-free mastery, coach dashboard isolation, track-aware study hero, non-debate practice shell + org Side Coach prompts, user-facing session metadata + legacy handling, coach-dashboard routing, assignment track compatibility (UI + server), and CompeteReady branding, PLUS the fail-closed HOSA Event Navigator (HOSA-only route, unknown ids resolve to nothing, one sourced event, honest partial cards, no cross-track leakage).");
}

main();
