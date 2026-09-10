import { AppShell } from "@/components/app/app-shell";
import { TrainingTrackProvider } from "@/components/training/training-track-context";
import { getTrackContext } from "@/lib/track-server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // The same request inputs the server pages resolve their track from, handed to the client shell so
  // both halves compute ONE effective track per render (see lib/track-precedence.ts). Read once here;
  // the session read is per-request cached, so pages pay nothing extra.
  const inputs = await getTrackContext();
  return (
    <TrainingTrackProvider inputs={inputs}>
      <AppShell>{children}</AppShell>
    </TrainingTrackProvider>
  );
}
