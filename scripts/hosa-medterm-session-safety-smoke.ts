/**
 * HOSA Medical Terminology practice-session safety — the session builder terminates and the start
 * route refuses what it cannot serve.
 *
 * Run with: npm run hosa-medterm-session-safety:smoke
 *
 * NO DATABASE CONNECTION, NO PROVIDER, NO WRITES, NO SECRET READ BY THIS SUITE. Deterministic: every
 * assertion is on a count, a status code, a message, a call order or source text; nothing depends on
 * the shuffle. The route is called for real, with its auth, rate-limit, registry-spec and database
 * modules replaced through the module cache before it loads, so an invalid request is proved to be
 * refused with the database client never touched. The valid path is proved at the builder and by
 * source order, not by opening a transaction. Audit classification: an ENV CARRIER, like every suite
 * that reaches lib/api — the route imports it, and it imports @prisma/client, whose module scope
 * reads <repo>/.env where one exists (docs/HANDOFF.md, "Current safe validation commands"). Nothing
 * here uses a value from it, and no PrismaClient is constructed because lib/prisma is stubbed.
 *
 * THE DEFECT (found 2026-09-26, fixed here). `buildMedTermSession` seeds its result with the whole
 * eligible pool and then appends the whole pool again until `count` is reached. With an empty pool
 * that loop never advances, so an unsupported area name reaching the builder spun a worker forever,
 * synchronously, inside the start route's open transaction. The start schema accepted any short
 * string as an area.
 *
 * WHAT IT PROTECTS.
 *   A. The canonical areas are the six in MEDTERM_AREAS, the guard is derived from them, and every
 *      bank question belongs to one.
 *   B. The start schema accepts a valid area, a valid mixed selection and an omitted selection, and
 *      refuses an unsupported area, an empty selection and a non-string with a 400.
 *   C. The builder terminates on an empty pool and on a count that is not a positive finite number,
 *      proved in a child process under a timeout before it is called in this one, and its legitimate
 *      behaviour (focused, mixed, full-bank and padded sessions) is unchanged.
 *   D. The route refuses an unsupported or empty selection with a 400 after auth and rate limiting,
 *      and before it reads the registry spec or touches the database: no session, no item, no
 *      mastery or review record can be written by an invalid request.
 *   E. The route's own guards are in the right order in its source, so a schema change cannot
 *      quietly reopen the hang, and the builder's guard is independent of the route's.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import { ZodError } from "zod";

const REPO = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(REPO, p), "utf8");
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

let checks = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    checks += 1;
    console.log(`  ok  ${name}`);
  });
}

// ---- module stubs, installed BEFORE the route loads ------------------------------------------------
// The route imports these by alias; tsx resolves the alias to the same absolute file, so a module
// object placed in the cache under that file is what the route receives.
const calls: string[] = [];
const prismaTouches: string[] = [];
function stub(relativePath: string, exports: Record<string, unknown>): string {
  const file = require.resolve(path.join(REPO, relativePath));
  const mod = new Module(file);
  mod.filename = file;
  mod.loaded = true;
  mod.exports = exports;
  require.cache[file] = mod;
  return file;
}
const prismaProxy = new Proxy({}, {
  get(_target, property) {
    prismaTouches.push(String(property));
    throw new Error(`the database client was touched (${String(property)})`);
  }
});
const authFile = stub("lib/api-auth", {
  requireUser: async () => { calls.push("requireUser"); return { id: "user_smoke", role: "STUDENT", organization: "HOSA" }; },
  clientIp: () => "203.0.113.9"
});
const rateFile = stub("lib/rate-limit", {
  enforceRateLimit: async () => { calls.push("enforceRateLimit"); }
});
// The spec stub refuses by default, which stops a valid request before the transaction; one control
// lets it answer, so the request reaches the database proxy and proves that proxy records.
let specAnswer: () => Promise<unknown> = async () => { throw new Error("the registry spec was read"); };
const specFile = stub("lib/competition-specs", {
  getActiveSpec: async () => { calls.push("getActiveSpec"); return specAnswer(); }
});
const prismaFile = stub("lib/prisma", { prisma: prismaProxy });

import { isMedTermArea, buildMedTermSession, MEDTERM_AREAS, MEDTERM_BANK } from "../lib/hosa-medterm";
import { medTermSessionStartRequestSchema } from "../lib/validators";
import { apiError } from "../lib/api";

const AREA_IDS = MEDTERM_AREAS.map((a) => a.id);
const NOT_AREAS = ["not-an-area", "", " ", "Word-Roots", "word-roots ", "clash", "performance-indicators", "hosa-medical-terminology"];

async function statusAndError(error: unknown): Promise<{ status: number; error: string }> {
  const response = apiError(error);
  const body = (await response.json()) as { error?: string };
  return { status: response.status, error: body.error ?? "" };
}

async function main() {
  console.log("\nhosa-medterm-session-safety:smoke\n");

  await check("A. the six canonical areas, and a guard derived from them", () => {
    assert.deepEqual(AREA_IDS, ["word-roots", "prefixes", "suffixes", "anatomy", "physiology", "pathophysiology"],
      "A1. MEDTERM_AREAS is the canonical list, in its documented order");
    for (const id of AREA_IDS) assert.equal(isMedTermArea(id), true, `A2. ${id} is an area`);
    for (const bogus of NOT_AREAS) assert.equal(isMedTermArea(bogus), false, `A3. ${JSON.stringify(bogus)} is not an area`);
    for (const nonString of [42, null, undefined, {}, ["word-roots"], true]) {
      assert.equal(isMedTermArea(nonString), false, `A4. a non-string is never an area (${JSON.stringify(nonString)})`);
    }
    assert.deepEqual([...new Set(MEDTERM_BANK.map((q) => q.area))].sort(), [...AREA_IDS].sort(),
      "A5. every bank question belongs to a canonical area, and every area has questions");
    assert.match(read("lib/hosa-medterm.ts"), /return typeof value === "string" && MEDTERM_AREAS\.some\(\(a\) => a\.id === value\)/,
      "A6. the guard reads MEDTERM_AREAS rather than repeating the list");
  });

  await check("B. the start schema accepts valid selections and refuses unsupported or empty ones", async () => {
    const valid = medTermSessionStartRequestSchema.parse({ count: 10, areas: ["prefixes"] });
    assert.deepEqual(valid, { count: 10, areas: ["prefixes"] }, "B1. a valid area parses unchanged");
    const mixed = medTermSessionStartRequestSchema.parse({ count: 12, areas: ["word-roots", "anatomy", "pathophysiology"] });
    assert.deepEqual(mixed.areas, ["word-roots", "anatomy", "pathophysiology"], "B2. a valid mixed selection parses unchanged");
    assert.deepEqual(medTermSessionStartRequestSchema.parse({ count: 20 }), { count: 20 }, "B3. an omitted selection still means every area");
    assert.deepEqual(medTermSessionStartRequestSchema.parse({ count: 6, areas: [...AREA_IDS] }).areas, AREA_IDS, "B4. all six areas may be named");

    const refused = async (body: unknown, label: string, message: RegExp) => {
      const result = medTermSessionStartRequestSchema.safeParse(body);
      assert.equal(result.success, false, `B5. ${label} is refused`);
      assert.ok(!result.success && result.error instanceof ZodError, `B5b. ${label} fails as a validation error`);
      const mapped = await statusAndError(result.success ? null : result.error);
      assert.equal(mapped.status, 400, `B5c. ${label} maps to HTTP 400`);
      assert.match(mapped.error, message, `B5d. ${label} says what was wrong ("${mapped.error}")`);
    };
    for (const bogus of NOT_AREAS) {
      await refused({ count: 10, areas: [bogus] }, `unsupported area ${JSON.stringify(bogus)}`, /unknown Medical Terminology area/);
    }
    await refused({ count: 10, areas: ["prefixes", "not-an-area"] }, "a valid area beside an unsupported one", /unknown Medical Terminology area/);
    await refused({ count: 10, areas: [] }, "an empty selection", /select at least one area/);
    await refused({ count: 10, areas: [42] }, "a non-string area", /unknown Medical Terminology area/);
    await refused({ count: 10, areas: "prefixes" }, "a bare string instead of a list", /areas/);
    await refused({ count: 10, areas: [...AREA_IDS, "prefixes"] }, "more than six areas", /areas/);
    for (const [count, label] of [[0, "zero"], [101, "over a hundred"], [1.5, "a fraction"], [-1, "negative"]] as const) {
      await refused({ count, areas: ["prefixes"] }, `a count of ${label}`, /count/);
    }
    // Control: the schema is what the route parses with.
    assert.ok(stripComments(read("app/api/hosa/medterm/session/route.ts")).includes("parseJson(request, medTermSessionStartRequestSchema)"),
      "B6. control: the route parses with this schema");
  });

  await check("C. the builder terminates on an empty pool and keeps its legitimate behaviour", () => {
    // C1. Termination is proved in a child process under a timeout FIRST, so a regression cannot hang
    // this suite: the child is killed and the assertion below names it.
    const probe = `
      const { buildMedTermSession } = require("./lib/hosa-medterm");
      const lengths = [
        buildMedTermSession(5, ["not-an-area"]).length,
        buildMedTermSession(5, ["clash"]).length,
        buildMedTermSession(5, [""]).length,
        buildMedTermSession(Infinity, ["prefixes"]).length,
        buildMedTermSession(Number.NaN, ["prefixes"]).length,
        buildMedTermSession(0, ["prefixes"]).length,
        buildMedTermSession(-3, ["prefixes"]).length,
        buildMedTermSession(10, []).length,
        buildMedTermSession(40, ["pathophysiology"]).length
      ];
      process.stdout.write(JSON.stringify(lengths));
    `;
    let output: string;
    try {
      output = execFileSync(path.join(REPO, "node_modules", ".bin", "tsx"), ["-e", probe],
        { cwd: REPO, encoding: "utf8", timeout: 90_000, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      const failure = error as { code?: string; killed?: boolean; signal?: string | null; stderr?: string; message: string };
      const hung = failure.code === "ETIMEDOUT" || failure.killed || failure.signal === "SIGTERM";
      assert.fail(hung
        ? "C1. the builder HUNG: the probe was still running when its timeout killed it"
        : `C1. the probe failed: ${failure.stderr?.trim() || failure.message}`);
    }
    assert.deepEqual(JSON.parse(output.trim()), [0, 0, 0, 0, 0, 0, 0, 10, 40],
      "C1b. an unknown area, a non-finite or non-positive count yield an empty session; a legacy empty list and an overdraw still serve");

    // C2. Now in this process: empty pool → empty session, not a throw and not a hang.
    assert.deepEqual(buildMedTermSession(5, ["not-an-area" as never]), [], "C2. an unsupported area yields an empty session");
    assert.deepEqual(buildMedTermSession(Infinity, ["prefixes"]), [], "C2b. an infinite count yields an empty session");

    // C3. Legitimate behaviour is unchanged. A valid area serves the count, all from that area, distinct.
    const focused = buildMedTermSession(20, ["word-roots"]);
    assert.equal(focused.length, 20, "C3. a focused 20-question session serves 20");
    assert.equal(new Set(focused.map((q) => q.id)).size, 20, "C3b. distinct");
    assert.ok(focused.every((q) => q.area === "word-roots"), "C3c. all from the requested area");
    // A valid mixed selection serves only from those areas.
    const mixed = buildMedTermSession(12, ["prefixes", "suffixes"]);
    assert.equal(mixed.length, 12, "C4. a mixed 12-question session serves 12");
    assert.equal(new Set(mixed.map((q) => q.id)).size, 12, "C4b. distinct");
    assert.ok(mixed.every((q) => q.area === "prefixes" || q.area === "suffixes"), "C4c. all from the two requested areas");
    assert.equal(new Set(buildMedTermSession(60, ["prefixes", "suffixes"]).map((q) => q.id)).size, 60,
      "C4d. and the whole two-area pool (60) is reachable");
    // No selection serves from the whole bank, and the bank is deep enough that 100 needs no repeat.
    const whole = buildMedTermSession(100);
    assert.equal(whole.length, 100, "C5. the schema's maximum count is served from the whole bank");
    assert.equal(new Set(whole.map((q) => q.id)).size, 100, "C5b. without a repeat");
    assert.equal(MEDTERM_BANK.length, 180, "C5c. control: the bank holds 180 questions");
    // Padding still works when a request exceeds a pool (the branch the hang lived in).
    const padded = buildMedTermSession(40, ["pathophysiology"]);
    assert.equal(padded.length, 40, "C6. a 40-question request on a 30-item area still serves 40");
    assert.equal(new Set(padded.map((q) => q.id)).size, 30, "C6b. over exactly its 30 distinct items");
    // The guard sits before the shuffle and the loop, in the builder itself.
    const builder = stripComments(read("lib/hosa-medterm.ts"));
    const guardAt = builder.indexOf("if (pool.length === 0 || !Number.isFinite(count) || count < 1) return [];");
    const loopAt = builder.indexOf("while (result.length < count)");
    assert.ok(guardAt > 0 && loopAt > guardAt, "C7. the builder's own guard precedes its padding loop");
  });

  await check("D. the route refuses an invalid request after auth and rate limiting, and before any read or write", async () => {
    // Control: the stubs are what the route will load.
    for (const [file, name] of [[authFile, "api-auth"], [rateFile, "rate-limit"], [specFile, "competition-specs"], [prismaFile, "prisma"]] as const) {
      assert.ok(require.cache[file]?.loaded && !require.cache[file]?.children.length, `D0. control: lib/${name} is stubbed`);
    }
    const { POST } = require("../app/api/hosa/medterm/session/route") as { POST: (request: Request) => Promise<Response> };
    const post = async (body: unknown) => {
      calls.length = 0;
      prismaTouches.length = 0;
      const response = await POST(new Request("http://localhost/api/hosa/medterm/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body)
      }));
      const json = (await response.json().catch(() => ({}))) as { error?: string; sessionId?: string };
      return { status: response.status, json, calls: [...calls], prismaTouches: [...prismaTouches] };
    };
    for (const [label, body, message] of [
      ["an unsupported area", { count: 10, areas: ["not-an-area"] }, /unknown Medical Terminology area/],
      ["another track's area", { count: 10, areas: ["clash"] }, /unknown Medical Terminology area/],
      ["a valid area beside an unsupported one", { count: 10, areas: ["prefixes", "not-an-area"] }, /unknown Medical Terminology area/],
      ["an empty selection", { count: 10, areas: [] }, /select at least one area/],
      ["a non-string area", { count: 10, areas: [42] }, /unknown Medical Terminology area/],
      ["a count of zero", { count: 0, areas: ["prefixes"] }, /count/],
      ["a malformed body", "{not json", /Invalid JSON body/]
    ] as const) {
      const result = await post(body);
      assert.equal(result.status, 400, `D1. ${label} is refused with HTTP 400`);
      assert.match(result.json.error ?? "", message, `D1b. ${label} is told why ("${result.json.error}")`);
      assert.equal(result.json.sessionId, undefined, `D1c. ${label} gets no session`);
      assert.deepEqual(result.calls, ["requireUser", "enforceRateLimit"],
        `D2. ${label}: auth then rate limit ran, and the registry spec was never read`);
      assert.deepEqual(result.prismaTouches, [], `D3. ${label}: the database client was never touched, so nothing was written`);
    }
    // Control: the stubs really are in the route's path. A request that passes validation reaches the
    // registry-spec read, which the stub refuses; that refusal is a 500 here and proves the order.
    // (The route logs each refusal as "[api] Unhandled error: ...".)
    console.log("      (the next two \"[api] Unhandled error\" lines are these controls' expected refusals)");
    const reached = await post({ count: 10, areas: ["prefixes"] });
    assert.deepEqual(reached.calls, ["requireUser", "enforceRateLimit", "getActiveSpec"], "D4. control: a valid request goes on to read the spec");
    assert.deepEqual(reached.prismaTouches, [], "D4b. control: and had not touched the database before that read");
    assert.equal(reached.status, 500, "D4c. control: the stub's refusal surfaces, so the stubs are live");
    // Control: the database proxy itself records. With the spec answering, the same valid request
    // reaches the transaction, and the proxy's refusal is what comes back. So D3's empty lists above
    // are the proxy's testimony, not a dead stub's silence.
    specAnswer = async () => null;
    try {
      const transacted = await post({ count: 10, areas: ["prefixes"] });
      assert.deepEqual(transacted.calls, ["requireUser", "enforceRateLimit", "getActiveSpec"], "D5. control: with a spec, a valid request goes on to the database");
      assert.deepEqual(transacted.prismaTouches, ["$transaction"], "D5b. control: and the database proxy records the transaction it refused");
      assert.equal(transacted.status, 500, "D5c. control: whose refusal surfaces");
      assert.equal(transacted.json.sessionId, undefined, "D5d. control: so no session was issued here either");
    } finally {
      specAnswer = async () => { throw new Error("the registry spec was read"); };
    }
  });

  await check("E. the route's guards are in order in its source, and the builder's guard is its own", () => {
    const src = stripComments(read("app/api/hosa/medterm/session/route.ts"));
    const at = (needle: string) => {
      const index = src.indexOf(needle);
      assert.ok(index >= 0, `E0. the route contains ${JSON.stringify(needle)}`);
      return index;
    };
    const order = [
      "await requireUser();",
      "await enforceRateLimit(",
      "parseJson(request, medTermSessionStartRequestSchema)",
      "input.areas?.filter(isMedTermArea)",
      'throw new HttpError("Unknown Medical Terminology area requested", 400)',
      "getActiveSpec(",
      "prisma.$transaction(",
      "lockUserRow(tx",
      "buildMedTermSession(input.count, requestedAreas)",
      "if (served.length === 0)",
      'throw new HttpError("No Medical Terminology questions match the requested areas", 400)',
      "practiceSession.create(",
      "requestedAreas: requestedAreas ?? []"
    ];
    const positions = order.map(at);
    for (let i = 1; i < positions.length; i += 1) {
      assert.ok(positions[i] > positions[i - 1], `E1. ${JSON.stringify(order[i - 1])} precedes ${JSON.stringify(order[i])}`);
    }
    assert.ok(!/as MedTermArea\[\]/.test(src), "E2. the builder receives narrowed areas, not a cast");
    assert.equal((src.match(/buildMedTermSession\(/g) ?? []).length, 1, "E3. the builder is called once, with the narrowed areas");
    // The schema narrows through the same guard, so the two layers cannot disagree with the bank.
    const validators = stripComments(read("lib/validators.ts"));
    assert.ok(validators.includes('z.custom<MedTermArea>(isMedTermArea, { message: "unknown Medical Terminology area" })'),
      "E4. the schema narrows areas through isMedTermArea");
    assert.ok(validators.includes('areas: z.array(medTermAreaSchema).min(1, "select at least one area").max(6).optional()'),
      "E5. and refuses an empty selection while keeping an omitted one legal");
    // The engine still starts sessions without naming areas, so learners' practice is unchanged.
    const engine = read("components/training/hosa-medterm-engine.tsx");
    assert.ok(engine.includes("body: JSON.stringify({ count })"), "E6. the practice engine still sends a count and no areas");
    // The builder module stays pure: no HttpError, no prisma, so the lessons suite's purity proof holds.
    const builder = stripComments(read("lib/hosa-medterm.ts"));
    for (const banned of ["@/lib/api", "@/lib/prisma", "process.env", "fetch("]) {
      assert.ok(!builder.includes(banned), `E7. lib/hosa-medterm.ts contains no ${banned}`);
    }
  });

  console.log(`\nhosa-medterm-session-safety: ${checks} checks passed. The six Medical Terminology areas are canonical and ` +
    "guarded from one list; the start schema and the route refuse an unsupported or empty selection with a 400 after " +
    "auth and rate limiting and before any read or write; the session builder terminates on an empty pool and on a " +
    "non-finite count (proved under a timeout) and still serves focused, mixed, whole-bank and padded sessions as before.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
