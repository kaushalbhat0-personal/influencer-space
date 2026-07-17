"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Link2,
  Image as ImageIcon,
  Trophy,
  Palette,
  CreditCard,
  Settings,
  LogOut,
  X,
  Rss,
  Globe,
  Gamepad2,
} from "lucide-react";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Storefront", icon: ShoppingBag },
  { href: "/admin/links", label: "Links & Affiliates", icon: Link2 },
  { href: "/admin/gallery", label: "Hall of Fame", icon: ImageIcon },
  { href: "/admin/settings/content", label: "Content Feed", icon: Rss },
  { href: "/admin/milestones", label: "Milestones", icon: Trophy },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/appearance", label: "Appearance", icon: Palette },
  { href: "/admin/settings/domain", label: "Domain", icon: Globe },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({
  open,
  onClose,
  siteUrl = "/",
}: {
  open: boolean;
  onClose: () => void;
  siteUrl?: string;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard";
    }
    return pathname.startsWith(href);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-zinc-950/90 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ─── Header ─── */}
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
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── Navigation ─── */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-s8ul-cyan/10 text-s8ul-cyan shadow-[0_0_12px_rgba(0,245,255,0.06)]"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-s8ul-cyan" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ─── Back to Site ─── */}
        <div className="border-t border-white/10 px-3 py-3">
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Site
          </a>
        </div>

        {/* ─── Sign Out ─── */}
        <div className="border-t border-white/10 px-3 py-3">
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
