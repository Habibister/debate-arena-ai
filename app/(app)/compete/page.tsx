import Link from "next/link";
import type { Route } from "next";
import { ClipboardList, Gavel, History, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveTrack } from "@/lib/track-server";

// Compete — the launcher for everything scored: live rounds, timed simulations, official-format
// tests, and past results. Pure navigation; each destination keeps its own honest labeling.
export default function CompetePage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = getActiveTrack(searchParams.track);
  const trackSlug = activeTrack?.slug ?? "debate";

  const destinations = [
    {
      href: `/debate?track=${trackSlug}`,
      label: "Debate Now",
      detail: "A full live round: AI opponent, real turn order, judged ballot.",
      icon: Gavel
    },
    {
      href: `/study-arcade?track=${trackSlug}`,
      label: "Full simulations",
      detail: "Timed end-to-end event runs — official structure where the registry has it.",
      icon: PlayCircle
    },
    {
      href: `/tests?track=${trackSlug}`,
      label: "Practice tests",
      detail: "Original question sets with explanations; official formats where verified.",
      icon: ClipboardList
    },
    {
      href: "/debates/history",
      label: "History",
      detail: "Every past round and ballot — nothing is deleted.",
      icon: History
    }
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Compete</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="page-title mt-3">Compete</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Scored practice that mirrors the real event. Pick your arena.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {destinations.map((dest) => {
          const Icon = dest.icon;
          return (
            <Link key={dest.label} href={dest.href as Route} className="rounded-lg border bg-card p-5 transition-colors hover:bg-muted">
              <Icon className="h-6 w-6 text-track" aria-hidden />
              <h2 className="mt-3 text-lg font-bold">{dest.label}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{dest.detail}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
