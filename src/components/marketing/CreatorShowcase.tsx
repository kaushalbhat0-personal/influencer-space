import { ExternalLink } from "lucide-react";

interface DemoCreator {
  name: string;
  niche: string;
  products: string;
  avatarInitial: string;
  accent: string;
}

const CREATORS: DemoCreator[] = [
  { name: "TechBytes", niche: "Tech Education", products: "Courses, Templates, Ebooks", avatarInitial: "T", accent: "from-blue-500 to-indigo-500" },
  { name: "FitWithPriya", niche: "Fitness Coaching", products: "Workout Plans, Meal Guides, Coaching", avatarInitial: "F", accent: "from-emerald-500 to-teal-500" },
  { name: "BeatLab", niche: "Music Production", products: "Sample Packs, Courses, Presets", avatarInitial: "B", accent: "from-violet-500 to-purple-500" },
  { name: "Lens & Light", niche: "Photography", products: "Presets, Tutorials, Prints", avatarInitial: "L", accent: "from-amber-500 to-orange-500" },
  { name: "MarketMinute", niche: "Finance", products: "Courses, Newsletters, Webinars", avatarInitial: "M", accent: "from-rose-500 to-pink-500" },
  { name: "SpiceRoute", niche: "Food & Cooking", products: "Recipe Ebooks, Masterclasses, Kits", avatarInitial: "S", accent: "from-red-500 to-rose-500" },
];

export function CreatorShowcase() {
  return (
    <section id="showcase" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              creators like you
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            From tech educators to fitness coaches — CreatorStore works for every niche.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CREATORS.map((creator) => (
            <div
              key={creator.name}
              className="group rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-6 transition-all hover:border-white/[0.12] hover:bg-[var(--surface-base)]/50"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${creator.accent} flex items-center justify-center text-sm font-bold text-white`}>
                  {creator.avatarInitial}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{creator.name}</h3>
                  <p className="text-xs text-zinc-500">{creator.niche}</p>
                </div>
              </div>

              {/* Store preview */}
              <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-root)] p-4 mb-4 min-h-[100px] flex items-center justify-center">
                <span className="text-xs text-zinc-700">Storefront preview</span>
              </div>

              <p className="text-xs text-zinc-600 mb-3">Selling: <span className="text-zinc-400">{creator.products}</span></p>

              <a
                href="/signup"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View storefront <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
