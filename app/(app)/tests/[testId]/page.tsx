import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { TestTakingClient } from "@/components/tests/test-taking-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PracticeTestPage({ params }: { params: { testId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const test = await prisma.practiceTest.findFirst({
    where: {
      id: params.testId,
      userId: session.user.id
    },
    include: {
      questions: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          question: true,
          choices: true,
          skillTag: true
        }
      }
    }
  });

  if (!test) {
    notFound();
  }

  if (test.status === "COMPLETED") {
    redirect(`/tests/${test.id}/results`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <Badge variant="secondary">Practice Test</Badge>
        <h1 className="mt-3 text-3xl font-bold">Answer every question</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          The answer key stays server-side until grading. Results will include explanations, weak areas, and recommended lessons.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["Track", test.organization],
            ["Event", test.eventType.replace(/_/g, " ")],
            ["Focus", test.eventCluster ?? "General"],
            ["Questions", String(test.questions.length)]
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="mt-1 font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <TestTakingClient
        test={{
          id: test.id,
          organization: test.organization,
          eventType: test.eventType,
          eventCluster: test.eventCluster,
          difficulty: test.difficulty,
          questions: test.questions
        }}
      />
    </div>
  );
}
