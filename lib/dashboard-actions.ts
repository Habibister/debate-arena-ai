import { trackById, type TrackInfo, type TrainingTrack } from "@/lib/training-tracks";

// Track-aware dashboard "next step" cards. Only real activities for the selected track are returned —
// never a misleading card (e.g. a DECA/HOSA test generator for Model UN or General Debate). When no
// track is selected the user is browsing broadly, so the full generic set is shown.
export type DashboardAction = {
  key: "practice" | "tests" | "skills" | "study";
  title: string;
  description: string;
  href: string;
};

// Tests and study decks exist only for the organization-based exam tracks.
const TRACKS_WITH_TESTS: TrainingTrack[] = ["DECA", "HOSA"];
const TRACKS_WITH_DECKS: TrainingTrack[] = ["DECA", "HOSA"];

export function nextStepsForTrack(track?: TrackInfo | null): DashboardAction[] {
  if (!track) {
    // No selected track → generic browse-all set.
    return [
      { key: "practice", title: "Start an AI round", description: "Get a topic, speak through the round, and receive judge feedback.", href: "/debate" },
      { key: "tests", title: "Generate a practice test", description: "Train DECA or HOSA with original questions and explanations.", href: "/tests" },
      { key: "skills", title: "Open mastery lessons", description: "Work through examples, guided practice, and a mastery check.", href: "/skills" },
      { key: "study", title: "Study weak terms", description: "Use flashcards and video resources before your next test.", href: "/study" }
    ];
  }

  const slug = track.slug;
  const actions: DashboardAction[] = [];

  // Practice always exists — routed to the correct experience for the track.
  actions.push(
    track.id === "GENERAL_DEBATE"
      ? { key: "practice", title: "Start an AI debate round", description: "Choose a format, speak through the round, and receive judge feedback.", href: "/debate" }
      : {
          key: "practice",
          title: `Start ${track.label} practice`,
          description: `A ${track.label}-specific setup — the AI uses ${track.label} criteria.`,
          href: `/training/${slug}/practice`
        }
  );

  // Practice tests: DECA/HOSA only. Omit for Model UN and General Debate (no org exam generator).
  if (TRACKS_WITH_TESTS.includes(track.id)) {
    actions.push({ key: "tests", title: `Generate a ${track.short} practice test`, description: `Original ${track.short} questions with explanations and weak-area detection.`, href: `/tests?track=${slug}` });
  }

  // Skills/lessons exist for every track (shared foundations + track skills).
  actions.push({ key: "skills", title: "Open mastery lessons", description: "Work through examples, guided practice, and a mastery check.", href: `/skills?track=${slug}` });

  // Flashcard decks: DECA/HOSA only. Omit when the track has none rather than show an empty study CTA.
  if (TRACKS_WITH_DECKS.includes(track.id)) {
    actions.push({ key: "study", title: "Study weak terms", description: "Use flashcard decks and video resources before your next test.", href: `/study?track=${slug}` });
  }

  return actions;
}

// Resource shelf organization for a track (or undefined to browse all). Kept here so the dashboard and
// tests both filter resources the same way. `trackById` guards against an unknown id.
export function resourceOrgForTrack(track?: TrackInfo | null): string | undefined {
  return track ? trackById(track.id).organization : undefined;
}
