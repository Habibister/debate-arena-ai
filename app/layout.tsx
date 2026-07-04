import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityProvider } from "@/components/debate/accessibility/accessibility-context";

export const metadata: Metadata = {
  title: "CompeteReady",
  description: "AI-powered training for Debate, Model UN, DECA, HOSA, Mock Trial, and public speaking."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Single sitewide accessibility provider — applies settings to <html> and shares state with
            the debate-room panel and /settings so everything stays synchronized. */}
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
