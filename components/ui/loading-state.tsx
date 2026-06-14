import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function LoadingState({ title, description, className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border bg-card p-4", className)} role="status" aria-live="polite">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        {description ? <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span> : null}
      </span>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
