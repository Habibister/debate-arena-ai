import { redirect } from "next/navigation";

// The Study section became the Study Arcade (master plan IA). Deck pages under /study/[deck]
// keep working — only this landing page moved.
export default function StudyPage({ searchParams }: { searchParams: { track?: string } }) {
  redirect(searchParams.track ? `/study-arcade?track=${searchParams.track}` : "/study-arcade");
}
