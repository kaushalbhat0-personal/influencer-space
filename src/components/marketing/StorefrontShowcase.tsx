import { Globe, Smartphone, Search, Package, ShieldCheck, BadgeIndianRupee } from "lucide-react";

/**
 * RCCF-MKT-02-R1 — Section 9: product experience.
 *
 * RCCF-VISUAL-03B-CORRECTION: canonical previews are Mystic Minutes and
 * North Star (real published storefronts). Spower Gaming remains legitimate
 * showcase data but is no longer the marketing screenshot reference.
 * Previous certified captures at
 *   public/marketing-assets/storefront/01-desktop.png (Spower Gaming)
 * are retained on disk for backwards compat but not used in active marketing.
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

        {/* Canonical example previews — Mystic Minutes & North Star (real published storefronts).
            RCCF-VISUAL-03B-CORRECTION: Spower Gaming screenshot retired from active marketing;
            these previews use tokenized surfaces with canonical creator identities, no Spower imagery. */}
        <div className="mb-5 grid gap-6 md:grid-cols-[1.5fr_0.9fr] max-w-5xl mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[10px] font-medium text-zinc-600">Mystic Minutes — mysticminutes17</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-hover)] p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-card)] border border-[var(--border)] text-sm font-bold text-[var(--text-primary)]">MM</span>
                <div>
                  <p className="text-sm font-semibold text-white">Mystic Minutes</p>
                  <p className="text-xs text-zinc-500">Spirituality · Numerology · Self-growth</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">Discover the deeper meaning of life in just one minute ⏳ Daily Shorts on spirituality and the unseen.</p>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-zinc-400">Daily Shorts</span>
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-zinc-400">Lifestyle</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-4 shadow-2xl flex flex-col">
            <div className="mb-3 flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[10px] font-medium text-zinc-600">North Star — northstar</span>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-hover)] p-4 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-card)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]">NS</span>
                <p className="text-sm font-semibold text-white">Northstar Studio</p>
              </div>
              <p className="text-xs leading-relaxed text-zinc-400">We build visual identities, digital experiences, and campaigns for ambitious creators.</p>
              <p className="text-[10px] text-zinc-600 mt-3">Real published storefront</p>
            </div>
          </div>
        </div>

        <p className="mb-14 text-center text-xs text-zinc-600">
          Real examples — Mystic Minutes and Northstar Studio are live CreatorStore sites. Yours is generated from your profile.
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
