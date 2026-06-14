import { Bot, MessageSquareText, Users } from "lucide-react";
import { DebateFlow } from "@/components/debate/debate-flow";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVELS, ORGANIZATIONS } from "@/lib/constants";

export default function DebatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">AI Debate System</Badge>
        <h1 className="mt-3 text-3xl font-bold">Create a round</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Phase 1 defines the complete setup flow, AI API routes, debate schema, and judging rubric. Phase 2 will add the live round composer and realtime matchmaking.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {ORGANIZATIONS.map((org) => (
              <div key={org.value} className="rounded-lg border bg-background p-4">
                <h3 className="font-semibold">{org.label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{org.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Level and opponent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {LEVELS.map((level) => (
                <div key={level.value} className="rounded-lg border bg-background p-4">
                  <h3 className="font-semibold">{level.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{level.description}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <Bot className="h-5 w-5 text-secondary" aria-hidden />
                <h3 className="mt-3 font-semibold">Debate AI</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Always available with level-aware responses.</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <Users className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 font-semibold">Debate students</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Match by organization, skill level, and age group.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DebateFlow />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle>AI Judge Rubric</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {["Logic", "Evidence", "Rebuttal", "Persuasion", "Clarity", "Communication"].map((metric) => (
            <div key={metric} className="rounded-lg border bg-background p-4 font-semibold">
              {metric}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
