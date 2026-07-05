import Link from "next/link";
import type { Route } from "next";
import { Library, PlayCircle } from "lucide-react";
import { RecommendedVideos } from "@/components/resources/recommended-videos";
import { Badge } from "@/components/ui/badge";
import { getActiveTrack } from "@/lib/track-server";

// Resources landing — shared external study material, filtered to the active track. This is the
// shell page for the Resources IA section; deeper libraries land with the Study Arcade build-out.
export default function ResourcesPage({ searchParams }: { searchParams: { track?: string } }) {
  const activeTrack = getActiveTrack(searchParams.track);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Resources</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold sm:text-4xl">
          <Library className="h-7 w-7 text-primary" aria-hidden />
          Resource library
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Curated external videos and reference material{activeTrack ? ` for ${activeTrack.label}` : ""} that lead back
          into in-app practice. Flashcards and review games live in the{" "}
          <Link href={"/study-arcade" as Route} className="font-semibold text-primary hover:underline">
            Study Arcade
          </Link>
          .
        </p>
      </div>

      <RecommendedVideos organization={activeTrack?.organization} title="Video resource shelf" limit={12} />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <PlayCircle className="h-3.5 w-3.5" aria-hidden />
        External links open on their platforms; CompeteReady never embeds or rehosts third-party content.
      </p>
    </div>
  );
}
