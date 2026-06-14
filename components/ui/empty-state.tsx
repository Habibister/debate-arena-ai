import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed bg-card p-6 text-center", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <a href={actionHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
