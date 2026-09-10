/**
 * track-context:smoke — the learner-facing EFFECTIVE-TRACK contract (Owner QA Repair 2).
 *
 * Strict-safe: imports only the pure precedence/route modules and reads source files. No .env, no
 * database, no network, no React render.
 *
 * What it proves: one precedence function (lib/track-precedence.ts) is consumed by BOTH the server
 * resolver and the client shell with the same inputs; the selection cookie is owner-bound; the shell
 * reads and appends `?track=` only on routes whose page consumes it; and every edge repaired for the
 * owner's findings #4 #5 #6 #7 #13 #15 #21 #23 keeps its track. Each control is paired with a
 * non-vacuous companion where a regex could otherwise pass on an empty or wrong file.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  activeTrackFromOrganization,
  parseTrackSelectionCookie,
  pickActiveTrack,
  trackSelectionCookieValue
} from "../lib/track-precedence";
import { routeConsumesTrackParam, routeTrackSlugFor, TRACK_PARAM_ROUTES } from "../lib/track-route";
import { isTrackRetired, trackById, trackBySlug, trackByOrganization, type TrackInfo } from "../lib/training-tracks";
import { ORGANIZATIONS } from "../lib/constants";
import { AUTHORED_LESSONS } from "../lib/lessons";
import { ROLEPLAY_LESSONS } from "../lib/roleplay-lessons";
import { EDUCATION_LESSONS } from "../lib/education/registry";

const results: string[] = [];
let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    results.push(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${name}\n     ${error instanceof Error ? error.message : String(error)}`);
  }
}
const read = (path: string) => readFileSync(path, "utf8");
// Comments never count as product behaviour: strip block, line and JSX comments before scanning.
const stripComments = (src: string) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

const PA = (routeSlug: string | null, organization: string | null, cookieSlug: string | null) =>
  pickActiveTrack({ routeSlug, organization: organization as never, cookieSlug });

// ---------------------------------------------------------------------------------------------
check("T1. precedence: route > selection > organization > unresolved (fail closed)", () => {
  assert.equal(PA("deca", "HOSA", "debate").track?.id, "DECA", "T1a route wins over selection and organization");
  assert.equal(PA("deca", "HOSA", "debate").source, "route");
  assert.equal(PA(null, "HOSA", "debate").track?.id, "GENERAL_DEBATE", "T1b selection wins over organization");
  assert.equal(PA(null, "HOSA", "debate").source, "preference");
  assert.equal(PA(null, "HOSA", null).track?.id, "HOSA", "T1c organization is the fallback");
  assert.equal(PA(null, "HOSA", null).source, "organization");
  assert.equal(PA(null, null, null).resolved, false, "T1d nothing resolves to nothing");
  assert.equal(PA(null, null, null).source, "none");
  // Non-vacuous controls: each input actually does the work claimed above.
  assert.notEqual(PA("deca", "HOSA", "debate").track?.id, PA(null, "HOSA", "debate").track?.id, "T1-C1 removing the route changes the winner");
  assert.notEqual(PA(null, "HOSA", "debate").track?.id, PA(null, "HOSA", null).track?.id, "T1-C2 removing the selection changes the winner");
  assert.notEqual(PA(null, "HOSA", null).track?.id, PA(null, "DECA", null).track?.id, "T1-C3 changing the organization changes the fallback");
  // Invalid or retired values are absent, never overrides.
  for (const bad of ["", "model-un", "not-a-track", "../deca", "DECA;"]) {
    assert.equal(PA(bad, "DECA", null).track?.id, "DECA", `T1e invalid route ${JSON.stringify(bad)} cannot override`);
    assert.equal(PA(null, "DECA", bad).track?.id, "DECA", `T1f invalid selection ${JSON.stringify(bad)} cannot override`);
  }
  for (const org of ["PUBLIC_SPEAKING", "MOCK_TRIAL", "MODEL_UN", "NOT_AN_ORG", ""]) {
    assert.equal(activeTrackFromOrganization(org as never), undefined, `T1g ${org} maps to no live track`);
  }
});

check("T2. the selection cookie is owner-bound: legacy, foreign and malformed values are not selections", () => {
  const mine = "0123456789abcdef";
  const theirs = "fedcba9876543210";
  assert.equal(parseTrackSelectionCookie(trackSelectionCookieValue("deca", mine), mine), "deca", "T2a roundtrip parses");
  assert.equal(parseTrackSelectionCookie("deca", mine), null, "T2b legacy plain slug is NOT a selection");
  assert.equal(parseTrackSelectionCookie("deca.fedcba9876543210", mine), null, "T2c another account's selection is NOT mine");
  assert.equal(parseTrackSelectionCookie(trackSelectionCookieValue("deca", theirs), mine), null, "T2c2 built for them, read by me → null");
  assert.equal(parseTrackSelectionCookie(trackSelectionCookieValue("model-un", mine), mine), null, "T2d a retired track is never a selection");
  assert.equal(parseTrackSelectionCookie(trackSelectionCookieValue("garbage", mine), mine), null, "T2e an unknown slug is never a selection");
  assert.equal(parseTrackSelectionCookie(trackSelectionCookieValue("deca", mine), null), null, "T2f signed out (no scope) → no selection");
  assert.equal(parseTrackSelectionCookie(trackSelectionCookieValue("deca", mine), "not-a-scope"), null, "T2g a malformed scope never matches");
  assert.equal(parseTrackSelectionCookie(null, mine), null, "T2h absent cookie");
  assert.equal(parseTrackSelectionCookie(".0123456789abcdef", mine), null, "T2i empty slug");
  // Control: the scope check is doing the work — same value, only the scope differs.
  assert.notEqual(parseTrackSelectionCookie("deca." + mine, mine), parseTrackSelectionCookie("deca." + mine, theirs), "T2-C the scope decides");
});

check("T3. the server scope is a one-way, per-account digest that never leaks the id", () => {
  const server = stripComments(read("lib/track-server.ts"));
  assert.match(server, /export function selectionScopeForUser\(userId: string, organization: Organization \| null\)/, "T3a scope helper exists and takes the organization");
  assert.match(server, /createHash\("sha256"\)[\s\S]{0,80}track-selection:\$\{userId\}:\$\{organization \?\? "none"\}[\s\S]{0,80}digest\("hex"\)\.slice\(0, 16\)/, "T3b sha256, salted with user AND organization, truncated to 16 hex — an organization change orphans every earlier selection");
  assert.match(server, /selectionScopeForUser\(userId, organization\)/, "T3b2 and the request scope is built with the session organization");
  assert.match(server, /parseTrackSelectionCookie\(rawCookie, selectionScope\)/, "T3c the raw cookie is validated against THIS learner's scope before it reaches the picker");
  assert.match(server, /cookies\(\)\.get\(TRACK_COOKIE\)/, "T3d the resolver reads the cookie");
  assert.ok(!server.includes(".set("), "T3e and never writes it");
  assert.ok(!/prisma\./.test(server), "T3f and touches no database directly");
  assert.match(server, /return pickActiveTrack\(\{ organization: inputs\.organization, cookieSlug: inputs\.selection \}\)/, "T3g the server hands the shared picker the validated selection, nothing rawer");
  assert.ok(!/export function pickActiveTrack/.test(server), "T3h there is ONE precedence function, and it does not live in the server module");
  assert.match(read("lib/track-server.ts"), /export \{ activeTrackFromOrganization, pickActiveTrack \} from "@\/lib\/track-precedence"/, "T3i the server re-exports the shared one");
});

// ---------------------------------------------------------------------------------------------
check("T4. `?track=` is honoured exactly where a page consumes it — the list equals the pages", () => {
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry === "page.tsx") pages.push(full);
    }
  };
  walk("app/(app)");
  assert.ok(pages.length > 15, "T4-C0 the page walk found the app");
  const consuming = new Set<string>();
  for (const file of pages) {
    const src = stripComments(read(file));
    // A page consumes the parameter when it hands it to the resolver, or (the /study shim) forwards it.
    // ... directly, via the lesson page's normalised `trackParam` (derived from searchParams.track), or forwarded by the /study shim.
    const passesParam =
      /(getActiveTrack|resolveActiveTrack)\(searchParams\??\.track\)/.test(src) ||
      (/const rawTrack = searchParams\??\.track;/.test(src) && /resolveActiveTrack\(trackParam\)/.test(src)) ||
      /redirect\([^;]{0,200}searchParams\??\.track/.test(src);
    if (!passesParam) continue;
    const route = "/" + file.replace(/^app\/\(app\)\//, "").replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "");
    consuming.add(route === "/" ? "/" : route);
  }
  const listed = new Set<string>(TRACK_PARAM_ROUTES);
  // Dynamic segments (`/lessons/[slug]`) are handled by the lesson rule, not the exact list.
  const staticConsuming = [...consuming].filter((r) => !r.includes("["));
  for (const route of staticConsuming) assert.ok(listed.has(route), `T4a page ${route} consumes ?track= but the shell list omits it`);
  for (const route of listed) assert.ok(consuming.has(route), `T4b shell list names ${route} but its page does not consume ?track=`);
  assert.ok(consuming.has("/lessons/[slug]"), "T4c the lesson page consumes ?track= (content-owned context)");
  // Pages that deliberately take NO parameter must not be in the list.
  for (const route of ["/dashboard", "/debates/history", "/training", "/teams", "/assignments", "/settings", "/profile"]) {
    assert.ok(!listed.has(route), `T4d ${route} takes no ?track= and is not listed`);
  }
});

check("T5. the client route half: pathname wins, then ?track= only on consuming routes", () => {
  assert.equal(routeTrackSlugFor("/training/deca/practice", "hosa"), "deca", "T5a a track-scoped pathname wins over the query");
  assert.equal(routeTrackSlugFor("/training/hosa", null), "hosa");
  assert.equal(routeTrackSlugFor("/home", "deca"), "deca", "T5b ?track= is read on a consuming route");
  assert.equal(routeTrackSlugFor("/study-arcade/review", "hosa"), "hosa");
  assert.equal(routeTrackSlugFor("/lessons/how-deca-roleplay-works", "deca"), "deca", "T5c and on every lesson page");
  assert.equal(routeTrackSlugFor("/dashboard", "deca"), undefined, "T5d ignored where the page ignores it");
  assert.equal(routeTrackSlugFor("/debates/history", "deca"), undefined);
  assert.equal(routeTrackSlugFor("/home", null), undefined, "T5e no query → no route track");
  assert.equal(routeTrackSlugFor("/training", "deca"), undefined, "T5f the chooser is neutral: no path track, and it consumes no query");
  assert.equal(routeConsumesTrackParam("/lessons/deca-reading-scenarios"), true, "T5g lesson routes consume the query");
  assert.equal(routeConsumesTrackParam("/lessons"), true);
  assert.equal(routeConsumesTrackParam("/training/deca"), false, "T5h hub routes are path-scoped, not query-scoped");
});

// ---------------------------------------------------------------------------------------------
check("T6. the shell consumes the SAME effective track as the page body — no second resolver", () => {
  const shell = stripComments(read("components/app/app-shell.tsx"));
  assert.match(shell, /const \{ effectiveTrack, source, ownTrack \} = useTrainingTrack\(\);/, "T6a the shell reads the effective track from the shared provider");
  assert.ok(!/resolveTrackFromPathname|pickActiveTrack|localStorage|useSearchParams/.test(shell), "T6b and computes nothing of its own");
  assert.match(shell, /const TRACK_AWARE: readonly string\[\] = TRACK_PARAM_ROUTES;/, "T6c hrefs are parameterised from the ONE consumption list");
  assert.ok(!/TRACK_AWARE = \["\/home"/.test(shell), "T6d no private copy of the list");
  assert.match(shell, /const withTrack = \(href: string\) => \(visualTrackSlug && TRACK_AWARE\.includes\(href\) \? `\$\{href\}\?track=\$\{visualTrackSlug\}` : href\);/, "T6e every parameterised href carries the EFFECTIVE slug, and none when unresolved");
  assert.match(shell, /const visualTrackSlug = effectiveTrack \? trackById\(effectiveTrack\)\.slug : undefined;/, "T6f the slug is the effective track's");
  assert.match(shell, /source === "route" && effectiveTrack !== ownTrack[\s\S]{0,40}Viewing: /, "T6g Viewing: names a route-scoped render of another track");
  assert.match(shell, /: `Track: \$\{trackById\(effectiveTrack\)\.short\}`/, "T6h Track: names the selection/organization render");
  assert.match(shell, /\? "Choose a track"/, "T6i an unresolved learner is told so, not painted as Debate");
  assert.match(shell, /withTrack\(item\.href\)/, "T6j the nav uses it");
});

check("T7. the provider is server-initialised and calls the shared picker; no localStorage; cookie is owner-bound", () => {
  const ctx = stripComments(read("components/training/training-track-context.tsx"));
  assert.match(ctx, /pickActiveTrack\(\{ routeSlug, organization: inputs\.organization, cookieSlug: selection \}\)/, "T7a same function, same inputs");
  assert.match(ctx, /routeTrackSlugFor\(pathname \?\? "", trackParam\)/, "T7b the route half comes from the shared route resolver");
  assert.match(ctx, /useState<string \| null>\(inputs\.selection\)/, "T7c the selection state starts from the server-validated value");
  assert.ok(!/localStorage|TRACK_STORAGE_KEY/.test(ctx), "T7d no localStorage mirror remains");
  assert.match(ctx, /if \(!scope\) return;/, "T7e no scope → nothing written");
  assert.match(ctx, /document\.cookie = `\$\{TRACK_COOKIE\}=\$\{trackSelectionCookieValue\(slug, scope\)\}/, "T7f the cookie value is owner-bound");
  assert.match(ctx, /writeTrackCookie\(normalized, inputs\.selectionScope\)/, "T7g setTrack writes with THIS learner's scope");
  // The only effect is a RE-SYNC from the live cookie (another tab, a cleared cookie); it never seeds
  // and it never writes, so the first render is already right and the common path never re-renders.
  const effects = ctx.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/g) ?? [];
  assert.equal(effects.length, 1, "T7h exactly one effect, and it is the re-sync");
  assert.match(effects[0] ?? "", /parseTrackSelectionCookie\(readSelectionCookie\(\), inputs\.selectionScope\)/, "T7h2 it re-validates the live cookie with THIS learner's scope");
  assert.match(effects[0] ?? "", /setSelection\(\(current\) => \(current === live \? current : live\)\)/, "T7h3 and only changes state when the value changed");
  assert.ok(!/document\.cookie =|writeTrackCookie/.test(effects[0] ?? ""), "T7h4 and never writes");
  assert.match(ctx, /const values = searchParams\?\.getAll\("track"\) \?\? \[\];\s*const trackParam = values\.length === 1 \? values\[0\] : null;/, "T7k a repeated ?track= is not a track — exactly one value counts, as on the server");
  assert.match(ctx, /const own = pickActiveTrack\(\{ organization: inputs\.organization, cookieSlug: selection \}\)\.track\?\.id;/, "T7l the learner's OWN track (selection → organization) is exposed beside the effective one");
  const layout = stripComments(read("app/(app)/layout.tsx"));
  assert.match(layout, /const inputs = await getTrackContext\(\);/, "T7i the layout gathers the server inputs");
  assert.match(layout, /<TrainingTrackProvider inputs=\{inputs\}>/, "T7j and hands them to the provider");
});

// ---------------------------------------------------------------------------------------------
check("T8. entering a hub is the switch, and the chooser says exactly that", () => {
  const controls = stripComments(read("components/training/track-controls.tsx"));
  assert.match(controls, /if \(selectedTrack !== trackId\) \{\s*setTrack\(trackId\);/, "T8a the hub records the selection once");
  assert.ok(!/router\.(push|replace)/.test(controls), "T8b and launches nothing");
  const chooser = stripComments(read("app/(app)/training/page.tsx"));
  assert.match(chooser, /const currentTrack = resolution\.resolved \? resolution\.track : undefined;/, "T8c the chooser marks the track actually in force");
  assert.match(chooser, /Current track<\/StatusChip>/, "T8d as 'Current track'");
  assert.match(chooser, /Entering a track makes it your current track everywhere in CompeteReady until you enter another one\./, "T8e the copy states the real semantics");
  assert.ok(!/switch it from a track\s+page/.test(chooser), "T8f the circular instruction is gone");
  assert.ok(!/following a link here doesn(&apos;|')t change it/.test(chooser), "T8g and so is the false persistence claim");
});

check("T9. a lesson renders under its OWN track: Back returns to that catalog, the URL is made to agree", () => {
  const page = stripComments(read("app/(app)/lessons/[slug]/page.tsx"));
  assert.match(page, /const owner: TrackInfo \| undefined = lesson\s*\? trackBySlug\(lesson\.track\)\s*: roleplay\s*\? trackBySlug\(roleplay\.track\)\s*: concept\s*\? trackById\(concept\.entry\.track\)\s*: undefined;/, "T9a ownership comes from the lesson's own track field, all three sources");
  assert.match(page, /if \(!owner \|\| isTrackRetired\(owner\.id\)\) \{\s*notFound\(\);\s*\}/, "T9b a lesson with no track cannot render");
  assert.match(page, /const rawTrack = searchParams\?\.track;\s*const trackParam = typeof rawTrack === "string" \? rawTrack : undefined;\s*const effective = await resolveActiveTrack\(trackParam\);\s*if \(effective\.track\?\.id !== owner\.id\) \{\s*redirect\(`\/lessons\/\$\{params\.slug\}\?track=\$\{owner\.slug\}` as Route\);\s*\}/, "T9c a render that would resolve to another track is redirected to the owner's canonical URL; a repeated ?track= counts as absent, as in the shell");
  assert.match(page, /if \(!owner \|\| isTrackRetired\(owner\.id\)\) \{\s*notFound\(\);\s*\}/, "T9c2 a retired owner is refused, never redirected in a loop");
  assert.match(page, /href=\{`\/lessons\?track=\$\{owner\.slug\}` as Route\}/, "T9d Back goes to the owner's catalog");
  assert.ok(!/href=\{"\/lessons" as Route\}/.test(page), "T9e no bare /lessons back link remains");
  assert.match(page, /export default async function LessonPage\(\{ params, searchParams \}/, "T9f the page accepts ?track=");
  // Lookup order pinned elsewhere (education-migration 32b) must survive: legacy → roleplay → concept.
  assert.ok(page.indexOf("getLesson(params.slug)") < page.indexOf("conceptEducationLesson(params.slug)"), "T9g lookup order unchanged");
  const practice = stripComments(read("components/lessons/roleplay-lesson-practice.tsx"));
  assert.match(practice, /backHref=\{`\/lessons\?track=\$\{lesson\.track\}`\}/, "T9h the unavailable-practice Back also names the owner");
  assert.ok(!/href=\{"\/lessons" as Route\}/.test(practice), "T9i and no bare one remains there either");
});

check("T10. review CTAs name the same track as the count they sit under", () => {
  const home = stripComments(read("app/(app)/home/page.tsx"));
  assert.match(home, /href: activeTrack \? `\/study-arcade\/review\?track=\$\{activeTrack\.slug\}` : "\/study-arcade\/review"/, "T10a home review card carries the effective track");
  const arcade = stripComments(read("app/(app)/study-arcade/page.tsx"));
  assert.match(arcade, /const trackQuery = activeTrack \? `\?track=\$\{activeTrack\.slug\}` : "";/, "T10b the arcade query is the RESOLVED slug, never the raw param");
  assert.match(arcade, /href=\{`\/study-arcade\/review\$\{trackQuery\}` as Route\}/, "T10c arcade review link carries it");
  assert.match(stripComments(read("app/(app)/lessons/page.tsx")), /"\/study-arcade\/review\?track=debate"/, "T10d Debate catalog review link is Debate-scoped");
  assert.match(stripComments(read("components/skills/skill-path.tsx")), /"\/study-arcade\/review\?track=debate"/, "T10e Debate skill path review tile is Debate-scoped");
  for (const file of ["app/(app)/home/page.tsx", "app/(app)/study-arcade/page.tsx", "app/(app)/lessons/page.tsx", "components/skills/skill-path.tsx"]) {
    const src = stripComments(read(file));
    const bare = src.match(/["'`]\/study-arcade\/review["'`]/g) ?? [];
    // home keeps ONE bare fallback, used only when no track resolved (the destination then fails closed too).
    assert.equal(bare.length, file.endsWith("home/page.tsx") ? 1 : 0, `T10f ${file} has no bare review href (${bare.length})`);
  }
  // Destination truth: the review page resolves the same parameter.
  assert.match(stripComments(read("app/(app)/study-arcade/review/page.tsx")), /getActiveTrack\(searchParams\.track\)/, "T10g the review page consumes it");
});

check("T11. Open Training under 'Practise <track>' opens THAT track's hub", () => {
  const arcade = stripComments(read("app/(app)/study-arcade/page.tsx"));
  assert.match(arcade, /href=\{\(activeTrack \? `\/training\/\$\{activeTrack\.slug\}` : "\/training"\) as Route\}/, "T11a destination keeps the track");
  assert.match(arcade, /\{activeTrack \? `Open \$\{activeTrack\.label\} training` : "Choose your competition"\}/, "T11b the label names the track it opens");
  assert.ok(!/activeTrack && !hasDecks \? "\/training" : "\/training"/.test(arcade), "T11c the two-branches-one-destination ternary is gone");
});

check("T12. the Tests study CTA keeps the track and names only what it opens", () => {
  const tests = stripComments(read("app/(app)/tests/page.tsx"));
  assert.match(tests, /const studyTrack = lockedOrganization \? activeTrack : undefined;/, "T12a0 the CTA is keyed on a track that HAS decks (an assigned test can render under Debate)");
  assert.match(tests, /href=\{\(studyTrack \? `\/study-arcade\?track=\$\{studyTrack\.slug\}` : "\/study-arcade"\) as Route\}/, "T12a destination keeps the track");
  assert.match(tests, /\{studyTrack \? `Study \$\{studyTrack\.label\} terms before testing` : "Study DECA\/HOSA terms before testing"\}/, "T12b the label matches the decks it opens");
  assert.ok(!/href="\/study"/.test(tests), "T12c the bare /study shim is no longer used");
});

check("T13. history is one list for every track and says so", () => {
  const history = stripComments(read("app/(app)/debates/history/page.tsx"));
  assert.ok(!/Debate history<\/h1>/.test(history), "T13a no Debate-only heading over a multi-track list");
  assert.match(history, /<h1 className="text-2xl font-bold">History<\/h1>/, "T13b heading is neutral");
  assert.match(history, /Every round and session saved to your history, from any of your tracks — each labelled with its own\./, "T13c the description states what is listed — saved rows, from any track — and no more");
  assert.ok(!/Every session you have started/.test(history), "T13c2 it does not claim every session (Medical Terminology practice is stored elsewhere)");
  assert.match(history, /trackByOrganization\(debate\.organization\)/, "T13d each row is still labelled with its own track");
  const compete = stripComments(read("app/(app)/compete/page.tsx"));
  assert.match(compete, /detail: "Your saved rounds and sessions, from any of your tracks\. DECA role-plays aren't saved yet\."/, "T13e the DECA card says any-track, and keeps the saved-yet truth");
  assert.match(compete, /detail: "Your saved rounds and sessions, from any of your tracks\. Medical Terminology practice isn't listed here yet\."/, "T13f the HOSA card says any-track and names what it does not list");
});

check("T15. every reachable lesson resolves to a live owner track (data, not regex)", () => {
  const owners: Array<[string, TrackInfo | undefined]> = [
    ...AUTHORED_LESSONS.map((l): [string, TrackInfo | undefined] => [l.slug, trackBySlug(l.track)]),
    ...ROLEPLAY_LESSONS.map((l): [string, TrackInfo | undefined] => [l.slug, trackBySlug(l.track)]),
    ...EDUCATION_LESSONS.filter((e) => e.visibility === "learner").map((e): [string, TrackInfo | undefined] => [e.id, trackById(e.track)])
  ];
  assert.ok(owners.length >= 20, `T15-C ${owners.length} lessons enumerated`);
  for (const [id, owner] of owners) {
    assert.ok(owner, `T15a ${id} has an owner track`);
    assert.ok(owner && !isTrackRetired(owner.id), `T15b ${id} is owned by a live track`);
    // The redirect target must be accepted by the resolver on the next request, or it would loop.
    assert.equal(owner && pickActiveTrack({ routeSlug: owner.slug }).track?.id, owner?.id, `T15c ${id}'s canonical ?track= resolves back to its owner`);
  }
});

check("T16. onboarding writes a selection only for a track the learner actually chose", () => {
  const form = stripComments(read("components/onboarding/diagnostic-form.tsx"));
  assert.match(form, /const \[trackChosen, setTrackChosen\] = useState\(false\);/, "T16a the form tracks whether the select was touched");
  assert.match(form, /setTrackChosen\(true\);/, "T16b touching the select marks it");
  assert.match(form, /if \(trackChosen\) setTrack\(finished\.track\);/, "T16c and only then is the selection written — an untouched pre-fill (possibly the default) is never a selection");
  assert.ok(!/^\s*setTrack\(finished\.track\);/m.test(form), "T16d no unconditional write remains");
});

check("T17. an unresolved learner is offered the chooser, never walked into the default hub", () => {
  const path = stripComments(read("components/onboarding/learning-path.tsx"));
  assert.match(path, /href=\{\(effectiveTrack \? `\/training\/\$\{info\.slug\}` : "\/training"\) as Route\}/, "T17a Continue goes to the hub only when a track resolved");
  assert.match(path, /\{effectiveTrack \? "Continue" : "Choose a track"\}/, "T17b and says so");
});

check("T18. entering a hub refreshes the server render, and launches nothing", () => {
  const controls = stripComments(read("components/training/track-controls.tsx"));
  assert.match(controls, /if \(selectedTrack !== trackId\) \{\s*setTrack\(trackId\);\s*router\.refresh\(\);\s*\}/, "T18a a changed selection triggers router.refresh() so cached pages re-render under the new track");
  assert.ok(!/router\.(push|replace)/.test(controls), "T18b and never navigates");
});

check("T19. the chip says Viewing only when the render is scoped to a track that is not the learner's own", () => {
  const shell = stripComments(read("components/app/app-shell.tsx"));
  assert.match(shell, /const \{ effectiveTrack, source, ownTrack \} = useTrainingTrack\(\);/, "T19a the shell reads the learner's own track too");
  assert.match(shell, /: source === "route" && effectiveTrack !== ownTrack\s*\? `Viewing: /, "T19b Viewing: requires a route track that differs from the learner's own");
});

check("T14. no repaired surface still emits a bare track-sensitive href", () => {
  const bareHits: string[] = [];
  const scan = (file: string, patterns: RegExp[]) => {
    const src = stripComments(read(file));
    assert.ok(src.length > 200, `T14-C ${file} read`);
    for (const p of patterns) for (const m of src.match(p) ?? []) bareHits.push(`${file}: ${m}`);
  };
  scan("app/(app)/lessons/[slug]/page.tsx", [/["'`]\/lessons["'`]/g]);
  scan("components/lessons/roleplay-lesson-practice.tsx", [/["'`]\/lessons["'`]/g]);
  scan("app/(app)/tests/page.tsx", [/["'`]\/study["'`]/g]);
  scan("app/(app)/study-arcade/page.tsx", [/["'`]\/study-arcade\/review["'`]/g, /["'`]\/resources["'`]/g]);
  assert.deepEqual(bareHits, [], `bare hrefs remain: ${bareHits.join(" | ")}`);
});

check("T20. a record-owned page takes its track from the RECORD, not the learner's selection", () => {
  // Owner QA Repair 3D, Round-3 finding #6: a DECA learner opening their own General Debate replay
  // saw "Track: DECA" over a Debate transcript, with no way back except the browser button.
  assert.equal(routeConsumesTrackParam("/debates/abc123/replay"), true, "T20a the shell reads the record's stamped track on a replay");
  assert.equal(routeConsumesTrackParam("/tests/abc123/results"), true, "T20b and on a graded test result");
  assert.equal(routeConsumesTrackParam("/debate/abc123"), false, "T20c the live arena is an activity, not a record view — its URL is never rewritten");
  assert.equal(routeConsumesTrackParam("/debates/history"), false, "T20d global history stays global");
  assert.equal(routeTrackSlugFor("/debates/abc123/replay", "debate"), "debate", "T20e the stamped value is honoured");
  assert.equal(routeTrackSlugFor("/debates/abc123/replay", null), undefined, "T20f the id alone still proves no track");
  assert.equal(routeTrackSlugFor("/tests/abc123/results", null), undefined);

  const replay = stripComments(read("app/(app)/debates/[debateId]/replay/page.tsx"));
  assert.ok(replay.length > 2000, "T20-C1 replay page read");
  assert.match(replay, /const track = trackByOrganization\(debate\.organization\);/, "T20g the replay's owner is the ROW's organization");
  assert.match(replay, /redirect\(`\/debates\/\$\{params\.debateId\}\/replay\?track=\$\{track\.slug\}`/, "T20h and it is stamped into the URL the shell reads");
  // Bound the slice to the RENDER of a real replay: the error branch ("Replay unavailable") already
  // had a history link, so an unbounded match would pass on a success branch with no way back — the
  // exact Round-3 dead end.
  const replayRender = replay.slice(replay.indexOf("const judgeSpeech"));
  assert.ok(replayRender.length > 1000, "T20-C3 the replay render slice is real");
  assert.match(replayRender, /href=\{"\/debates\/history" as Route\}/, "T20i a viewable replay has a canonical return that needs no referrer");

  const resultsPage = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
  assert.ok(resultsPage.length > 2000, "T20-C2 results page read");
  assert.match(resultsPage, /const recordTrack = trackByOrganization\(test\.organization\);/, "T20j a graded result belongs to the organization stored on the row");
  assert.match(resultsPage, /redirect\(`\/tests\/\$\{test\.id\}\/results\?track=\$\{recordTrack\.slug\}`/, "T20k stamped the same way");
  assert.match(resultsPage, /Back to \$\{recordTrack\.label\} practice tests/, "T20l and its return names the catalog it opens");

  const skill = stripComments(read("app/(app)/skills/[slug]/page.tsx"));
  assert.match(skill, /const ownerTrack = trackByOrganization\(resolution\.track\);/, "T20m the legacy skill record's Back follows its own track");
  assert.ok(!/href=\{"\/lessons" as Route\}/.test(skill), "T20n and no longer drops to whichever catalog the learner had selected");

  // A retired owner has no catalog and no active track: every one of these pages must fall back
  // rather than stamp a track the resolver would refuse.
  for (const [file, src] of [["replay", replay], ["results", resultsPage], ["skills", skill]] as const) {
    assert.match(src, /isTrackRetired\(/, `T20o ${file} refuses to stamp a retired track`);
  }
});

check("T21. viewing a foreign record never changes the learner's selection", () => {
  // The selection is written in exactly one place. A record page that wrote it would silently move a
  // DECA learner to Debate for opening one old replay.
  for (const file of [
    "app/(app)/debates/[debateId]/replay/page.tsx",
    "app/(app)/tests/[testId]/results/page.tsx",
    "app/(app)/skills/[slug]/page.tsx"
  ]) {
    const src = stripComments(read(file));
    assert.ok(src.length > 1000, `T21-C ${file} read`);
    assert.ok(!/setTrack|document\.cookie|cookies\(\)\.set|TRACK_COOKIE/.test(src), `T21a ${file} writes no selection`);
  }
  const provider = stripComments(read("components/training/training-track-context.tsx"));
  assert.match(provider, /setTrack: \(next\) => \{/, "T21b the switcher is still the only writer");
});

check("T22. a track-scoped page describes the track it is scoped to", () => {
  // Final DECA cleanup, Round-3 finding #10. /tests?track=deca locks the generator to DECA and uses
  // DECA vocabulary throughout, while the header said "DECA and HOSA" and offered the learner both an
  // "event cluster" and an "event category" to work out between them.
  const tests = stripComments(read("app/(app)/tests/page.tsx"));
  assert.ok(tests.length > 2000, "T22-C the tests page was read");
  assert.match(tests, /<Badge variant="secondary">\{lockedOrganization \?\? "DECA and HOSA"\}<\/Badge>/,
    "T22a the eyebrow names the organization the page is actually serving");
  assert.match(tests, /\{HEADER_DESCRIPTION\[lockedOrganization \?\? "BOTH"\]\}/, "T22b and so does the description");
  assert.match(tests, /DECA: "Generate original questions by DECA event cluster,/, "T22c DECA's copy names only DECA's vocabulary");
  assert.match(tests, /HOSA: "Generate original questions by HOSA event category,/, "T22d HOSA's names only HOSA's");
  assert.match(tests, /BOTH: "Generate original questions by DECA event cluster or HOSA event category/,
    "T22e and both are named only where the generator really offers both");
  // The SAME value that locks the generator drives the copy, so the header cannot describe a track
  // the page is not serving. This is the non-vacuous half: a hardcoded string would pass T22a alone.
  assert.match(tests, /const lockedOrganization = activeTrack\?\.id === "DECA" \? "DECA" : activeTrack\?\.id === "HOSA" \? "HOSA" : undefined;/,
    "T22f the discriminator is unchanged — copy follows the lock, the lock does not follow copy");
  assert.match(tests, /<TestBuilderPreview organization=\{lockedOrganization\} \/>/, "T22g the generator preview is scoped by the same value");
  // The "Supported test tracks" card heading is deliberately NOT track-scoped: its tiles list event
  // types and a grading note, so a heading claiming what a track's tests COVER would assert something
  // the tiles do not support. Pinned as unchanged rather than silently left alone.
  assert.match(tests, /<CardTitle>Supported test tracks<\/CardTitle>/, "T22h the card heading makes no new content claim");

  const preview = stripComments(read("components/tests/test-builder-preview.tsx"));
  assert.match(preview, /The API route generates original \{organization \?\? "DECA and HOSA"\} questions\./,
    "T22i the preview names one track when one is locked");
  assert.ok(!/OpenAI/.test(preview), "T22j and names no provider it does not select");

  // The generator's own disclaimer is the third multi-track string a locked learner used to read.
  const generator = stripComments(read("components/tests/practice-test-generator.tsx"));
  assert.match(generator, /These are not official \{organization\} tests\./, "T22k the disclaimer names the org being generated");
  assert.match(generator, /\{organization === "HOSA" \? "event category" : "event cluster"\}/, "T22l in that org's own vocabulary");
  assert.ok(!/it still names both/.test(generator), "T22l-1 and claims no 'both' state, which that value can never hold");
  assert.ok(!/not official DECA or HOSA tests/.test(generator), "T22m and no longer names both to every learner");
  assert.match(generator, /const \[organization, setOrganization\] = useState<TestingOrganization>\(initialOrg\);/,
    "T22n the value it follows is the generator's real organization state, which is what gets posted");
});

check("T23. the product advertises only tracks it can actually train", () => {
  // QA-R1 #10. The homepage printed a hardcoded "6 Org tracks" and listed five organizations from the
  // SIGNUP list — including Mock Trial and Public Speaking, which no training track backs. A learner
  // could read the page and expect training the product cannot give.
  const trainable = ORGANIZATIONS.filter((org) => {
    const track = trackByOrganization(org.value);
    return Boolean(track) && !isTrackRetired(track!.id);
  });
  assert.deepEqual(trainable.map((org) => org.value), ["DEBATE", "DECA", "HOSA"], "T23a exactly the three trainable organizations");
  for (const unbacked of ["MOCK_TRIAL", "PUBLIC_SPEAKING"]) {
    assert.equal(trackByOrganization(unbacked as never), undefined, `T23-C ${unbacked} really has no track behind it`);
  }
  const landing = stripComments(read("app/page.tsx"));
  assert.ok(landing.length > 2000, "T23-C1 the landing page was read");
  assert.match(landing, /const TRAINABLE_ORGANIZATIONS = ORGANIZATIONS\.filter\(/, "T23b the page derives its list from the tracks");
  assert.match(landing, /\{TRAINABLE_ORGANIZATIONS\.length\}/, "T23c and its count from that same list");
  assert.match(landing, /\{TRAINABLE_ORGANIZATIONS\.map\(/, "T23d the supported-tracks grid renders that list, not every signup option");
  assert.ok(!/>6</.test(landing), "T23e no hardcoded track count survives");
  assert.ok(!/(?<![A-Z_])ORGANIZATIONS\.map\(/.test(landing), "T23f and nothing on the page still walks the raw signup list");
  // XP: the number is real but it is not a per-track currency, and it is capped.
  assert.match(landing, /\+\{XP_REWARDS\.debateCompleted\}/, "T23g the XP figure is derived from the reward table");
  assert.match(landing, /XP per judged round, first \{DAILY_REWARD_QUOTA\} each day/, "T23h and is described as capped, not as a track's currency");
  assert.ok(!/Debate XP/.test(landing), "T23i the invented 'Debate XP' currency is gone");
});

check("T24. a learner's profile shows the track they train, and only work they really did", () => {
  const profile = stripComments(read("app/(app)/profile/page.tsx"));
  assert.ok(profile.length > 2000, "T24-C the profile page was read");
  // QA-R1 #13: identity followed the SIGNUP organization, so a DECA learner read "Debate" as who they are.
  assert.match(profile, /const activeTrack = \(await resolveActiveTrack\(\)\)\.track;/, "T24a identity comes from the one canonical resolver");
  assert.match(profile, /Training in: \$\{activeTrack\.label\}/, "T24b and is stated as the track being trained");
  assert.match(profile, /Signed up under \{signupOrganizationLabel\}/, "T24c the signup organization is still shown, named as what it is");
  assert.match(profile, /signupTrack\?\.id !== activeTrack\?\.id \? organizationLabel\(signupOrganization\) : null/,
    "T24d and only when it differs from the track being trained");
  assert.ok(!/<span>\{organizationLabel\(user\.preferredOrganization \?\? user\.organization\)\}<\/span>/.test(profile),
    "T24e the signup organization is no longer presented as the learner's identity");
  // QA-R1 #14: "In progress" was printed for any ungraded row, including a set never opened.
  assert.match(profile, /questions: \{ select: \{ _count: \{ select: \{ answers: true \} \} \} \}/, "T24f the page counts real answers");
  assert.match(profile, /answered > 0 \? `In progress — \$\{answered\} answered` : "Not started"/, "T24g an untouched set is called Not started");
  assert.match(profile, /graded \? `\/tests\/\$\{test\.id\}\/results` : `\/tests\/\$\{test\.id\}`/, "T24h and each row opens what it names");
  assert.ok(!/typeof test\.score === "number" \? `\$\{test\.score\}% score` : "In progress"/.test(profile),
    "T24i the ungraded-equals-in-progress shortcut is gone");
});

check("T25. a retired track keeps its record but offers no way back in", () => {
  // QA-R1 #13. The Model UN row is the learner's own persisted session, so it is neither deleted nor
  // hidden — but Model UN is retired, and "Continue" led back into a track the product no longer runs.
  const history = stripComments(read("app/(app)/debates/history/page.tsx"));
  assert.ok(history.length > 1500, "T25-C the history page was read");
  assert.match(history, /const retiredTrack = Boolean\(track && isTrackRetired\(track\.id\)\);/, "T25a the row knows whether its track is retired");
  assert.match(history, /No longer offered/, "T25b and says so on the row");
  assert.match(history, /\{unfinished && retiredTrack \? \(/, "T25c an unfinished retired session takes a different branch");
  assert.match(history, /This track is no longer offered, so this session cannot be continued\./, "T25d which states why instead of offering a dead action");
  const continueBlock = history.slice(history.indexOf("unfinished && retiredTrack"), history.indexOf("View replay"));
  assert.ok(!/retiredTrack[\s\S]{0,400}Continue\s*<\/Link>/.test(continueBlock) || continueBlock.indexOf("Continue") > continueBlock.indexOf("cannot be continued"),
    "T25e the retired branch precedes and replaces the Continue action");
  assert.ok(/View replay/.test(history), "T25f a judged record can still be read back");
  assert.ok(isTrackRetired("MODEL_UN"), "T25-C1 control: Model UN really is the retired track this protects against");
  assert.ok(!isTrackRetired("DECA") && !isTrackRetired("GENERAL_DEBATE") && !isTrackRetired("HOSA"),
    "T25-C2 and no live track is caught by it");
});

check("T26. test feedback resolves to lessons that exist", () => {
  // QA-R2 #5. The grader recommended rows from the legacy Lesson table, every DECA one of which renders
  // "no written lesson here yet", and the results page linked them at /skills/<slug>.
  const results_ = stripComments(read("app/(app)/tests/[testId]/results/page.tsx"));
  assert.ok(results_.length > 2000, "T26-C the results page was read");
  assert.match(results_, /decaDiagnosticRoutesForLearner\(test\.weakAreas\)/, "T26a the page routes diagnostics through the bridge");
  assert.match(results_, /href=\{route\.lessonHref as Route\}/, "T26b and links the lesson the bridge names");
  assert.match(results_, /href=\{route\.drillHref as Route\}/, "T26c beside the drill for that recorded skill");
  assert.ok(!/href=\{`\/skills\/\$\{lesson\.lessonSlug\}` as Route\}/.test(results_), "T26d no stored slug is linked into the legacy skills route any more");
  assert.match(results_, /decaBridgeLessonIsPublished\(lesson\.lessonSlug\)/, "T26e a stored recommendation renders only when its lesson is real");
  assert.match(results_, /retiredRecommendationCount > 0/, "T26f and the rest are disclosed as older records");
  assert.match(results_, /uncoveredDiagnostics\.length > 0/, "T26g a diagnostic with no lesson is named, not silently dropped");

  const grade = stripComments(read("app/api/tests/[testId]/grade/route.ts"));
  assert.match(grade, /if \(test\.organization === "DECA"\) \{[\s\S]{0,200}decaDiagnosticRoutesForLearner\(weakAreas\)/, "T26h the grader stores DECA recommendations from the bridge");
  assert.ok(!/recommendedLessons = lessons\.slice\(0, 3\)/.test(grade), "T26i the fallback that handed out three unrelated lessons is gone");
  assert.match(grade, /} else \{[\s\S]{0,400}prisma\.lesson\.findMany/, "T26j other organizations keep their existing path, untouched");
});

console.log(results.join("\n"));
console.log(`\n${results.length - failures}/${results.length} track-context controls passed`);
if (failures > 0) process.exit(1);
