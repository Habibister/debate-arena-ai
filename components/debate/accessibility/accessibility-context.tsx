"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { accessibilityDataAttributes, DEFAULT_ACCESSIBILITY, normalizeAccessibility, type AccessibilitySettings } from "@/lib/accessibility";

const STORAGE_KEY = "debatearena-accessibility";
const ROOT_ATTRS = ["data-theme", "data-colorblind", "data-eye-comfort", "data-reduced-motion", "data-large-text", "data-increased-spacing", "data-high-contrast", "data-dyslexia"];

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

  // Reflect settings onto <html> so global CSS applies sitewide (and stays in sync everywhere).
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    const attrs = accessibilityDataAttributes(settings);
    for (const key of ROOT_ATTRS) {
      if (attrs[key]) {
        root.setAttribute(key, attrs[key]);
      } else {
        root.removeAttribute(key);
      }
    }
  }, [settings]);

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
