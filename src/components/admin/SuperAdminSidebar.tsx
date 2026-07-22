"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ADMIN_REGISTRY, GROUP_ORDER, type AdminGroup } from "@/config/admin-registry";
import { cn } from "@/lib/utils";
import { ArrowLeft, LogOut, ChevronDown } from "lucide-react";

const GROUP_LABELS: Record<AdminGroup, string> = {
  overview: "Overview",
  operations: "Operations",
  billing: "Billing",
  "ai-platform": "Creator Platform",
  platform: "Platform",
  system: "System",
};

const DEFAULT_OPEN: AdminGroup[] = ["overview"];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Set<AdminGroup>>(
    new Set(DEFAULT_OPEN)
  );

  const toggle = (group: AdminGroup) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/super-admin") return pathname === "/super-admin";
    return href !== "/super-admin" && pathname.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-white/[0.06] bg-[var(--surface-base)]">
      <div className="flex h-14 items-center px-4 border-b border-white/[0.06]">
        <Link href="/super-admin" className="text-sm font-bold text-indigo-400 tracking-tight">
          CreatorStore
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {GROUP_ORDER.map((group) => {
          const items = ADMIN_REGISTRY.filter((m) => m.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <button
                onClick={() => toggle(group)}
                className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
              >
                <span className="flex-1 text-left">{GROUP_LABELS[group]}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", expanded.has(group) && "rotate-180")} />
              </button>
              {expanded.has(group) && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((mod) => {
                    const Icon = mod.icon;
                    const active = isActive(mod.href);
                    return (
                      <Link
                        key={mod.id}
                        href={mod.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          active
                            ? "bg-indigo-500/10 text-indigo-400"
                            : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 truncate">{mod.title}</span>
                        {mod.badge && (
                          <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                            {mod.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-2 space-y-1">
        <Link href="/admin/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Creator View
        </Link>
        <button onClick={() => signOut({ callbackUrl: "/admin/login" })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-red-400">
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
