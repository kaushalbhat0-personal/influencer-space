"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MobileSidebarToggle } from "@/components/admin/MobileSidebarToggle";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const sidebarLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/gallery", label: "Gallery", icon: "📸" },
  { href: "/admin/timeline", label: "Timeline", icon: "📅" },
  { href: "/admin/games", label: "Games", icon: "🎮" },
  { href: "/admin/products", label: "Products", icon: "📦" },
  { href: "/admin/affiliates", label: "Affiliates", icon: "🔗" },
  { href: "/admin/messages", label: "Messages", icon: "✉️" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin/login";
  const closeSidebar = () => setSidebarOpen(false);

  if (isLoginPage) {
    return <div className="min-h-dvh bg-[#0a0a0a]"><main>{children}</main></div>;
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex">
      <MobileSidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen((prev) => !prev)} />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 z-30 bg-black lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] shadow-2xl shadow-s8ul-cyan/5 lg:static lg:!translate-x-0"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b border-white/10">
            <Link href="/admin/dashboard" onClick={closeSidebar} className="admin-gradient-text text-xl font-bold font-gaming">
              S8UL Admin
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {sidebarLinks.map((link) => {
              const isActive = link.href === "/admin/dashboard"
                ? pathname === "/admin/dashboard"
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-s8ul-cyan/15 text-s8ul-cyan shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-s8ul-cyan" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-4">
            <Link
              href="/"
              onClick={closeSidebar}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Site
            </Link>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 min-w-0">
        <main className="p-4 pt-16 sm:p-6 sm:pt-16 lg:p-8 lg:pt-8">
          <Suspense fallback={<div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" text="Loading..." /></div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
