import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// M5 Phase A — device-local authored-lesson resume.
//
// Proves the persistence contract WITHOUT a browser: a minimal in-memory localStorage stub is
// installed on globalThis before the helper is imported, so every storage path (load / save / clear /
// reject / quota failure) is exercised directly. Component-level guarantees that cannot be expressed
// against the helper (hydration gate, no Side Coach on the persistence path, unavailable lessons
// touching no storage) are asserted against the component source, matching this repo's convention.

type StoreMap = Map<string, string>;

function installStorage(opts: { throwOnSet?: boolean; throwOnGet?: boolean } = {}) {
  const map: StoreMap = new Map();
  const storage = {
    getItem(key: string) {
      if (opts.throwOnGet) throw new Error("blocked");
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      if (opts.throwOnSet) throw new Error("QuotaExceededError");
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    }
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
  return map;
}

function removeStorage() {
  delete (globalThis as unknown as { window?: unknown }).window;
}

async function main() {
  // Install a storage stub BEFORE importing the helper (it reads `window` lazily, but keep it honest).
  let map = installStorage();

  const {
    AUTHORED_LESSON_PROGRESS_VERSION,
    MAX_STORED_RESPONSE_CHARS,
    authoredLessonProgressKey,
    isAuthoredLessonProgress,
    loadAuthoredLessonProgress,
    saveAuthoredLessonProgress,
    clearAuthoredLessonProgress,
    resolveRestoredIdentifyIndex,
    normalizeRestoredProgress,
    countResponseWords,
    MIN_MEANINGFUL_RESPONSE_WORDS
  } = await import("../lib/authored-lesson-progress");

  const SCOPE = "abc123def4567890";
  const SLUG = "how-deca-roleplay-works";
  const KEY = authoredLessonProgressKey(SCOPE, SLUG);

  // ---- key shape: versioned, user- and lesson-scoped, no PII -------------------------------------
  assert.ok(KEY.includes(`v${AUTHORED_LESSON_PROGRESS_VERSION}`), "key is versioned");
  assert.ok(KEY.includes(SCOPE) && KEY.includes(SLUG), "key is namespaced by user scope AND lesson slug");
  assert.ok(!/@|email|name/i.test(KEY), "key contains no name or email");

  // ---- 1. valid saved state restores every approved field ---------------------------------------
  const saved = saveAuthoredLessonProgress(SCOPE, SLUG, {
    phase: "respond",
    identifyIndex: 2,
    writeText: "I recommend a loyalty-suite buffer because it protects repeat bookings.",
    followText: "We would track repeat-booking rate quarter over quarter.",
    followUnlocked: true
  });
  assert.equal(saved, true, "save reports success when storage works");
  const restored = loadAuthoredLessonProgress(SCOPE, SLUG);
  assert.ok(restored, "valid state restores");
  assert.equal(restored!.phase, "respond", "restores phase");
  assert.equal(restored!.identifyIndex, 2, "restores identify index");
  assert.ok(restored!.writeText.startsWith("I recommend"), "restores first written response");
  assert.ok(restored!.followText.startsWith("We would track"), "restores follow-up response");
  assert.equal(restored!.followUnlocked, true, "restores follow-up-unlocked state");

  // ---- what is NOT persisted --------------------------------------------------------------------
  const rawStored = JSON.parse(map.get(KEY)!) as Record<string, unknown>;
  for (const banned of ["feedback", "strength", "improvement", "example", "correctCount", "selected", "revealed", "busy", "error", "completedAt", "completed", "mastery", "xp", "rating", "score"]) {
    assert.ok(!(banned in rawStored), `stored payload contains no ${banned}`);
  }
  assert.deepEqual(
    Object.keys(rawStored).sort(),
    ["followText", "followUnlocked", "identifyIndex", "phase", "slug", "updatedAt", "v", "writeText"],
    "stored payload is exactly the approved fields"
  );

  // ---- restored index is clamped to the authored question count -------------------------------
  assert.equal(resolveRestoredIdentifyIndex(2, 4), 2, "an in-range restored index is kept");
  assert.equal(resolveRestoredIdentifyIndex(9, 4), 3, "a stale index past the end clamps to the last question");
  assert.equal(resolveRestoredIdentifyIndex(-1, 4), 0, "a negative index falls back to the first question");
  assert.equal(resolveRestoredIdentifyIndex(2, 0), 0, "an empty question set falls back to 0");

  // ---- 2. invalid JSON is ignored safely ---------------------------------------------------------
  map.set(KEY, "{not json at all");
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "malformed JSON is ignored");
  assert.equal(map.has(KEY), false, "malformed entry is discarded, not left to fail repeatedly");

  // ---- 3. wrong schema version is ignored --------------------------------------------------------
  map.set(KEY, JSON.stringify({ v: 999, slug: SLUG, phase: "respond", identifyIndex: 0, writeText: "a", followText: "b", followUnlocked: false, updatedAt: Date.now() }));
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "wrong schema version is ignored");

  // ---- 4. wrong lesson slug is ignored -----------------------------------------------------------
  map.set(KEY, JSON.stringify({ v: AUTHORED_LESSON_PROGRESS_VERSION, slug: "how-hosa-scenario-interaction-works", phase: "respond", identifyIndex: 0, writeText: "a", followText: "b", followUnlocked: false, updatedAt: Date.now() }));
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "entry for another lesson is never applied");

  // ---- 5. oversized / invalid fields are rejected -------------------------------------------------
  const tooLong = "x".repeat(MAX_STORED_RESPONSE_CHARS + 1);
  map.set(KEY, JSON.stringify({ v: AUTHORED_LESSON_PROGRESS_VERSION, slug: SLUG, phase: "respond", identifyIndex: 0, writeText: tooLong, followText: "b", followUnlocked: false, updatedAt: Date.now() }));
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "oversized response is rejected on load");
  assert.equal(
    saveAuthoredLessonProgress(SCOPE, SLUG, { phase: "respond", identifyIndex: 0, writeText: tooLong, followText: "b", followUnlocked: false }),
    false,
    "oversized response is refused on save rather than silently truncated"
  );
  for (const bad of [
    { phase: "nonsense", identifyIndex: 0 },
    { phase: "respond", identifyIndex: -1 },
    { phase: "respond", identifyIndex: 1.5 }
  ]) {
    assert.equal(
      isAuthoredLessonProgress({ v: AUTHORED_LESSON_PROGRESS_VERSION, slug: SLUG, writeText: "a", followText: "b", followUnlocked: false, updatedAt: 1, ...bad }, SLUG),
      false,
      `validator rejects ${JSON.stringify(bad)}`
    );
  }
  assert.equal(isAuthoredLessonProgress(null, SLUG), false, "validator rejects null");
  assert.equal(isAuthoredLessonProgress("string", SLUG), false, "validator rejects a non-object");

  // ---- 7. storage failure degrades honestly -------------------------------------------------------
  removeStorage();
  map = installStorage({ throwOnSet: true });
  assert.equal(
    saveAuthoredLessonProgress(SCOPE, SLUG, { phase: "identify", identifyIndex: 0, writeText: "a", followText: "b", followUnlocked: false }),
    false,
    "save reports FAILURE when storage throws (drives the honest unsaved label)"
  );
  removeStorage();
  map = installStorage({ throwOnGet: true });
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "load survives a throwing storage");

  // SSR-safe: no `window` at all must not throw.
  removeStorage();
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "load is SSR-safe with no window");
  assert.equal(saveAuthoredLessonProgress(SCOPE, SLUG, { phase: "identify", identifyIndex: 0, writeText: "", followText: "", followUnlocked: false }), false, "save is SSR-safe with no window");
  assert.equal(clearAuthoredLessonProgress(SCOPE, SLUG), false, "clear is SSR-safe with no window");

  // ---- 8. reset clears ONLY this user + this lesson -------------------------------------------------
  map = installStorage();
  const OTHER_SCOPE = "0000111122223333";
  const OTHER_SLUG = "another-authored-lesson";
  saveAuthoredLessonProgress(SCOPE, SLUG, { phase: "respond", identifyIndex: 1, writeText: "mine", followText: "mine2", followUnlocked: true });
  saveAuthoredLessonProgress(OTHER_SCOPE, SLUG, { phase: "respond", identifyIndex: 1, writeText: "theirs", followText: "theirs2", followUnlocked: true });
  saveAuthoredLessonProgress(SCOPE, OTHER_SLUG, { phase: "identify", identifyIndex: 0, writeText: "other", followText: "other2", followUnlocked: false });
  map.set("unrelated-app-key", "keep me");
  assert.equal(map.size, 4, "three progress entries plus one unrelated key");
  clearAuthoredLessonProgress(SCOPE, SLUG);
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "reset cleared this user's entry for this lesson");
  assert.ok(loadAuthoredLessonProgress(OTHER_SCOPE, SLUG), "another ACCOUNT's entry for the same lesson survives");
  assert.ok(loadAuthoredLessonProgress(SCOPE, OTHER_SLUG), "the same account's OTHER lesson survives");
  assert.equal(map.get("unrelated-app-key"), "keep me", "unrelated app storage untouched");

  // ---- user isolation: two accounts never share an entry -------------------------------------------
  assert.notEqual(authoredLessonProgressKey(SCOPE, SLUG), authoredLessonProgressKey(OTHER_SCOPE, SLUG), "different accounts get different keys");

  removeStorage();

  // ================= M5A: resume-state normalization =================================================
  // The live phase union is exactly ["identify", "respond"] — both are AUTHORING phases and neither
  // depends on Side Coach feedback. Normalization therefore (a) closes a real hole in `followUnlocked`
  // and (b) makes resume forward-safe if the union ever grows a feedback/results/submitting phase.
  const QCOUNT = 4;
  const GOOD_FIRST = "I recommend a loyalty-tier suite buffer because it protects our repeat bookings.";
  const GOOD_FOLLOW = "I would track the repeat-booking rate quarter over quarter to prove it works.";
  const SHORT = "too short";
  assert.ok(countResponseWords(GOOD_FIRST) >= MIN_MEANINGFUL_RESPONSE_WORDS, "fixture: first response passes the gate");
  assert.ok(countResponseWords(SHORT) < MIN_MEANINGFUL_RESPONSE_WORDS, "fixture: short response fails the gate");

  // 1 + 2. Every phase value is covered; safe authoring phases restore directly.
  for (const safePhase of ["identify", "respond"] as const) {
    const n = normalizeRestoredProgress(
      { phase: safePhase, identifyIndex: 2, writeText: GOOD_FIRST, followText: GOOD_FOLLOW, followUnlocked: true },
      QCOUNT
    );
    assert.equal(n.phase, safePhase, `safe authoring phase "${safePhase}" restores directly`);
    assert.equal(n.normalizedPhase, false, `"${safePhase}" is not treated as unsafe`);
  }

  // 3. A feedback/results/submitting phase NEVER restores as-is (it has no persisted feedback).
  for (const unsafePhase of ["feedback", "results", "submitting", "loading", "complete", "completed", "", "IDENTIFY", 7, null, undefined]) {
    const n = normalizeRestoredProgress(
      { phase: unsafePhase, identifyIndex: 1, writeText: GOOD_FIRST, followText: GOOD_FOLLOW, followUnlocked: true },
      QCOUNT
    );
    assert.ok(n.phase === "identify" || n.phase === "respond", `phase ${JSON.stringify(unsafePhase)} normalizes to an authoring phase`);
    assert.equal(n.normalizedPhase, true, `phase ${JSON.stringify(unsafePhase)} is flagged as normalized`);
  }

  // 4. Both valid responses survive normalization, and the learner lands where fresh feedback can be
  //    requested again (respond + follow-up unlocked).
  const fromFeedback = normalizeRestoredProgress(
    { phase: "feedback", identifyIndex: 3, writeText: GOOD_FIRST, followText: GOOD_FOLLOW, followUnlocked: true },
    QCOUNT
  );
  assert.equal(fromFeedback.phase, "respond", "a feedback phase with both valid responses returns to the final authoring phase");
  assert.equal(fromFeedback.followUnlocked, true, "the learner can request fresh coaching again");
  assert.equal(fromFeedback.writeText, GOOD_FIRST, "first response survives normalization verbatim");
  assert.equal(fromFeedback.followText, GOOD_FOLLOW, "follow-up response survives normalization verbatim");

  // 5. A too-short/missing first response can NEVER restore the follow-up as unlocked.
  for (const firstResponse of [SHORT, "", "   "]) {
    const n = normalizeRestoredProgress(
      { phase: "respond", identifyIndex: 0, writeText: firstResponse, followText: GOOD_FOLLOW, followUnlocked: true },
      QCOUNT
    );
    assert.equal(n.followUnlocked, false, "a stored follow-up unlock is withdrawn when the first response fails the gate");
    assert.equal(n.withdrewFollowUnlock, true, "the withdrawal is reported");
    assert.equal(n.followText, GOOD_FOLLOW, "the learner's follow-up text is still preserved, only the unlock is withdrawn");
  }

  // 6. An unsafe phase without a sufficient first response falls back to the earliest authoring phase.
  const fromFeedbackShort = normalizeRestoredProgress(
    { phase: "results", identifyIndex: 2, writeText: SHORT, followText: "", followUnlocked: true },
    QCOUNT
  );
  assert.equal(fromFeedbackShort.phase, "identify", "an unsafe phase without a valid first response falls back to the earliest authoring phase");
  assert.equal(fromFeedbackShort.followUnlocked, false, "and the follow-up stays locked");

  // followUnlocked can never survive the identify phase (an impossible combination).
  assert.equal(
    normalizeRestoredProgress({ phase: "identify", identifyIndex: 0, writeText: GOOD_FIRST, followText: "", followUnlocked: true }, QCOUNT).followUnlocked,
    false,
    "follow-up unlock is impossible during the identify phase"
  );

  // Cross-field: an out-of-range index never reads past the end.
  // M11R2 CHANGED THIS EXPECTATION: it used to require clamping to QCOUNT - 1. A "feedback" phase
  // normalizes to `identify` (SHORT does not meet the gate), and a resumed identify phase now
  // RESTARTS at 0 rather than resuming mid-exercise with an unknowable score. The pure clamp is
  // still exercised directly below, so nothing about the out-of-range guarantee was lost.
  const outOfRange = normalizeRestoredProgress({ phase: "feedback", identifyIndex: 99, writeText: SHORT, followText: "", followUnlocked: false }, QCOUNT);
  assert.equal(outOfRange.phase, "identify", "an unsafe phase with no meaningful first response lands in identify");
  assert.equal(outOfRange.identifyIndex, 0, "and a resumed identify phase restarts at question zero");
  assert.equal(outOfRange.identifyRestartedForScore, true, "the restart is reported so the learner can be told why");
  assert.equal(resolveRestoredIdentifyIndex(99, QCOUNT), QCOUNT - 1, "the pure clamp still bounds an out-of-range index");
  assert.equal(normalizeRestoredProgress({ phase: "respond", identifyIndex: -5, writeText: GOOD_FIRST, followText: "", followUnlocked: false }, QCOUNT).identifyIndex, 0, "a negative index normalizes to 0");

  // ---- M11R2: a resumed quick check never shows a score it cannot justify ---------------------------
  // 3/4/5. index 0 resumes untouched; index > 0 restarts; no correct count is ever invented.
  const at0 = normalizeRestoredProgress({ phase: "identify", identifyIndex: 0, writeText: "", followText: "", followUnlocked: false }, QCOUNT);
  assert.equal(at0.identifyIndex, 0, "a stored identify phase at question zero restores at zero");
  assert.equal(at0.identifyRestartedForScore, false, "and reports no restart, because nothing was lost");
  for (const idx of [1, 2, QCOUNT - 1, 99]) {
    const r = normalizeRestoredProgress({ phase: "identify", identifyIndex: idx, writeText: "", followText: "", followUnlocked: false }, QCOUNT);
    assert.equal(r.identifyIndex, 0, `a stored identify phase at ${idx} restarts at zero`);
    assert.equal(r.identifyRestartedForScore, true, `and the restart at ${idx} is reported`);
    assert.ok(!("correctCount" in r) && !("score" in r), "normalization never produces a correct count or score");
  }
  // 7/8/9/10. a respond-phase restore keeps its work and is NOT sent back through the quick check.
  const resumedRespond = normalizeRestoredProgress(
    { phase: "respond", identifyIndex: 3, writeText: GOOD_FIRST, followText: "A follow-up answer that is clearly long enough to count.", followUnlocked: true },
    QCOUNT
  );
  assert.equal(resumedRespond.phase, "respond", "a restored respond phase stays in respond");
  assert.equal(resumedRespond.identifyIndex, 3, "and is NOT rewound through the quick check to rebuild a score");
  assert.equal(resumedRespond.identifyRestartedForScore, false, "so it reports no quick-check restart");
  assert.equal(resumedRespond.writeText, GOOD_FIRST, "the first response survives verbatim");
  assert.ok(resumedRespond.followText.startsWith("A follow-up answer"), "the follow-up survives verbatim");
  assert.equal(resumedRespond.followUnlocked, true, "and the unlock is re-derived through the shared gate");
  // 21. a hand-edited index cannot manufacture a score or a shortcut.
  const handEdited = normalizeRestoredProgress({ phase: "identify", identifyIndex: 999999, writeText: "", followText: "", followUnlocked: true }, QCOUNT);
  assert.equal(handEdited.identifyIndex, 0, "a hand-edited index cannot skip the quick check");
  assert.equal(handEdited.followUnlocked, false, "nor unlock the follow-up");
  assert.equal(Object.keys(handEdited).sort().join(","),
    ["followText", "followUnlocked", "identifyIndex", "identifyRestartedForScore", "normalizedPhase", "phase", "withdrewFollowUnlock", "writeText"].join(","),
    "the normalizer's result shape carries no score-bearing field");
  // 20. restarting converges: re-normalizing the value that would be written back is a fixed point.
  const rewritten = normalizeRestoredProgress({ phase: at0.phase, identifyIndex: 0, writeText: "", followText: "", followUnlocked: false }, QCOUNT);
  assert.equal(rewritten.identifyIndex, 0, "the normalized index is a fixed point — no hydrate/write loop");
  assert.equal(rewritten.identifyRestartedForScore, false, "and the restart notice does not re-fire on the next load");

  // 8. Normalization records nothing: its result carries no completion/mastery/score/progress field.
  const shape = Object.keys(fromFeedback).sort();
  // M11R2 added `identifyRestartedForScore`: a boolean saying the quick check restarted so the UI can
  // explain why. It is navigation/notice state, not a score — and it is never persisted (asserted
  // against the stored payload elsewhere in this suite).
  assert.deepEqual(
    shape,
    ["followText", "followUnlocked", "identifyIndex", "identifyRestartedForScore", "normalizedPhase", "phase", "withdrewFollowUnlock", "writeText"],
    "normalization returns navigation state only — no completion, mastery, XP, score, rating or progress"
  );
  for (const [k, v] of Object.entries(fromFeedback)) {
    if (k === "identifyIndex") continue; // navigation position, not a result
    assert.notEqual(typeof v, "number", `no normalized field carries a number that could read as a score: ${k}`);
  }

  // 9. Invalid phase strings are rejected at the STORAGE boundary too (defence in depth).
  map = installStorage();
  map.set(authoredLessonProgressKey(SCOPE, SLUG), JSON.stringify({ v: AUTHORED_LESSON_PROGRESS_VERSION, slug: SLUG, phase: "feedback", identifyIndex: 0, writeText: GOOD_FIRST, followText: GOOD_FOLLOW, followUnlocked: true, updatedAt: Date.now() }));
  assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG), null, "an entry with a non-authoring phase is rejected and discarded by the validator");
  removeStorage();

  // ================= end-to-end reload cycle (headless simulation) ===================================
  // Mirrors the component's lifecycle without a browser: the auth-gated lesson route and the
  // TCC-blocked preview helper prevent a real click-through here, so this exercises the exact
  // load/save/clear paths the component calls, in the same order.
  map = installStorage();
  const CYCLE_SLUG = "how-deca-roleplay-works";
  const QUESTION_COUNT = 4;

  // (1) fresh open — nothing saved yet, so the lesson starts from its authored initial state.
  assert.equal(loadAuthoredLessonProgress(SCOPE, CYCLE_SLUG), null, "reload cycle: fresh open has no saved state");

  // (2) learner advances one identify step, then (3) types both responses. Each change is a save.
  saveAuthoredLessonProgress(SCOPE, CYCLE_SLUG, { phase: "identify", identifyIndex: 1, writeText: "", followText: "", followUnlocked: false });
  const FIRST = "I recommend we hold a small buffer of loyalty-tier suites so this cannot repeat.";
  const SECOND = "Because the repeat-booking rate is what the owner actually watches quarter to quarter.";
  saveAuthoredLessonProgress(SCOPE, CYCLE_SLUG, { phase: "respond", identifyIndex: 3, writeText: FIRST, followText: SECOND, followUnlocked: true });

  // (4) RELOAD — the component's mount effect loads and applies, clamping the index.
  const afterReload = loadAuthoredLessonProgress(SCOPE, CYCLE_SLUG);
  assert.ok(afterReload, "reload cycle: saved state survives a reload");
  assert.equal(afterReload!.phase, "respond", "reload cycle: phase restores");
  assert.equal(resolveRestoredIdentifyIndex(afterReload!.identifyIndex, QUESTION_COUNT), 3, "reload cycle: identify index restores");
  assert.equal(afterReload!.writeText, FIRST, "reload cycle: first response restores exactly");
  assert.equal(afterReload!.followText, SECOND, "reload cycle: follow-up response restores exactly");
  assert.equal(afterReload!.followUnlocked, true, "reload cycle: follow-up-unlocked state restores");

  // (6) AI feedback must NOT come back — the learner asks for fresh coaching after a reload.
  assert.ok(!("feedback" in (afterReload as unknown as Record<string, unknown>)), "reload cycle: no AI feedback is restored");

  // (8) reset, then (9) reload again -> (10) authored initial state.
  clearAuthoredLessonProgress(SCOPE, CYCLE_SLUG);
  assert.equal(loadAuthoredLessonProgress(SCOPE, CYCLE_SLUG), null, "reload cycle: after reset, a reload starts from the authored initial state");

  // ---- reload AFTER reaching coaching feedback -----------------------------------------------
  // Construct the state that would exist at the moment feedback is on screen, reload, and confirm
  // the learner comes back to a safe authoring phase with their work intact and no result implied.
  saveAuthoredLessonProgress(SCOPE, CYCLE_SLUG, { phase: "respond", identifyIndex: 3, writeText: FIRST, followText: SECOND, followUnlocked: true });
  const atFeedback = loadAuthoredLessonProgress(SCOPE, CYCLE_SLUG);
  assert.ok(atFeedback, "reload-after-feedback: the authored work is still stored");
  // Simulate a stored phase that depends on the non-persisted feedback object.
  const afterFeedbackReload = normalizeRestoredProgress(
    { phase: "feedback", identifyIndex: atFeedback!.identifyIndex, writeText: atFeedback!.writeText, followText: atFeedback!.followText, followUnlocked: atFeedback!.followUnlocked },
    QUESTION_COUNT
  );
  assert.equal(afterFeedbackReload.writeText, FIRST, "reload-after-feedback: first response remains");
  assert.equal(afterFeedbackReload.followText, SECOND, "reload-after-feedback: follow-up response remains");
  assert.ok(!("feedback" in (afterFeedbackReload as unknown as Record<string, unknown>)), "reload-after-feedback: feedback is absent");
  assert.equal(afterFeedbackReload.phase, "respond", "reload-after-feedback: returns to a safe phase where feedback can be requested again");
  assert.equal(afterFeedbackReload.followUnlocked, true, "reload-after-feedback: the feedback request is available again");
  assert.equal(afterFeedbackReload.normalizedPhase, true, "reload-after-feedback: the unsafe phase was normalized, not restored");
  // 7. No normalization path can fire a request: the helper module imports nothing and calls no fetch.
  const helperSrc = readFileSync("lib/authored-lesson-progress.ts", "utf8");
  for (const banned of ["fetch(", "side-coach", "XMLHttpRequest", "sendBeacon", "recordDrillMastery", "completedAt"]) {
    assert.ok(!helperSrc.includes(banned), `the persistence/normalization helper never uses ${banned}`);
  }
  // No module imports at all: the helper is self-contained, so it cannot reach a network or DB layer.
  const helperImports = helperSrc.split("\n").filter((line) => /^\s*(import|require)\b/.test(line));
  assert.equal(helperImports.length, 0, "the helper imports nothing — it cannot reach a network, DB, or AI module");

  // (11) the withdrawn HOSA lesson never touches storage at all.
  const beforeHosa = map.size;
  assert.equal(loadAuthoredLessonProgress(SCOPE, "how-hosa-scenario-interaction-works"), null, "reload cycle: no stored entry exists for the withdrawn HOSA lesson");
  assert.equal(map.size, beforeHosa, "reload cycle: probing the withdrawn lesson wrote nothing");
  removeStorage();

  // ================= component-source guarantees =====================================================
  const practice = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");

  // 6. the hydration gate: no save effect may run before a load attempt has completed.
  assert.ok(practice.includes("if (!hydrated || !userScope) return;"), "save effect is gated on hydration — empty initial state cannot overwrite saved work");
  assert.ok(practice.includes("setHydrated(true)"), "hydration completes explicitly after the load attempt");

  // 9. an unavailable lesson performs no storage access at all.
  const unavailableFn = practice.slice(practice.indexOf("function PracticeUnavailable"), practice.indexOf("function ActiveRoleplayPractice"));
  for (const banned of ["localStorage", "loadAuthoredLessonProgress", "saveAuthoredLessonProgress", "clearAuthoredLessonProgress", "useState", "useEffect", "fetch("]) {
    assert.ok(!unavailableFn.includes(banned), `unavailable practice does not use ${banned}`);
  }
  assert.ok(practice.includes('if (lesson.practiceStatus !== "available")'), "the unavailable branch is taken before any active-practice hook mounts");

  // 10/11. the persistence path never records anything beyond local resume.
  for (const banned of ["recordDrillMastery", "@/lib/prisma", "@/lib/spaced-review", "completedAt", "/api/skills", "/api/debates"]) {
    assert.ok(!practice.includes(banned), `practice component never references ${banned}`);
  }
  // Regex-free: inspect the actual save call site and assert no feedback field is passed.
  const saveCallIdx = practice.indexOf("saveAuthoredLessonProgress(userScope, lesson.slug, {");
  assert.ok(saveCallIdx > 0, "the save call site is present");
  const saveCall = practice.slice(saveCallIdx, saveCallIdx + 400);
  for (const banned of ["feedback", "strength", "improvement", "example", "correctCount"]) {
    assert.ok(!saveCall.includes(banned), `the save call passes no ${banned}`);
  }
  assert.ok(practice.includes("/api/ai/side-coach"), "the Side Coach call still exists (unchanged) for the available lesson");
  // The Side Coach request must not sit inside the persistence effect.
  const saveEffect = practice.slice(practice.indexOf("if (!hydrated || !userScope) return;"), practice.indexOf("const resetPractice"));
  assert.ok(!saveEffect.includes("fetch("), "the save effect issues no network request");

  // Honest labelling, conveyed by text (never colour alone).
  assert.ok(practice.includes("Saved on this device"), "honest saved-on-this-device label present");
  assert.ok(practice.includes("Progress is not being saved on this device"), "honest unsaved label present");
  assert.ok(practice.includes("not synced"), "label states it is not synced to another device");
  assert.ok(/not a score, a competition result, or mastery/.test(practice), "label denies score/competition/mastery meaning");
  assert.ok(practice.includes("Start this practice over"), "local reset action present");

  // ============ M11R10: the follow-up unlock is EARNED, not re-derived on restore ============
  // The live UI earns it by an explicit Continue click that is enabled only once the first response
  // passes the shared word gate. Restore must honour that recorded decision, never manufacture it.
  {
    const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
    const AT_GATE = words(MIN_MEANINGFUL_RESPONSE_WORDS);
    const BELOW_GATE = words(MIN_MEANINGFUL_RESPONSE_WORDS - 1);
    const ABOVE_GATE = words(MIN_MEANINGFUL_RESPONSE_WORDS + 5);
    const restore = (over: Record<string, unknown>) =>
      normalizeRestoredProgress(
        { phase: "respond", identifyIndex: 0, writeText: AT_GATE, followText: "", followUnlocked: false, ...over },
        3
      );

    // 1-4. A stored FALSE stays false however good the writing is — typing is not earning.
    for (const [label, writeText] of [["at the gate", AT_GATE], ["above the gate", ABOVE_GATE]] as const) {
      const out = restore({ writeText, followUnlocked: false });
      assert.equal(out.followUnlocked, false, `a never-clicked unlock stays locked (${label})`);
      assert.equal(out.withdrewFollowUnlock, false, `and reports no withdrawal (${label})`);
    }

    // 5-6. A stored TRUE with a response that still passes restores unlocked.
    for (const [label, writeText] of [["at the gate", AT_GATE], ["above the gate", ABOVE_GATE]] as const) {
      const out = restore({ writeText, followUnlocked: true });
      assert.equal(out.followUnlocked, true, `an explicitly earned unlock survives restore (${label})`);
      assert.equal(out.withdrewFollowUnlock, false, `with no withdrawal notice (${label})`);
    }

    // 7-8, 10. A stored TRUE is withdrawn when the gate or the phase no longer supports it.
    for (const [label, over] of [
      ["one word below the gate", { writeText: BELOW_GATE }],
      ["whitespace-only", { writeText: "   \n\t  " }],
      ["an empty first response", { writeText: "" }],
      ["a non-response phase", { phase: "identify" }]
    ] as const) {
      const out = restore({ ...over, followUnlocked: true });
      assert.equal(out.followUnlocked, false, `a stored unlock is withdrawn with ${label}`);
      assert.equal(out.withdrewFollowUnlock, true, `and the withdrawal is reported with ${label}`);
    }

    // 9. Punctuation-only. M11R10 recorded this as a known limitation of the shared token counter;
    // M11R11 corrected the counter itself, so punctuation is now zero words on BOTH paths.
    const punctuation = ". , ; ! ? - -- ... :";
    assert.ok(punctuation.trim().split(/\s+/).filter(Boolean).length >= MIN_MEANINGFUL_RESPONSE_WORDS,
      "control: the fixture really is 8+ whitespace-separated pieces (the old counter passed it)");
    assert.equal(countResponseWords(punctuation), 0, "punctuation-only text contains no words");
    assert.equal(restore({ writeText: punctuation, followUnlocked: true }).followUnlocked, false,
      "so a stored unlock over punctuation-only text is withdrawn");
    assert.equal(restore({ writeText: punctuation, followUnlocked: true }).withdrewFollowUnlock, true,
      "and the withdrawal is reported");
    assert.equal(restore({ writeText: punctuation, followUnlocked: false }).followUnlocked, false,
      "and it still cannot unlock without the recorded click");

    // 11-12. withdrewFollowUnlock reports ONLY a stored true that normalization had to reject.
    assert.equal(restore({ writeText: BELOW_GATE, followUnlocked: false }).withdrewFollowUnlock, false,
      "a stored false never produces a withdrawal notice");

    // 13. Default/reset progress is locked and quiet.
    const fresh = restore({ phase: "identify", identifyIndex: 0, writeText: "", followText: "", followUnlocked: false });
    assert.equal(fresh.followUnlocked, false, "reset/default progress is locked");
    assert.equal(fresh.withdrewFollowUnlock, false, "with no withdrawal notice");

    // 14. Unlock cannot cross lessons: the store is keyed per scope AND slug.
    map = installStorage();
    saveAuthoredLessonProgress(SCOPE, SLUG, { phase: "respond", identifyIndex: 0, writeText: AT_GATE, followText: "", followUnlocked: true });
    saveAuthoredLessonProgress(SCOPE, "how-hosa-scenario-interaction-works",
      { phase: "respond", identifyIndex: 0, writeText: AT_GATE, followText: "", followUnlocked: false });
    assert.equal(loadAuthoredLessonProgress(SCOPE, SLUG)!.followUnlocked, true, "lesson A keeps its earned unlock");
    assert.equal(loadAuthoredLessonProgress(SCOPE, "how-hosa-scenario-interaction-works")!.followUnlocked, false,
      "lesson B does not inherit it");

    // 15-17. Normalization is pure, and the learner's own text is never altered.
    const input = { phase: "respond", identifyIndex: 0, writeText: AT_GATE, followText: "my follow-up", followUnlocked: true };
    const snapshot = JSON.stringify(input);
    const out = normalizeRestoredProgress({ ...input }, 3);
    assert.equal(JSON.stringify(input), snapshot, "normalization does not mutate its input");
    assert.equal(out.writeText, AT_GATE, "the first response survives verbatim");
    assert.equal(out.followText, "my follow-up", "and so does the follow-up text");

    // ---- Non-vacuous controls ----
    // The pre-fix formula, evaluated on the SAME fixture, unlocks it. The production normalizer does not.
    const preFix = (phase: string, writeText: string) =>
      phase === "respond" && countResponseWords(writeText) >= MIN_MEANINGFUL_RESPONSE_WORDS;
    assert.equal(preFix("respond", AT_GATE), true, "control: the pre-fix formula unlocks a never-clicked fixture");
    assert.equal(restore({ writeText: AT_GATE, followUnlocked: false }).followUnlocked, false,
      "control: the corrected production normalizer keeps that same fixture locked");
    assert.equal(restore({ writeText: AT_GATE, followUnlocked: true }).followUnlocked, true,
      "control: flipping ONLY the stored flag restores it unlocked");
    assert.equal(restore({ writeText: BELOW_GATE, followUnlocked: true }).followUnlocked, false,
      "control: dropping ONLY the response below the gate withdraws it");
    // The production source no longer contains the derived-only formula.
    const normalizerSrc = readFileSync("lib/authored-lesson-progress.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    assert.ok(!/followUnlocked\s*=\s*phase === "respond" && firstResponseIsMeaningful/.test(normalizerSrc),
      "control: the derived-only formula is gone from production code");
    assert.ok(/followUnlocked\s*=\s*storedUnlock && phase === "respond" && firstResponseIsMeaningful/.test(normalizerSrc),
      "and the stored decision is the source of truth");
    // 20. The component's Continue gate is still the same shared condition.
    const practiceSrc = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
    assert.ok(/disabled=\{wordCount\(writeText\) < MIN_RESPONSE_WORDS\}/.test(practiceSrc),
      "the explicit Continue button still uses the shared word gate");
    assert.ok(practiceSrc.includes("const MIN_RESPONSE_WORDS = MIN_MEANINGFUL_RESPONSE_WORDS;"),
      "and that gate is the same production constant");
    // 19. HOSA authored practice remains inert.
    const { getRoleplayLesson } = await import("../lib/roleplay-lessons");
    assert.equal(getRoleplayLesson("how-hosa-scenario-interaction-works")!.practiceStatus, "temporarily-unavailable",
      "HOSA authored practice remains unavailable");
  }

  // ============ M11R11: the gate counts WORD-LIKE tokens, on one shared helper ============
  {
    const passes = (t: string) => countResponseWords(t) >= MIN_MEANINGFUL_RESPONSE_WORDS;
    const oldCounter = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

    // 13-14. The threshold itself is unchanged.
    assert.equal(MIN_MEANINGFUL_RESPONSE_WORDS, 8, "the threshold remains exactly eight");
    assert.equal(countResponseWords("one two three four five six seven eight"), 8, "eight ordinary words count as eight");
    assert.ok(passes("one two three four five six seven eight"), "and pass");
    assert.ok(!passes("one two three four five six seven"), "seven ordinary words stay below the threshold");

    // 15-17. Non-word input counts as nothing.
    for (const [label, text] of [
      ["whitespace-only", "   \n\t  "],
      ["punctuation-only", ". , ; ! ? - -- ... :"],
      ["bracket/symbol-only", "[ ] { } ( ) < > / \\ | @"],
      ["emoji-only", "🙂 🎉 ✅ ❤️ 🚀 ⭐ 🔥 💡"]
    ] as const) {
      assert.equal(countResponseWords(text), 0, `${label} input counts as zero words`);
      assert.ok(!passes(text), `${label} input cannot satisfy the gate`);
    }

    // 18-22. Real words survive punctuation, and the token rules are explicit.
    assert.equal(countResponseWords("Yes, we do — and I recommend it, truly."), 8,
      "punctuation attached to real words does not erase them");
    assert.equal(countResponseWords("don't"), 1, "a contraction is one word");
    assert.equal(countResponseWords("evidence-based"), 1, "a hyphenated term is one word");
    assert.equal(countResponseWords("café niño über señor αβγ"), 5, "unicode alphabetic words count");
    // Digits count: the authored rubric asks for metrics and costs, and the production evidence
    // helper already treats a digit as word-like.
    assert.equal(countResponseWords("15% 2026 $40"), 3, "numeric tokens count as words");
    assert.equal(countResponseWords(" — hello , world ; 15% ... "), 3, "mixed input counts only word-like tokens");

    // 23-25. ONE helper serves both paths.
    const practiceSrc = readFileSync("components/lessons/roleplay-lesson-practice.tsx", "utf8");
    assert.ok(/const wordCount = countResponseWords;/.test(practiceSrc),
      "the live Continue gate uses the shared production helper");
    assert.ok(practiceSrc.includes('from "@/lib/authored-lesson-progress"'), "imported from the shared module");
    const progressSrc = readFileSync("lib/authored-lesson-progress.ts", "utf8");
    assert.equal((progressSrc.match(/export function countResponseWords/g) ?? []).length, 1,
      "exactly one token-count implementation exists");
    assert.ok(/firstResponseIsMeaningful = countResponseWords\(writeText\) >= MIN_MEANINGFUL_RESPONSE_WORDS/.test(progressSrc),
      "and restore normalization uses that same helper and threshold");
    assert.ok(!/split\(\/\\s\+\/\)\.filter\(Boolean\)\.length/.test(progressSrc.replace(/\/\/[^\n]*/g, " ")),
      "the raw whitespace-chunk counter is gone from production");

    // 26-33. The unlock contract holds under the corrected gate.
    const eightWords = "one two three four five six seven eight";
    const sevenWords = "one two three four five six seven";
    const punct = ". , ; ! ? - -- ... :";
    const norm = (writeText: string, followUnlocked: boolean) =>
      normalizeRestoredProgress({ phase: "respond", identifyIndex: 0, writeText, followText: "keep me", followUnlocked }, 3);
    assert.equal(norm(punct, false).followUnlocked, false, "stored false + punctuation stays locked");
    assert.equal(norm(punct, true).followUnlocked, false, "stored true + punctuation is withdrawn");
    assert.equal(norm(punct, true).withdrewFollowUnlock, true, "and reported");
    assert.equal(norm(eightWords, false).followUnlocked, false, "stored false + eight real words stays locked");
    assert.equal(norm(eightWords, false).withdrewFollowUnlock, false, "with no false withdrawal notice");
    assert.equal(norm(eightWords, true).followUnlocked, true, "stored true + eight real words restores unlocked");
    assert.equal(norm(sevenWords, true).followUnlocked, false, "stored true + seven words is withdrawn");
    assert.equal(norm(eightWords, true).followText, "keep me", "learner text is never rewritten");
    assert.equal(norm(punct, true).writeText, punct, "and neither is a rejected first response");

    // ---- Non-vacuous controls ----
    assert.ok(oldCounter(punct) >= MIN_MEANINGFUL_RESPONSE_WORDS,
      "control: the OLD whitespace-split formula counted the punctuation fixture as 8+");
    assert.equal(countResponseWords(punct), 0, "control: the corrected production helper counts it as zero");
    assert.ok(passes(eightWords) && !passes(sevenWords), "control: eight pass, seven fail");
    assert.equal(countResponseWords("one two three four five six seven ---"), 7,
      "control: replacing one word with punctuation drops the count");
  }

  console.log(
    "Lesson-progress smoke passed: M5 device-local resume (versioned user+lesson key, no PII), approved-fields-only payload, restore of phase/index/both responses/unlock, rejection of malformed JSON + wrong version + wrong slug + oversized fields, SSR-safe and throw-safe storage, honest save-failure reporting, reset scoped to one user+lesson, hydration gate, no mastery/server/Side-Coach writes on the persistence path, and unavailable lessons touching no storage; PLUS M5A resume normalization (every phase value covered, non-authoring phases never restored, both responses preserved, follow-up unlock only when earned, index clamped, navigation-only result, no request on any normalization path)."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
