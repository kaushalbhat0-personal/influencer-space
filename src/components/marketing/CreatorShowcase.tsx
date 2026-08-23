import Link from "next/link";

/**
 * RCCF-MKT-02-R1 — Section 3: Showcase.
 * "Show what you do. Show what you make." — represents the breadth of people
 * who build a home here (creators, freelancers, artists, educators,
 * professionals, businesses) and what their space holds. Deliberately NOT
 * fictional named creators with empty preview placeholders.
 */
const AUDIENCES = [
  {
    who: "Creators",
    what: "Channel highlights, content feeds, merch, and courses for your audience.",
  },
  {
    who: "Freelancers & professionals",
    what: "Services, case studies, testimonials, and a booking link clients can actually find.",
  },
  {
    who: "Artists & photographers",
    what: "A portfolio that looks like you — gallery sections tuned to your work.",
  },
  {
    who: "Educators & coaches",
    what: "Course showcases, session bookings, and resources in one place.",
  },
  {
    who: "Businesses & brands",
    what: "A real website with products, contact, and your links — not just another profile page.",
  },
] as const;

export function CreatorShowcase() {
  return (
    <section id="showcase" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Show what you do.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Show what you make.
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            Your home is built from who you already are online — so whatever you
            create, it has a place to live.
          </p>
        </div>

        {/* Alternating editorial list — no repetitive icon cards */}
        <div className="mx-auto max-w-4xl space-y-4" role="list">
          {AUDIENCES.map((a, i) => (
            <div
              key={a.who}
              className={`flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/40 p-5 sm:flex-row sm:items-center sm:gap-6 ${
                i % 2 === 1 ? "sm:pl-10" : ""
              }`}
            >
              {/* RCCF-MKT-04-R1: fixed w-56 shrink-0 forced intrinsic width on
                  320-414px viewports; fixed-width alignment is now sm+ only. */}
              <h3 className="text-sm font-semibold text-white sm:w-56 sm:shrink-0">{a.who}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{a.what}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/signup?persona=creator" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Put your work on the web →
          </Link>
        </div>
      </div>
    </section>
  );
}
