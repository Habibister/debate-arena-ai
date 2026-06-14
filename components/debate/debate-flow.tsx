import { ArrowRight, Bot, CheckCircle2, Gauge, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { title: "Choose organization", detail: "Debate, Model UN, DECA, HOSA, Mock Trial, or Public Speaking." },
  { title: "Pick level", detail: "Beginner, Intermediate, or Elite pacing and rubric expectations." },
  { title: "Generate topic", detail: "Original prompt with background and evidence angles." },
  { title: "Start debate", detail: "AI opponent immediately, real student matchmaking when available." },
  { title: "Complete rounds", detail: "Minimum three rounds with tracked messages and speaking goals." },
  { title: "AI judge", detail: "Scores logic, evidence, rebuttal, persuasion, clarity, and communication." }
];

export function DebateFlow() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>AI Debate Flow</CardTitle>
          <Badge variant="secondary">Phase 2 ready</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                {index < steps.length - 1 ? <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden /> : <Trophy className="h-4 w-4 text-accent" aria-hidden />}
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
            <Bot className="h-5 w-5 text-secondary" aria-hidden />
            <span className="text-sm font-semibold">AI fallback matchmaking</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
            <Gauge className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-sm font-semibold">Level-aware difficulty</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-background p-4">
            <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden />
            <span className="text-sm font-semibold">Readiness evaluation</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
