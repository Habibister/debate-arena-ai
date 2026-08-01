"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// One shell-level More surface, so a constant id is stable and unique — and identical on the server
// and the client, which a generated id would not guarantee.
const DIALOG_ID = "shell-more-menu";
const TITLE_ID = "shell-more-menu-title";

export type ShellMoreItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * The mobile secondary-navigation surface (M12C).
 *
 * It replaces the 12-item horizontal rail that clipped ~895px of itself at 375px and duplicated
 * Home / Train / Compete / Teams alongside the bottom bar. Every route the rail carried is reachable
 * here; the four bottom-bar destinations deliberately are not, because they remain one tap away.
 *
 * A modal dialog rather than a plain disclosure: the panel covers the page, so the content behind it
 * must not stay reachable by keyboard or scroll. Implemented locally — the project has no dialog
 * dependency and M12C adds none.
 */
export function ShellMoreMenu({
  items,
  hrefFor,
  isActive
}: {
  /** Caller-owned navigation data — this component defines no destination of its own. */
  items: readonly ShellMoreItem[];
  /** The shell's existing track-aware href builder, passed through unchanged. */
  hrefFor: (href: string) => string;
  /** The shell's existing active-route test, passed through unchanged. */
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Focus moves in on open and returns to the trigger on close, so a keyboard user never loses their
  // place. The restore runs on unmount too, via the cleanup below.
  useEffect(() => {
    if (!open) return;
    // Captured at open time: the element focus must return to, so the cleanup never depends on what
    // the ref happens to hold later.
    const returnTarget = triggerRef.current ?? (document.activeElement as HTMLElement | null);
    closeRef.current?.focus();

    // Scroll lock, remembering the caller's own value rather than assuming "visible".
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function focusable(): HTMLElement[] {
      const panel = panelRef.current;
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter((el) => el.getClientRects().length > 0);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (nodes.length === 0) {
        // Nothing to move to — keep focus where it is rather than letting it escape the dialog.
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      // A single focusable control (or focus somehow outside the panel) collapses to "stay here".
      if (nodes.length === 1 || !activeEl || !panelRef.current?.contains(activeEl)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && activeEl === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      body.style.overflow = previousOverflow;
      returnTarget?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={DIALOG_ID}
        className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <Menu className="h-5 w-5" aria-hidden />
        <span className="sr-only sm:not-sr-only">More</span>
      </button>

      {open ? (
        <div id={DIALOG_ID} role="dialog" aria-modal="true" aria-labelledby={TITLE_ID} className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop: a plain surface, not a control. Closing by keyboard is Escape or the close
              button, so this adds no redundant tab stop inside the dialog. */}
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div
            ref={panelRef}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-lg border-t bg-card shadow-overlay"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <span id={TITLE_ID} className="text-sm font-semibold text-foreground">
                More
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" aria-hidden />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <nav aria-label="More navigation" className="grid gap-1 p-3">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={hrefFor(item.href) as Route}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium text-foreground transition-colors",
                      active
                        ? "border-selected-border bg-selected-surface"
                        : "border-transparent hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-track")} aria-hidden />
                    <span>{item.label}</span>
                    {active ? <span className="sr-only">Current page</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
