import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/components/debate/accessibility/accessibility-context";

// Design-system faces (stage 1): Inter as the actually-loaded body face (previously a silent
// system fallback), Barlow Condensed as the competitive display face for wordmark/headings.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "CompeteReady",
  description: "AI-powered training for Debate, DECA, and HOSA — AI opponents, AI judging, and mastery tracking."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable}`}>
      <body>
        {/* Single sitewide accessibility provider — applies settings to <html> and shares state with
            the debate-room panel and /settings so everything stays synchronized. */}
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
