// Pure, framework-free helpers for the audio-debate / accessibility mode. No DB, no JWT — settings
// live in localStorage on the client. Kept separate from React so voice mapping, section splitting,
// and the CSS class logic can be unit-tested.

export type VoiceStyle = "calm-coach" | "persuasive-debater" | "tournament-judge" | "slow-reader";
export type SpeechRate = "slow" | "normal" | "fast";

// Original, generic voice styles — mapped to browser SpeechSynthesis rate/pitch. No cloned, celebrity,
// or copyrighted-character voices: these only adjust speed/pitch of whatever system voice is available.
export const VOICE_STYLES: Array<{ id: VoiceStyle; name: string; rate: number; pitch: number }> = [
  { id: "calm-coach", name: "Calm Coach", rate: 0.95, pitch: 1.0 },
  { id: "persuasive-debater", name: "Persuasive Debater", rate: 1.05, pitch: 1.05 },
  { id: "tournament-judge", name: "Tournament Judge", rate: 1.0, pitch: 0.95 },
  { id: "slow-reader", name: "Slow Reader", rate: 0.8, pitch: 1.0 }
];

const RATE_MULTIPLIER: Record<SpeechRate, number> = { slow: 0.8, normal: 1, fast: 1.2 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Combines the chosen voice style with the speech-rate setting into safe SpeechSynthesis values.
export function resolveSpeechParams(style: VoiceStyle, rate: SpeechRate): { rate: number; pitch: number } {
  const preset = VOICE_STYLES.find((v) => v.id === style) ?? VOICE_STYLES[0];
  return {
    rate: clamp(preset.rate * (RATE_MULTIPLIER[rate] ?? 1), 0.5, 1.6),
    pitch: clamp(preset.pitch, 0.6, 1.4)
  };
}

export type AccessibilitySettings = {
  audioAutoplay: boolean;
  speechRate: SpeechRate;
  voiceStyle: VoiceStyle;
  dyslexiaFont: boolean;
  largerText: boolean;
  lineSpacing: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  colorBlind: boolean;
  eyeComfort: boolean;
  readAiAloud: boolean;
  readStudentAloud: boolean;
};

// Calm defaults: no autoplay, normal rate, AI read-aloud available but manual.
export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  audioAutoplay: false,
  speechRate: "normal",
  voiceStyle: "calm-coach",
  dyslexiaFont: false,
  largerText: false,
  lineSpacing: false,
  reducedMotion: false,
  highContrast: false,
  colorBlind: false,
  eyeComfort: false,
  readAiAloud: true,
  readStudentAloud: false
};

const RATES: SpeechRate[] = ["slow", "normal", "fast"];

export function normalizeAccessibility(raw: unknown): AccessibilitySettings {
  const input = (raw ?? {}) as Partial<AccessibilitySettings>;
  const d = DEFAULT_ACCESSIBILITY;
  return {
    audioAutoplay: Boolean(input.audioAutoplay ?? d.audioAutoplay),
    speechRate: RATES.includes(input.speechRate as SpeechRate) ? (input.speechRate as SpeechRate) : d.speechRate,
    voiceStyle: VOICE_STYLES.some((v) => v.id === input.voiceStyle) ? (input.voiceStyle as VoiceStyle) : d.voiceStyle,
    dyslexiaFont: Boolean(input.dyslexiaFont ?? d.dyslexiaFont),
    largerText: Boolean(input.largerText ?? d.largerText),
    lineSpacing: Boolean(input.lineSpacing ?? d.lineSpacing),
    reducedMotion: Boolean(input.reducedMotion ?? d.reducedMotion),
    highContrast: Boolean(input.highContrast ?? d.highContrast),
    colorBlind: Boolean(input.colorBlind ?? d.colorBlind),
    eyeComfort: Boolean(input.eyeComfort ?? d.eyeComfort),
    readAiAloud: Boolean(input.readAiAloud ?? d.readAiAloud),
    readStudentAloud: Boolean(input.readStudentAloud ?? d.readStudentAloud)
  };
}

// Root <html> data attributes so global CSS (globals.css) can apply sitewide accessibility styles.
export function accessibilityDataAttributes(s: AccessibilitySettings): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (s.colorBlind) attrs["data-colorblind"] = "true";
  if (s.eyeComfort) attrs["data-eye-comfort"] = "true";
  if (s.reducedMotion) attrs["data-reduced-motion"] = "true";
  if (s.largerText) attrs["data-large-text"] = "true";
  if (s.lineSpacing) attrs["data-increased-spacing"] = "true";
  if (s.highContrast) attrs["data-high-contrast"] = "true";
  if (s.dyslexiaFont) attrs["data-dyslexia"] = "true";
  return attrs;
}

// Classes for the arena root: high contrast + globally disabled transitions for reduced motion.
export function accessibilityFrameClass(s: AccessibilitySettings): string {
  return [s.highContrast ? "contrast-125" : "", s.reducedMotion ? "[&_*]:!transition-none" : ""].filter(Boolean).join(" ");
}

// Classes for readable text blocks (transcript + input): dyslexia spacing, larger size, line spacing,
// left alignment, and a shorter readable line width. Safe system fonts + spacing only — no font file.
export function accessibilityTextClass(s: AccessibilitySettings): string {
  return [
    s.dyslexiaFont ? "tracking-wide [word-spacing:0.18em] text-left max-w-prose" : "",
    s.largerText ? "!text-base sm:!text-lg" : "",
    s.lineSpacing ? "!leading-8" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export type SpeechSection = { label: string; text: string };

const SECTION_LABELS = ["Claim", "Warrant", "Evidence", "Rebuttal", "Impact", "Weighing"];

// Splits an AI speech into labeled sections (Claim/Evidence/Rebuttal/Impact/Weighing) when the text
// uses those headers; otherwise returns a single readable block. Never invents or rewrites content.
export function splitDebateSections(text: string): SpeechSection[] {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return [];
  }

  const labelRegex = new RegExp(`^\\s*(${SECTION_LABELS.join("|")})\\s*[:\\-–—]\\s*(.*)$`, "i");
  const sections: SpeechSection[] = [];
  let current: SpeechSection | null = null;

  for (const line of trimmed.split(/\n+/)) {
    const match = line.match(labelRegex);
    if (match) {
      if (current) {
        sections.push(current);
      }
      const label = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
      current = { label, text: match[2].trim() };
    } else if (current) {
      current.text += (current.text ? " " : "") + line.trim();
    } else {
      current = { label: "Speech", text: line.trim() };
    }
  }
  if (current) {
    sections.push(current);
  }

  const labeled = sections.filter((s) => s.text.length > 0);
  // Only treat it as chunked if real headers were found (more than one labeled section).
  if (labeled.length <= 1) {
    return [{ label: "Speech", text: trimmed }];
  }
  return labeled;
}
