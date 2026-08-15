"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { type NavConfig, type NavGroup } from "@/config/admin-nav";
import { ChevronDown, ExternalLink, LogOut, X } from "lucide-react";
import { PublishStatusBadge, type PublishStatusValue } from "@/components/publish/PublishStatusBadge";

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  siteUrl?: string;
  publishStatus?: PublishStatusValue;
  nav: NavConfig;
}

export function AdminSidebar({ open, onClose, siteUrl = "/", publishStatus = "draft", nav }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const asideRef = useRef<HTMLElement>(null);

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.href));

  const isGroupCollapsed = (group: NavGroup) => {
    if (!group.collapsible) return false;
    if (isGroupActive(group)) return false;
    return collapsed.has(group.label ?? "");
  };

  // RCCF-68.3.4 — mobile drawer a11y: Escape closes, body scroll locked, focus
  // moves into the drawer on open and returns to the trigger on close, and Tab
  // is trapped inside the drawer while it is open. Desktop (lg+) is unaffected —
  // the aside is static there and `open` only drives the mobile overlay.
  const openRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    openRef.current = true;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Simple focus trap: cycle Tab within the drawer.
      if (e.key === "Tab") {
        const aside = asideRef.current;
        if (!aside) return;
        const focusables = Array.from(
          aside.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Move focus into the drawer once it is visible.
    const focusTimer = window.setTimeout(() => {
      asideRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    }, 50);

    return () => {
      openRef.current = false;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        aria-label="Admin navigation"
        role={open ? "dialog" : "navigation"}
        {...(open ? { "aria-modal": true } : {})}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-zinc-950/90 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-lg font-bold text-transparent font-display"
          >
            CreatorStore
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.groups.map((group, gi) => (
            <div key={gi}>
              {group.label ? (
                <button
                  onClick={() => toggleGroup(group.label!)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                    isGroupActive(group)
                      ? "text-s8ul-cyan"
                      : "text-zinc-600 hover:text-zinc-400"
                  )}
                  aria-expanded={!isGroupCollapsed(group)}
                >
                  <span className="flex-1 text-left">{group.label}</span>
                  {group.collapsible && (
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isGroupCollapsed(group) ? "" : "rotate-180"
                      )}
                    />
                  )}
                </button>
              ) : null}

              <div className={cn("space-y-0.5", isGroupCollapsed(group) ? "hidden" : "")}>
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-s8ul-cyan/10 text-s8ul-cyan shadow-[0_0_12px_rgba(0,245,255,0.06)]"
                          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge === "unread" && (
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                      )}
                      {item.badge === "pending" && (
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-400">
                          •
                        </span>
                      )}
                      {item.badge === "soon" && (
                        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                          Soon
                        </span>
                      )}
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-s8ul-cyan" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-3 py-3 space-y-1">
          <div className="flex items-center justify-between px-4 py-2">
            <PublishStatusBadge status={publishStatus} size="sm" />
          </div>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            View Website
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
