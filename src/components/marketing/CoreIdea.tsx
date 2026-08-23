import { Globe, LayoutGrid, Link2, ShoppingBag, Gauge } from "lucide-react";

/**
 * RCCF-MKT-02-R1 — Section 2: the core idea.
 * One place for your online presence: website, profile, showcase, links,
 * and commerce composed as a single home — deliberately NOT a grid of
 * separate feature cards.
 */
const LAYERS = [
  { icon: Globe, label: "Your website", note: "Your name, your domain, your space on the web" },
  { icon: LayoutGrid, label: "Your work", note: "Portfolio, gallery, content, and milestones" },
  { icon: Link2, label: "Your links", note: "Social profiles, brands, and everything you share" },
  { icon: ShoppingBag, label: "Your store", note: "Products, services, courses, and checkout" },
] as const;

export function CoreIdea() {
  return (
    <section id="core" className="relative overflow-hidden px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you do online.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                One home.
              </span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Most tools give you one piece — a link page, a shop, or a blog.
              CreatorStore gives you the whole home: your presence, your work,
              your links, and your business live together in one place you own.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
              And because it&rsquo;s all one platform, it stays in sync — change
              your brand once and it carries everywhere, from your homepage to
              your checkout.
            </p>
          </div>

          {/* Composed visual — one home, layered */}
          <div className="relative">
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-5 shadow-2xl sm:p-6">
              <div className="mb-4 flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-3 text-[10px] font-medium text-zinc-600">yourname.com</span>
              </div>
              <div className="space-y-3" role="list" aria-label="What your CreatorStore home includes">
                {LAYERS.map((layer, i) => (
                  <div
                    key={layer.label}
                    className={`flex items-center gap-4 rounded-xl border border-white/[0.06] px-4 py-3 ${
                      i === LAYERS.length - 1 ? "bg-indigo-500/[0.06] border-indigo-500/20" : "bg-[var(--surface-root)]"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                      <layer.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{layer.label}</p>
                      <p className="text-xs text-zinc-500">{layer.note}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                <Gauge className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Managed end to end from one dashboard
              </div>
            </div>
            {/* Soft glow behind the frame */}
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.10),transparent_65%)]" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
