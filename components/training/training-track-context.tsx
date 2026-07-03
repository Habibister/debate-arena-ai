"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_TRACK, normalizeTrack, TRACK_STORAGE_KEY, type TrainingTrack } from "@/lib/training-tracks";

type TrainingTrackContextValue = {
  track: TrainingTrack;
  setTrack: (track: TrainingTrack) => void;
};

const TrainingTrackContext = createContext<TrainingTrackContextValue | null>(null);

export function TrainingTrackProvider({ children }: { children: React.ReactNode }) {
  // Start from the default so SSR and first client render match; hydrate from localStorage after mount.
  const [track, setTrackState] = useState<TrainingTrack>(DEFAULT_TRACK);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TRACK_STORAGE_KEY);
      if (stored) {
        setTrackState(normalizeTrack(stored));
      }
    } catch {
      // localStorage unavailable — keep default, never crash.
    }
  }, []);

  const value = useMemo<TrainingTrackContextValue>(
    () => ({
      track,
      setTrack: (next) => {
        const normalized = normalizeTrack(next);
        setTrackState(normalized);
        try {
          window.localStorage.setItem(TRACK_STORAGE_KEY, normalized); // never in JWT/cookies
        } catch {
          // ignore storage failures
        }
      }
    }),
    [track]
  );

  return <TrainingTrackContext.Provider value={value}>{children}</TrainingTrackContext.Provider>;
}

export function useTrainingTrack() {
  return useContext(TrainingTrackContext) ?? { track: DEFAULT_TRACK, setTrack: () => {} };
}
