import { Database, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const adminItems = [
  { title: "Users and roles", detail: "Student, Coach, and Admin permissions are modeled.", icon: ShieldCheck },
  { title: "Database", detail: "Prisma schema covers debates, lessons, tests, teams, achievements, and XP.", icon: Database },
  { title: "AI Functions", detail: "OpenAI wrappers and API routes are isolated for observability and cost controls.", icon: Sparkles },
  { title: "Authentication", detail: "NextAuth credentials provider is configured for seeded demo accounts.", icon: KeyRound }
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Admin</Badge>
        <h1 className="mt-3 text-3xl font-bold">Platform controls</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Phase 1 creates the operational foundation. Phase 2 can add user management screens, AI usage logs, moderation queues, and billing controls.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adminItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{item.title}</CardTitle>
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
