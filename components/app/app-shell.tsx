"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  ClipboardList,
  Flame,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/debate", label: "Debate", icon: MessageSquareText },
  { href: "/skills", label: "Skills", icon: BookOpenCheck },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/study", label: "Study", icon: Layers3 },
  { href: "/coach", label: "Coach", icon: Users },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card px-4 py-5 lg:block">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-bold">DebateArena AI</span>
            <span className="block text-xs text-muted-foreground">Training OS</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">Silver progress</span>
            <span className="text-muted-foreground">375 XP</span>
          </div>
          <Progress value={42} className="mt-3" />
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-accent" aria-hidden />
            8-day streak
          </div>
        </div>

        <div className="mt-8 rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="h-4 w-4 text-accent" aria-hidden />
            Training stack
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Debate rounds, original tests, skill practice, XP, and coach visibility are wired into one learning loop.
          </p>
        </div>
      </aside>

      <div className="pb-16 lg:pb-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              DebateArena AI
            </Link>
            <Link href="/debate" className={buttonVariants({ size: "sm" })}>
              Debate
            </Link>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-semibold",
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
