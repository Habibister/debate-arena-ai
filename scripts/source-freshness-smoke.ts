import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// THE PRODUCTION DECISION LAYER — the same function the shared component calls. No mirrored copy.
import { formatVerifiedDate, presentSourceFreshness, type SourceFreshnessMetadata } from "../lib/source-freshness";
import { hosaEventById, hosaSourceMetadata, HOSA_EVENTS, presentHosaEvent } from "../lib/hosa-events";
import { decaFamilyById, decaSourceMetadata, DECA_FAMILIES, presentDecaFamily } from "../lib/deca-events";
import { getLesson } from "../lib/lessons";
import { getRoleplayLesson } from "../lib/roleplay-lessons";

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");

/** Every learner-facing string the presenter can emit, for the machine-code audit. */
function allText(v: ReturnType<typeof presentSourceFreshness>): string {
  return [v.authorityLabel, v.freshnessLabel, v.verifiedLabel, v.revalidationLabel, v.revalidationNote, v.sourceLabel, ...v.variationLabels]
    .filter(Boolean)
    .join(" | ");
}

function main() {
  const model = readFileSync("lib/source-freshness.ts", "utf8");
  const note = readFileSync("components/source/source-freshness-note.tsx", "utf8");
  const hosaNav = readFileSync("components/training/hosa-event-navigator.tsx", "utf8");
  const decaNav = readFileSync("components/training/deca-event-navigator.tsx", "utf8");
  const lessonView = readFileSync("components/lessons/lesson-view.tsx", "utf8");
  const rpView = readFileSync("components/lessons/roleplay-lesson-view.tsx", "utf8");

  // ---- 1. the shared component exists and renders only the decision layer's output ---------------
  assert.ok(note.includes("export function SourceFreshnessNote"), "the shared indicator component exists");
  assert.ok(note.includes("presentSourceFreshness(metadata)"), "it renders through the shared decision layer");
  assert.ok(!note.includes('"use client"'), "it is server-renderable, so source text is in the document");
  assert.ok(!/aria-live|role="status"|role="alert"/.test(note), "no noisy live region — this content never updates in place");
  assert.ok(!/title=\{/.test(note), "essential source information is not hidden inside a tooltip");

  // ---- 2. machine codes are never the learner-facing wording -----------------------------------------
  const MACHINE = ["verified-current", "verified-stable", "awaiting-season-revalidation", "tier-2",
                   "stable-teaching", "sourceStatus", "possibly-outdated", "awaiting-revalidation", "unresolved"];
  const everyState: SourceFreshnessMetadata[] = [
    { authority: "official", freshness: "current", organization: "HOSA", sourceLabel: "X", season: "2025-26", lastVerified: "2026-07-05" },
    { authority: "stable-teaching", freshness: "stable", organization: "NSDA", sourceLabel: "Y" },
    { authority: "tier-2", freshness: "stable", organization: "CompeteReady", sourceLabel: "Z" },
    { authority: "partial", freshness: "possibly-outdated" },
    { authority: "unverified" }
  ];
  for (const m of everyState) {
    const text = allText(presentSourceFreshness(m));
    for (const code of MACHINE) assert.ok(!text.includes(code), `no machine code "${code}" reaches the learner`);
  }

  // ---- 3/4. official cannot render without its required metadata -------------------------------------
  const officialNoLabel = presentSourceFreshness({ authority: "official", freshness: "current", organization: "HOSA", season: "2025-26" });
  assert.equal(officialNoLabel.authority, "unverified", "official without a source label degrades");
  assert.ok(!officialNoLabel.authorityLabel.includes("Official"), "and never says Official");
  assert.equal(officialNoLabel.degraded, true, "the degradation is reported");
  const officialNoOrg = presentSourceFreshness({ authority: "official", freshness: "current", sourceLabel: "X", season: "2025-26" });
  assert.equal(officialNoOrg.authority, "unverified", "official without an organization degrades");
  const stableNoLabel = presentSourceFreshness({ authority: "stable-teaching", freshness: "stable" });
  assert.equal(stableNoLabel.authority, "unverified", "stable-teaching without a source label degrades");

  // ---- 5. missing season/version is omitted, not guessed ------------------------------------------------
  const noSeason = presentSourceFreshness({ authority: "official", freshness: "current", organization: "DECA", sourceLabel: "X" });
  assert.equal(noSeason.freshnessLabel, null, "current with no season or version makes no currency claim");
  assert.equal(noSeason.degraded, true, "and says so");
  const byVersion = presentSourceFreshness({ authority: "official", freshness: "current", organization: "NSDA", sourceLabel: "X", documentVersion: "v3" });
  assert.equal(byVersion.freshnessLabel, "Current — v3", "a document version anchors currency just as a season does");
  assert.ok(!/20\d\d/.test(noSeason.freshnessLabel ?? ""), "no year is invented from the calendar");

  // ---- 6. missing or malformed verification date is omitted ---------------------------------------------
  assert.equal(formatVerifiedDate(undefined), null, "absent date -> null");
  assert.equal(formatVerifiedDate("not-a-date"), null, "malformed date -> null");
  assert.equal(formatVerifiedDate("2026-02-31"), null, "impossible calendar day -> null");
  assert.equal(formatVerifiedDate("2026-13-01"), null, "impossible month -> null");
  assert.equal(formatVerifiedDate("2026-07-05"), "July 5, 2026", "a real ISO date formats without timezone drift");
  const noDate = presentSourceFreshness({ authority: "official", freshness: "current", organization: "HOSA", sourceLabel: "X", season: "2025-26" });
  assert.equal(noDate.verifiedLabel, null, "no date line is rendered when there is no date");
  assert.equal(noDate.tone, "provisional", "and a dateless official claim is not given verified tone");
  const badDate = presentSourceFreshness({ ...noDate, authority: "official", freshness: "current", organization: "HOSA", sourceLabel: "X", season: "2025-26", lastVerified: "07/05/2026" });
  assert.equal(badDate.verifiedLabel, null, "a malformed date is dropped, never reformatted into a guess");
  assert.equal(badDate.degraded, true, "and the drop is reported");

  // ---- M11R1 demotion regression: a demoted claim must lose its verification line ------------------------
  // The suite previously fed exactly this input and asserted tone, authorityLabel and freshnessLabel —
  // but NOT verifiedLabel, which was the one property that leaked. Positive control first.
  const fullOfficial = { authority: "official", freshness: "current", organization: "HOSA",
                         sourceLabel: "HOSA guidelines", season: "2025-26", lastVerified: "2026-07-05" } as const;
  const intact = presentSourceFreshness(fullOfficial);
  assert.equal(intact.verifiedLabel, "Last verified July 5, 2026", "positive control: a complete official claim keeps its date");
  assert.equal(intact.tone, "verified", "positive control: and earns verified tone");
  for (const [label, meta] of [
    ["source label removed", { ...fullOfficial, sourceLabel: undefined }],
    ["organization removed", { ...fullOfficial, organization: undefined }],
    ["authority already partial", { ...fullOfficial, authority: "partial" }],
    ["authority already unverified", { ...fullOfficial, authority: "unverified" }]
  ] as const) {
    const d = presentSourceFreshness(meta as never);
    assert.notEqual(d.authority, "official", `${label}: the claim is demoted`);
    assert.equal(d.verifiedLabel, null, `${label}: verifiedLabel does NOT survive demotion`);
    assert.equal(d.tone, "provisional", `${label}: verified tone does not survive`);
    assert.ok(!/Official/.test(d.authorityLabel), `${label}: no official wording survives`);
    const rendered = allText(d);
    assert.ok(!/Last verified/.test(rendered), `${label}: no stale verification line reaches the learner`);
    assert.ok(/not yet verified/i.test(d.authorityLabel), `${label}: the state reads as unverified/partial`);
  }

  // ---- 7/8. partial and unverified never render as verified ----------------------------------------------
  for (const authority of ["partial", "unverified"] as const) {
    const v = presentSourceFreshness({ authority, freshness: "current", season: "2025-26", sourceLabel: "X", organization: "HOSA", lastVerified: "2026-07-05" });
    assert.equal(v.tone, "provisional", `${authority} never gets verified tone`);
    assert.ok(!v.authorityLabel.includes("Official"), `${authority} never says Official`);
    assert.equal(v.freshnessLabel, null, `${authority} makes no currency claim`);
  }
  assert.equal(presentSourceFreshness({ authority: "partial" }).authorityLabel, "Complete current details not yet verified", "partial wording is honest and learner-facing");
  assert.equal(presentSourceFreshness({ authority: "unverified" }).authorityLabel, "Not yet verified", "unverified wording is honest");

  // ---- 9. revalidation text comes from metadata, not the component ------------------------------------------
  const noTrigger = presentSourceFreshness({ authority: "partial", revalidation: { required: true } });
  assert.equal(noTrigger.revalidationLabel, "Revalidation required before relying on this", "no trigger -> no invented date");
  assert.ok(!/September|20\d\d/.test(noTrigger.revalidationLabel ?? ""), "and certainly no invented September date");
  const withTrigger = presentSourceFreshness({ authority: "partial", revalidation: { required: true, triggerLabel: "the expected September 1, 2026 release", note: "N" } });
  assert.equal(withTrigger.revalidationLabel, "Revalidation required after the expected September 1, 2026 release", "the trigger comes from metadata");
  assert.equal(presentSourceFreshness({ authority: "partial", revalidation: { required: false } }).revalidationLabel, null, "not required -> nothing shown");
  assert.ok(!/September 1/.test(stripComments(note)), "the component hardcodes no revalidation date");

  // ---- 10/11. variation text appears only when enabled --------------------------------------------------------
  assert.deepEqual(presentSourceFreshness({ authority: "partial" }).variationLabels, [], "no variation flags -> no variation text");
  assert.deepEqual(presentSourceFreshness({ authority: "partial", associationVariation: true }).variationLabels, ["Association rules may vary"], "association only");
  assert.deepEqual(presentSourceFreshness({ authority: "partial", competitionLevelVariation: true }).variationLabels, ["Rules may differ by competition level"], "level only");
  assert.equal(presentSourceFreshness({ authority: "partial", associationVariation: true, competitionLevelVariation: true }).variationLabels.length, 2, "both when both");

  // ---- 12/13. HOSA Medical Terminology --------------------------------------------------------------------------
  const mt = hosaEventById("medical-terminology")!;
  const mtView = presentSourceFreshness(hosaSourceMetadata(mt));
  assert.equal(mtView.authority, "official", "MT is an official claim");
  assert.equal(mtView.authorityLabel, "Official HOSA source", "named to the organization");
  assert.equal(mtView.freshnessLabel, "Current for 2025-26", "the approved season");
  assert.equal(mtView.verifiedLabel, "Last verified July 5, 2026", "the approved verification date");
  assert.equal(mtView.revalidationLabel, "Revalidation required after the expected September 1, 2026 release", "the dated gate");
  assert.ok(/later update notices/.test(mtView.revalidationNote ?? ""), "later notices must also be checked");
  assert.deepEqual(mtView.variationLabels, ["Association rules may vary"], "association implementation may vary");
  assert.equal(mtView.tone, "verified", "and it earns verified tone");
  assert.equal(mtView.degraded, false, "with nothing degraded");
  const allHosaText = HOSA_EVENTS.map((e) => allText(presentSourceFreshness(hosaSourceMetadata(e)))).join(" ") + " " + stripComments(hosaNav);
  assert.ok(!/every September|each September|annually on September|every year on September/i.test(allHosaText),
    "September 1 is never a permanent annual release rule");

  // ---- 14. no partial HOSA event inherits MT metadata --------------------------------------------------------------
  for (const e of HOSA_EVENTS.filter((e) => e.id !== "medical-terminology")) {
    const v = presentSourceFreshness(hosaSourceMetadata(e));
    assert.equal(v.authority, "partial", `${e.name} stays partial`);
    assert.equal(v.sourceLabel, null, `${e.name} claims no source label`);
    assert.equal(v.freshnessLabel, null, `${e.name} claims no season`);
    assert.equal(v.verifiedLabel, null, `${e.name} claims no verification date`);
    assert.equal(v.revalidationLabel, null, `${e.name} inherits no revalidation gate`);
    assert.equal(v.tone, "provisional", `${e.name} is never verified`);
  }

  // ---- 15. the family-level routing section is not an event and gains no verification ---------------------------------
  const famBlock = hosaNav.slice(hosaNav.indexOf("Don&apos;t see your event?"));
  assert.ok(!famBlock.includes("SourceFreshnessNote"), "the clinical-family routing section carries no source indicator");
  assert.ok(!famBlock.includes("hosaSourceMetadata"), "and derives no verification of its own");

  // ---- 16/17/18/19/20. DECA families -----------------------------------------------------------------------------------
  // M11R1 — these four assertions previously REQUIRED the fabricated DECA provenance
  // ("Official DECA source", "Current for 2025-26", "Last verified July 5, 2026", verified tone).
  // The season and source label had no support in the approved record and were removed, so the
  // expectations are inverted to the honest state rather than deleted: DECA must now fail closed.
  const series = presentSourceFreshness(decaSourceMetadata(decaFamilyById("individual-series")!));
  assert.equal(series.authority, "partial", "Individual Series projects partial provenance");
  assert.ok(!/Official/.test(series.authorityLabel), "and never an official label");
  assert.equal(series.freshnessLabel, null, "with no currency claim");
  assert.equal(series.verifiedLabel, null, "and no verification date");
  assert.equal(series.tone, "provisional", "and never verified tone");
  for (const id of ["principles-of-business-administration", "team-decision-making",
                    "personal-financial-literacy", "professional-selling-and-consulting"]) {
    const v = presentSourceFreshness(decaSourceMetadata(decaFamilyById(id)!));
    assert.equal(v.authority, "partial", `${id} projects partial provenance`);
    assert.equal(v.freshnessLabel, null, `${id} makes no currency claim`);
    assert.equal(v.verifiedLabel, null, `${id} shows no verification date`);
  }
  // DECA must not borrow HOSA's season or label through any path.
  for (const f of DECA_FAMILIES) {
    const t = allText(presentSourceFreshness(decaSourceMetadata(f)));
    for (const banned of ["2025-26", "competitive event guidelines", "Last verified", "Official"]) {
      assert.ok(!t.includes(banned), `${f.name} provenance must not contain ${JSON.stringify(banned)}`);
    }
  }
  // TDM's weighting stays unresolved and the indicator does not launder it into a clean badge.
  const tdm = decaFamilyById("team-decision-making")!;
  assert.equal(presentDecaFamily(tdm).facts.examWeightingNote, undefined, "TDM still shows no weighting");
  assert.ok(tdm.unresolvedFields?.some((f) => /weighting/i.test(f)), "TDM still names the unresolved weighting");
  assert.ok(decaNav.includes("DECA_TDM_WEIGHTING_NOTE"), "and the card still renders the conflict note");
  const psc = presentSourceFreshness(decaSourceMetadata(decaFamilyById("professional-selling-and-consulting")!));
  assert.equal(psc.authority, "partial", "PSC never renders as verified");
  assert.equal(psc.tone, "provisional", "PSC keeps provisional tone");
  for (const id of ["prepared-events", "written-events", "online-events"]) {
    const v = presentSourceFreshness(decaSourceMetadata(decaFamilyById(id)!));
    assert.equal(v.authority, "partial", `${id} stays partial`);
    assert.equal(v.verifiedLabel, null, `${id} gains no verification date`);
    assert.equal(v.freshnessLabel, null, `${id} gains no currency claim`);
  }
  const allDecaText = DECA_FAMILIES.map((f) => allText(presentSourceFreshness(decaSourceMetadata(f)))).join(" ") + " " + stripComments(decaNav);
  assert.ok(!/(publish|release)[a-z ]*(annually|every year|each year)/i.test(allDecaText), "no universal DECA annual publication date");
  assert.ok(!/September 1/.test(allDecaText), "DECA borrows no HOSA release date");

  // ---- 21. nothing universal is introduced ------------------------------------------------------------------------------
  const surfaces = [model, note, hosaNav, decaNav].map(stripComments).join("\n");
  for (const [label, pattern] of [["one-third formula", /one[- ]third|\b1\/3\b|33%/i], ["cut line", /cut ?line|top \d+ advance/i],
                                  ["advancement model", /will advance|automatically qualif/i], ["blazer rule", /must wear a blazer|blazer is required/i]] as const) {
    assert.ok(!pattern.test(surfaces), `no ${label} is introduced`);
  }

  // ---- 22/23/24. lesson provenance ---------------------------------------------------------------------------------------
  const cwi = getLesson("debate-claim-warrant-impact") ?? getLesson("claim-warrant-impact");
  const debateLesson = cwi ?? (() => { throw new Error("the Debate CWI lesson was not found"); })();
  const cwiView = presentSourceFreshness(debateLesson.provenance);
  assert.equal(cwiView.authority, "stable-teaching", "CWI is stable teaching material, not a current-rules source");
  assert.equal(cwiView.sourceLabel, "NSDA Debate Training Guide", "it names the specific Guide");
  assert.ok(/not a current-rules source/.test(cwiView.authorityLabel), "and says so in the label");
  assert.equal(cwiView.verifiedLabel, null, "no verification date is claimed for it");
  assert.ok(/one supported formulation rather than the only one/.test(debateLesson.provenanceNote), "CWI is not called the only official model");
  assert.ok(/Claim\/Data\/Warrant\/Impact/.test(debateLesson.provenanceNote), "the compatible four-part presentation is acknowledged");

  const deca = getRoleplayLesson("how-deca-roleplay-works")!;
  const decaView = presentSourceFreshness(deca.provenance);
  assert.equal(decaView.authority, "tier-2", "the DECA lesson is CompeteReady instruction");
  assert.ok(/not official competition rules/.test(decaView.authorityLabel), "labeled as not official");
  assert.ok(/five-part recommendation scaffold is ours/.test(deca.provenanceNote), "the scaffold is labeled as CompeteReady's");
  assert.ok(/controls timing, exam weighting, Performance Indicator count/.test(deca.provenanceNote), "official family rules are named as controlling");
  assert.ok(/not a specification for any one event/.test(deca.provenanceNote), "it is shared instruction, not an event spec");

  const hosaLesson = getRoleplayLesson("how-hosa-scenario-interaction-works")!;
  const hosaView = presentSourceFreshness(hosaLesson.provenance);
  assert.equal(hosaView.authority, "tier-2", "the HOSA lesson is CompeteReady instruction");
  for (const phrase of ["never teaches, scores, or simulates hands-on clinical procedures",
                        "does not create clinical readiness",
                        "Communication is one layer inside applicable clinical skill events",
                        "current official guideline and rating sheet control every rule",
                        "CompeteReady's own policy, not a HOSA rule"]) {
    assert.ok(hosaLesson.provenanceNote.includes(phrase), `the HOSA lesson provenance preserves: ${phrase}`);
  }

  // ---- 25. HOSA practice untouched ----------------------------------------------------------------------------------------
  assert.equal(hosaLesson.practiceStatus, "temporarily-unavailable", "HOSA practice remains withdrawn");
  assert.equal(hosaLesson.practice, undefined, "no practice or rubric was restored");
  const practice = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
  const unavailableFn = practice.slice(practice.indexOf("function PracticeUnavailable"), practice.indexOf("function PracticeStatusBar"));
  for (const banned of ["useState", "useEffect", "localStorage", "fetch(", "recordDrillMastery"]) {
    assert.ok(!unavailableFn.includes(banned), `the HOSA unavailable branch still mounts no ${banned}`);
  }

  // ---- 26/27. no internal IDs, no unsupported URLs -------------------------------------------------------------------------
  const learnerText = [...HOSA_EVENTS.map((e) => allText(presentSourceFreshness(hosaSourceMetadata(e)))),
                       ...DECA_FAMILIES.map((f) => allText(presentSourceFreshness(decaSourceMetadata(f)))),
                       allText(cwiView), allText(decaView), allText(hosaView)].join(" ");
  assert.ok(!/\b(HR-\d+|H\d+\b|D\d{1,2}\b|B-\d+|HV-\d+|DV-\d+)\b/.test(learnerText), "no internal proposal ID reaches a learner");
  assert.ok(!/https?:\/\//.test(learnerText), "no source URL is introduced — a label without a link is acceptable");
  assert.ok(!/https?:\/\//.test(stripComments(note)) && !/href=/.test(note), "the indicator component adds no link at all");

  // ---- 28. registry facts stay single-source ---------------------------------------------------------------------------------
  for (const [name, src] of [["the HOSA Navigator", hosaNav], ["the DECA Navigator", decaNav]] as const) {
    const code = stripComments(src);
    assert.ok(!/last verified \{/.test(code) && !/2026-07-05/.test(code), `${name} restates no verification date`);
    assert.ok(!/2025-26/.test(code), `${name} restates no season`);
  }
  assert.ok(hosaNav.includes("hosaSourceMetadata(record)") && decaNav.includes("decaSourceMetadata(record)"),
    "both Navigators derive metadata from their registry rather than assembling it");
  assert.ok(lessonView.includes("lesson.provenance") && rpView.includes("lesson.provenance"),
    "lesson renderers read provenance from lesson data");
  for (const [name, src] of [["the lesson view", lessonView], ["the role-play lesson view", rpView]] as const) {
    assert.ok(!/Debate Training Guide|CompeteReady authored lesson/.test(stripComments(src)), `${name} hardcodes no source label`);
  }
  // The decision layer is pure.
  const runtimeImports = model.split("\n").filter((l) => /^\s*import\s+(?!type\b)/.test(l));
  assert.equal(runtimeImports.length, 0, "the source/freshness model has no runtime imports");
  for (const banned of ["react", "next/", "fetch(", "localStorage", "@/lib/prisma", "recordDrillMastery"]) {
    assert.ok(!model.includes(banned), `the model does not use ${banned}`);
  }

  // ---- 34. track isolation ------------------------------------------------------------------------------------------------------
  assert.ok(!/DECA|Performance Indicator/i.test(stripComments(hosaNav)), "no DECA content in the HOSA Navigator");
  assert.ok(!/HOSA|Medical Terminology|clinical/i.test(stripComments(decaNav)), "no HOSA content in the DECA Navigator");
  assert.equal(hosaSourceMetadata(hosaEventById("medical-terminology")!).organization, "HOSA", "HOSA metadata is attributed to HOSA");
  assert.equal(decaSourceMetadata(decaFamilyById("individual-series")!).organization, "DECA", "DECA metadata is attributed to DECA");

  console.log(
    "Source/freshness smoke passed: one shared decision layer gates every provenance claim, and the shared indicator renders only what it allows. Official status requires a source label AND an organization; currency requires a season or a document version; a verification date must be a real ISO calendar day and is dropped otherwise; revalidation without a trigger never invents a date; and partial or unverified records can never acquire official wording, a currency claim, or verified tone. No machine code (verified-current, tier-2, awaiting-season-revalidation, sourceStatus) reaches a learner, and no internal proposal ID or unsupported URL does either. HOSA Medical Terminology shows Official HOSA source, Current for 2025-26, Last verified July 5, 2026, the dated September 1 2026 revalidation gate with later notices, and association variation — while every other HOSA event inherits none of it and September 1 is never stated as an annual rule. DECA Series, PBA and TDM keep their approved metadata; TDM's weighting stays unresolved and is not laundered into a clean badge; PSC and the prepared, written and online families stay partial. Debate CWI is labeled as the specific Guide's stable teaching material rather than NSDA's only model; the DECA lesson labels the five-part scaffold as CompeteReady's and defers to family rules; the HOSA lesson keeps its communication-only and no-clinical-readiness boundaries with practice still withdrawn. Seasons, dates and labels live only in registry and lesson data, and the model itself has no runtime imports."
  );
}

main();
