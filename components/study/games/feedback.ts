// Optional, very soft feedback beep. No audio assets, no autoplay — only plays when the user has
// turned Sound on. Fully guarded so it never throws on unsupported browsers.
export function playBeep(enabled: boolean, kind: "correct" | "incorrect") {
  if (!enabled || typeof window === "undefined") {
    return;
  }
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      return;
    }
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "correct" ? 660 : 320;
    gain.gain.value = 0.04; // quiet
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {
    // ignore — audio is a non-essential enhancement
  }
}
