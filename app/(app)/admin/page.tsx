import { getServerSession } from "next-auth";
import { Database, KeyRound, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { authOptions } from "@/lib/auth";

const adminItems = [
  { title: "Users and roles", detail: "Student, Coach, and Admin permissions are modeled.", icon: ShieldCheck },
  { title: "Database", detail: "Prisma schema covers debates, lessons, tests, teams, achievements, and XP.", icon: Database },
  { title: "AI Functions", detail: "AI wrappers and API routes are isolated for observability and cost controls.", icon: Sparkles },
  { title: "Authentication", detail: "NextAuth credentials provider with bcrypt password hashing.", icon: KeyRound }
];

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Admin tools are restricted to admin accounts — students and coaches must not see them.
  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <div>
          <Badge variant="secondary">Admin</Badge>
          <h1 className="mt-3 text-3xl font-bold">Platform controls</h1>
        </div>
        <EmptyState
          icon={Lock}
          title="You need an admin account to access this page."
          description="Admin tools are only available to platform administrators."
          actionLabel="Back to dashboard"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Admin</Badge>
        <h1 className="mt-3 text-3xl font-bold">Platform controls</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Manage the operational foundation for users, organizations, AI usage, moderation, and coach-led learning programs.
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
