import { Badge } from "@/components/ui/badge";
import { DebateRoom } from "@/components/debate/debate-room";

export default function DebatePage({ searchParams }: { searchParams: { track?: string } }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">AI Debate Arena</Badge>
          <Badge variant="outline">Free local judging</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Create a debate room</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Choose a motion, format, timer, and side. DebateArena AI will create a dedicated arena page with turn order,
          AI opponent speeches, and a judge decision when the round is complete.
        </p>
      </div>

      <DebateRoom track={searchParams.track} />
    </div>
  );
}
