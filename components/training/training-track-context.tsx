"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_TRACK, normalizeTrack, TRACK_COOKIE, TRACK_STORAGE_KEY, trackById, type TrainingTrack } from "@/lib/training-tracks";

// Mirror the selection into a non-auth preference cookie (slug value) so server components can read
// the selected track when `?track=` is absent. Client-only, never sent to/derived from the JWT.
function writeTrackCookie(track: TrainingTrack) {
  try {
    const slug = trackById(track).slug;
    // 1 year, root path, Lax so it rides normal navigations.
    document.cookie = `${TRACK_COOKIE}=${slug}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // document unavailable (SSR) or blocked — localStorage still holds the selection.
  }
}

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
        const normalized = normalizeTrack(stored);
        setTrackState(normalized);
        // Keep the server-readable cookie in sync with the stored selection on load.
        writeTrackCookie(normalized);
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
          window.localStorage.setItem(TRACK_STORAGE_KEY, normalized);
        } catch {
          // ignore storage failures
        }
        // Non-auth preference cookie so server components resolve the track without `?track=`.
        writeTrackCookie(normalized);
      }
    }),
    [track]
  );

  return <TrainingTrackContext.Provider value={value}>{children}</TrainingTrackContext.Provider>;
}

export function useTrainingTrack() {
  return useContext(TrainingTrackContext) ?? { track: DEFAULT_TRACK, setTrack: () => {} };
}
