import Link from "next/link";
import type { Route } from "next";
import { BookOpen } from "lucide-react";
import { decaSimulationPrep } from "@/lib/education/deca-simulation-prep";

/**
 * The DECA role-play preparation path, on the two surfaces that need it (P1-D).
 *
 * `before` renders on the simulation setup: what the curriculum recommends reading first.
 * `after` renders on the ballot: the same lessons, offered as review.
 *
 * WHAT THE COPY MAY NOT SAY. Not "you are not ready" — readiness is not measured here, and inventing
 * the word would be inventing the measurement. Not "you got this wrong" after a round — the links
 * exist for every learner, so their presence diagnoses nothing. The `after` heading therefore says
 * so out loud, because a list of lessons under a score reads as an accusation unless it does.
 *
 * Nothing here gates anything: both variants are lists of links beside a button the learner can
 * press regardless.
 */
export function DecaSimulationPrepPanel({ variant }: { variant: "before" | "after" }) {
  const { core, skills } = decaSimulationPrep();
  if (core.length === 0 && skills.length === 0) return null;
  const before = variant === "before";

  return (
    <section className={before ? "rounded-lg border bg-muted/30 p-4" : "mt-4 rounded-lg border bg-muted/30 p-4"}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BookOpen className="h-4 w-4 text-track" aria-hidden />
        {before ? "Recommended before you simulate" : "Review your preparation"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {before
          ? "These lessons will help you prepare. You can start a role-play whenever you like."
          : "These are the lessons behind a role-play. Nothing here says you got any of them wrong."}
      </p>
      <ol className="mt-3 space-y-2">
        {core.map((step, i) => (
          <li key={step.lessonId} className="text-xs">
            <Link href={step.href as Route} className="font-semibold text-primary hover:underline">
              {`${i + 1}. ${step.title}`}
            </Link>
            <span className="block text-muted-foreground">{step.why}</span>
          </li>
        ))}
      </ol>
      {skills.length > 0 ? (
        <>
          <p className="mt-3 text-xs font-semibold">Skills a round leans on</p>
          <ul className="mt-2 space-y-2">
            {skills.map((step) => (
              <li key={step.lessonId} className="text-xs">
                <Link href={step.href as Route} className="font-semibold text-primary hover:underline">
                  {step.title}
                </Link>
                <span className="block text-muted-foreground">{step.why}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
