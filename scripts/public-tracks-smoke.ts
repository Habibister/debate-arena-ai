/**
 * PUBLIC TRACKS — CompeteReady publicly supports exactly Debate and DECA (owner decision, 2026-09-27).
 * HOSA is DORMANT: its curriculum, bank, decks, tests, components and routes stay in the repository, but
 * no learner is offered it, routed into it, recommended it, or silently converted out of it.
 *
 * Run with: npm run public-tracks:smoke
 *
 * NO DATABASE CONNECTION, NO PROVIDER, NO WRITES, NO SECRET READ BY THIS SUITE. Real pages and route
 * handlers are rendered/called with their session, auth, track-resolution, rate-limit, AI and database
 * modules replaced through the module cache before they load. The database stand-in answers reads with
 * empty results and throws on any write, and the AI stand-in throws if it is ever reached.
 *
 * What it proves:
 *   A. ONE canonical definition: PUBLIC TRACKS = Debate + DECA; HOSA and Model UN are dormant.
 *   B. A saved HOSA preference (organization, selection cookie or route slug) FAILS CLOSED to unresolved:
 *      never Debate or DECA, never HOSA. An explicit public selection still wins. setTrack ignores HOSA.
 *   C. HOSA is absent from every learner picker: /training, onboarding, signup, profile, team creation,
 *      the tests generator, Study Arcade track choice, the opponent picker, and the landing copy.
 *   D. A HOSA-saved learner and a brand-new learner see only "Choose Debate or DECA" on Home, Dashboard,
 *      Lessons, Study Arcade, Tests, Resources and Skills, and no HOSA surface anywhere on them.
 *   E. A Debate learner and a DECA learner see 0 HOSA surfaces on every primary page (no regression).
 *   F. Direct HOSA routes are dormant: each redirects once to its area's general page (never a loop, never
 *      a `?track=` naming HOSA), and the APIs refuse new HOSA practice with 410 before any provider call.
 *   N. The app shell (desktop nav, mobile bottom bar, More menu, track chip) offers no HOSA entry.
 *   T. Dormant HOSA teams: no new team, no new member, no assignment nudge, and truthful coach copy.
 *   M. Judged-round metrics count by canonical track ownership: a historical judged HOSA session stays
 *      readable in history and replay but adds 0 to every Debate count and activity state (Home,
 *      Dashboard, the Debate record, the average, the learning path); dormant sessions add 0 to the
 *      coach's round count and to assignment evidence; a real Debate round still counts and a DECA
 *      role-play is not a Debate round; DECA renders identically; the coach copy is DECA-only.
 *   G. The HOSA code and data are still there (not deleted).
 *   W. Nothing in the whole run attempted a database write.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const REPO = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(REPO, p), "utf8");
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1 ");
const decode = (h: string) =>
  h.replace(/&#x27;|&#39;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const visible = (h: string) => decode(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const hrefs = (h: string) => Array.from(decode(h).matchAll(/href="([^"]*)"/g), (m) => m[1]);

let checks = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  await fn();
  checks += 1;
  console.log(`  ok  ${name}`);
}

// ---- module stubs, installed BEFORE any page loads ------------------------------------------------------
function stubFile(file: string, exports: Record<string, unknown>): void {
  const mod = new Module(file);
  mod.filename = file;
  mod.loaded = true;
  mod.exports = exports;
  require.cache[file] = mod;
}
const stub = (relativePath: string, exports: Record<string, unknown>) => stubFile(require.resolve(path.join(REPO, relativePath)), exports);

// The viewer: signup organization, validated selection cookie slug, and role.
const viewer: { id: string; organization: string | null; cookie: string | null; role: string } = {
  id: "user_public_tracks",
  organization: null,
  cookie: null,
  role: "STUDENT"
};

// Database stand-in: every read answers "nothing yet" (a fresh account), every write throws. The rows a
// test needs are set per case in `rows`.
const rows: {
  debate: Record<string, unknown> | null;
  /** Stored debate rows, newest first, that debate count/findMany/aggregate/findFirst are evaluated over. */
  debates: Array<Record<string, unknown>>;
  practiceTest: Record<string, unknown> | null;
  team: Record<string, unknown> | null;
  assignment: Record<string, unknown> | null;
  assignments: Array<Record<string, unknown>>;
  coachTeams: Array<Record<string, unknown>>;
} = { debate: null, debates: [], practiceTest: null, team: null, assignment: null, assignments: [], coachTeams: [] };
// The viewer's account-wide counters (User.xp / User.streak): every track's scored work moves them.
const viewerStats = { xp: 0, streak: 0 };
const writes: string[] = [];
const WRITE = /^(create|createMany|update|updateMany|upsert|delete|deleteMany|\$executeRaw|\$executeRawUnsafe)$/;

// A small, STRICT evaluator of the Prisma `where` shapes the judged-round queries use. Anything it does
// not understand throws, so a query that changes shape fails this suite instead of passing vacuously.
// Null handling follows SQL, as Prisma does: `not`, `in` and `notIn` never match a NULL column.
type Where = Record<string, unknown>;
const FILTER_OPERATORS = new Set(["equals", "not", "in", "notIn", "gte", "gt", "lte", "lt"]);
const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
function matchesField(value: unknown, filter: unknown, key: string): boolean {
  if (filter === null || typeof filter !== "object" || filter instanceof Date) return same(value ?? null, filter);
  const entries = Object.entries(filter as Record<string, unknown>);
  for (const [op] of entries) if (!FILTER_OPERATORS.has(op)) throw new Error(`debate stand-in: unsupported filter ${key}.${op}`);
  const present = value !== null && value !== undefined;
  return entries.every(([op, arg]) => {
    if (op === "equals") return same(value ?? null, arg);
    if (op === "not") return arg === null ? present : present && !same(value, arg);
    if (op === "in") return present && (arg as unknown[]).some((a) => same(value, a));
    if (op === "notIn") return present && !(arg as unknown[]).some((a) => same(value, a));
    if (!present) return false;
    if (op === "gte") return Number(value) >= Number(arg);
    if (op === "gt") return Number(value) > Number(arg);
    if (op === "lte") return Number(value) <= Number(arg);
    return Number(value) < Number(arg);
  });
}
function matchesWhere(row: Record<string, unknown>, where: Where): boolean {
  return Object.entries(where).every(([key, filter]) => {
    if (key === "OR") return (filter as Where[]).some((w) => matchesWhere(row, w));
    if (key === "AND") return (Array.isArray(filter) ? (filter as Where[]) : [filter as Where]).every((w) => matchesWhere(row, w));
    if (!(key in row)) throw new Error(`debate stand-in: the fixture has no "${key}" field to filter on`);
    return matchesField(row[key], filter, key);
  });
}
function debateRows(args?: { where?: Where; take?: number }): Array<Record<string, unknown>> {
  const matched = rows.debates.filter((row) => matchesWhere(row, args?.where ?? {}));
  return typeof args?.take === "number" ? matched.slice(0, args.take) : matched;
}
function debateAggregate(args: { where?: Where; _avg?: Record<string, boolean> } & Record<string, unknown>) {
  const unsupported = Object.keys(args).filter((k) => k !== "where" && k !== "_avg");
  if (unsupported.length > 0 || Object.keys(args._avg ?? {}).some((k) => k !== "overallScore")) {
    throw new Error(`debate stand-in: unsupported aggregate ${JSON.stringify(Object.keys(args))}`);
  }
  const scores = debateRows({ where: args.where }).map((r) => r.overallScore).filter((s): s is number => typeof s === "number");
  return { _avg: { overallScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null } };
}

