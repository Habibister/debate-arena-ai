"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

// The Web Speech API types aren't in the standard TS DOM lib, so we describe the bits we use.
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean } & ArrayLike<{ transcript: string }>> }) => void) | null;
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

const TIME_UP_NOTICE = "Time is up — recording stopped. Review your response before submitting.";

type Props = {
  onAppend: (text: string) => void;
  disabled?: boolean;
  // True when the active student speech timer has reached zero (timed turns only).
  timeUp?: boolean;
  // Identifies the current speech turn; changing it resets the per-turn expiration guard.
  turnKey?: string | number | null;
};

// Speech-to-text that stays active through natural pauses (restarts itself on a spurious onend) and
// stops only on: manual Stop, the speech timer hitting zero, navigation/unmount, or a fatal mic
// error. Recognized text is appended to the response (never replaces typed text, never auto-submits).
export function SpeechInput({ onAppend, disabled, timeUp = false, turnKey = null }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const stoppedIntentionallyRef = useRef(false);
  const interimRef = useRef("");
  const restartTimerRef = useRef<number | null>(null);
  const expiredHandledRef = useRef(false);
  const timeUpRef = useRef(false);
  const onAppendRef = useRef(onAppend);

  useEffect(() => {
    onAppendRef.current = onAppend;
  }, [onAppend]);
  useEffect(() => {
    timeUpRef.current = timeUp;
  }, [timeUp]);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      // Component unmount (e.g. turn ends / navigation) — stop the mic promptly.
      hardStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearRestartTimer() {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }

  // Append any pending interim transcript so a stop/restart never loses words (cleared after use so
  // it can't be appended twice).
  function flushInterim() {
    const text = interimRef.current.trim();
    interimRef.current = "";
    if (text) {
      onAppendRef.current(text);
    }
  }

  function startSession() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? "";
          if (result.isFinal) {
            const clean = transcript.trim();
            if (clean) {
              onAppendRef.current(clean); // final segments append once, as they finalize
            }
          } else {
            interim += transcript;
          }
        }
        interimRef.current = interim.trim();
      };

      recognition.onerror = (event) => {
        const error = event?.error;
        // Fatal mic problems stop for good; transient ones (no-speech/aborted) let onend restart.
        if (error === "not-allowed" || error === "service-not-allowed") {
          stoppedIntentionallyRef.current = true;
          setNotice("Microphone access was blocked. You can still type your response.");
          setListening(false);
          listeningRef.current = false;
        } else if (error === "audio-capture") {
          stoppedIntentionallyRef.current = true;
          setNotice("No microphone was found. You can still type your response.");
          setListening(false);
          listeningRef.current = false;
        }
      };

      recognition.onend = () => {
        flushInterim();
        // Intentional stop (manual / timer / unmount / fatal) — do not restart.
        if (stoppedIntentionallyRef.current || !listeningRef.current) {
          setListening(false);
          return;
        }
        // Natural end (pause, thinking, browser hiccup) — restart to keep listening.
        clearRestartTimer();
        restartTimerRef.current = window.setTimeout(() => {
          if (!stoppedIntentionallyRef.current && listeningRef.current) {
            startSession();
          }
        }, 250);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      // start() can throw if the previous session is still ending; onend won't fire, so nothing stacks
    }
  }

  function start() {
    if (!getRecognitionCtor() || timeUpRef.current) {
      // Do not (re)start after the turn's time is up — wait for a new turn.
      if (timeUpRef.current) {
        setNotice(TIME_UP_NOTICE);
      }
      return;
    }
    setNotice(null);
    stoppedIntentionallyRef.current = false;
    expiredHandledRef.current = false;
    interimRef.current = "";
    listeningRef.current = true;
    setListening(true);
    startSession();
  }

  // Intentional stop shared by manual stop, timer expiry, unmount, and fatal errors.
  function hardStop() {
    stoppedIntentionallyRef.current = true;
    clearRestartTimer();
    flushInterim();
    listeningRef.current = false;
    try {
      recognitionRef.current?.abort(); // abort() drops the mic indicator promptly
    } catch {
      // ignore
    }
    setListening(false);
  }

  // Timer expiry: stop exactly once per turn (guard prevents repeats while turnRemaining stays 0).
  useEffect(() => {
    if (timeUp && listeningRef.current && !expiredHandledRef.current) {
      expiredHandledRef.current = true;
      hardStop();
      setNotice(TIME_UP_NOTICE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  // New speech turn: reset the expiration guard and clear the time-up message. Never auto-starts —
  // the student must press "Speak response" again.
  useEffect(() => {
    expiredHandledRef.current = false;
    setNotice((current) => (current === TIME_UP_NOTICE ? null : current));
  }, [turnKey]);

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
          onClick={listening ? hardStop : start}
          className="border-white/15 bg-white/[0.03] text-neutral-200 hover:bg-white/10"
          aria-pressed={listening}
        >
          {listening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
          {listening ? "Listening… tap to stop" : "Speak response"}
        </Button>
        {listening ? (
          <span className="text-xs text-neutral-400">Speak clearly. Pauses are fine — review the transcript before sending.</span>
        ) : (
          <span className="text-xs text-neutral-500">Your speech becomes editable text before you send it.</span>
        )}
      </div>
      {notice ? <p className="text-xs font-medium text-amber-300">{notice}</p> : null}
    </div>
  );
}
