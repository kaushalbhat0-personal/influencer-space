import { FAQ_CATEGORIES } from "@/lib/marketing/content";

export function PricingFAQ() {
  return (
    <section id="faq" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              questions
            </span>
          </h2>
          <p className="mt-3 text-zinc-500">
            Everything you need to know about CreatorStore.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.id}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                {category.label}
              </h3>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30"
                  >
                    <summary className="flex cursor-pointer items-center justify-between px-5 py-4 list-none text-sm font-medium text-zinc-300">
                      {item.q}
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </summary>
                    <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-500">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
