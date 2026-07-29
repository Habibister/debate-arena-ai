import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Dumbbell, MessageSquare } from "lucide-react";
import { LessonPractice } from "@/components/lessons/lesson-practice";
import { LessonView } from "@/components/lessons/lesson-view";
import { RoleplayCourseFooter, RoleplayLessonView } from "@/components/lessons/roleplay-lesson-view";
import { RoleplayLessonPractice } from "@/components/lessons/roleplay-lesson-practice";
import { buttonVariants } from "@/components/ui/button";
import { getLesson } from "@/lib/lessons";
import { getRoleplayLesson } from "@/lib/roleplay-lessons";

export default function LessonPage({ params }: { params: { slug: string } }) {
  const lesson = getLesson(params.slug);
  const roleplay = getRoleplayLesson(params.slug);
  if (!lesson && !roleplay) {
    notFound();
  }

  const back = (
    <Link href={"/lessons" as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Lessons
    </Link>
  );

  // Role-play lesson (DECA/HOSA): authored teaching + an interactive mini role-play whose feedback
  // reuses the Side Coach route (no mastery/record) + the course-map footer.
  if (roleplay) {
    return (
      <div className="space-y-6">
        {back}
        <RoleplayLessonView lesson={roleplay} />
        <section aria-labelledby="practice" className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            <h2 id="practice" className="text-xl font-bold">Practice</h2>
          </div>
          <RoleplayLessonPractice lesson={roleplay} />
        </section>
        <RoleplayCourseFooter lesson={roleplay} />
      </div>
    );
  }

  // Debate concept lesson (Claim/Warrant/Impact) — practice records real mastery via the drills pipeline.
  return (
    <div className="space-y-6">
      {back}
      <LessonView lesson={lesson!} />
      <section aria-labelledby="practice" className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="practice" className="text-xl font-bold">Practice</h2>
        </div>
        <LessonPractice
          drillArea={lesson!.drillArea}
          skillSlug={lesson!.skillSlug}
          skillLabel={lesson!.skillLabel}
          questionCount={lesson!.practice.questionCount}
          intro={lesson!.practice.intro}
        />
      </section>
    </div>
  );
}
