import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { LessonPractice } from "@/components/lessons/lesson-practice";
import { LessonView } from "@/components/lessons/lesson-view";
import { buttonVariants } from "@/components/ui/button";
import { getLesson } from "@/lib/lessons";

export default function LessonPage({ params }: { params: { slug: string } }) {
  const lesson = getLesson(params.slug);
  if (!lesson) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href={"/lessons" as Route} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Lessons
      </Link>

      <LessonView lesson={lesson} />

      {/* (5) Practice — wired to the existing drills pipeline (records real mastery). */}
      <section aria-labelledby="practice" className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="practice" className="text-xl font-bold">Practice</h2>
        </div>
        <LessonPractice
          drillArea={lesson.drillArea}
          skillSlug={lesson.skillSlug}
          skillLabel={lesson.skillLabel}
          questionCount={lesson.practice.questionCount}
          intro={lesson.practice.intro}
        />
      </section>
    </div>
  );
}
