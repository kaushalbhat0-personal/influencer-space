"use client";

import { Suspense, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Search, ExternalLink, Layout } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { RuntimeNotificationBell } from "@/components/layout/RuntimeNotificationBell";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import type { NavConfigWire } from "@/config/admin-nav";
import { AdminPublishControl } from "./admin-publish-control";

export function AdminLayoutClient({
  children,
  siteUrl,
  publishStatus = "draft",
  nav,
  density = "comfortable",
}: {
  children: React.ReactNode;
  siteUrl: string;
  publishStatus?: PublishStatusValue;
  nav: NavConfigWire;
  density?: "compact" | "comfortable" | "spacious";
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // RCCF-VISUAL-05D: wire layoutDensity -> html[data-density] for admin density system
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const isLoginPage = pathname === "/admin/login";
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  if (isLoginPage) {
    return <div className="min-h-dvh bg-[var(--surface-root)]"><main>{children}</main></div>;
  }

  return (
    <div className="min-h-dvh bg-[var(--surface-root)] flex">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        siteUrl={siteUrl}
        publishStatus={publishStatus}
        nav={nav}
      />

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-base)]/80 px-4 backdrop-blur-xl lg:hidden" style={{ boxShadow: "var(--shadow-elevation)" }}>
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-sm font-bold tracking-tight text-[var(--text-primary)]">
          CreatorStore
        </span>
        <div className="flex-1" />
        <AdminPublishControl status={publishStatus} size="sm" />
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          aria-label="Search (Cmd+K)"
        >
          <Search className="h-5 w-5" />
        </button>
        <RuntimeNotificationBell />
      </div>

      {/* Desktop topbar */}
      <div className="fixed inset-x-0 top-0 z-20 hidden h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--surface-base)]/80 px-6 backdrop-blur-xl lg:flex ml-64" style={{ boxShadow: "var(--shadow-elevation)" }}>
        <WorkspaceSwitcher />
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        <div className="flex-1" />
        <AdminPublishControl status={publishStatus} size="md" />
        <Link
          href="/builder"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Layout className="h-3.5 w-3.5" />
          Builder
        </Link>
        <Link
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View site
        </Link>
        <RuntimeNotificationBell />
      </div>

      {/* Global overlays */}
      <CommandPalette />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <main className="mx-auto max-w-6xl p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-20">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner size="lg" text="Loading..." />
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
