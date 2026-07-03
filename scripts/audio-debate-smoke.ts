/**
 * Audio-debate / accessibility smoke test (pure logic + source integration checks — no browser).
 * Run with: npm run audio-debate:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  accessibilityFrameClass,
  accessibilityTextClass,
  DEFAULT_ACCESSIBILITY,
  normalizeAccessibility,
  resolveSpeechParams,
  splitDebateSections,
  VOICE_STYLES
} from "../lib/accessibility";

function main() {
  // Voice styles map to safe SpeechSynthesis rate/pitch for every rate setting.
  for (const style of VOICE_STYLES) {
    for (const rate of ["slow", "normal", "fast"] as const) {
      const params = resolveSpeechParams(style.id, rate);
      assert.ok(params.rate >= 0.5 && params.rate <= 1.6, `rate in range for ${style.id}/${rate}`);
      assert.ok(params.pitch >= 0.6 && params.pitch <= 1.4, `pitch in range for ${style.id}`);
    }
  }

  // Calm defaults (no autoplay, normal rate) and safe normalization of bad input.
  assert.equal(DEFAULT_ACCESSIBILITY.audioAutoplay, false, "autoplay off by default");
  assert.equal(DEFAULT_ACCESSIBILITY.speechRate, "normal", "normal rate by default");
  const normalized = normalizeAccessibility({ speechRate: "hyper", voiceStyle: "celebrity", largerText: true });
  assert.equal(normalized.speechRate, "normal", "invalid rate falls back");
  assert.equal(normalized.voiceStyle, "calm-coach", "invalid voice falls back (no celebrity voices)");
  assert.equal(normalized.largerText, true, "valid setting is kept");

  // Frame classes (root) reflect high contrast + reduced motion.
  assert.equal(accessibilityFrameClass(DEFAULT_ACCESSIBILITY), "", "no frame classes by default");
  const framed = accessibilityFrameClass({ ...DEFAULT_ACCESSIBILITY, highContrast: true, reducedMotion: true });
  assert.ok(/contrast-125/.test(framed), "high contrast class applied");
  assert.ok(/transition-none/.test(framed), "reduced motion disables transitions");

  // Text classes reflect dyslexia / larger text / spacing.
  assert.equal(accessibilityTextClass(DEFAULT_ACCESSIBILITY), "", "no text classes by default");
  const textCls = accessibilityTextClass({ ...DEFAULT_ACCESSIBILITY, dyslexiaFont: true, largerText: true, lineSpacing: true });
  assert.ok(/word-spacing/.test(textCls), "dyslexia spacing applied");
  assert.ok(/text-base|text-lg/.test(textCls), "larger text applied");
  assert.ok(/leading-8/.test(textCls), "line spacing applied");

  // Section splitting: plain text stays one block; labeled text chunks — content preserved verbatim.
  const single = splitDebateSections("Just one plain paragraph without headers.");
  assert.equal(single.length, 1, "plain text is a single block");
  assert.equal(single[0].label, "Speech", "single block labeled Speech");
  const chunked = splitDebateSections("Claim: We should act.\nEvidence: A study shows X.\nImpact: Lives improve.");
  assert.deepEqual(chunked.map((s) => s.label), ["Claim", "Evidence", "Impact"], "labeled text splits into sections");
  assert.ok(chunked.some((s) => /study shows X/.test(s.text)), "original content preserved, not rewritten");

  // Integration + safety checks via source.
  const arena = readFileSync("components/debate/debate-arena.tsx", "utf8");
  assert.ok(arena.includes("AccessibilityProvider"), "arena wraps the accessibility provider");
  assert.ok(arena.includes("<MessageContent"), "arena uses chunked MessageContent");
  assert.ok(arena.includes("<SpeechInput"), "arena includes speech-to-text input");
  assert.ok(arena.includes("Read feedback aloud"), "judge ballot has read-aloud");
  assert.ok(arena.includes("Copy transcript"), "arena has copy transcript");

  const room = readFileSync("components/debate/debate-room.tsx", "utf8");
  assert.ok(room.includes("Audio debate"), "audio debate option present");
  assert.ok(!room.includes("Audio debate coming soon"), "audio debate is no longer 'coming soon'");

  const stt = readFileSync("components/debate/accessibility/speech-input.tsx", "utf8");
  assert.ok(stt.includes("Voice input is not supported in this browser"), "STT unsupported fallback message present");

  // Accessibility settings must never touch auth/JWT.
  const auth = readFileSync("lib/auth.ts", "utf8");
  assert.ok(!/dyslexia|speechRate|audioAutoplay|accessibility/i.test(auth), "no accessibility settings in the JWT/session");

  // Gemini/AI health route untouched.
  assert.ok(existsSync("app/api/ai/health/route.ts"), "AI health route still exists");

  console.log("Audio-debate smoke tests passed: voice params, settings normalize, frame/text classes, section splitting (content preserved), arena+room integration, STT fallback, no-JWT storage, AI health untouched.");
}

main();
