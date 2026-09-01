"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  DoorOpen,
  FileCheck2,
  Gamepad2,
  Gavel,
  GraduationCap,
  History,
  Home as HomeIcon,
  Library,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Swords,
  Users
} from "lucide-react";
import { ShellMoreMenu } from "@/components/app/shell-more-menu";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrainingTrack } from "@/components/training/training-track-context";
import { resolveTrackFromPathname } from "@/lib/track-route";
import { trackById, trackHasPracticeTests } from "@/lib/training-tracks";

// The shell owns ONE navigation definition. Desktop and mobile both render from these two arrays, so
// role gating and active state cannot drift apart between the two surfaces.
//
// Primary IA: Home | Train | Compete | Resources | Teams. Every old route stays functional —
// Progress, Study Arcade, tests, skills, history live in the secondary group or inside sections.
const navItems = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/training", label: "Train", icon: GraduationCap },
  { href: "/compete", label: "Compete", icon: Gavel },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/teams", label: "Teams", icon: Users }
] as const;

// Mobile bottom bar shows exactly these four; the rest live in the More sheet.
const BOTTOM_BAR_HREFS = ["/home", "/training", "/compete", "/teams"] as const;

// Secondary destinations: one click away in the desktop sidebar, one tap away inside mobile More.
const moreItems = [
  { href: "/dashboard", label: "Progress", icon: LayoutDashboard },
  { href: "/study-arcade", label: "Study Arcade", icon: Gamepad2 },
  { href: "/assignments", label: "Assignments", icon: FileCheck2 },
  { href: "/debates/history", label: "History", icon: History },
  { href: "/skills", label: "Skills", icon: BookOpenCheck },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/coach", label: "Coach", icon: ShieldCheck, requiresRole: ["COACH", "ADMIN"] },
  { href: "/admin", label: "Admin", icon: ShieldCheck, requiresRole: ["ADMIN"] }
] as const;

// One id, owned by whichever <main> this shell renders — never two at once.
const MAIN_ID = "main-content";

// One active-state language for every navigation surface: a semantic selected surface, a structural
// selected edge, normal foreground text, and the track accent on the icon as reinforcement only.
// Never hue alone — `aria-current="page"` always accompanies it.
const NAV_ITEM_BASE =
  "focus-ring flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors";
