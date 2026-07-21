"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { getNavForRole } from "@/lib/navigation/config";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DashboardShellProps {
  children: React.ReactNode;
  topbar?: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, topbar, className }: DashboardShellProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "ADMIN";
  const nav = getNavForRole(role);

  return (
    <div className="flex min-h-screen bg-[var(--surface-root)]">
      <Sidebar
        nav={nav}
        bottom={
          <div className="flex items-center gap-3 px-1">
            <Link
              href="/admin/settings"
              className="flex-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            >
              <User className="h-4 w-4" />
              <span className="truncate">{(session?.user as { name?: string })?.name ?? "Account"}</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-red-400"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {topbar && (
          <div className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-white/10 bg-[var(--surface-base)]/80 backdrop-blur-xl px-4 lg:px-6">
            {topbar}
          </div>
        )}

        <main className={cn("flex-1 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8", className)}>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner size="lg" text="Loading..." />
              </div>
            }>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
