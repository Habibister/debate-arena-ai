"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Layers3,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users
} from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assignments", label: "Assignments", icon: FileCheck2 },
  { href: "/debate", label: "Debate", icon: MessageSquareText },
  { href: "/skills", label: "Skills", icon: BookOpenCheck },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/study", label: "Study", icon: Layers3 },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/coach", label: "Coach", icon: Users, requiresRole: ["COACH", "ADMIN"] },
  { href: "/admin", label: "Admin", icon: ShieldCheck, requiresRole: ["ADMIN"] }
] as const;

type ShellSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
    role?: string | null;
    rank?: string | null;
    xp?: number | null;
  };
};

function roleLabel(role?: string | null) {
  if (!role) return "Student";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<ShellSession | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session");
        const payload = (await response.json()) as ShellSession;
        if (active) {
          setSession(payload);
        }
      } catch {
        if (active) {
          setSession(null);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const profileName = session?.user?.displayName ?? session?.user?.name ?? "Student";
  const profileUsername = session?.user?.username ?? session?.user?.email?.split("@")[0] ?? "profile";
  const profileAvatar = session?.user?.avatarUrl ?? session?.user?.image;
  const role = session?.user?.role ?? null;
  // Real values from the session (zero/Bronze for a brand-new account) — never hardcoded sample stats.
  const xp = session?.user?.xp ?? 0;
  const rank = (session?.user?.rank ?? "BRONZE").replace("_", " ");
  // Only show role-restricted links once we know the role. Students never see Coach/Admin.
  const visibleNav = navItems.filter(
    (item) => !("requiresRole" in item) || (role ? (item.requiresRole as readonly string[]).includes(role) : false)
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card px-4 py-5 lg:block">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="flex items-center gap-2 text-sm font-bold">
              DebateArena AI
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-semibold uppercase">
                Beta
              </Badge>
            </span>
            <span className="block text-xs text-muted-foreground">Training OS</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href as Route}
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
          <Link href="/profile" className="flex items-center gap-3 rounded-md p-2 transition hover:bg-muted">
            <UserAvatar username={profileUsername} displayName={profileName} avatarUrl={profileAvatar} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{profileName}</span>
              <span className="block truncate text-xs text-muted-foreground">@{profileUsername}</span>
            </span>
          </Link>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Badge variant="secondary">{roleLabel(role)}</Badge>
            <span className="text-xs font-semibold text-muted-foreground">{rank} · {xp} XP</span>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={() => signOut({ callbackUrl: "/signin" })}>
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </Button>
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
            <Link href="/profile" className="flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-sm font-semibold">
              <UserAvatar username={profileUsername} displayName={profileName} avatarUrl={profileAvatar} size="sm" />
              <span className="max-w-24 truncate">@{profileUsername}</span>
            </Link>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href as Route}
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
        {visibleNav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href as Route}
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
