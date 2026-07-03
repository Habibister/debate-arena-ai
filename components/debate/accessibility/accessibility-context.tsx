"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_ACCESSIBILITY, normalizeAccessibility, type AccessibilitySettings } from "@/lib/accessibility";

const STORAGE_KEY = "debatearena-accessibility";

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  update: (patch: Partial<AccessibilitySettings>) => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  // Always start from defaults so the server and first client render match (no hydration mismatch).
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY);

  // Load persisted prefs after mount — browser only.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(normalizeAccessibility(JSON.parse(stored)));
      }
    } catch {
      // localStorage may be unavailable (private mode) — fall back to defaults, never crash.
    }
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      settings,
      update: (patch) =>
        setSettings((current) => {
          const next = normalizeAccessibility({ ...current, ...patch });
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore storage failures — settings still apply for this session
          }
          return next;
        })
    }),
    [settings]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

// Safe outside a provider too (returns defaults + no-op) so components never crash.
export function useAccessibility() {
  return useContext(AccessibilityContext) ?? { settings: DEFAULT_ACCESSIBILITY, update: () => {} };
}
