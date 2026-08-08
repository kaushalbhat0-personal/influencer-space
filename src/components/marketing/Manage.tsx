import { Package, Users, CreditCard, LayoutGrid, FileText, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ManageItem {
  icon: LucideIcon;
  title: string;
  body: string;
}

const ITEMS: ManageItem[] = [
  { icon: Package, title: "Orders", body: "Track, fulfill, and manage every order from one dashboard. Real-time status updates." },
  { icon: Users, title: "Customers", body: "See who's buying, what they purchase, and build relationships with your audience." },
  { icon: CreditCard, title: "Payments", body: "UPI, cards, and net banking via Razorpay. Payouts directly to your account." },
  { icon: LayoutGrid, title: "Products", body: "Add, edit, and organize products, courses, and digital downloads in minutes." },
  { icon: FileText, title: "Content", body: "Manage your gallery, milestones, content feed, and all your creator assets in one place." },
  { icon: BarChart3, title: "Analytics", body: "Revenue, traffic, conversion rates — know what's working and what to improve." },
];

export function Manage() {
  return (
    <section id="manage" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your entire business.<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              One dashboard.
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            CreatorStore is the operating system for your creator business. Products, payments, content, customers — all in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-5 transition-all hover:border-white/[0.12] hover:bg-[var(--surface-base)]/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-4">
                <item.icon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href="/signup?persona=creator" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
            Start building — Free →</a>
        </div>
      </div>
    </section>
  );
}
