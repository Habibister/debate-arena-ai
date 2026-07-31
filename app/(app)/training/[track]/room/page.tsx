import { notFound, redirect } from "next/navigation";
import { RoleplayRoom } from "@/components/rooms/roleplay-room";
import { getOfficialPrepFormat } from "@/lib/competition-specs";
import { trackBySlug } from "@/lib/training-tracks";

export const dynamic = "force-dynamic";

// Dedicated session room. DECA is the ONLY track with a room: it fetches its registry prep format
// for the simulation clocks, and the session config arrives client-side via sessionStorage
// (RoleplayRoom redirects back to setup if it's absent).
//
// M11R6: HOSA is deliberately excluded. Its generic health-science role-play generated and scored
// patient interactions with no sourced rubric behind them, so it was withdrawn. A direct hit on
// /training/hosa/room must therefore fail CLOSED — before RoleplayRoom mounts, before any scenario,
// turn or judging request, and without writing anything. HOSA lands on its Event Navigator, which
// is a different route than this one, so no redirect loop is possible.
const HOSA_ROOM_FALLBACK = "/training/hosa/events";

export default async function RoleplayRoomPage({ params }: { params: { track: string } }) {
  const track = trackBySlug(params.track);
  if (!track) notFound();
  if (track.id === "HOSA") redirect(HOSA_ROOM_FALLBACK);
  if (track.id !== "DECA") redirect(`/training/${params.track}/practice`);

  const officialPrep = await getOfficialPrepFormat("DECA");

  return <RoleplayRoom track="deca" officialPrep={officialPrep} />;
}
