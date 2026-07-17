"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Activity,
  ToggleRight,
  Zap,
  ArrowLeft,
  LogOut,
} from "lucide-react";

const links = [
  { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/super-admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/super-admin/health", label: "System Health", icon: Activity },
  { href: "/super-admin/features", label: "Feature Flags", icon: ToggleRight },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] shadow-2xl shadow-purple-500/5">
      <div className="flex h-16 items-center justify-center border-b border-white/10">
        <Link href="/super-admin" className="text-lg font-bold font-display text-purple-400">
          Platform
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-purple-500/15 text-purple-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 space-y-2">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Influencer View
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
