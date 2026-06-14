import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NextStepCardProps = {
  title: string;
  description: string;
  href: Route;
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "accent";
};

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent"
};

export function NextStepCard({ title, description, href, icon: Icon, tone = "primary" }: NextStepCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:bg-muted">
        <CardContent className="flex h-full gap-4 p-4">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", toneClasses[tone])}>
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-semibold">
              {title}
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </span>
            <span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span>
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
