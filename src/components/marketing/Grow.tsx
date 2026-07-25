import { Sparkles, Search, Mail, BarChart3, Share2, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GrowItem {
  icon: LucideIcon;
  title: string;
  body: string;
}

const ITEMS: GrowItem[] = [
  { icon: Sparkles, title: "AI Storefront", body: "Your storefront is generated from your content — products, copy, and SEO built automatically." },
  { icon: Search, title: "SEO Optimized", body: "Every page is SEO-optimized out of the box. Titles, descriptions, structured data — handled." },
  { icon: Mail, title: "Email Capture", body: "Collect emails with embedded forms. Build your audience and send updates when you launch." },
  { icon: BarChart3, title: "Analytics Dashboard", body: "See what's selling, where traffic comes from, and how your store performs — at a glance." },
  { icon: Share2, title: "Social Integrations", body: "Connect YouTube, Instagram, TikTok, and more. Your content syncs automatically." },
  { icon: TrendingUp, title: "Conversion Optimized", body: "Built for conversions — fast checkout, mobile-first design, and frictionless buying." },
];

export function Grow() {
  return (
    <section id="grow" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Grow your{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              brand
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            SEO, analytics, and social tools that turn visitors into customers — all built in, all automated.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-5 transition-all hover:border-white/[0.12] hover:bg-[var(--surface-base)]/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 mb-4">
                <item.icon className="h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a href="/signup" className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
            Grow your business — Free →</a>
        </div>
      </div>
    </section>
  );
}
