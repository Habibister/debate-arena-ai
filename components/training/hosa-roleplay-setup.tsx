"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { Level } from "@prisma/client";
import { Dices, DoorOpen, HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HOSA_CATEGORIES } from "@/lib/training-tracks";
import { HOSA_ROLE_PAIRS, writeRoleplayConfig } from "@/components/rooms/roleplay-config";

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ELITE"];
// Medical Terminology is the verified written exam (its own flagship room), excluded from the
// interactive role-play categories.
const ROLEPLAY_CATEGORIES = HOSA_CATEGORIES.filter((c) => !/medical terminology/i.test(c));

// Setup-only form for the HOSA health-science role-play. The session runs in the dedicated room
// (/training/hosa/room). Always generic/unofficial — HOSA's only verified spec is the MT exam.
export function HosaRoleplaySetup() {
  const router = useRouter();
  const [level, setLevel] = useState<Level>("BEGINNER");
  const [category, setCategory] = useState(ROLEPLAY_CATEGORIES[0]);
  const [studentRole, setStudentRole] = useState("health science student");
  const [characterRole, setCharacterRole] = useState("patient who is anxious about a new diagnosis");

  function enterRoom() {
    writeRoleplayConfig({ track: "hosa", level, category, studentRole, characterRole });
    router.push("/training/hosa/room" as Route);
  }

  function surpriseMe() {
    const options = HOSA_ROLE_PAIRS.filter((p) => p.student !== studentRole || p.character !== characterRole);
    const pick = options[Math.floor(Math.random() * options.length)] ?? HOSA_ROLE_PAIRS[0];
    setStudentRole(pick.student);
    setCharacterRole(pick.character);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" aria-hidden />
            Guided health-science role-play
          </CardTitle>
          <Badge variant="secondary">HOSA</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Set it up here, then enter the room: scenario brief → your response → feedback, with read-aloud
          and speech input. HOSA&apos;s official spec covers Medical Terminology (the written exam above), so
          these interactive scenarios are AI-generated generic practice — never scored as official.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Practice category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              {ROLEPLAY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
            <Input value={studentRole} onChange={(e) => setStudentRole(e.target.value)} placeholder="e.g. health science student" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">AI plays <span className="font-normal text-muted-foreground">(editable — type any character)</span></span>
            <Input value={characterRole} onChange={(e) => setCharacterRole(e.target.value)} placeholder="e.g. anxious patient" />
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
