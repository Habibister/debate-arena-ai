import { notFound, redirect } from "next/navigation";
import { RoleplayRoom } from "@/components/rooms/roleplay-room";
import { getOfficialPrepFormat } from "@/lib/competition-specs";
import { trackBySlug } from "@/lib/training-tracks";

export const dynamic = "force-dynamic";

// Dedicated session room. Only the two role-play tracks have rooms; everyone else configures on the
// practice page. DECA fetches its registry prep format for the simulation clocks. The actual session
// config arrives client-side via sessionStorage (RoleplayRoom redirects back to setup if it's absent).
export default async function RoleplayRoomPage({ params }: { params: { track: string } }) {
  const track = trackBySlug(params.track);
  if (!track) notFound();
  if (track.id !== "DECA" && track.id !== "HOSA") redirect(`/training/${params.track}/practice`);

  const kind = track.id === "DECA" ? "deca" : "hosa";
  const officialPrep = kind === "deca" ? await getOfficialPrepFormat("DECA") : null;

  return <RoleplayRoom track={kind} officialPrep={officialPrep} />;
}
