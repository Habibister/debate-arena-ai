"use client";

import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveSpeechParams } from "@/lib/accessibility";
import { useAccessibility } from "@/components/debate/accessibility/accessibility-context";

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

type Props = {
  text: string;
  label?: string;
  className?: string;
};

// Play/stop button backed by browser SpeechSynthesis. Cancels any in-flight speech before starting a
// new one (so repeated clicks never stack voices), stops on unmount, and hides itself when unsupported.
export function SpeakButton({ text, label = "Play audio", className }: Props) {
  const { settings } = useAccessibility();
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(speechSupported());
  }, []);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  function speak() {
    if (!supported || !text.trim()) {
      return;
    }
    try {
      window.speechSynthesis.cancel(); // stop stale speech; no stacking
      const utterance = new SpeechSynthesisUtterance(text);
      const { rate, pitch } = resolveSpeechParams(settings.voiceStyle, settings.speechRate);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.lang = "en-US";
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find((v) => /^en[-_]/i.test(v.lang)) ?? voices[0];
      if (englishVoice) {
        utterance.voice = englishVoice; // whatever the browser offers — no cloned/celebrity voice
      }
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
    }
  }

  function stop() {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    setSpeaking(false);
  }

  // If TTS is unavailable, render nothing — the transcript text is always shown anyway.
  if (!supported) {
    return null;
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={speaking ? stop : speak} className={cn(className)} aria-pressed={speaking}>
      {speaking ? <Square className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      {speaking ? "Stop" : label}
    </Button>
  );
}
