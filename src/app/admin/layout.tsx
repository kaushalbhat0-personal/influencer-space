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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-900">
      <MobileSidebarToggle
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

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
        className="fixed inset-y-0 left-0 z-40 w-64 -translate-x-full transform bg-gray-800 shadow-xl transition-transform lg:relative lg:translate-x-0"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-center border-b border-gray-700">
            <Link
              href="/admin/dashboard"
              onClick={closeSidebar}
              className="text-xl font-bold text-white"
            >
              Admin Panel
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {sidebarLinks.map((link) => {
              const isActive =
                link.href === "/admin/dashboard"
                  ? pathname === "/admin/dashboard"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-s8ul-cyan/20 text-s8ul-cyan"
                      : "text-gray-400 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-700 p-4">
            <Link
              href="/"
              onClick={closeSidebar}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            >
              ← Back to Site
            </Link>
          </div>
        </div>
      </motion.aside>

      <div className="lg:pl-64">
        <main className="p-4 sm:p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="flex h-64 items-center justify-center">
                <LoadingSpinner size="lg" />
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
