import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DebateWritingPractice } from "@/components/skills/debate-writing-practice";
import { buttonVariants } from "@/components/ui/button";
import { getDebateSkillScenario } from "@/lib/debate-skill-practice";

export default function DebateSkillWritingPracticePage({ params }: { params: { slug: string } }) {
  const scenario = getDebateSkillScenario(params.slug, "BEGINNER", 0);

  return (
    <div className="space-y-6">
      <Link href={`/skills/${params.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to lesson
      </Link>

      <DebateWritingPractice slug={params.slug} initialScenario={scenario} />
    </div>
  );
}
