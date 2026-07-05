import type { Route } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DebateRoom } from "@/components/debate/debate-room";
import { SpecBanner } from "@/components/specs/spec-banner";
import { getActiveTrack } from "@/lib/track-server";

export default function DebatePage({ searchParams }: { searchParams: { track?: string } }) {
  // The debate room is a General Debate (parliamentary/PF) experience. Other tracks have their own
  // legitimate practice (DECA role play, HOSA scenarios, Model UN committee) — never present
  // parliamentary debate as their training. Send them to the correct track practice instead.
  const activeTrack = getActiveTrack(searchParams.track);
  if (activeTrack && activeTrack.id !== "GENERAL_DEBATE") {
    redirect(`/training/${activeTrack.slug}/practice` as Route);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">AI Debate Arena</Badge>
          <Badge variant="outline">Free local judging</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Create a debate room</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Choose a motion, format, timer, and side. CompeteReady will create a dedicated arena page with turn order,
          AI opponent speeches, and a judge decision when the round is complete.
        </p>
        <div className="mt-4">
          <SpecBanner organization="DEBATE" />
        </div>
      </div>

      <DebateRoom track={searchParams.track} />
    </div>
  );
}