const NAV_ITEM_ACTIVE = "border-l-2 border-l-selected-border bg-selected-surface";
const NAV_ITEM_IDLE = "border-l-2 border-l-transparent hover:bg-muted";

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
  const router = useRouter();
  const [session, setSession] = useState<ShellSession | null>(null);
  // Full-screen practice: an active debate room (/debate/<id>) OR a role-play session room
  // (/training/<track>/room) takes over the whole viewport — no sidebar, no nav — so the room is the
  // only primary interface.
  const isDebateRoom = /^\/debate\/[^/]+$/.test(pathname);
  const roomMatch = pathname.match(/^\/training\/([^/]+)\/room$/);
  const focusMode = isDebateRoom || Boolean(roomMatch);

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
  const { track } = useTrainingTrack();
  const trackSlug = trackById(track).slug;
  // ---- Route-derived VISUAL identity (M12C) --------------------------------------------------
  // The route wins over a stale stored preference for what the chrome LOOKS like, and for nothing
  // else. `track`/`trackSlug` above remain the learner's stored selection and keep driving every
  // link, query parameter and persisted behaviour, so following a DECA link never rewrites a saved
  // HOSA preference. This mirrors the contract lib/track-server.ts already enforces server-side.
  // Derived from `pathname`, which is available on the first render, so there is no wrong-track flash.
  const routeTrack = resolveTrackFromPathname(pathname);
  const visualTrack = routeTrack ?? track;
  const visualTrackSlug = trackById(visualTrack).slug;
  // "Viewing:" on a route-scoped page (this page's track), "Track:" on a neutral one (your saved
  // selection). The wording never implies the saved preference changed.
  const trackChipLabel = routeTrack
    ? `Viewing: ${trackById(visualTrack).short}`
    : `Track: ${trackById(track).short}`;
  // Preserve the selected track when navigating to track-filterable content routes.
  const TRACK_AWARE = ["/home", "/compete", "/study-arcade", "/tests", "/skills", "/debate"];
  const withTrack = (href: string) => (TRACK_AWARE.includes(href) ? `${href}?track=${trackSlug}` : href);
  // Real values from the session (zero/Bronze for a brand-new account) — never hardcoded sample stats.
  const xp = session?.user?.xp ?? 0;
  const rank = (session?.user?.rank ?? "BRONZE").replace("_", " ");
  // Only show role-restricted links once we know the role. Students never see Coach/Admin.
  const roleAllows = (item: { requiresRole?: readonly string[] }) =>
    !item.requiresRole || (role ? item.requiresRole.includes(role) : false);
  const visibleNav = navItems.filter((item) => roleAllows(item as { requiresRole?: readonly string[] }));
  // Capability gating, applied beside role gating. A destination with no product behind it for the
  // track in view is not offered at all — the learner never picks Tests and then reads that Tests
  // belongs to other tracks. Both the desktop sidebar and mobile More derive from `visibleMore`, so
  // capability cannot drift between the two surfaces any more than role can.
  const capabilityAllows = (item: { href: string }) =>
    item.href !== "/tests" || trackHasPracticeTests(visualTrack);
  const visibleMore = moreItems.filter(
    (item) => roleAllows(item as { requiresRole?: readonly string[] }) && capabilityAllows(item)
  );
  const bottomBarNav = visibleNav.filter((item) => (BOTTOM_BAR_HREFS as readonly string[]).includes(item.href));
  // Mobile More carries every secondary destination the bottom bar does not — the same filtered list
  // the desktop sidebar shows, so nothing is reachable on one surface but not the other. Resources is
  // primary on desktop but is not one of the four bottom-bar destinations, so it belongs here too.
  const mobileMoreItems = [
    ...visibleNav.filter((item) => !(BOTTOM_BAR_HREFS as readonly string[]).includes(item.href)),
    ...visibleMore
  ].map((item) => ({ href: item.href, label: item.label, icon: item.icon }));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Only the debate room uses this floating exit now (role-play rooms exit via their own RoomChrome).
  // Debate rooms persist — leaving goes to history.
  function exitFocusMode() {
    if (window.confirm("End this practice and leave the room? Your progress is saved to your history.")) {
      router.push("/debates/history");
    }
  }

  // First focusable control in the document, in both shell branches. Visually hidden until focused,
  // and it occupies no space while hidden, so it can never shift layout.
  const skipLink = (
    <a
      href={`#${MAIN_ID}`}
      className="focus-ring sr-only rounded-md border bg-card px-4 py-3 text-sm font-semibold text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center"
    >
      Skip to main content
    </a>
  );

  if (focusMode) {
    return (
      <div className="min-h-screen bg-background" data-track={visualTrackSlug}>
        {skipLink}
        {/* Role-play rooms render their own in-room exit (RoomChrome); only the debate room still
            needs this floating control until it migrates onto the shared shell. */}
        {isDebateRoom ? (
          <button
            type="button"
            onClick={exitFocusMode}
            className="focus-ring fixed bottom-4 left-4 z-40 flex min-h-11 items-center gap-2 rounded-full border bg-card/95 px-4 py-2 text-sm font-semibold shadow-soft backdrop-blur hover:bg-muted"
          >
            <DoorOpen className="h-4 w-4" aria-hidden />
            Exit practice
          </button>
        ) : null}
        <main id={MAIN_ID} tabIndex={-1} className="min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  return (
    // data-track retints --track-accent for the whole shell (debate=gold, deca=emerald, hosa=red).
    // On a track-scoped route this is the ROUTE's track, so the chrome can never contradict the page.
    <div className="min-h-screen bg-background" data-track={visualTrackSlug}>
      {skipLink}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r bg-card px-4 py-5 lg:block">
        <Link href="/" className="focus-ring flex min-h-11 items-center gap-3 rounded-md px-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-track/40 bg-track/15 text-track">
            <Swords className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <span className="font-display text-lg font-bold uppercase leading-none tracking-wide">CompeteReady</span>
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-semibold uppercase">
                Beta
              </Badge>
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Competitive training</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="mt-8 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={withTrack(item.href) as Route}
                className={cn(NAV_ITEM_BASE, active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE)}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-track")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6">
          <p className="eyebrow px-3" id="shell-secondary-heading">
            More
          </p>
          {/* Kept visibly expanded: a disclosure here would add state and an extra interaction for
              seven links that already fit. */}
          <nav aria-labelledby="shell-secondary-heading" className="mt-1 space-y-1">
            {visibleMore.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={withTrack(item.href) as Route}
                  className={cn(NAV_ITEM_BASE, "text-xs", active ? NAV_ITEM_ACTIVE : NAV_ITEM_IDLE)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active && "text-track")} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 rounded-lg border bg-background p-4">
          <Link
            href="/profile"
            className="focus-ring flex min-h-11 items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
          >
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
          <Link
            href={"/training" as Route}
            className="focus-ring mt-2 flex min-h-11 items-center justify-between gap-2 rounded-md border border-track/40 bg-track/10 px-3 text-xs transition-colors hover:bg-track/15"
          >
            <span className="font-semibold text-foreground">{trackChipLabel}</span>
            <span className="font-semibold text-muted-foreground">Switch</span>
          </Link>
          <Button type="button" variant="outline" size="sm" className="mt-3 min-h-11 w-full" onClick={() => signOut({ callbackUrl: "/signin" })}>
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </Button>
        </div>
      </aside>

      {/* Bottom clearance: the fixed bar plus the device safe area, so no control can sit under it. */}
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="focus-ring flex min-h-11 items-center gap-2 rounded-md pr-2">
              <Swords className="h-5 w-5 shrink-0 text-track" aria-hidden />
              <span className="font-display text-base font-bold uppercase tracking-wide">CompeteReady</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShellMoreMenu items={mobileMoreItems} hrefFor={withTrack} isActive={isActive} />
              <Link
                href="/profile"
                className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border bg-card"
              >
                <UserAvatar username={profileUsername} displayName={profileName} avatarUrl={profileAvatar} size="sm" />
                <span className="sr-only">Profile — @{profileUsername}</span>
              </Link>
            </div>
          </div>
          <Link
            href={"/training" as Route}
            className="focus-ring mt-2 flex min-h-11 items-center justify-between gap-2 rounded-md border border-track/40 bg-track/10 px-3 text-xs transition-colors hover:bg-track/15"
          >
            <span className="font-semibold text-foreground">{trackChipLabel}</span>
            <span className="font-semibold text-muted-foreground">Switch</span>
          </Link>
        </header>
        <main id={MAIN_ID} tabIndex={-1} className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 px-2 py-2 backdrop-blur lg:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {bottomBarNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={withTrack(item.href) as Route}
              className={cn(
                "focus-ring flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border-t-2 px-2 text-[11px] font-semibold transition-colors",
                active ? "border-t-selected-border bg-selected-surface text-foreground" : "border-t-transparent text-muted-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-4 w-4", active && "text-track")} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
