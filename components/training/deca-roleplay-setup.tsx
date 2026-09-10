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
import { decaClusterHasOfficialSpec } from "@/lib/deca-spec-scope";
import {
  DECA_ROLE_PAIRS,
  decaDefaultRolePairForCluster,
  decaRolePairsForCluster,
  writeRoleplayConfig
} from "@/components/rooms/roleplay-config";
import { DecaSimulationPrepPanel } from "@/components/training/deca-simulation-prep-panel";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ELITE"];

/** The cluster the setup opens on: the one our sourced specification covers. */
const DEFAULT_CLUSTER = "Hospitality & Tourism";

// Setup-only form for the DECA role-play. Configuration lives here; the session itself runs in the
// dedicated room (/training/deca/room). `mode="simulation"` adds the timed prep/performance clocks.
export function DecaRoleplaySetup({ mode = "practice" }: { mode?: "practice" | "simulation" }) {
  const router = useRouter();
  const isSim = mode === "simulation";
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [cluster, setCluster] = useState(DEFAULT_CLUSTER);
  const [studentRole, setStudentRole] = useState(decaDefaultRolePairForCluster(DEFAULT_CLUSTER).student);
  const [judgeRole, setJudgeRole] = useState(decaDefaultRolePairForCluster(DEFAULT_CLUSTER).judge);
  // QA-R3 #12/#20. Roles follow the cluster until the learner types their own; after that they are the
  // learner's and the cluster stops overwriting them. Deterministic, and both states are labelled — no
  // silent mixture of a hotel role with a Finance cluster, and no beginner asked to repair a default.
  const [rolesAreCustom, setRolesAreCustom] = useState(false);

  function chooseCluster(next: string) {
    setCluster(next);
    if (rolesAreCustom) return;
    const pair = decaDefaultRolePairForCluster(next);
    setStudentRole(pair.student);
    setJudgeRole(pair.judge);
  }

  function useClusterDefaults() {
    const pair = decaDefaultRolePairForCluster(cluster);
    setStudentRole(pair.student);
    setJudgeRole(pair.judge);
    setRolesAreCustom(false);
  }
  // OWNER QA REPAIR 3C. Exactly one DECA specification is seeded (Hotel and Lodging Management
  // Series, Hospitality & Tourism). The simulation's clock is attributed as official only for that
  // cluster, so the setup says which clock this run will get BEFORE the learner enters the room —
  // and the cluster control visibly decides it.
  const officialTiming = decaClusterHasOfficialSpec(cluster);

  function enterRoom() {
    writeRoleplayConfig({ track: "deca", level, cluster, studentRole, judgeRole, simulation: isSim });
    router.push("/training/deca/room" as Route);
  }

  function surpriseMe() {
    // Shuffles within the CHOSEN cluster, so a surprise never hands a Finance learner a hotel pairing.
    const pool = decaRolePairsForCluster(cluster);
    const options = pool.filter((p) => p.student !== studentRole || p.judge !== judgeRole);
    const pick = options[Math.floor(Math.random() * options.length)] ?? pool[0] ?? DECA_ROLE_PAIRS[0];
    setStudentRole(pick.student);
    setJudgeRole(pick.judge);
    setRolesAreCustom(false);
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
        {isSim ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {officialTiming
              ? "Hospitality & Tourism is the one cluster our sourced specification covers, so where a preparation period is available this run uses that event's own."
              : "No official preparation period is sourced for this career cluster, so any clock in this run is CompeteReady's practice timer, not DECA's. The room tells you which one you got."}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* OWNER QA REPAIR 3C: the two editable fields below sit under the cluster select and read as
            a preview of it. They are not: they are your own starting values, and the cluster is what
            shapes the generated scenario. Said plainly rather than rewiring the defaults. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Career cluster</span>
            <select value={cluster} onChange={(e) => chooseCluster(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
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
            <Input
              value={studentRole}
              onChange={(e) => {
                setStudentRole(e.target.value);
                setRolesAreCustom(true);
              }}
              placeholder="e.g. the manager on duty"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">AI plays <span className="font-normal text-muted-foreground">(editable — type any character)</span></span>
            <Input
              value={judgeRole}
              onChange={(e) => {
                setJudgeRole(e.target.value);
                setRolesAreCustom(true);
              }}
              placeholder="e.g. the customer you are meeting"
            />
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            The career cluster and difficulty shape the scenario the room generates. The two roles are CompeteReady
            practice pairings for the cluster you picked — ours, not DECA event roles — and they follow the cluster
            until you type your own.
          </p>
          {rolesAreCustom ? (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Custom roles.</span> These stay as you typed them, even if you
              change cluster.
              <button type="button" onClick={useClusterDefaults} className="focus-ring font-semibold text-primary underline">
                Use {cluster} defaults
              </button>
            </p>
          ) : null}
        </div>

        {/* P1-D: the curriculum path, recommended and never required. It sits ABOVE the entry button
            on purpose — a learner who wants to read first meets it, and a learner who wants to
            practise first walks straight past it to a button nothing has disabled. */}
        <DecaSimulationPrepPanel variant="before" />

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
