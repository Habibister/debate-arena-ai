import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Training page not found"
      description="That practice page may have moved or belongs to a different account. Head back to the dashboard to continue training."
      actionLabel="Open dashboard"
      actionHref="/dashboard"
    />
  );
}
