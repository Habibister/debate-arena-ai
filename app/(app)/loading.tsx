import { BookOpenCheck, ClipboardList, MessageSquareText } from "lucide-react";
import { LoadingState, SkeletonBlock } from "@/components/ui/loading-state";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <LoadingState title="Loading your training space" description="Pulling together progress, next steps, and practice tools." />
      <div className="grid gap-4 md:grid-cols-3">
        {[MessageSquareText, ClipboardList, BookOpenCheck].map((Icon, index) => (
          <div key={index} className="rounded-lg border bg-card p-5">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
            <SkeletonBlock className="mt-5 h-5 w-32" />
            <SkeletonBlock className="mt-3 h-4 w-full" />
            <SkeletonBlock className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
