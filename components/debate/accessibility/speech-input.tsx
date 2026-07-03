"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// The Web Speech API types aren't in the standard TS DOM lib, so we describe the bits we use.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Props = {
  onAppend: (text: string) => void;
  disabled?: boolean;
};

// Speech-to-text control. Appends the recognized transcript to the existing response (never replaces
// typed text, never auto-submits). Falls back to a clear message when unsupported, and handles mic
// permission denial without breaking the debate.
export function SpeechInput({ onAppend, disabled }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      try {
        recognitionRef.current?.abort(); // stop recognition if the component unmounts
      } catch {
        // ignore
      }
    };
  }, []);

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      return;
    }
    setNotice(null);
    try {
      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          onAppend(transcript.trim());
        }
      };
      recognition.onerror = (event: { error?: string }) => {
        setListening(false);
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          setNotice("Microphone access was blocked. You can still type your response.");
        }
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setNotice("Voice input could not start. You can still type your response.");
    }
  }

  function stop() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }

  if (!supported) {
    return (
      <p className="text-sm text-neutral-400">Voice input is not supported in this browser. You can still type your response.</p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={listening ? stop : start}
          className="border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10"
          aria-pressed={listening}
        >
          {listening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
          {listening ? "Listening… tap to stop" : "Speak response"}
        </Button>
        {listening ? (
          <span className="flex items-center gap-1 text-xs text-neutral-400">
            <MicOff className="h-3.5 w-3.5" aria-hidden />
            Speak clearly, then review the transcript before sending.
          </span>
        ) : (
          <span className="text-xs text-neutral-500">Your speech becomes editable text before you send it.</span>
        )}
      </div>
      {notice ? <p className="text-xs font-medium text-amber-300">{notice}</p> : null}
    </div>
  );
}
