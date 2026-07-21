"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, Menu, X } from "lucide-react";
import type { DashboardNav, NavGroup, NavItem } from "@/lib/navigation/config";

interface SidebarProps {
  nav: DashboardNav;
  collapsed?: boolean;
  bottom?: React.ReactNode;
}

export function Sidebar({ nav, collapsed = false, bottom }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(nav.groups.filter((g) => g.defaultOpen).map((g) => g.label))
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center gap-3 px-4 border-b border-white/10">
        {collapsed ? (
          <span className="mx-auto bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-sm font-bold text-transparent font-display">
            CS
          </span>
        ) : (
          <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-sm font-bold text-transparent font-display">
            CreatorStore
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4" aria-label="Main navigation">
        {nav.groups.map((group) => (
          <SidebarGroup
            key={group.label}
            group={group}
            collapsed={collapsed}
            expanded={expandedGroups.has(group.label)}
            onToggle={() => toggleGroup(group.label)}
            isActive={isActive}
          />
        ))}
      </nav>

      {bottom && <div className="border-t border-white/10 p-3">{bottom}</div>}
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-[var(--surface-base)] border-r border-white/10 shadow-2xl">
            <div className="flex h-14 items-center justify-between px-4 border-b border-white/10">
              <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-sm font-bold text-transparent font-display">
                CreatorStore
              </span>
              <button onClick={() => setMobileOpen(false)} className="text-zinc-400 hover:text-white" aria-label="Close sidebar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-full overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-white/10 bg-[var(--surface-base)] transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function SidebarGroup({
  group,
  collapsed,
  expanded,
  onToggle,
  isActive,
}: {
  group: NavGroup;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors",
          collapsed && "justify-center"
        )}
        aria-expanded={expanded}
      >
        {!collapsed && <span className="flex-1 text-left">{group.label}</span>}
        {!collapsed && (
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
            aria-hidden="true"
          />
        )}
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.href)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 group",
        isActive
          ? "bg-s8ul-cyan/10 text-s8ul-cyan"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
        collapsed && "justify-center px-2"
      )}
      target={item.external ? "_blank" : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                item.badgeVariant === "cyan" && "bg-s8ul-cyan/20 text-s8ul-cyan",
                item.badgeVariant === "gold" && "bg-amber-500/20 text-amber-400",
                item.badgeVariant === "success" && "bg-green-500/20 text-green-400",
                (!item.badgeVariant || item.badgeVariant === "default") && "bg-zinc-800 text-zinc-300"
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
