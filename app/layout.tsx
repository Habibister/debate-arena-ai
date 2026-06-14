import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DebateArena AI",
  description: "AI-powered training for Debate, Model UN, DECA, HOSA, Mock Trial, and public speaking."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