function modelProxy(model: string) {
  return new Proxy({}, {
    get(_t, method: string) {
      if (WRITE.test(method)) {
        return async () => {
          writes.push(`${model}.${method}`);
          throw new Error(`database write attempted: ${model}.${method}`);
        };
      }
      if (model === "debate") {
        if (method === "count") return async (args?: { where?: Where }) => debateRows({ where: args?.where }).length;
        if (method === "findMany") return async (args?: { where?: Where; take?: number }) => debateRows(args);
        if (method === "aggregate") return async (args: { where?: Where; _avg?: Record<string, boolean> }) => debateAggregate(args);
        if (method === "findUnique" || method === "findFirst") {
          return async (args?: { where?: Where }) => rows.debate ?? debateRows({ where: args?.where })[0] ?? null;
        }
      }
      if (method === "findMany" && model === "assignment") return async () => rows.assignments;
      if (method === "findMany" || method === "groupBy") return async () => [];
      if (method === "count") return async () => 0;
      if (method === "aggregate") return async () => ({ _avg: {}, _sum: {}, _count: {}, _max: {}, _min: {} });
      if (method === "findUnique" || method === "findFirst" || method === "findUniqueOrThrow" || method === "findFirstOrThrow") {
        return async () => {
          if (model === "user") return { id: viewer.id, name: "Riley Park", displayName: "Riley Park", username: "riley", xp: viewerStats.xp, streak: viewerStats.streak, wins: 0, rank: "BRONZE", organization: viewer.organization, preferredOrganization: viewer.organization, email: "riley@example.test" };
          if (model === "debate") return rows.debate;
          if (model === "assignment") return rows.assignment;
          if (model === "practiceTest") return rows.practiceTest;
          if (model === "team") return rows.team;
          if (model === "coach") return { teams: rows.coachTeams };
          return null;
        };
      }
      return async () => null;
    }
  });
}
const prismaStandIn = new Proxy({} as Record<string, unknown>, {
  get(_t, property: string) {
    if (property === "$transaction") return async () => { writes.push("$transaction"); throw new Error("database transaction attempted"); };
    if (property === "then") return undefined;
    return modelProxy(property);
  }
});

stubFile(require.resolve("next-auth", { paths: [REPO] }), {
  getServerSession: async () => ({ user: { id: viewer.id, role: viewer.role, organization: viewer.organization, email: "riley@example.test", username: "riley" } })
});
stub("lib/auth", { authOptions: {} });
stub("lib/prisma", { prisma: prismaStandIn });
const shellPath = { current: "/" };
// Client components rendered on the server need a router; the real redirect()/notFound() are kept so a
// page's redirect still throws its real NEXT_REDIRECT digest.
const realNavigation = require(require.resolve("next/navigation", { paths: [REPO] }));
stubFile(require.resolve("next/navigation", { paths: [REPO] }), {
  ...realNavigation,
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, prefetch() {}, back() {} }),
  usePathname: () => shellPath.current,
  useSearchParams: () => new URLSearchParams()
});
let providerCalls = 0;
const aiStandIn = new Proxy({} as Record<string, unknown>, {
  get(_t, property: string) {
    if (property === "__esModule") return false;
    return async () => {
      providerCalls += 1;
      throw new Error(`provider reached: ${property}`);
    };
  }
});
stub("lib/ai", aiStandIn);
// The side coach reaches the provider through lib/ai-providers rather than lib/ai.
const realProviders = require(path.join(REPO, "lib/ai-providers.ts")) as Record<string, unknown>;
stub("lib/ai-providers", {
  ...realProviders,
  runProviderCompletion: async () => {
    providerCalls += 1;
    throw new Error("provider reached: runProviderCompletion");
  }
});
stub("lib/rate-limit", { enforceRateLimit: async () => undefined, RateLimitError: class RateLimitError extends Error {} });
// The current-scoring-era boundary is UNSET in the repository, so every judged-round average is "—" and
// the average queries never run. `eraStart` stays null (the real behavior) except inside the checks
// that set an activation instant to prove WHICH rounds an average is taken over.
type EraModule = { currentScoringEraScope: () => unknown; isCurrentScoringEra: (completedAt: Date | null | undefined) => boolean };
const realEra = require(path.join(REPO, "lib/debate-scoring-era.ts")) as EraModule & Record<string, unknown>;
const eraStart: { current: Date | null } = { current: null };
stub("lib/debate-scoring-era", {
  ...realEra,
  currentScoringEraScope: () =>
    eraStart.current ? { eligible: true, where: { completedAt: { gte: eraStart.current } } } : realEra.currentScoringEraScope(),
  isCurrentScoringEra: (completedAt: Date | null | undefined) =>
    eraStart.current ? Boolean(completedAt) && completedAt!.getTime() >= eraStart.current.getTime() : realEra.isCurrentScoringEra(completedAt)
});

// tsconfig jsx=preserve => classic React.createElement, so React must be global before components load.
(globalThis as { React?: unknown }).React = React;

import { pickActiveTrack, parseTrackSelectionCookie } from "../lib/track-precedence";
stub("lib/track-server", {
  resolveActiveTrack: async (routeSlug?: string | null) =>
    pickActiveTrack({ routeSlug, organization: viewer.organization as never, cookieSlug: viewer.cookie }),
  getActiveTrack: async (routeSlug?: string | null) =>
    pickActiveTrack({ routeSlug, organization: viewer.organization as never, cookieSlug: viewer.cookie }).track
});

import {
  ACTIVE_TRACKS,
  PUBLIC_PRACTICE_TEST_ORGANIZATIONS,
  PUBLIC_TRACK_IDS,
  PUBLIC_TRACKS_PHRASE,
  RETIRED_TRACKS,
  TRACKS,
  isRetiredOrganization,
  isTrackRetired,
  trackAllowsOrganization,
  trackById,
  trackBySlug
} from "../lib/training-tracks";
import { dormantTrackParamRedirect, resolveTrackFromPathname } from "../lib/track-route";
import { AI_DEBATE_PERSONAS, PUBLIC_AI_PERSONAS, getAiPersona, nearestAiPersona } from "../lib/ai-personas";
import { nextStepsForTrack } from "../lib/dashboard-actions";
import { EDUCATION_LESSONS } from "../lib/education/registry";
import { deckSummaries } from "../lib/study-content";
import { HOSA_WITHDRAWN_STATUS, TRACK_NOT_OFFERED_BODY, TRACK_NOT_OFFERED_STATUS } from "../lib/api";

type Page = (props: { params?: Record<string, string>; searchParams?: Record<string, string> }) => unknown;
const page = (p: string): Page => require(path.join(REPO, p)).default as Page;

async function render(p: string, props: { params?: Record<string, string>; searchParams?: Record<string, string> } = {}) {
  const element = await page(p)({ params: props.params ?? {}, searchParams: props.searchParams ?? {} });
  return renderToStaticMarkup(element as React.ReactElement);
}
async function redirectOf(p: string, props: { params?: Record<string, string>; searchParams?: Record<string, string> } = {}): Promise<string | null> {
  try {
    await render(p, props);
    return null;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return digest;
  }
}
/** The one redirect contract: a temporary (307) replace redirect to exactly `target`. */
const redirectTo = (target: string) => `NEXT_REDIRECT;replace;${target};307;`;

function setViewer(kind: "new" | "hosa-org" | "hosa-cookie" | "debate" | "deca") {
  viewer.cookie = null;
  viewer.organization = null;
  if (kind === "hosa-org") viewer.organization = "HOSA";
  if (kind === "hosa-cookie") { viewer.organization = "HOSA"; viewer.cookie = "hosa"; }
  if (kind === "debate") viewer.organization = "DEBATE";
  if (kind === "deca") viewer.organization = "DECA";
}

/** Every trace of the dormant track a learner could see or follow on a rendered page. */
function hosaSurfaces(html: string): string[] {
  const found: string[] = [];
  const text = visible(html);
  for (const pattern of [/\bHOSA\b/i, /Medical Terminology/i, /medical terms?/i, /health[- ]science/i]) {
    const m = text.match(pattern);
    if (m) found.push(`text: …${text.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + 60)}…`);
  }
  for (const href of hrefs(html)) if (/hosa/i.test(href)) found.push(`href: ${href}`);
  return found;
}

const PRIMARY_PAGES: Array<[string, string]> = [
  ["/home", "app/(app)/home/page.tsx"],
  ["/dashboard", "app/(app)/dashboard/page.tsx"],
  ["/training", "app/(app)/training/page.tsx"],
  ["/lessons", "app/(app)/lessons/page.tsx"],
  ["/study-arcade", "app/(app)/study-arcade/page.tsx"],
  ["/tests", "app/(app)/tests/page.tsx"],
  ["/resources", "app/(app)/resources/page.tsx"],
  ["/skills", "app/(app)/skills/page.tsx"],
  ["/compete", "app/(app)/compete/page.tsx"]
];
const CHOOSER_PAGES = PRIMARY_PAGES.filter(([route]) => !["/training", "/compete"].includes(route));

