import type { Config } from "tailwindcss";

// No `darkMode` strategy is configured. This project themes through <html data-theme="…"> plus
// prefers-color-scheme, and every token flips inside app/globals.css — no element ever receives a
// `dark` class. The former `darkMode: ["class"]` therefore compiled `dark:` variants that could
// never match; the four lesson components that used them now use semantic tokens instead.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1200px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        // Track identity accent — resolves through --track-accent, which a data-track wrapper
        // retints (debate=gold, deca=emerald, hosa=red). Use for anything track-scoped.
        track: {
          DEFAULT: "hsl(var(--track-accent))",
          debate: "hsl(var(--track-debate))",
          deca: "hsl(var(--track-deca))",
          hosa: "hsl(var(--track-hosa))"
        },
        // Semantic state roles (M12B). These are the component API for state colour — reach for
        // `text-success` / `border-warning` / `bg-locked/10`, never a raw palette shade, so every
        // accessibility mode can retint them. Colour always accompanies a word and an icon.
        "surface-interactive": {
          DEFAULT: "hsl(var(--surface-interactive))",
          foreground: "hsl(var(--surface-interactive-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))"
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))"
        },
        locked: {
          DEFAULT: "hsl(var(--locked))",
          foreground: "hsl(var(--locked-foreground))"
        },
        unavailable: {
          DEFAULT: "hsl(var(--unavailable))",
          foreground: "hsl(var(--unavailable-foreground))"
        },
        "selected-border": "hsl(var(--selected-border))",
        "selected-surface": "hsl(var(--selected-surface))",
        "selected-foreground": "hsl(var(--selected-foreground))"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        // Dark-ground ambient shadow (replaces the light-theme blue glow).
        soft: "0 12px 40px rgba(0, 0, 0, 0.45)",
        // Four restrained elevation levels. Level 0 is the page ground (no shadow) and level 1 is a
        // border-led card (`shadow-sm`, unchanged); only these two upper levels are new. Deliberately
        // small and neutral — no glow, no gradient, no glass, nothing animated.
        raised: "0 2px 8px rgba(0, 0, 0, 0.28)", // level 2: interactive / hovered surface
        overlay: "0 24px 64px rgba(0, 0, 0, 0.55)" // level 3: dialog, sheet, popover
      }
    }
  },
  plugins: []
};

export default config;
