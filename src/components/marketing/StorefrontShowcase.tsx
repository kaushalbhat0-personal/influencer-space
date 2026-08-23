import { Globe, Smartphone, Search, Package, ShieldCheck, BadgeIndianRupee } from "lucide-react";

/**
 * RCCF-MKT-02-R1 — Section 9: product experience.
 *
 * RCCF-MKT-03: the certified SPower Gaming captures (RCCF-MKT-02/R2/R3) are now
 * wired in as product demonstration — an example of what can be built. The
 * framing stays strictly demonstration-only per the MKT asset policy:
 *   public/marketing-assets/storefront/01-desktop.png   (1440x900)
 *   public/marketing-assets/storefront/02-mobile.png    (390x844)
 */
const FACTS = [
  { icon: Globe, title: "Your own domain", body: "Publish to your CreatorStore address, or connect your own domain with free SSL on eligible plans." },
  { icon: Smartphone, title: "Ready for every screen", body: "Your site is responsive out of the box — desktop, tablet, and phone." },
  { icon: Search, title: "Built-in SEO", body: "Meta tags, structured data, and sitemaps so people can actually find you." },
  { icon: Package, title: "Orders in one place", body: "Track orders, customers, and revenue from your dashboard." },
  { icon: ShieldCheck, title: "Checkout by Razorpay", body: "UPI, cards, net banking, and wallets — payments handled end to end." },
  { icon: BadgeIndianRupee, title: "You keep 100%", body: "No transaction fees. Every rupee your customers spend goes to you." },
] as const;

export function StorefrontShowcase() {
  return (
    <section id="proof" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            A real website,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              not just a page
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            Everything under the hood works like it should — because your name
            is on it.
          </p>
        </div>

        {/* Certified example captures — demonstration of what can be built */}
        <div className="mb-5 flex items-end justify-center gap-6">
          <div className="w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[10px] font-medium text-zinc-600">Desktop</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing-assets/storefront/01-desktop.png"
              alt="Example of a website built with CreatorStore, shown on desktop"
              className="w-full rounded-lg"
              loading="lazy"
            />
          </div>
          <div className="hidden w-44 shrink-0 rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-2 shadow-2xl md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing-assets/storefront/02-mobile.png"
              alt="The same CreatorStore site shown on a phone"
              className="w-full rounded-lg"
              loading="lazy"
            />
          </div>
        </div>
        <p className="mb-14 text-center text-xs text-zinc-600">
          An example site built on CreatorStore. Yours is generated from your
          profile — and looks entirely yours.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((fact) => (
            <div
              key={fact.title}
              className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/40 p-6 transition-colors hover:border-white/[0.12]"
            >
              <fact.icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-white">{fact.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{fact.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
