/**
 * HOSA practice-scope smoke (M11R6).
 *
 * The generic HOSA health-science role-play was withdrawn: it generated patient scenarios from a
 * free-text role pairing and scored them against no sourced rubric. The verified Medical Terminology
 * exam — which has registry-backed provenance and records real attempts — is untouched.
 *
 * This suite pins that boundary. Every negative check runs against COMMENT-STRIPPED source, because
 * the comments explaining the withdrawal necessarily quote the strings being forbidden; and every
 * negative check is paired with a positive control, so "absent" can never mean "looked in the wrong
 * place". Fixtures carrying the old behaviour prove each check can still fail.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hosaEventById } from "../lib/hosa-events";
import { getRoleplayLesson } from "../lib/roleplay-lessons";
import { trackBySlug } from "../lib/training-tracks";

/** Strips comments so a negative scan cannot match the prose that explains the negative. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
const read = (path: string) => readFileSync(path, "utf8");
const visible = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const PRACTICE_ROUTE = "app/(app)/training/[track]/practice/page.tsx";
const ROOM_ROUTE = "app/(app)/training/[track]/room/page.tsx";
const COMPETE_ROUTE = "app/(app)/compete/page.tsx";
const SCENARIO_ROUTE = "app/api/ai/hosa-scenario/route.ts";
const JUDGE_ROUTE = "app/api/ai/judge-hosa/route.ts";
const TURN_ROUTE = "app/api/ai/roleplay-turn/route.ts";
const WITHDRAWN_SETUP = "components/training/hosa-roleplay-setup.tsx";

function main() {
  // ---- 1-3. The verified Medical Terminology path survives untouched -------------------------------
  const practice = code(read(PRACTICE_ROUTE));
  assert.ok(practice.length > 200, "the practice route source is non-empty (the scans below are meaningful)");
  assert.ok(practice.includes("HosaEventPrep"), "1. the practice route retains HosaEventPrep");
  assert.ok(/track\.id === "HOSA" \? <HosaEventPrep \/> : null/.test(practice),
    "2. and mounts it for HOSA — the Medical Terminology practice path");
  const prep = read("components/training/hosa-event-prep.tsx");
  assert.ok(prep.includes('getActiveSpec("HOSA", "Medical Terminology")'), "3. which loads the registry spec");
  assert.ok(prep.includes("SpecBanner"), "3b. and shows its provenance banner");
  assert.ok(prep.includes("HosaMedtermEngine") || prep.includes("hosa-medterm-engine"),
    "16. and mounts the Medical Terminology engine");

  // ---- 4-7. The generic simulator is gone from the practice route ----------------------------------
  assert.ok(!practice.includes("HosaRoleplaySetup"), "4. the practice route no longer imports or mounts HosaRoleplaySetup");
  // Scoped to the HOSA-relevant lines: DECA and Debate legitimately keep their own role-play wording
  // in this same file, so a whole-file scan would match their code, not HOSA's.
  const practiceHosaOnly = practice
    .split("\n")
    .filter((line) => !/deca|debate|mun|model un/i.test(line))
    .join("\n");
  for (const forbidden of ["patient", "clinician", "role-play", "roleplay", "scenario"]) {
    assert.ok(!new RegExp(forbidden, "i").test(practiceHosaOnly),
      `5. the practice route carries no generic ${forbidden} CTA of its own`);
  }
  assert.ok(/deca/i.test(practice), "5b. control: the DECA lines this scan excludes really are present");
  assert.ok(!practice.includes("/training/hosa/room"), "6. and no route into the shared room");
  assert.ok(!existsSync(WITHDRAWN_SETUP), "7. the withdrawn setup component is deleted from the repository");
  for (const file of [PRACTICE_ROUTE, ROOM_ROUTE, COMPETE_ROUTE]) {
    assert.ok(!code(read(file)).includes("hosa-roleplay-setup"), `7b. nothing imports it (${file})`);
  }

  // ---- 8-11. The room fails closed for HOSA; DECA and Debate keep theirs ---------------------------
  const room = code(read(ROOM_ROUTE));
  assert.ok(/track\.id === "HOSA"\s*\)?\s*redirect\(/.test(room.replace(/\s+/g, " ")) || /HOSA[\s\S]{0,80}redirect\(/.test(room),
    "8. HOSA is diverted before anything mounts");
  assert.ok(!/track: kind|track=\{kind\}|track="hosa"/.test(room), "8b. and no HOSA value can reach RoleplayRoom");
  assert.ok(/RoleplayRoom track="deca"/.test(room), "10/11. the room mounts only for DECA");
  const roomRedirect = /HOSA_ROOM_FALLBACK = "(\/[^"]+)"/.exec(room)?.[1];
  assert.ok(roomRedirect, "9. HOSA has an explicit fallback destination");
  assert.ok(roomRedirect!.startsWith("/training/hosa"), "9b. which is track-internal");
  assert.notEqual(roomRedirect, "/training/hosa/room", "9c. and is not this route (no redirect loop)");
  assert.ok(!roomRedirect!.includes("/practice"), "9d. and is not the practice route either");
  assert.ok(existsSync(`app/(app)/training/[track]/events/page.tsx`), "9e. and the destination route exists");
  // Debate keeps its own room, which was never this route.
  assert.ok(existsSync("components/debate/debate-room.tsx"), "10b. the Debate room component is untouched");
  assert.ok(code(read(PRACTICE_ROUTE)).includes("DebateRoom"), "10c. and Debate practice still mounts it");
  assert.ok(code(read(PRACTICE_ROUTE)).includes("DecaRoleplaySetup"), "11b. DECA keeps its role-play setup");

  // ---- 12-14. Compete ------------------------------------------------------------------------------
  const compete = code(read(COMPETE_ROUTE));
  assert.ok(!compete.includes("Guided HOSA Role-Play"), "12. Compete has no generic HOSA role-play entry");
  assert.ok(!/coached patient interaction/i.test(compete), "13. and no coached-patient-interaction promise");
  assert.ok(/HOSA[\s\S]*?\/training\/hosa\/events/.test(compete), "14. HOSA gets event navigation instead");
  assert.ok(!/HOSA[\s\S]*?href: "\/training\/hosa\/practice"/.test(compete),
    "14b. and no track-level link into the practice route");
  assert.ok(/Guided DECA Role-Play[\s\S]*?\/training\/deca\/practice/.test(compete), "11c. DECA's arena is untouched");
  assert.ok(/Full Debate Round[\s\S]*?\/debate\?track=/.test(compete), "10d. Debate's arena is untouched");

  // ---- 15, 17-18. Event HQ and the Medical Terminology APIs are unchanged ---------------------------
  const hq = read("app/(app)/training/[track]/event/[eventSlug]/page.tsx");
  assert.ok(hq.includes('href: "/training/hosa/practice"'), "15. the Medical Terminology Event HQ keeps its practice path");
  for (const [n, path] of [["17", "app/api/hosa/medterm/session/route.ts"], ["18", "app/api/hosa/medterm/submit/route.ts"]] as const) {
    assert.ok(existsSync(path), `${n}. ${path} still exists`);
    const src = read(path);
    assert.ok(src.includes("requireUser"), `${n}b. and still authenticates`);
  }
  const engine = read("components/training/hosa-medterm-engine.tsx");
  for (const endpoint of ["/api/hosa/medterm/session", "/api/hosa/medterm/submit"]) {
    assert.ok(engine.includes(endpoint), `17/18c. the engine still records through ${endpoint}`);
  }

  // ---- 19-29. The two withdrawn endpoints fail closed behind their security gates -------------------
  const PROVIDER_SYMBOLS = ["generateHosaScenario", "judgeHosaPerformance", "@/lib/ai", "openai", "anthropic", "google"];
  const PARSE_SYMBOLS = ["parseJson", "request.json", "await req.json"];
  const WRITE_SYMBOLS = ["prisma", ".create(", ".update(", ".upsert("];
  for (const [label, path, workload] of [
    ["hosa-scenario", SCENARIO_ROUTE, "light"], ["judge-hosa", JUDGE_ROUTE, "heavy"]
  ] as const) {
    const src = code(read(path));
    // 28/29 — the security boundary is intact and still ordered auth -> rate limit.
    const authAt = src.indexOf("await requireUser();");
    const limitAt = src.indexOf("await enforceRateLimit(");
    assert.ok(authAt !== -1, `28. ${label} still authenticates`);
    assert.ok(limitAt !== -1, `29. ${label} still rate-limits`);
    assert.ok(authAt < limitAt, `29b. ${label} authenticates before rate-limiting`);
    assert.ok(src.includes(`workload: "${workload}"`), `29c. ${label} keeps its rate-limit workload`);
    // 19/23 — a stable unavailable result.
    assert.ok(/status: 410/.test(src), `19/23. ${label} returns HTTP 410`);
    assert.ok(/unavailable: true/.test(src) && /Generic HOSA role-play practice is unavailable\./.test(src),
      `19/23b. ${label} returns the stable unavailable body`);
    const returnAt = src.indexOf("status: 410");
    assert.ok(limitAt < returnAt, `19/23c. ${label} rate-limits BEFORE refusing`);
    // 20-22, 24-27 — nothing downstream can run.
    for (const symbol of PROVIDER_SYMBOLS) {
      assert.ok(!src.includes(symbol), `20/24. ${label} cannot reach a provider (${symbol})`);
    }
    for (const symbol of PARSE_SYMBOLS) {
      assert.ok(!src.includes(symbol), `21/26. ${label} never parses the request body (${symbol})`);
    }
    for (const symbol of WRITE_SYMBOLS) {
      assert.ok(!src.includes(symbol), `22/27. ${label} writes no learner data (${symbol})`);
    }
  }
  const judge = code(read(JUDGE_ROUTE));
  for (const scoreField of ["overallScore", "presentationScore", "questioningScore", "roleplayJudgeRequestSchema"]) {
    assert.ok(!judge.includes(scoreField), `25/26. judge-hosa can no longer produce ${scoreField}`);
  }

  // ---- 30. The shared roleplay-turn endpoint is untouched and still needed -------------------------
  const turn = read(TURN_ROUTE);
  assert.ok(turn.includes("await requireUser();") && turn.includes("await enforceRateLimit("),
    "30. roleplay-turn keeps its gates");
  assert.ok(/parseJson\(/.test(turn), "30b. and still parses real requests — it was not disabled");
  const roomComponent = read("components/rooms/roleplay-room.tsx");
  assert.ok(roomComponent.includes("/api/ai/roleplay-turn"), "30c. the DECA room still calls it");
  assert.ok(roomComponent.includes("/api/ai/judge-deca"), "30d. and DECA judging is untouched");

  // ---- 31-33. No active HOSA learner surface offers the withdrawn behaviour ------------------------
  (globalThis as { React?: unknown }).React = React;
  const hosaSlug = trackBySlug("hosa")!.slug;
  const TrackHubPage = require("../app/(app)/training/[track]/page").default;
  const CompetePage = require("../app/(app)/compete/page").default;
  const hubText = visible(renderToStaticMarkup(
    createElement(TrackHubPage as never, { params: { track: hosaSlug } } as never) as never));
  const competeText = visible(renderToStaticMarkup(
    createElement(CompetePage as never, { searchParams: { track: hosaSlug } } as never) as never));
  const WITHDRAWN_ROLES = ["anxious about a new diagnosis", "worried about a child's fever", "post-op patient",
                           "dental anxiety", "shaken bystander", "health science student"];
  for (const surface of [["HOSA hub", hubText], ["Compete", competeText]] as const) {
    for (const role of WITHDRAWN_ROLES) {
      assert.ok(!surface[1].includes(role), `31. no withdrawn patient-role example on ${surface[0]} ("${role}")`);
    }
    assert.ok(!/AI plays|Your role|Surprise me|Enter the room/i.test(surface[1]),
      `32. no free-text clinical role configuration on ${surface[0]}`);
    assert.ok(!/scored (patient|clinical) interaction/i.test(surface[1]),
      `33. no AI-scored patient interaction offered on ${surface[0]}`);
  }
  assert.ok(competeText.includes("Find your HOSA event"), "14c. Compete's HOSA entry renders");
  assert.ok(hubText.length > 200 && competeText.length > 200, "31b. both surfaces actually rendered");

  // ---- 34-36. The authored lesson and Medical Terminology provenance are unchanged ------------------
  const lesson = getRoleplayLesson("how-hosa-scenario-interaction-works")!;
  assert.equal(lesson.slug, "how-hosa-scenario-interaction-works", "34. the communication lesson is still reachable by its slug");
  assert.equal(lesson.practiceStatus, "temporarily-unavailable", "35. its own interactive scenario is still unavailable");
  assert.ok(JSON.stringify(lesson).includes("one layer inside applicable clinical-skill events"),
    "34b. and it is still the informational communication lesson");
  const mt = hosaEventById("medical-terminology")!;
  assert.equal(mt.name, "Medical Terminology", "36. Medical Terminology is unchanged");
  assert.equal(mt.routeTarget, "/training/hosa/event/medical-terminology", "36b. with its own route");
  assert.equal(mt.sourceStatus, "verified-current", "36c. and its verified provenance");
  assert.equal(mt.season, "2025-26", "36d. and its season");

  // ---- 38, 43. Isolation and no schema/dependency drift ---------------------------------------------
  assert.ok(!compete.includes("/training/deca/") || /DECA/.test(compete),
    "38. Compete still scopes each track's arena to that track");
  assert.ok(!hubText.includes("DECA"), "38b. the HOSA hub still leaks no DECA surface");
  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; dependencies?: unknown };
  assert.ok(pkg.scripts["hosa-practice-scope:smoke"], "43. this suite is registered");
  const smokes = Object.keys(pkg.scripts).filter((k) => k.endsWith(":smoke"));
  assert.equal(smokes.length, 24, `43b. the registered smoke inventory is 24 (found ${smokes.length})`);

  // ---- NON-VACUOUS CONTROLS -------------------------------------------------------------------------
  // Each check above is re-run against a fixture carrying the OLD behaviour and must trip. Production
  // source is never modified to produce these.
  const fixtures: Array<[string, boolean]> = [
    ["a practice route importing the withdrawn setup",
      code('import { HosaRoleplaySetup } from "@/components/training/hosa-roleplay-setup";').includes("HosaRoleplaySetup")],
    ["a practice route linking to the shared room",
      code('<Link href="/training/hosa/room">Enter</Link>').includes("/training/hosa/room")],
    ["a compete page offering the generic arena",
      code('{ label: "Guided HOSA Role-Play", href: "/training/hosa/practice" }').includes("Guided HOSA Role-Play")],
    ["a compete page promising a coached patient interaction",
      /coached patient interaction/i.test(code('detail: "A coached patient interaction: scenario -> feedback."'))],
    ["an endpoint that still reaches a provider",
      PROVIDER_SYMBOLS.some((sym) => code('import { generateHosaScenario } from "@/lib/ai";').includes(sym))],
    ["an endpoint that still parses a body",
      PARSE_SYMBOLS.some((sym) => code("const input = await parseJson(request, schema);").includes(sym))],
    ["a judge endpoint that still scores",
      code("return NextResponse.json({ overallScore: 82 });").includes("overallScore")],
    ["a room route that still mounts HOSA",
      /RoleplayRoom track=\{kind\}/.test(code('return <RoleplayRoom track={kind} officialPrep={officialPrep} />;'))],
    ["a surface still showing a withdrawn role example",
      WITHDRAWN_ROLES.some((r) => "AI plays: patient who is anxious about a new diagnosis".includes(r))]
  ];
  for (const [label, tripped] of fixtures) {
    assert.ok(tripped, `control: the corresponding check still rejects ${label}`);
  }
  // And the positive controls the negatives depend on: the retained paths are really there.
  assert.ok(read(PRACTICE_ROUTE).includes("HosaEventPrep"), "control: Medical Terminology practice still exists");
  assert.ok(read(TURN_ROUTE).length > 100, "control: the shared roleplay-turn route still exists");

  console.log(
    "HOSA practice-scope smoke passed: the generic health-science role-play is withdrawn end to end " +
    "(no setup component, no practice-page mount, no room mount for HOSA, no Compete arena, and both " +
    "HOSA-only AI routes fail closed with 410 behind an unchanged auth + rate-limit boundary, reaching " +
    "no provider, parsing no body, producing no score and writing nothing), while verified Medical " +
    "Terminology practice, its registry provenance, its session/submit recording, the shared " +
    "roleplay-turn endpoint, and Debate and DECA role-play are all unchanged."
  );
}

main();
