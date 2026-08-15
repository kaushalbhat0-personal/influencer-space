import { ShoppingBag, BookOpen, Dumbbell, Users, Package, Calendar, Heart, Link2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SellItem {
  icon: LucideIcon;
  title: string;
  body: string;
}

const ITEMS: SellItem[] = [
  { icon: ShoppingBag, title: "Digital Products", body: "Sell ebooks, templates, presets, and downloads — delivered instantly." },
  { icon: BookOpen, title: "Courses", body: "Showcase your courses and services with a dedicated storefront section." },
  { icon: Dumbbell, title: "Coaching", body: "Offer one-on-one or group coaching sessions with bookings and payments." },
  { icon: Calendar, title: "Services & Bookings", body: "Let clients book your services directly with availability and payments." },
  { icon: Package, title: "Physical Products", body: "Sell merch, gear, and physical goods with inventory and shipping built in." },
  { icon: Heart, title: "Affiliate Links", body: "Promote products you love and earn commissions on every sale." },
  { icon: Users, title: "Memberships", body: "Showcase membership tiers with exclusive content and community." },
  { icon: Link2, title: "WhatsApp Commerce", body: "Let customers order direct via WhatsApp with one-tap checkout links." },
];

export function SellAnything() {
  return (
    <section id="sell" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Sell{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              what you create
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            Digital products, physical goods, services, bookings, and affiliate links — CreatorStore helps you sell and showcase it all.
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
          <a href="/signup?persona=creator" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Start selling — Free →</a>
        </div>
      </div>
    </section>
  );
}
