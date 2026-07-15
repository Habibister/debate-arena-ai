"use client";

import { useEffect, useState } from "react";

// Renders a timestamp in the VIEWER's timezone. Server-side `toLocaleDateString()` formats in the
// server's zone (UTC on Vercel), which can display "tomorrow" for users in western timezones late at
// night. To avoid a hydration mismatch we render a deterministic UTC string on the server and first
// client paint, then swap to the user's local formatting after mount.
function formatUtc(iso: string, mode: "date" | "datetime"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  if (mode === "date") return date;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${date}, ${hh}:${mm} UTC`;
}

export function LocalDate({ value, mode = "date" }: { value: string | number | Date; mode?: "date" | "datetime" }) {
  const iso = value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  const [text, setText] = useState(() => formatUtc(iso, mode));

  useEffect(() => {
    const d = new Date(iso);
    setText(mode === "datetime" ? d.toLocaleString() : d.toLocaleDateString());
  }, [iso, mode]);

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
