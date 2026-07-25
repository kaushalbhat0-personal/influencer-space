import { ShoppingBag, BookOpen, Dumbbell, Users, Package, Calendar, Heart, Link2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SellItem {
  icon: LucideIcon;
  title: string;
  body: string;
}

const ITEMS: SellItem[] = [
  { icon: ShoppingBag, title: "Digital Products", body: "Sell ebooks, templates, presets, and downloads — delivered instantly." },
  { icon: BookOpen, title: "Courses", body: "Create and sell video courses with modules, lessons, and progress tracking." },
  { icon: Dumbbell, title: "Coaching", body: "Offer one-on-one or group coaching sessions with scheduling and payments." },
  { icon: Users, title: "Memberships", body: "Recurring membership tiers with exclusive content, community, and perks." },
  { icon: Package, title: "Physical Products", body: "Sell merch, gear, and physical goods with inventory and shipping built in." },
  { icon: Calendar, title: "Events & Bookings", body: "Sell tickets, host webinars, and let clients book your time directly." },
  { icon: Heart, title: "Donations & Tips", body: "Accept one-time support, tips, and donations from your audience." },
  { icon: Link2, title: "Affiliate Links", body: "Promote products you love and earn commissions on every sale." },
];

export function SellAnything() {
  return (
    <section id="sell" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Sell{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              anything
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            Digital products, courses, memberships, physical goods, services — whatever you create, CreatorStore helps you sell it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-5 transition-all hover:border-white/[0.12] hover:bg-[var(--surface-base)]/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 mb-4">
                <item.icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href="/signup" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Start selling — Free →</a>
        </div>
      </div>
    </section>
  );
}
