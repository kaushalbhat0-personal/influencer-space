"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { NotificationCenter } from "@/components/layout/NotificationCenter";

export function AdminLayoutClient({
  children,
  siteUrl,
}: {
  children: React.ReactNode;
  siteUrl: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

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
      />

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-white/10 bg-zinc-950/80 px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-sm font-bold text-transparent font-display">
          CreatorStore
        </span>
        <div className="flex-1" />
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
          aria-label="Search (Cmd+K)"
        >
          <Search className="h-5 w-5" />
        </button>
        <NotificationCenter />
      </div>

      {/* Desktop topbar */}
      <div className="fixed inset-x-0 top-0 z-20 hidden h-14 items-center gap-4 border-b border-white/10 bg-zinc-950/80 px-6 backdrop-blur-xl lg:flex ml-64">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-500 hover:border-white/20 hover:text-zinc-300 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        <div className="flex-1" />
        <NotificationCenter />
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
