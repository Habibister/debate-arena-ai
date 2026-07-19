"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Level } from "@prisma/client";
import { Dices, DoorOpen, MessageSquareQuote, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DECA_CLUSTERS } from "@/lib/training-tracks";
import { DECA_ROLE_PAIRS, writeRoleplayConfig } from "@/components/rooms/roleplay-config";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ELITE"];

// Setup-only form for the DECA role-play. Configuration lives here; the session itself runs in the
// dedicated room (/training/deca/room). `mode="simulation"` adds the timed prep/performance clocks.
export function DecaRoleplaySetup({ mode = "practice" }: { mode?: "practice" | "simulation" }) {
  const router = useRouter();
  const isSim = mode === "simulation";
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [cluster, setCluster] = useState("Hospitality & Tourism");
  const [studentRole, setStudentRole] = useState("front desk manager");
  const [judgeRole, setJudgeRole] = useState("hotel guest whose reserved suite was given away");

  function enterRoom() {
    writeRoleplayConfig({ track: "deca", level, cluster, studentRole, judgeRole, simulation: isSim });
    router.push("/training/deca/room" as Route);
  }

  function surpriseMe() {
    const options = DECA_ROLE_PAIRS.filter((p) => p.student !== studentRole || p.judge !== judgeRole);
    const pick = options[Math.floor(Math.random() * options.length)] ?? DECA_ROLE_PAIRS[0];
    setStudentRole(pick.student);
    setJudgeRole(pick.judge);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {isSim ? <PlayCircle className="h-5 w-5 text-primary" aria-hidden /> : <MessageSquareQuote className="h-5 w-5 text-primary" aria-hidden />}
            {isSim ? "DECA Full Simulation — timed round" : "Guided role-play with objection round"}
          </CardTitle>
          <Badge variant="secondary">{isSim ? "Full Simulation" : "DECA"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSim
            ? "Set it up here, then enter the room for one continuous timed round: prep clock → pitch → the judge's objection round → scored ballot."
            : "Set it up here, then enter the room: scenario brief → pitch → the judge's objection round → scored ballot, read-aloud and speech input available."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Career cluster</span>
            <select value={cluster} onChange={(e) => setCluster(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {DECA_CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Difficulty</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {LEVELS.map((l) => <option key={l} value={l}>{l.toLowerCase()}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Your role <span className="font-normal text-muted-foreground">(editable — type any role)</span></span>
            <Input value={studentRole} onChange={(e) => setStudentRole(e.target.value)} placeholder="e.g. front desk manager" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">AI plays <span className="font-normal text-muted-foreground">(editable — type any character)</span></span>
            <Input value={judgeRole} onChange={(e) => setJudgeRole(e.target.value)} placeholder="e.g. frustrated hotel guest" />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={enterRoom}>
            <DoorOpen className="h-4 w-4" aria-hidden />
            Enter the room
          </Button>
          <Button type="button" variant="outline" onClick={surpriseMe}>
            <Dices className="h-4 w-4" aria-hidden />
            Surprise me
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
