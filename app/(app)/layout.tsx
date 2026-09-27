import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { TrainingTrackProvider } from "@/components/training/training-track-context";
import { LoadingState } from "@/components/ui/loading-state";
import { getTrackContext } from "@/lib/track-server";

// What stands in for the shell while React cannot render it synchronously. In practice that is only
// the build's static pass (see the boundary below); a real request never suspends here. Neutral on
// purpose: it names no track, no progress and no product claim.
function ShellFallback() {
  return (
    <div className="p-6">
      <LoadingState title="Loading..." />
    </div>
  );
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // The same request inputs the server pages resolve their track from, handed to the client shell so
  // both halves compute ONE effective track per render (see lib/track-precedence.ts). Read once here;
  // the session read is per-request cached, so pages pay nothing extra.
  const inputs = await getTrackContext();
  // The provider reads `useSearchParams()`, which Next only allows under a Suspense boundary: during
  // `next build` the static pass bails the subtree out to the client, and without a boundary above
  // the provider the whole page fails to prerender. This is the ONE boundary for every (app) route,
  // because this layout is the only place the provider is mounted. At runtime these routes render
  // per request (the session and cookie reads above mark them dynamic), so the fallback never shows.
  return (
    <Suspense fallback={<ShellFallback />}>
      <TrainingTrackProvider inputs={inputs}>
        <AppShell>{children}</AppShell>
      </TrainingTrackProvider>
    </Suspense>
  );
}
