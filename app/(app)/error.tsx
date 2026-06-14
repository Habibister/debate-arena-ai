"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <CircleAlert className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-2xl font-bold">Something interrupted practice</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          The training screen could not load. Try again, or return to another practice area.
        </p>
        <Button type="button" className="mt-5" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
