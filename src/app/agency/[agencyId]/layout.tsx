import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  BarChart3,
  Settings,
} from "lucide-react";

const navLinks = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "creators", label: "Creators", icon: Users },
  { href: "stores", label: "Stores", icon: ShoppingBag },
  { href: "analytics", label: "Analytics", icon: BarChart3 },
  { href: "settings", label: "Settings", icon: Settings },
];

export default async function AgencyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { agencyId: string };
}) {
  return (
    <div className="flex min-h-dvh bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-white/10 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <Link
            href={`/agency/${params.agencyId}`}
            className="text-lg font-bold font-display text-s8ul-cyan"
          >
            Agency
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={`/agency/${params.agencyId}/${link.href}`}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-56 flex-1 min-w-0">
        <main className="p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
