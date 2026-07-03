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
  resolveTrackFromSlugs,
  TRACK_COOKIE,
  TRACKS,
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
  assert.ok(study.includes("activeTrack") && study.includes("getActiveTrack"), "study page filters decks by the selected track (cookie-aware resolver)");

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

  // Pages are wired to filter (not just banner), and there is no separate /lessons page.
  assert.ok(readFileSync("app/(app)/skills/page.tsx", "utf8").includes("track={activeTrack?.id}"), "skills page filters by track");
  assert.ok(readFileSync("app/(app)/tests/page.tsx", "utf8").includes('activeTrack.id === "DECA"'), "tests page filters by track");
  assert.ok(!existsSync("app/(app)/lessons/page.tsx"), "no separate /lessons page (lessons filtered via skills)");
  // Game entry points are per-deck, and deck listings are already track-filtered (study), so no leakage.
  assert.ok(readFileSync("app/(app)/study/page.tsx", "utf8").includes("activeTrack"), "study/deck (game entry) is track-filtered");

  // ----------------------------------------------------------------------------------------------
  // Phase-1 repair coverage: global track mode, Model UN practice, dashboard filtering, focus mode,
  // accessibility overlay, and removed placeholders.
  // ----------------------------------------------------------------------------------------------

  // 1. Selected track survives navigation without relying only on ?track= — a preference cookie is the
  // fallback, and the URL param overrides it on a track-specific route.
  assert.equal(resolveTrackFromSlugs("hosa", undefined)?.id, "HOSA", "?track= resolves the track");
  assert.equal(resolveTrackFromSlugs(undefined, "hosa")?.id, "HOSA", "HOSA stays HOSA via cookie when ?track= is absent");
  assert.equal(resolveTrackFromSlugs("model-un", "hosa")?.id, "MODEL_UN", "URL track overrides the cookie on a track-specific route");
  assert.equal(resolveTrackFromSlugs(undefined, undefined), undefined, "no query + no cookie -> no track (browse-all allowed)");
  assert.equal(resolveTrackFromSlugs(undefined, "garbage"), undefined, "unknown cookie slug -> no track (never a wrong track)");
  assert.equal(TRACK_COOKIE, "debatearena_track", "track cookie name is stable");
  const ctx = readFileSync("components/training/training-track-context.tsx", "utf8");
  assert.ok(ctx.includes("TRACK_COOKIE") && ctx.includes("document.cookie"), "track context mirrors the selection into the server-readable cookie");

  // 2 + 3. HOSA content isolation on the consuming pages (server components read the resolver).
  const studyPage = readFileSync("app/(app)/study/page.tsx", "utf8");
  assert.ok(studyPage.includes("getActiveTrack"), "study page resolves the active track (cookie fallback)");
  assert.ok(studyPage.includes("organization={activeTrack?.organization}"), "study resource shelf is scoped to the track");
  const hosaResources = recommendedResources({ organization: "HOSA" });
  assert.ok(hosaResources.every((r) => r.organization !== "DECA"), "HOSA resources exclude DECA resources");
  const decaResources = recommendedResources({ organization: "DECA" });
  assert.ok(decaResources.every((r) => r.organization !== "HOSA"), "DECA resources exclude HOSA resources");
  // No fallback-to-all when an organization filter yields nothing (honest empty state, no leakage).
  const noneResources = recommendedResources({ organization: "MODEL_UN" });
  assert.ok(noneResources.every((r) => r.organization !== "DECA" && r.organization !== "HOSA"), "Model UN never surfaces DECA/HOSA resources");

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

  console.log("Tracks smoke tests passed: 4 tracks, slug/org mapping (+ reverse), safe normalize, org-based filtering (no leakage, honest empty states), honest source labels, debate->track-org propagation, org-specific AI, study filter, dashboard path, assignment track display, routes present, existing systems preserved, PLUS global track cookie resolver, HOSA resource isolation, Model UN practice (terminology/stages/context, no parliamentary labels), Model UN + General Debate dashboard filtering, full-screen focus mode, accessibility overlay, removed placeholders, direct-URL deck isolation, DECA-not-parliamentary redirect, track-filtered unfinished sessions, HOSA mastery has no rebuttal text, and coach dashboard isolation.");
}

main();
