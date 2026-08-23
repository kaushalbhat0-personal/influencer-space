import Link from "next/link";

/**
 * RCCF-MKT-02-R1 — Section 4: Sell.
 * "Turn what you offer into something people can buy." Commerce is a
 * capability of the home — present but not the entire identity. Categories
 * are compact and non-limiting; membership wording matches the roadmap-honest
 * FAQ (tiers are showcaseable today, recurring billing is not live yet).
 */
const OFFERS = [
  { title: "Products", note: "Physical goods with inventory and shipping built in" },
  { title: "Services & bookings", note: "Clients book and pay for your time directly" },
  { title: "Courses", note: "Showcase and sell what you teach" },
  { title: "Digital downloads", note: "Ebooks, presets, templates — delivered instantly" },
  { title: "Affiliate links", note: "Earn commissions on products you recommend" },
  { title: "Membership tiers", note: "Preview exclusive tiers now — recurring billing is on the roadmap" },
] as const;

export function SellAnything() {
  return (
    <section id="sell" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Turn what you offer into{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              something people can buy
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            When you&rsquo;re ready, your home can do business — checkout runs
            on Razorpay with UPI and cards, and you keep 100% of every sale.
          </p>
        </div>

        {/* Compact offer cloud — replaces the old 8-card grid */}
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {OFFERS.map((offer) => (
            <div
              key={offer.title}
              className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/40 p-5 transition-colors hover:border-white/[0.12]"
            >
              <h3 className="text-sm font-semibold text-white">{offer.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{offer.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/signup?persona=creator" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Start selling — Free →
          </Link>
        </div>
      </div>
    </section>
  );
}
