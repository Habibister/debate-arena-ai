import { Bot, MessageSquareText, Users } from "lucide-react";
import { DebateRoom } from "@/components/debate/debate-room";
import { DebateFlow } from "@/components/debate/debate-flow";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVELS, ORGANIZATIONS } from "@/lib/constants";
import { RUBRIC_SEEDS, SPEAKER_POINT_SCALE } from "@/lib/rubrics";

export default function DebatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">AI Debate System</Badge>
        <h1 className="mt-3 text-3xl font-bold">Create a judged practice round</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Select organization, event type, level, and practice mode. The judge switches scoring engines for parliamentary debate, DECA roleplays, and HOSA performances.
        </p>
      </div>

      <DebateRoom />

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
            <CardTitle>Organization-Specific Judge Engines</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 xl:grid-cols-3">
            {RUBRIC_SEEDS.map((rubric) => (
              <div key={`${rubric.organization}-${rubric.eventType}`} className="rounded-lg border bg-background p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{rubric.organization.replace("_", " ")}</p>
                <h3 className="mt-2 font-semibold">{rubric.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{rubric.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {rubric.categories.slice(0, 5).map((category) => (
                    <Badge key={category.key} variant="outline">
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border bg-background p-4">
            <p className="font-semibold">Parliamentary speaker point scale</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SPEAKER_POINT_SCALE.map((item) => (
                <div key={item.score} className="rounded-md border bg-card p-3 text-sm">
                  <span className="font-semibold">{item.score}</span>
                  <span className="ml-2 text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
