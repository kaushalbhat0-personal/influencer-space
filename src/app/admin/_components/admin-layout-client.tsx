"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
    return <div className="min-h-dvh bg-[#0a0a0a]"><main>{children}</main></div>;
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        siteUrl={siteUrl}
      />

      {/* ─── Mobile header ─── */}
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
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 min-w-0">
        <main className="mx-auto max-w-6xl p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8">
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
