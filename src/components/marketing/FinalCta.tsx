import Link from "next/link";

/**
 * RCCF-MKT-02-R1 — Section 10: final CTA.
 * Closes on the positioning: "Your presence. Your business." Existing product
 * flow (/signup persona split) is unchanged. No urgency, no user counts, no
 * revenue claims.
 */
export function FinalCta() {
  return (
    <section id="final-cta" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent px-6 py-14 backdrop-blur-sm sm:px-12 sm:py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Your presence. Your business.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            Build your home online. Bring your work, links, and business
            together — in one place you own.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup?persona=creator" className="btn-primary px-10 py-3.5 text-sm">
              Start as Creator
            </Link>
            <Link href="/signup?persona=partner" className="btn-secondary px-10 py-3.5 text-sm">
              Become a Partner
            </Link>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            No credit card required · 15-day free trial · Keep 100% of every sale
          </p>
        </div>
      </div>
    </section>
  );
}
