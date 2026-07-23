"use client";

import { useEffect, useRef, useState } from "react";
import type { Organization } from "@prisma/client";
import { LifeBuoy, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export type OfficialMessage = { id: string; role: string; authorId?: string | null; content: string };

type CoachEntry = {
  id: string;
  kind: "turn" | "ask" | "error";
  label?: string;
  message?: string;
  strength?: string;
  improvement?: string;
  nextMove?: string;
};

// Quick prompts are organization-specific: only General Debate talks about rebuttal/weighing/opponents.
// Non-debate practices are solo delivery exercises, so their prompts match the real activity.
const DEBATE_ASK_OPTIONS = [
  "What should I answer?",
  "Help me organize my rebuttal",
  "What argument did I miss?",
  "How should I weigh this?",
  "Explain the opponent's point simply"
];

const ASK_OPTIONS_BY_ORG: Partial<Record<Organization, string[]>> = {
  MODEL_UN: [
    "Help organize my opening speech",
    "Check whether I represented my country's position",
    "Help prepare a moderated caucus response",
    "What negotiation point should I emphasize?",
    "Help explain my resolution or amendment"
  ],
  DECA: [
    "Help organize my role-play response",
    "Which performance indicator should I address?",
    "Help identify the client's main need",
    "Strengthen my recommendation",
    "Help prepare my closing summary"
  ],
  HOSA: [
    "Help organize my response",
    "Which health-science concepts should I mention?",
    "Check my terminology",
    "Help make my explanation safe and role-appropriate",
    "What important step did I miss?"
  ]
};

function askOptionsForOrganization(organization: Organization): string[] {
  return ASK_OPTIONS_BY_ORG[organization] ?? DEBATE_ASK_OPTIONS;
}

type Props = {
  // Marks a persisted debate assistedPractice when the coach is used. Optional: client-state rooms
  // (DECA/HOSA role-play) have no debate record, so it's omitted and assisted-flagging simply no-ops.
  debateId?: string;
  organization: Organization;
  eventType?: string;
  studentSide?: "AFFIRMATIVE" | "NEGATIVE";
  level?: "BEGINNER" | "INTERMEDIATE" | "ELITE";
  messages: OfficialMessage[]; // read-only official transcript; the coach NEVER mutates it
};

export function SideCoachPanel({ debateId, organization, eventType, studentSide, level, messages }: Props) {
  const [entries, setEntries] = useState<CoachEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const coachedIdRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const guidanceLevel = level === "BEGINNER" ? 2 : 1;
  const isPractice = organization !== "DEBATE";
  const askOptions = askOptionsForOrganization(organization);

  // Official student speeches are the ones with an author. Coaching reads them but never writes back.
  const studentMessages = messages.filter((m) => Boolean(m.authorId) && (m.role === "AFFIRMATIVE" || m.role === "NEGATIVE"));
  const latestStudent = studentMessages[studentMessages.length - 1];

  async function askCoach(requestType: "turn-feedback" | "ask", options?: { askKind?: string; latestStudentSpeech?: string }) {
    setLoading(true);
    const localId = `coach-${(seqRef.current += 1)}`;
    try {
      const response = await fetch("/api/ai/side-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debateId,
          organization,
          eventType,
          studentSide,
          level,
          stage: `Turn ${studentMessages.length || 1}`,
          transcript: messages.map((m) => ({ role: m.role, content: m.content })),
          latestStudentSpeech: options?.latestStudentSpeech,
          requestType,
          askKind: options?.askKind,
          guidanceLevel
        })
      });
      if (!response.ok) {
        throw new Error("coach unavailable");
      }
      const data = (await response.json()) as { message?: string; strength?: string; improvement?: string; nextMove?: string };
      setEntries((current) => [
        ...current,
        {
          id: localId,
          kind: requestType === "ask" ? "ask" : "turn",
          label: options?.askKind,
          message: data.message,
          strength: data.strength,
          improvement: data.improvement,
          nextMove: data.nextMove
        }
      ]);
    } catch {
      setEntries((current) => [
        ...current,
        { id: localId, kind: "error", message: "Your Side Coach is unavailable right now. You can continue the debate." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Auto turn-feedback once per new student speech.
  useEffect(() => {
    if (!latestStudent || coachedIdRef.current === latestStudent.id) {
      return;
    }
    coachedIdRef.current = latestStudent.id;
    void askCoach("turn-feedback", { latestStudentSpeech: latestStudent.content });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestStudent?.id]);

  return (
    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/[0.06] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-semibold text-emerald-100">
          <LifeBuoy className="h-4 w-4 text-emerald-300" aria-hidden />
          Your Side Coach
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-200/80">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Private
        </span>
      </div>
      <p className="mt-1 text-xs text-emerald-100/70">
        {isPractice
          ? "Assisted practice — these suggestions are private and do not count as your submitted response."
          : "Assisted practice — these suggestions are private, are not sent to the opponent or judge, and do not count as your speech."}
      </p>

      <div className="mt-3 space-y-2">
        {entries.length === 0 && !loading ? (
          <p className="text-sm text-emerald-100/60">Speak or ask for help and your Side Coach will guide you here.</p>
        ) : null}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-neutral-100">
            {entry.label ? <p className="text-xs font-semibold text-emerald-200">{entry.label}</p> : null}
            {entry.kind === "error" ? <p className="text-amber-200">{entry.message}</p> : null}
            {entry.strength ? <p className="mt-1"><span className="font-semibold text-emerald-200">Worked:</span> {entry.strength}</p> : null}
            {entry.improvement ? <p className="mt-1"><span className="font-semibold text-emerald-200">Improve:</span> {entry.improvement}</p> : null}
            {entry.nextMove ? <p className="mt-1"><span className="font-semibold text-emerald-200">Next move:</span> {entry.nextMove}</p> : null}
            {entry.kind === "ask" && entry.message ? <p className="mt-1">{entry.message}</p> : null}
          </div>
        ))}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-emerald-100/70">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Coaching…
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {askOptions.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => askCoach("ask", { askKind: option, latestStudentSpeech: latestStudent?.content })}
            className="border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
