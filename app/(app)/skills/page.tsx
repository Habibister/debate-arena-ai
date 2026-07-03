import { getServerSession } from "next-auth";
import { SkillPath } from "@/components/skills/skill-path";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { isDemoUser } from "@/lib/demo";
import { trackBySlug } from "@/lib/training-tracks";

const lessonStructure = ["Lesson", "Examples", "Guided practice", "Independent practice", "Mastery quiz"];

export default async function SkillsPage({ searchParams }: { searchParams: { track?: string } }) {
  const session = await getServerSession(authOptions);
  const showSampleProgress = isDemoUser(session?.user?.email);
  const activeTrack = trackBySlug(searchParams.track);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Skill Development</Badge>
          {activeTrack ? <Badge variant="outline">Training in: {activeTrack.label}</Badge> : null}
        </div>
        <h1 className="mt-3 text-3xl font-bold">Mastery paths</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Skills are organized by organization and lesson sequence, with focused pages for lessons, examples, guided reps, independent practice, and mastery checks.
        </p>
      </div>

      <SkillPath showSampleProgress={showSampleProgress} track={activeTrack?.id} />

      <Card>
        <CardHeader>
          <CardTitle>Lesson anatomy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {lessonStructure.map((item, index) => (
            <div key={item} className="rounded-lg border bg-background p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold">{item}</h3>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
