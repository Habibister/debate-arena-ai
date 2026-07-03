import { AppShell } from "@/components/app/app-shell";
import { TrainingTrackProvider } from "@/components/training/training-track-context";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrainingTrackProvider>
      <AppShell>{children}</AppShell>
    </TrainingTrackProvider>
  );
}