async function main() {
  console.log("public-tracks smoke\n");

  // ---- A. one canonical definition -----------------------------------------------------------------
  await check("A1. PUBLIC TRACKS = Debate + DECA, in that order, from one list", () => {
    assert.deepEqual([...PUBLIC_TRACK_IDS], ["GENERAL_DEBATE", "DECA"]);
    assert.deepEqual(ACTIVE_TRACKS.map((t) => t.id), ["GENERAL_DEBATE", "DECA"]);
    assert.deepEqual(ACTIVE_TRACKS.map((t) => t.slug), ["debate", "deca"]);
    assert.equal(PUBLIC_TRACKS_PHRASE, "Debate or DECA");
  });
  await check("A2. HOSA and Model UN are dormant, still defined, and every other track is public", () => {
    assert.deepEqual([...RETIRED_TRACKS].sort(), ["HOSA", "MODEL_UN"]);
    assert.ok(isTrackRetired("HOSA") && isTrackRetired("MODEL_UN"));
    assert.ok(!isTrackRetired("GENERAL_DEBATE") && !isTrackRetired("DECA"));
    assert.equal(trackById("HOSA").label, "HOSA", "HOSA is not deleted from the track type, so records keep their label");
    assert.equal(TRACKS.length, 4);
    assert.ok(isRetiredOrganization("HOSA") && isRetiredOrganization("MODEL_UN"));
    for (const org of ["DEBATE", "DECA", "MOCK_TRIAL", "PUBLIC_SPEAKING", "", null, undefined]) {
      assert.equal(isRetiredOrganization(org), false, `${String(org)} is not a dormant track`);
    }
    assert.deepEqual([...PUBLIC_PRACTICE_TEST_ORGANIZATIONS], ["DECA"], "the only public practice-test organization is DECA");
  });
  await check("A3. pickers read the canonical list rather than a scattered HOSA check", () => {
    for (const file of ["app/(app)/training/page.tsx", "components/onboarding/diagnostic-form.tsx", "components/training/choose-track-state.tsx"]) {
      assert.match(stripComments(read(file)), /ACTIVE_TRACKS\.map\(/, `${file} maps ACTIVE_TRACKS`);
    }
    assert.match(stripComments(read("components/tests/practice-test-generator.tsx")), /PUBLIC_PRACTICE_TEST_ORGANIZATIONS\.map\(/);
    assert.ok(!/\(\["DECA", "HOSA"\] as const\)\.map/.test(stripComments(read("components/tests/practice-test-generator.tsx"))), "the generator no longer hardcodes HOSA as a choice");
  });

  // ---- B. a saved HOSA preference fails closed ---------------------------------------------------------
  await check("B1. HOSA signup organization, selection cookie and route slug all resolve to UNRESOLVED", () => {
    for (const input of [{ organization: "HOSA" }, { cookieSlug: "hosa" }, { routeSlug: "hosa" }, { routeSlug: "hosa", cookieSlug: "hosa", organization: "HOSA" }]) {
      const r = pickActiveTrack(input as never);
      assert.equal(r.resolved, false, `${JSON.stringify(input)} is unresolved`);
      assert.equal(r.track, undefined);
      assert.equal(r.source, "none");
    }
    assert.equal(parseTrackSelectionCookie("hosa.0123456789abcdef", "0123456789abcdef"), null, "a stored HOSA selection is not a selection");
    assert.equal(resolveTrackFromPathname("/training/hosa"), undefined);
    assert.equal(resolveTrackFromPathname("/training/hosa/events"), undefined);
  });
  await check("B2. never silently converted: an explicit PUBLIC choice wins, HOSA never picks one for the learner", () => {
    assert.equal(pickActiveTrack({ organization: "HOSA" as never, cookieSlug: "deca" }).track?.id, "DECA", "a DECA selection is honoured");
    assert.equal(pickActiveTrack({ organization: "HOSA" as never, cookieSlug: "debate" }).track?.id, "GENERAL_DEBATE");
    assert.equal(pickActiveTrack({ routeSlug: "hosa", cookieSlug: "deca" }).track?.id, "DECA", "a HOSA route falls through to the learner's own public selection");
    assert.equal(pickActiveTrack({ routeSlug: "debate", organization: "HOSA" as never }).track?.id, "GENERAL_DEBATE", "opening a Debate page is Debate, for that render only");
  });
  await check("B3. setTrack ignores a dormant id instead of normalizing it to Debate", () => {
    const ctx = stripComments(read("components/training/training-track-context.tsx"));
    assert.match(ctx, /setTrack: \(next\) => \{\s*if \(!ACTIVE_TRACKS\.some\(\(t\) => t\.id === next\)\) return;/);
  });
  await check("B4. dormant content is never allowed through the direct-URL isolation rule, resolved or not", () => {
    for (const track of [undefined, null, trackById("GENERAL_DEBATE"), trackById("DECA")]) {
      assert.equal(trackAllowsOrganization(track, "HOSA"), false);
      assert.equal(trackAllowsOrganization(track, "MODEL_UN"), false);
    }
    assert.equal(trackAllowsOrganization(undefined, "DECA"), true, "control: unresolved browsing of public content is unchanged");
    assert.equal(trackAllowsOrganization(trackById("DECA"), "DECA"), true);
    assert.equal(trackAllowsOrganization(trackById("DECA"), "DEBATE"), false);
  });

  // ---- C. HOSA is absent from every picker ------------------------------------------------------------
  await check("C1. signup offers Debate and DECA only", () => {
    const src = stripComments(read("components/auth/sign-up-form.tsx"));
    const literal = src.match(/const organizations[^=]*=\s*\[([\s\S]*?)\];/);
    assert.ok(literal, "the signup organization list was found");
    assert.deepEqual(Array.from(literal![1].matchAll(/value: "([A-Z_]+)"/g), (m) => m[1]), ["DEBATE", "DECA"]);
  });
  await check("C2. profile and team creation never offer HOSA; a stored HOSA profile is preserved, not converted", () => {
    for (const file of ["components/profile/profile-edit-form.tsx", "components/coach/create-team-form.tsx"]) {
      const src = stripComments(read(file));
      const literal = src.match(/const organizations[^=]*=\s*\[([\s\S]*?)\];/);
      assert.ok(literal, `${file} list found`);
      const values = Array.from(literal![1].matchAll(/value: "([A-Z_]+)"/g), (m) => m[1]);
      assert.ok(values.includes("DEBATE") && values.includes("DECA"), `${file} keeps Debate and DECA`);
      assert.ok(!values.includes("HOSA") && !values.includes("MODEL_UN"), `${file} offers no dormant track`);
    }
    const profile = stripComments(read("components/profile/profile-edit-form.tsx"));
    assert.match(profile, /isRetiredOrganization\(preferredOrganization\) \? \(\s*<option value=\{preferredOrganization\} disabled>\s*Previous organization \(no longer offered\)/);
  });
  await check("C3. onboarding offers the public tracks behind a 'Choose Debate or DECA' placeholder, and writes only a real choice", () => {
    const form = stripComments(read("components/onboarding/diagnostic-form.tsx"));
    assert.match(form, /const needsTrackChoice = !effectiveTrack && !trackChosen;/);
    assert.match(form, /<option value="" disabled>\s*Choose \{PUBLIC_TRACKS_PHRASE\}\s*<\/option>/);
    assert.match(form, /disabled=\{saving \|\| needsTrackChoice\}/);
    assert.match(form, /if \(trackChosen\) setTrack\(finished\.track\);/);
  });
  await check("C4. the opponent picker and the recommended bot never offer the dormant HOSA judge (still resolvable by id)", () => {
    assert.ok(AI_DEBATE_PERSONAS.some((p) => p.id === "hosa-judge"), "the persona is kept");
    assert.equal(getAiPersona("hosa-judge").id, "hosa-judge", "stored rounds still resolve it");
    assert.ok(!PUBLIC_AI_PERSONAS.some((p) => p.id === "hosa-judge"));
    assert.equal(PUBLIC_AI_PERSONAS.length, AI_DEBATE_PERSONAS.length - 1, "exactly one persona is dormant");
    for (let rating = 0; rating <= 2600; rating += 25) assert.notEqual(nearestAiPersona(rating).id, "hosa-judge");
    const room = stripComments(read("components/debate/debate-room.tsx"));
    assert.match(room, /\{PUBLIC_AI_PERSONAS\.map\(\(persona\) => \(/);
    assert.ok(!/\{AI_DEBATE_PERSONAS\.map\(/.test(room));
  });
  await check("C5. landing and site copy name Debate and DECA only", () => {
    const layout = stripComments(read("app/layout.tsx"));
    assert.match(layout, /AI-powered training for Debate and DECA/);
    const landing = stripComments(read("app/page.tsx"));
    assert.ok(!/HOSA/.test(landing.replace(/import[^\n]*\n/g, "")), "the landing page names no HOSA");
    assert.match(landing, /Train students for Debate and DECA/);
    assert.ok(!/HOSA/.test(stripComments(read("lib/dashboard-actions.ts")).match(/if \(!track\) \{[\s\S]*?\n  \}/)![0]), "the no-track action set names no HOSA");
    const nullSteps = nextStepsForTrack(null);
    assert.ok(nullSteps.every((a) => !/HOSA/.test(`${a.title} ${a.description} ${a.href}`)));
  });

  // ---- D. unresolved and HOSA-saved learners get the neutral chooser ----------------------------------
  for (const kind of ["new", "hosa-org", "hosa-cookie"] as const) {
    await check(`D-${kind}. the primary pages show "Choose Debate or DECA" and 0 HOSA surfaces`, async () => {
      setViewer(kind);
      const writesBefore = writes.length;
      for (const [route, file] of CHOOSER_PAGES) {
        const html = await render(file);
        assert.deepEqual(hosaSurfaces(html), [], `${route}: no HOSA surface`);
        assert.match(visible(html), /Choose Debate or DECA/, `${route}: the neutral chooser is shown`);
        const links = hrefs(html);
        assert.ok(links.includes("/training/debate") && links.includes("/training/deca"), `${route}: both public tracks are offered`);
        assert.ok(!links.some((h) => /\/training\/(hosa|model-un)/.test(h)), `${route}: no dormant hub is linked`);
      }
      // The chooser pages claim nothing a learner has not done.
      const home = visible(await render("app/(app)/home/page.tsx"));
      assert.ok(!/judged round|Debate record|Start an AI round/i.test(home), "Home shows no Debate record or Debate action for an unresolved learner");
      const dash = visible(await render("app/(app)/dashboard/page.tsx"));
      assert.ok(!/Judged rounds|Recommended bot|Debate record|Practice average/i.test(dash), "Dashboard shows no track record for an unresolved learner");
      assert.match(dash, /Assigned Work/, "the account-level assigned work stays reachable");
      assert.equal(writes.length, writesBefore, "rendering wrote nothing");
    });
  }
  await check("D2. /training shows exactly two track cards and HOSA-saved learners have no 'Current track'", async () => {
    setViewer("hosa-org");
    const html = await render("app/(app)/training/page.tsx");
    assert.deepEqual(hosaSurfaces(html), []);
    const enter = hrefs(html).filter((h) => /^\/training\/[a-z-]+$/.test(h));
    assert.deepEqual([...new Set(enter)], ["/training/debate", "/training/deca"]);
    assert.ok(!/Current track/.test(visible(html)), "no track is presented as theirs");
    assert.match(html, /lg:grid-cols-2/, "two columns: no empty third slot");
  });
  await check("D3. /compete fails closed for a HOSA-saved learner, to the chooser that lists only public tracks", async () => {
    setViewer("hosa-org");
    const html = await render("app/(app)/compete/page.tsx");
    assert.deepEqual(hosaSurfaces(html), []);
    assert.match(visible(html), /Choose your track first/);
  });

  // ---- E. Debate and DECA learners: 0 HOSA surfaces, their own content intact ----------------------------
  for (const kind of ["debate", "deca"] as const) {
    await check(`E-${kind}. a ${kind === "deca" ? "DECA" : "Debate"} learner sees 0 HOSA surfaces on every primary page`, async () => {
      setViewer(kind);
      const own = kind === "deca" ? "DECA" : "General Debate";
      for (const [route, file] of PRIMARY_PAGES) {
        if (kind === "debate" && route === "/tests") {
          // Unchanged Debate behavior: Debate has no practice-test product, so /tests sends it to its drills.
          assert.equal(await redirectOf(file), redirectTo("/study-arcade?track=debate"));
          continue;
        }
        const html = await render(file);
        assert.deepEqual(hosaSurfaces(html), [], `${route}: no HOSA surface`);
        assert.ok(!/Choose Debate or DECA/.test(visible(html)), `${route}: a resolved learner is not sent back to the chooser`);
        if (route !== "/training") assert.ok(visible(html).includes(own) || route === "/dashboard" || route === "/home", `${route}: names the learner's own track`);
      }
      const training = await render("app/(app)/training/page.tsx");
      assert.match(visible(training), /Current track/, "the learner's own track is still marked current");
    });
  }
  await check("E3. the DECA tests page and generator offer DECA only", async () => {
    setViewer("deca");
    const html = await render("app/(app)/tests/page.tsx");
    assert.deepEqual(hosaSurfaces(html), []);
    assert.match(visible(html), /DECA · matched to your selected track/);
    setViewer("new");
    const assigned = await render("app/(app)/tests/page.tsx", { searchParams: { assignmentId: "assignment_1" } });
    assert.deepEqual(hosaSurfaces(assigned), [], "an assigned test with no track resolved still offers no HOSA");
    assert.match(visible(assigned), /Organization DECA/, "the one public practice-test organization is shown, not a choice that includes HOSA");
  });
  await check("E4. Study Arcade lists only the learner's own decks; HOSA decks are never offered", async () => {
    const hosaDecks = deckSummaries().filter((d) => d.organization === "HOSA");
    assert.ok(hosaDecks.length > 0, "control: HOSA decks still exist in code");
    for (const kind of ["debate", "deca"] as const) {
      setViewer(kind);
      const links = hrefs(await render("app/(app)/study-arcade/page.tsx"));
      for (const deck of hosaDecks) assert.ok(!links.some((h) => h.includes(deck.deckSlug)), `${kind}: ${deck.deckSlug} is not linked`);
    }
  });

  // ---- F. direct HOSA routes are dormant ----------------------------------------------------------------
  const hosaLesson = EDUCATION_LESSONS.find((e) => e.track === "HOSA" && e.visibility === "learner");
  const hosaDeck = deckSummaries().find((d) => d.organization === "HOSA");
  assert.ok(hosaLesson && hosaDeck, "fixtures: a HOSA lesson and deck exist");
  for (const kind of ["new", "hosa-org", "deca", "debate"] as const) {
    await check(`F-${kind}. every direct HOSA entry redirects once to its general page`, async () => {
      setViewer(kind);
      assert.equal(await redirectOf("app/(app)/training/[track]/page.tsx", { params: { track: "hosa" } }), redirectTo("/training"));
      assert.equal(await redirectOf("app/(app)/training/[track]/events/page.tsx", { params: { track: "hosa" } }), redirectTo("/training"));
      assert.equal(await redirectOf("app/(app)/training/[track]/practice/page.tsx", { params: { track: "hosa" } }), redirectTo("/training"));
      assert.equal(await redirectOf("app/(app)/training/[track]/room/page.tsx", { params: { track: "hosa" } }), redirectTo("/training"));
      assert.equal(await redirectOf("app/(app)/training/[track]/event/[eventSlug]/page.tsx", { params: { track: "hosa", eventSlug: "medical-terminology" } }), redirectTo("/training"));
      assert.equal(await redirectOf("app/(app)/lessons/[slug]/page.tsx", { params: { slug: hosaLesson!.id }, searchParams: { track: "hosa" } }), redirectTo("/lessons"));
      assert.equal(await redirectOf("app/(app)/lessons/[slug]/page.tsx", { params: { slug: "how-hosa-scenario-interaction-works" } }), redirectTo("/lessons"), "the HOSA role-play lesson too");
      assert.equal(await redirectOf("app/(app)/skills/[slug]/page.tsx", { params: { slug: "hosa-patient-communication-1" } }), redirectTo("/skills"));
      assert.equal(await redirectOf("app/(app)/skills/[slug]/practice/page.tsx", { params: { slug: "hosa-medical-terminology" } }), redirectTo("/skills"), "its practice page too");
      assert.equal(await redirectOf("app/(app)/study/[deck]/page.tsx", { params: { deck: hosaDeck!.deckSlug }, searchParams: { assignmentId: "assignment_1" } }), redirectTo("/study"), "even with an assignment");
      assert.equal(await redirectOf("app/(app)/study/[deck]/games/page.tsx", { params: { deck: hosaDeck!.deckSlug } }), redirectTo("/study"));
    });
  }
  await check("F2. no loop: every redirect target renders without redirecting back into HOSA", async () => {
    setViewer("hosa-org");
    for (const target of ["app/(app)/training/page.tsx", "app/(app)/lessons/page.tsx", "app/(app)/skills/page.tsx"]) {
      assert.equal(await redirectOf(target), null, `${target} renders`);
    }
    assert.equal(await redirectOf("app/(app)/study/page.tsx"), redirectTo("/study-arcade"));
    assert.equal(await redirectOf("app/(app)/study-arcade/page.tsx"), null);
  });
  await check("F3. a HOSA record: an unfinished test or session cannot be continued; a finished one stays readable", async () => {
    setViewer("deca");
    rows.practiceTest = { id: "t_hosa", userId: viewer.id, organization: "HOSA", status: "IN_PROGRESS", questions: [] };
    assert.equal(await redirectOf("app/(app)/tests/[testId]/page.tsx", { params: { testId: "t_hosa" } }), redirectTo("/tests"));
    rows.debate = { id: "d_hosa", organization: "HOSA", status: "ACTIVE", messages: [], student: null, opponentUser: null };
    assert.equal(await redirectOf("app/(app)/debate/[debateId]/page.tsx", { params: { debateId: "d_hosa" } }), redirectTo("/debates/history"));
    rows.debate = { ...rows.debate, status: "JUDGED" };
    assert.equal(await redirectOf("app/(app)/debate/[debateId]/page.tsx", { params: { debateId: "d_hosa" } }), redirectTo("/debates/d_hosa/replay"));
    // A finished HOSA test is the learner's own record: it still renders, with its score, and offers no
    // way back into HOSA (no retake, no lesson, deck, video or practice link).
    rows.practiceTest = {
      id: "t_hosa_done", userId: viewer.id, organization: "HOSA", status: "COMPLETED", score: 80, weakAreas: ["Word roots"],
      recommendations: { note: "Work through what the results page lists under \"What to work on\", then regenerate a shorter test in the same event cluster." }, eventType: "WRITTEN_TEST", eventCluster: "Medical Terminology", difficulty: "BEGINNER", questionCount: 10,
      completedAt: new Date("2026-09-20T12:00:00Z"), createdAt: new Date("2026-09-20T11:00:00Z"), questions: []
    };
    const result = await render("app/(app)/tests/[testId]/results/page.tsx", { params: { testId: "t_hosa_done" } });
    assert.match(visible(result), /80%/, "the score is still shown");
    assert.match(visible(result), /This track is no longer offered, so this result has no next steps\./);
    assert.ok(!/Generate another|Practice weak skills|Practice speaking|Generate a retake/.test(visible(result)), "no next step is offered");
    assert.ok(!/regenerate|Move up a difficulty|What to work on/i.test(visible(result)), "the stored next-attempt advice is withheld too");
    assert.ok(!/>Lessons</.test(result), "no lesson count is shown for a record that links no lesson");
    assert.deepEqual(hrefs(result).filter((h) => /hosa|\/lessons\/|\/study\/|medterm|youtube|\/debate$/i.test(h)), [], "no link leads back into HOSA or elsewhere as a next step");
    rows.debate = null;
    rows.practiceTest = null;
  });
  await check("F4. a ?track= naming a dormant track is dropped by the middleware, other parameters kept, never looping", () => {
    assert.equal(dormantTrackParamRedirect("/lessons", "?track=hosa"), "/lessons");
    assert.equal(dormantTrackParamRedirect("/tests", "?track=hosa&assignmentId=a1"), "/tests?assignmentId=a1");
    assert.equal(dormantTrackParamRedirect("/study-arcade", "?area=x&track=model-un"), "/study-arcade?area=x");
    for (const clean of ["", "?track=deca", "?track=debate", "?area=x", "?track=HOSA-unknown"]) {
      assert.equal(dormantTrackParamRedirect("/lessons", clean), null, `${clean || "(none)"} is left alone`);
    }
    const once = dormantTrackParamRedirect("/tests", "?track=hosa&track=deca")!;
    assert.equal(once, "/tests");
    assert.equal(dormantTrackParamRedirect("/tests", once.slice("/tests".length)), null, "its own output never redirects again");
    const mw = stripComments(read("middleware.ts"));
    assert.match(mw, /const dormant = dormantTrackParamRedirect\(pathname, search\);\s*if \(dormant\) \{\s*return NextResponse\.redirect\(new URL\(dormant, request\.url\)\);/);
    assert.ok(mw.indexOf("dormantTrackParamRedirect(pathname") < mw.indexOf("getToken("), "it runs before anything else and writes nothing");
  });
  await check("F5. the APIs refuse new HOSA practice with 410 after auth, before any provider call or write", async () => {
    setViewer("deca");
    const post = (body: unknown) => new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" }, body: JSON.stringify(body) });
    const writesBefore = writes.length;
    const tests = require(path.join(REPO, "app/api/tests/route.ts")) as { POST: (r: Request) => Promise<Response> };
    const r1 = await tests.POST(post({ organization: "HOSA", eventType: "WRITTEN_TEST", eventCluster: "Medical Terminology", difficulty: "BEGINNER", questionCount: 10 }));
    assert.equal(r1.status, TRACK_NOT_OFFERED_STATUS);
    assert.deepEqual(await r1.json(), TRACK_NOT_OFFERED_BODY);
    const pq = require(path.join(REPO, "app/api/ai/practice-questions/route.ts")) as { POST: (r: Request) => Promise<Response> };
    const r2 = await pq.POST(post({ organization: "HOSA", eventType: "WRITTEN_TEST", difficulty: "BEGINNER", count: 10 }));
    assert.equal(r2.status, 410);
    const rp = require(path.join(REPO, "app/api/ai/roleplay-turn/route.ts")) as { POST: (r: Request) => Promise<Response> };
    const r3 = await rp.POST(post({ organization: "HOSA", level: "BEGINNER", scenario: "A patient arrives worried.", characterRole: "Patient", transcript: [{ role: "AFFIRMATIVE", round: 1, content: "Hello there, how can I help today?" }], exchangesSoFar: 0, maxExchanges: 3 }));
    assert.equal(r3.status, 410, "roleplay-turn refuses a valid HOSA request");
    assert.equal(providerCalls, 0, "no provider was reached for HOSA");
    // Control: the same valid body for DECA passes the guard and reaches the provider stand-in, so the
    // 410 above is the dormant-track refusal and not a parse failure.
    const r4 = await rp.POST(post({ organization: "DECA", level: "BEGINNER", scenario: "A client arrives worried.", characterRole: "Client", transcript: [{ role: "AFFIRMATIVE", round: 1, content: "Hello there, how can I help today?" }], exchangesSoFar: 0, maxExchanges: 3 }));
    assert.notEqual(r4.status, 410, "DECA is not refused");
    assert.equal(providerCalls, 1, "control: DECA reached the provider stand-in");
    providerCalls = 0;
    assert.equal(writes.length, writesBefore, "nothing was written");
    assert.equal(TRACK_NOT_OFFERED_STATUS, HOSA_WITHDRAWN_STATUS, "the same Gone contract the withdrawn HOSA role-play uses");
    // The other generation routes that take an organization refuse it the same way, before the provider.
    const generation: Array<[string, Record<string, unknown>]> = [
      ["app/api/ai/lesson/route.ts", { organization: "HOSA", level: "BEGINNER", skillName: "Word roots" }],
      ["app/api/ai/topic/route.ts", { organization: "HOSA", level: "BEGINNER" }],
      ["app/api/ai/opponent/route.ts", { organization: "HOSA", level: "BEGINNER", topic: "This house would test a topic", side: "NEGATIVE", round: 1, transcript: [] }],
      ["app/api/ai/judge/route.ts", { organization: "HOSA", level: "BEGINNER", topic: "This house would test a topic", transcript: [1, 2, 3].map((round) => ({ role: "AFFIRMATIVE", round, content: "An argument with a claim, a warrant and an impact." })) }],
      ["app/api/ai/side-coach/route.ts", { organization: "HOSA" }],
      ["app/api/matchmaking/route.ts", { organization: "HOSA", level: "BEGINNER" }]
    ];
    for (const [file, body] of generation) {
      const route = require(path.join(REPO, file)) as { POST: (r: Request) => Promise<Response> };
      const response = await route.POST(post(body));
      assert.equal(response.status, 410, `${file} refuses HOSA (got ${response.status}: ${await response.clone().text()})`);
      assert.deepEqual(await response.json(), TRACK_NOT_OFFERED_BODY);
    }
    assert.equal(providerCalls, 0, "none of them reached the provider");
    assert.equal(writes.length, writesBefore, "and none of them wrote");
    for (const file of ["app/api/tests/route.ts", "app/api/ai/practice-questions/route.ts", "app/api/ai/roleplay-turn/route.ts", ...generation.map(([file]) => file)]) {
      const src = stripComments(read(file));
      const guard = src.indexOf("isRetiredOrganization(input.organization)");
      assert.ok(guard > src.indexOf("enforceRateLimit(") && guard > src.indexOf("parseJson("), `${file}: auth, rate limit and parse come first`);
    }
    for (const file of ["app/api/tests/[testId]/grade/route.ts", "app/api/debates/[debateId]/opponent/route.ts", "app/api/debates/[debateId]/messages/route.ts"]) {
      assert.match(stripComments(read(file)), /if \(isRetiredOrganization\((test|debate)\.organization\)\) \{\s*return trackNotOffered\(\);/, `${file} refuses a dormant record`);
    }
  });
  await check("F6. the debate room is given the RESOLVED track, never a raw ?track=hosa", () => {
    const src = stripComments(read("app/(app)/debate/page.tsx"));
    assert.match(src, /<DebateRoom track=\{activeTrack\?\.slug\}/);
    assert.ok(!/<DebateRoom track=\{searchParams\.track\}/.test(src));
  });

  // ---- N. the app shell offers no HOSA entry ------------------------------------------------------------
  await check("N. the app shell (desktop nav, mobile bottom bar, More menu, track chip) offers no HOSA entry for any learner", async () => {
    const { AppShell } = require(path.join(REPO, "components/app/app-shell.tsx")) as { AppShell: React.ComponentType<{ children?: React.ReactNode }> };
    const { TrainingTrackProvider } = require(path.join(REPO, "components/training/training-track-context.tsx")) as {
      TrainingTrackProvider: React.ComponentType<{ inputs: { organization: string | null; selection: string | null; selectionScope: string | null }; children?: React.ReactNode }>;
    };
    const shellFor = (organization: string | null, selection: string | null) =>
      renderToStaticMarkup(
        React.createElement(TrainingTrackProvider, { inputs: { organization, selection, selectionScope: null } },
          React.createElement(AppShell, null, React.createElement("p", null, "page body")))
      );
    shellPath.current = "/home";
    try {
      const cases: Array<[string, string | null, string | null, string]> = [
        ["new", null, null, "Choose a track"],
        ["hosa-org", "HOSA", null, "Choose a track"],
        ["hosa-selection", "HOSA", "hosa", "Choose a track"],
        ["debate", "DEBATE", null, "Track: Debate"],
        ["deca", "DECA", null, "Track: DECA"],
        ["hosa-org + DECA selection", "HOSA", "deca", "Track: DECA"]
      ];
      for (const [name, organization, selection, chip] of cases) {
        const html = shellFor(organization, selection);
        assert.match(visible(html), /page body/, `${name}: the shell rendered its page`);
        assert.deepEqual(hosaSurfaces(html), [], `${name}: no HOSA entry in the shell`);
        assert.ok(visible(html).includes(chip), `${name}: the track chip reads "${chip}"`);
        assert.ok(!/data-track="hosa"/.test(html), `${name}: the shell never wears the dormant track`);
        for (const href of ["/home", "/training", "/compete", "/teams"]) {
          assert.ok(hrefs(html).some((h) => h === href || h.startsWith(`${href}?`)), `${name}: ${href} stays reachable`);
        }
      }
    } finally {
      shellPath.current = "/";
    }
  });

  // ---- T. dormant HOSA teams ----------------------------------------------------------------------------
  await check("T1. no new HOSA team and no new HOSA member: both refuse with 410 before any write", async () => {
    const teams = require(path.join(REPO, "lib/teams.ts")) as {
      createTeam: (p: Record<string, unknown>) => Promise<unknown>;
      joinTeamByCode: (p: Record<string, unknown>) => Promise<unknown>;
    };
    const writesBefore = writes.length;
    await assert.rejects(teams.createTeam({ userId: viewer.id, role: "COACH", name: "Health team", organization: "HOSA" }),
      (error: { status?: number }) => error.status === 410, "a HOSA team is not created");
    rows.team = { id: "team_hosa", name: "Health team", organization: "HOSA" };
    await assert.rejects(teams.joinTeamByCode({ userId: viewer.id, joinCode: "HOSA-ABC123" }),
      (error: { status?: number }) => error.status === 410, "a HOSA team is not joined");
    assert.equal(writes.length, writesBefore, "both refused before any write");
    // Control: a DECA team gets past the dormant check (and reaches the write stand-in, which throws).
    rows.team = { id: "team_deca", name: "DECA team", organization: "DECA" };
    await assert.rejects(teams.joinTeamByCode({ userId: viewer.id, joinCode: "DECA-ABC123" }), /database write attempted: teamMember\.create/);
    writes.length = writesBefore;
    rows.team = null;
  });
  await check("T2. a DECA learner's unfinished HOSA assignment is never their next step, and is labeled no longer offered", async () => {
    setViewer("deca");
    rows.assignments = [{
      id: "asg_hosa", title: "Word roots review", type: "PRACTICE_TEST", dueDate: null, createdAt: new Date("2026-09-20T12:00:00Z"),
      team: { id: "team_hosa", name: "Health team", organization: "HOSA", coach: null }, submissions: []
    }];
    try {
      const dash = visible(await render("app/(app)/dashboard/page.tsx"));
      assert.ok(!/Finish your assigned coach work/.test(dash), "the dormant assignment is not the next step");
      assert.match(dash, /No longer offered/, "the dashboard labels it in words");
      const list = visible(await render("app/(app)/assignments/page.tsx"));
      assert.match(list, /No longer offered/);
      assert.ok(!/Due soon|Active|Past due/.test(list.replace(/No longer offered/g, "")), "it is not listed as due or active work");
      // Control: the same assignment on a DECA team IS the next step.
      rows.assignments = [{ ...rows.assignments[0], team: { id: "team_deca", name: "DECA team", organization: "DECA", coach: null } }];
      assert.match(visible(await render("app/(app)/dashboard/page.tsx")), /Finish your assigned coach work/, "control: public-track work still leads");
    } finally {
      rows.assignments = [];
    }
  });
  await check("T3. coach surfaces: a HOSA team offers no join code and is not assignable, with truthful copy", async () => {
    const coach = stripComments(read("app/(app)/coach/page.tsx"));
    assert.match(coach, /isRetiredOrganization\(team\.organization\) \? \(/, "the coach dashboard branches on a dormant team");
    assert.match(read("app/(app)/coach/page.tsx"), /This team&apos;s track is no longer offered\./);
    const dormantStart = coach.indexOf("isRetiredOrganization(team.organization) ? (");
    const withdrawn = coach.slice(dormantStart, coach.indexOf(") : (", dormantStart));
    assert.ok(withdrawn.length > 0 && /no longer offered/.test(withdrawn), "control: the dormant branch was found");
    assert.ok(!/CopyButton|joinCode/.test(withdrawn), "the dormant branch shows no join code or copy button");
    const form = stripComments(read("app/(app)/coach/assignments/new/page.tsx"));
    assert.match(form, /teams\.length === 0 && dormantTeamCount > 0 \? \(/, "a coach with only dormant teams is not told to create their first team");
    assert.match(form, /title="Your teams are on a track that is no longer offered\."/);
  });

  // ---- M. judged-round metrics count by canonical track ownership ----------------------------------------
  // A historical judged HOSA session is the learner's record: it stays readable in history and replay, but
  // it adds nothing to any number presented as Debate activity. A real Debate round still counts, and DECA
  // is unchanged. Every query below runs against the same stored rows through the strict `where` evaluator.
  const JUDGED_AT = new Date("2026-09-20T12:00:00Z");
  const judgedSession = (id: string, organization: string, eventType: string, overallScore: number | null, topic: string, minutesAgo: number, extra: Record<string, unknown> = {}) => {
    const debateOrg = organization === "DEBATE";
    const at = new Date(JUDGED_AT.getTime() - minutesAgo * 60_000);
    return {
      id, organization, eventType, topic, format: "PARLIAMENTARY", level: "BEGINNER", practiceMode: "DEBATE", status: "JUDGED",
      studentId: viewer.id, createdById: viewer.id, opponentUserId: null, student: null, opponentUser: null,
      studentSide: debateOrg ? "GOVERNMENT" : "AFFIRMATIVE", opponentSide: debateOrg ? "OPPOSITION" : "NEGATIVE",
      aiPersona: debateOrg ? "Coach Ada" : null, assistedPractice: false,
      overallScore, logicScore: null, evidenceScore: null, rebuttalScore: null, persuasionScore: null, clarityScore: null, communicationScore: null,
      strengths: [`Strength noted on ${id}`], weaknesses: [], recommendations: [],
      createdAt: new Date(at.getTime() - 3_600_000), updatedAt: at, completedAt: at,
      messages: [{ id: `${id}_m1`, role: debateOrg ? "GOVERNMENT" : "AFFIRMATIVE", authorId: viewer.id, round: 1, content: `Opening speech for ${id}.`, createdAt: at }],
      ...extra
    };
  };
  // Newest first, as every query orders them. The HOSA session is the newest, so a leak would also make
  // it the coach's "latest feedback".
  const HOSA_JUDGED = judgedSession("d_hosa_judged", "HOSA", "HEALTH_SCIENCE_EVENT", 20, "Explain a new diagnosis to a worried patient", 0);
  const DEBATE_JUDGED = judgedSession("d_debate_judged", "DEBATE", "PARLIAMENTARY_DEBATE", 80, "This house would ban homework", 60);
  const DEBATE_GUIDED = judgedSession("d_debate_guided", "DEBATE", "PARLIAMENTARY_DEBATE", null, "This house would extend the school day", 120, { practiceMode: "LESSON" });
  const DECA_JUDGED = judgedSession("d_deca_judged", "DECA", "ROLEPLAY", 60, "Pitch a loyalty program to a store manager", 180);
  // A legacy Model UN committee session: the other dormant track, excluded by the same rule.
  const MUN_JUDGED = judgedSession("d_mun_judged", "MODEL_UN", "MODEL_UN_COMMITTEE", 10, "Committee on clean water access", 240);
  const ERA_SET = new Date("2026-01-01T00:00:00Z");
  /** The value printed under a Fact or StatCard label, or null when that label is not on the page. */
  const labeledValue = (html: string, label: string): string | null => decode(html).match(new RegExp(`>${label}</p><p[^>]*>([^<]*)</p>`))?.[1] ?? null;
  const resetRecord = () => {
    rows.debates = [];
    rows.assignment = null;
    viewerStats.xp = 0;
    viewerStats.streak = 0;
    eraStart.current = null;
  };

  await check("M0. the Debate metric filters come from the canonical track list, and the stand-in refuses a query shape it does not know", () => {
    const tracks = require(path.join(REPO, "lib/training-tracks.ts")) as Record<string, unknown>;
    assert.deepEqual(tracks.DEBATE_ROUND_WHERE, { organization: trackById("GENERAL_DEBATE").organization });
    assert.deepEqual([...(tracks.RETIRED_ORGANIZATIONS as string[])].sort(), ["HOSA", "MODEL_UN"]);
    assert.deepEqual(tracks.NON_DORMANT_ROUND_WHERE, { organization: { notIn: tracks.RETIRED_ORGANIZATIONS } });
    rows.debates = [HOSA_JUDGED];
    try {
      assert.throws(() => debateRows({ where: { organization: { contains: "HOSA" } } }), /unsupported filter/);
      assert.throws(() => debateRows({ where: { team: { organization: "HOSA" } } }), /no "team" field/);
      assert.throws(() => debateRows({ where: { student: { is: { organization: "HOSA" } } } }), /unsupported filter student.is/);
      assert.throws(() => debateRows({ where: { noSuchField: 1 } }), /no "noSuchField" field/);
      assert.deepEqual(debateRows({ where: { organization: { notIn: ["HOSA"] } } }), [], "control: the evaluator filters");
    } finally {
      resetRecord();
    }
  });
  await check("M1. a historical judged HOSA session stays readable: /debate sends it to its replay, the replay renders it, history lists it", async () => {
    setViewer("debate");
    rows.debates = [HOSA_JUDGED];
    const writesBefore = writes.length;
    try {
      assert.equal(await redirectOf("app/(app)/debate/[debateId]/page.tsx", { params: { debateId: HOSA_JUDGED.id } }), redirectTo(`/debates/${HOSA_JUDGED.id}/replay`));
      const replay = visible(await render("app/(app)/debates/[debateId]/replay/page.tsx", { params: { debateId: HOSA_JUDGED.id } }));
      assert.ok(!/Replay unavailable/.test(replay), "the replay is not refused");
      assert.ok(replay.includes(HOSA_JUDGED.topic), "the replay shows the session");
      assert.match(replay, /Opening speech for d_hosa_judged\./, "with its transcript");
      assert.match(replay, /Practice ballot score: 20/, "and its stored ballot");
      const history = await render("app/(app)/debates/history/page.tsx");
      assert.ok(hrefs(history).includes(`/debates/${HOSA_JUDGED.id}/replay`), "history still links its replay");
      assert.equal(writes.length, writesBefore, "reading history wrote nothing");
    } finally {
      resetRecord();
    }
  });
  // Scope note: the Dashboard's internal bot-matching heuristic still reads the account-wide XP and
  // frozen wins counters (recorded debt), so the "Recommended bot" label is deliberately not asserted.
  await check("M2. ... and it adds 0 to every Debate count and activity state: Home, Dashboard, the Debate record, the average and the learning path", async () => {
    setViewer("debate");
    rows.debates = [HOSA_JUDGED];
    // What that HOSA ballot really earned on the account-wide counters.
    viewerStats.xp = 40;
    viewerStats.streak = 1;
    eraStart.current = ERA_SET;
    try {
      const home = await render("app/(app)/home/page.tsx");
      assert.equal(labeledValue(home, "Judged rounds"), "0", "Home: Judged rounds");
      assert.equal(labeledValue(home, "Guided exercises"), null, "Home: no guided line");
      const dashHtml = await render("app/(app)/dashboard/page.tsx");
      const dash = visible(dashHtml);
      assert.equal(labeledValue(dashHtml, "Judged rounds"), "0", "Dashboard: Judged rounds");
      assert.match(dash, /Avg practice ballot score \(current scoring\) —\./, "Dashboard: the HOSA ballot is not averaged");
      assert.match(dash, /No judged rounds yet/, "Debate record heading");
      assert.match(dash, /0 judged rounds · avg practice ballot score \(current scoring\) —/, "Debate record summary");
      assert.match(dash, /Complete your first activity so recommendations can adapt\./, "the HOSA session's XP does not make the Debate path active");
      // The account-wide counters still show the real session, and say it is account-wide.
      assert.equal(labeledValue(home, "Practice sessions"), "1");
      assert.equal(labeledValue(dashHtml, "XP"), "40");
      assert.match(dash, /1 practice session completed across all your tracks — not only this one\./);
      assert.match(dash, /Earn XP from scored training — counted across all your tracks\./);
      assert.ok(!/in your track/.test(`${dash} ${visible(home)}`), "no account-wide counter is presented as Debate's own");
    } finally {
      resetRecord();
    }
  });
  await check("M3. a real judged Debate round still counts normally, and a guided Debate exercise keeps its own line", async () => {
    setViewer("debate");
    // A judged DECA role-play is DECA's, not Debate's: it must not reach the Debate count or average either.
    rows.debates = [HOSA_JUDGED, DEBATE_JUDGED, DEBATE_GUIDED, DECA_JUDGED];
    viewerStats.xp = 60;
    viewerStats.streak = 3;
    try {
      const home = await render("app/(app)/home/page.tsx");
      assert.equal(labeledValue(home, "Judged rounds"), "1", "Home: the Debate round counts");
      assert.equal(labeledValue(home, "Guided exercises"), "1", "Home: the guided exercise counts on its own line");
      // Unchanged fail-closed state: with no scoring-era boundary set, no average is shown.
      assert.match(visible(await render("app/(app)/dashboard/page.tsx")), /1 judged round · avg practice ballot score \(current scoring\) —/);
      eraStart.current = ERA_SET;
      const dashHtml = await render("app/(app)/dashboard/page.tsx");
      const dash = visible(dashHtml);
      assert.equal(labeledValue(dashHtml, "Judged rounds"), "1", "Dashboard: the Debate round counts");
      assert.match(dash, /Avg practice ballot score \(current scoring\) 80\. 1 guided exercise completed, not counted here\./, "the average is the Debate round's own ballot (80): not 50 with the HOSA ballot, not 70 with the DECA one");
      assert.match(dash, /1 judged round · avg practice ballot score \(current scoring\) 80/);
      assert.ok(!/Complete your first activity/.test(dash), "a real Debate round makes the Debate path active");
    } finally {
      resetRecord();
    }
  });
  await check("M4. DECA is unchanged: its Home and Dashboard render identically with or without other tracks' judged sessions", async () => {
    setViewer("deca");
    viewerStats.xp = 60;
    viewerStats.streak = 3;
    eraStart.current = ERA_SET;
    try {
      const baseHome = await render("app/(app)/home/page.tsx");
      const baseDash = await render("app/(app)/dashboard/page.tsx");
      rows.debates = [HOSA_JUDGED, DEBATE_JUDGED, DECA_JUDGED];
      const home = await render("app/(app)/home/page.tsx");
      const dash = await render("app/(app)/dashboard/page.tsx");
      assert.equal(home, baseHome, "DECA Home is byte-identical");
      assert.equal(dash, baseDash, "DECA Dashboard is byte-identical");
      assert.equal(labeledValue(home, "Judged rounds"), null, "DECA Home shows no judged-round count");
      assert.match(visible(home), /Practice tests completed/, "DECA Home shows DECA's own record");
      assert.ok(!/Judged rounds|Debate record|judged rounds?\b/.test(visible(dash)), "DECA Dashboard shows no Debate record");
      assert.match(visible(dash), /DECA record/);
    } finally {
      resetRecord();
    }
  });
  await check("M5. the coach view and assignment evidence treat HOSA and Model UN sessions as history only; Debate and DECA rounds count as before", async () => {
    setViewer("debate");
    rows.debates = [HOSA_JUDGED, DEBATE_JUDGED, DECA_JUDGED, MUN_JUDGED];
    eraStart.current = ERA_SET;
    const writesBefore = writes.length;
    try {
      const { getCoachStudentProgress } = require(path.join(REPO, "lib/coach-progress.ts")) as {
        getCoachStudentProgress: (viewerId: string, studentId: string, role?: string) => Promise<{
          debate: { judgedRounds: number; averageScore: number | null; recent: Array<{ id: string }>; latestFeedback: { strengths: string[] } | null };
        }>;
      };
      const progress = await getCoachStudentProgress("user_admin", viewer.id, "ADMIN");
      assert.equal(progress.debate.judgedRounds, 2, "the Debate and DECA rounds count, the HOSA and Model UN sessions do not");
      assert.equal(progress.debate.averageScore, 70, "the average is (80 + 60) / 2, without the dormant ballots");
      assert.deepEqual(progress.debate.latestFeedback?.strengths, DEBATE_JUDGED.strengths, "the latest feedback is not the HOSA ballot's");
      assert.deepEqual(progress.debate.recent.map((d) => d.id), [HOSA_JUDGED.id, DEBATE_JUDGED.id, DECA_JUDGED.id, MUN_JUDGED.id], "the dormant sessions stay in the coach's recent history");
      const assignments = require(path.join(REPO, "lib/assignments.ts")) as {
        getStudentEvidenceOptions: (userId: string, type: string) => Promise<Array<{ id: string }>>;
        completeAssignment: (p: { assignmentId: string; userId: string; input: Record<string, unknown> }) => Promise<unknown>;
      };
      const options = await assignments.getStudentEvidenceOptions(viewer.id, "DEBATE_ROUND");
      assert.deepEqual(options.map((o) => o.id), [DEBATE_JUDGED.id, DECA_JUDGED.id], "the HOSA and Model UN sessions are not offered as evidence");
      rows.assignment = { id: "asg_round", type: "DEBATE_ROUND", targetId: null, team: { id: "team_debate", name: "Debate team", organization: "DEBATE", coach: null }, submissions: [] };
      await assert.rejects(assignments.completeAssignment({ assignmentId: "asg_round", userId: viewer.id, input: { evidenceId: HOSA_JUDGED.id, notes: null } }),
        (error: { status?: number }) => error.status === 403, "a HOSA session is refused as evidence");
      assert.equal(writes.length, writesBefore, "refused before any write");
      // Control: a real Debate round is accepted (and reaches the write stand-in, which throws).
      await assert.rejects(assignments.completeAssignment({ assignmentId: "asg_round", userId: viewer.id, input: { evidenceId: DEBATE_JUDGED.id, notes: null } }),
        /database write attempted: assignmentSubmission\.upsert/);
    } finally {
      writes.length = writesBefore;
      resetRecord();
    }
  });
  await check("M6. coach assignment copy names the current product: the practice-test type is DECA-only, and no type mentions HOSA", () => {
    const { ASSIGNMENT_TYPE_META } = require(path.join(REPO, "lib/assignment-types.ts")) as {
      ASSIGNMENT_TYPE_META: Record<string, { label: string; description: string; evidenceLabel: string }>;
    };
    assert.equal(ASSIGNMENT_TYPE_META.PRACTICE_TEST.description, "Students complete a generated DECA practice test and submit the completed test.");
    for (const [type, meta] of Object.entries(ASSIGNMENT_TYPE_META)) {
      assert.ok(!/HOSA/.test(`${meta.label} ${meta.description} ${meta.evidenceLabel}`), `${type} names no HOSA`);
    }
    // The wording is true: among the public tracks, only a DECA team can be given a practice test.
    const { assignmentTypesForOrganization } = require(path.join(REPO, "lib/track-content.ts")) as { assignmentTypesForOrganization: (org: string) => string[] };
    assert.deepEqual(ACTIVE_TRACKS.filter((t) => assignmentTypesForOrganization(t.organization).includes("PRACTICE_TEST")).map((t) => t.id), ["DECA"]);
  });

  // ---- G. the HOSA code and data are still there --------------------------------------------------------
  await check("G. HOSA is dormant, not deleted: curriculum, bank, decks, components and routes remain", () => {
    assert.ok(EDUCATION_LESSONS.filter((e) => e.track === "HOSA").length >= 17, "the Medical Terminology lessons remain");
    for (const file of [
      "lib/education/tracks/hosa.ts",
      "lib/hosa-medterm.ts",
      "components/training/hosa-medterm-engine.tsx",
      "components/training/hosa-event-prep.tsx",
      "components/training/hosa-event-navigator.tsx",
      "app/api/hosa/medterm/session/route.ts",
      "app/api/hosa/medterm/check/route.ts",
      "app/api/hosa/medterm/submit/route.ts"
    ]) {
      assert.ok(existsSync(path.join(REPO, file)), `${file} still exists`);
    }
    assert.equal(trackBySlug("hosa")?.id, "HOSA", "lookups by slug still resolve for records");
    const schema = read("prisma/schema.prisma");
    assert.match(schema, /enum Organization \{[^}]*HOSA/, "the HOSA organization value stays in the schema (no migration)");
    assert.match(schema, /HOSA_MEDTERM/, "HOSA practice-session records stay in the schema");
  });

  await check("W. nothing in the whole run attempted a database write", () => {
    assert.deepEqual(writes, [], "no page, API or redirect attempted a database write");
  });

  console.log(`\nPublic-tracks smoke passed: ${checks} checks. CompeteReady offers exactly Debate and DECA; a HOSA-saved or new learner gets "Choose Debate or DECA" and is never converted; Debate and DECA learners see 0 HOSA surfaces; every direct HOSA entry redirects once to its general page; the shell offers no HOSA entry; HOSA teams take no new team, member or assignment nudge; a historical HOSA session stays readable but adds 0 to Debate metrics; the APIs refuse new HOSA practice and generation with 410 before any provider call; nothing was written and HOSA's code and data remain.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
