"use client";

import { useEffect, useRef, useState } from "react";
import type { Organization } from "@prisma/client";
import { AlertTriangle, LifeBuoy, Loader2, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type OfficialMessage = { id: string; role: string; authorId?: string | null; content: string };

type CoachRequest = {
  requestType: "turn-feedback" | "ask";
  askKind?: string;
  latestStudentSpeech?: string;
};

type CoachEntry = {
  id: string;
  kind: "turn" | "ask" | "unavailable";
  label?: string;
  message?: string;
  strength?: string;
  improvement?: string;
  nextMove?: string;
  example?: string;
  // Present only on an `unavailable` entry: the exact request to re-issue if the learner retries.
  // Retry is always an explicit learner action — nothing here ever fires on its own.
  retry?: CoachRequest;
};

// A payload may render as coaching ONLY if it can actually be shown as evaluation. `turn-feedback`
// builds its card from these four fields, so a payload with none of them is incomplete — rendering
// it would produce an empty card that looks like feedback. `ask` needs prose.
function isRenderableCoaching(
  data: { message?: string; strength?: string; improvement?: string; nextMove?: string; example?: string; unavailable?: boolean },
  requestType: "turn-feedback" | "ask"
): boolean {
  if (data.unavailable === true) return false;
  if (requestType === "ask") return Boolean(data.message && data.message.trim());
  return Boolean(data.strength || data.improvement || data.nextMove || data.example);
}

// Quick prompts are organization-specific: only General Debate talks about rebuttal/weighing/opponents.
// Non-debate practices are solo delivery exercises, so their prompts match the real activity.
const DEBATE_ASK_OPTIONS = [
  "What should I answer?",
  "Help me organize my rebuttal",
  "What argument did I miss?",
  "How should I weigh this?",
  "Explain the opponent's point simply"
];

// Role-play rooms (DECA/HOSA) share scenario-grounded controls; "Show a sample response" is
// Beginner-only and added at render time.
const ROLEPLAY_ASK_OPTIONS = ["Give me a hint", "Help me start", "What am I missing?", "Simplify this situation"];

const ASK_OPTIONS_BY_ORG: Partial<Record<Organization, string[]>> = {
  MODEL_UN: [
    "Help organize my opening speech",
    "Check whether I represented my country's position",
    "Help prepare a moderated caucus response",
    "What negotiation point should I emphasize?",
    "Help explain my resolution or amendment"
  ],
  DECA: ROLEPLAY_ASK_OPTIONS,
  HOSA: ROLEPLAY_ASK_OPTIONS
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
  // Scenario + goals + a stage label so coaching references the actual situation (role-play rooms).
  scenario?: string;
  goals?: string[];
  stageLabel?: string;
  messages: OfficialMessage[]; // read-only official transcript; the coach NEVER mutates it
};

export function SideCoachPanel({ debateId, organization, eventType, studentSide, level, scenario, goals, stageLabel, messages }: Props) {
  const [entries, setEntries] = useState<CoachEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const coachedIdRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const guidanceLevel = level === "BEGINNER" ? 2 : 1;
  const isPractice = organization !== "DEBATE";
  const baseAskOptions = askOptionsForOrganization(organization);
  // "Show a sample response" is Beginner-only, and only for the role-play rooms.
  const askOptions =
    level === "BEGINNER" && (organization === "DECA" || organization === "HOSA")
      ? [...baseAskOptions, "Show a sample response"]
      : baseAskOptions;

  // Official student speeches are the ones with an author. Coaching reads them but never writes back.
  const studentMessages = messages.filter((m) => Boolean(m.authorId) && (m.role === "AFFIRMATIVE" || m.role === "NEGATIVE"));
  const latestStudent = studentMessages[studentMessages.length - 1];

  // `replaceEntryId` is set only by an explicit retry: the unavailable entry is replaced in place, so
  // a retry never stacks duplicate cards and never duplicates round state.
  async function askCoach(
    requestType: "turn-feedback" | "ask",
    options?: { askKind?: string; latestStudentSpeech?: string },
    replaceEntryId?: string
  ) {
    setLoading(true);
    const localId = replaceEntryId ?? `coach-${(seqRef.current += 1)}`;
    const request: CoachRequest = { requestType, askKind: options?.askKind, latestStudentSpeech: options?.latestStudentSpeech };
    // Replaces an existing entry when retrying, otherwise appends. The official transcript (`messages`)
    // is a read-only prop and is never touched by any of this.
    const upsert = (entry: CoachEntry) =>
      setEntries((current) => (current.some((e) => e.id === entry.id) ? current.map((e) => (e.id === entry.id ? entry : e)) : [...current, entry]));
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
          scenario,
          goals,
          stage: stageLabel ?? `Turn ${studentMessages.length || 1}`,
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
      const data = (await response.json()) as {
        message?: string;
        strength?: string;
        improvement?: string;
        nextMove?: string;
        example?: string;
        unavailable?: boolean;
      };
      // A provider outage arrives as HTTP 200 with `unavailable: true`, and a malformed payload can
      // arrive with nothing renderable. Neither is an evaluation — never show either as coaching.
      if (!isRenderableCoaching(data, requestType)) {
        throw new Error("coach unavailable");
      }
      upsert({
        id: localId,
        kind: requestType === "ask" ? "ask" : "turn",
        label: options?.askKind,
        message: data.message,
        strength: data.strength,
        improvement: data.improvement,
        nextMove: data.nextMove,
        example: data.example
      });
    } catch {
      upsert({ id: localId, kind: "unavailable", label: options?.askKind, retry: request });
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
          <div
            key={entry.id}
            className={
              entry.kind === "unavailable"
                ? "rounded-md border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-neutral-100"
                : "rounded-md border border-white/10 bg-black/20 p-3 text-sm text-neutral-100"
            }
          >
            {entry.label ? <p className="text-xs font-semibold text-emerald-200">{entry.label}</p> : null}
            {/* Honest unavailable state: no praise, no rubric fields, no example, no success styling,
                no completion. Status is carried by an icon AND text, never by colour alone. */}
            {entry.kind === "unavailable" ? (
              <div>
                <p className="flex items-start gap-2 font-semibold text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                  <span>Side Coach is temporarily unavailable. {isPractice ? "Your practice was not evaluated." : "Your debate was not evaluated."}</span>
                </p>
                <p className="mt-1 text-xs text-amber-100/80">
                  No score, feedback, or progress was recorded. Your {isPractice ? "practice" : "debate"} and transcript are
                  unchanged, and you can keep going.
                </p>
                {entry.retry ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="mt-2 border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                    onClick={() =>
                      askCoach(
                        entry.retry!.requestType,
                        { askKind: entry.retry!.askKind, latestStudentSpeech: entry.retry!.latestStudentSpeech },
                        entry.id
                      )
                    }
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Try again
                  </Button>
                ) : null}
              </div>
            ) : null}
            {entry.strength ? <p className="mt-1"><span className="font-semibold text-emerald-200">Worked:</span> {entry.strength}</p> : null}
            {entry.improvement ? <p className="mt-1"><span className="font-semibold text-emerald-200">Improve:</span> {entry.improvement}</p> : null}
            {entry.nextMove ? <p className="mt-1"><span className="font-semibold text-emerald-200">Next move:</span> {entry.nextMove}</p> : null}
            {entry.kind === "ask" && entry.message ? <p className="mt-1">{entry.message}</p> : null}
            {entry.example ? (
              <p className="mt-2 rounded border border-emerald-400/20 bg-emerald-500/10 p-2 text-emerald-50">
                <span className="font-semibold text-emerald-200">Example:</span> <span className="italic">{entry.example}</span>
              </p>
            ) : null}
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
