import Link from "next/link";
import { EXAMPLES } from "./data";
import type { StoreExample } from "./data";
import { ExternalLink } from "lucide-react";

export function StoreExamples({ demos }: { demos?: StoreExample[] }) {
  const examples = (demos && demos.length > 0) ? demos : EXAMPLES;
  return (
    <section className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Explore{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              creator websites
            </span>
          </h2>
          <p className="mt-3 text-zinc-500">
            See what creators build with CreatorStore. Every example is a fully functional storefront.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {examples.map((example) => (
            <div
              key={example.id}
              className="group rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50 overflow-hidden transition-all hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/20 cursor-default"
            >
              {/* Placeholder preview */}
              <div className={`relative h-48 bg-gradient-to-br ${example.placeholder} flex items-center justify-center overflow-hidden`}>
                {/* Simulated browser chrome inside card preview */}
                <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.04] bg-black/20">
                  <span className="h-2 w-2 rounded-full bg-red-500/40" />
                  <span className="h-2 w-2 rounded-full bg-amber-500/40" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/40" />
                </div>

                {/* Simulated content */}
                <div className="w-3/4 space-y-2 mt-4">
                  <div className="h-2 rounded bg-white/[0.08] w-1/2 mx-auto" />
                  <div className="h-2 rounded bg-white/[0.05] w-3/4 mx-auto" />
                  <div className="grid grid-cols-2 gap-2 px-6 mt-3">
                    <div className="h-10 rounded bg-white/[0.04]" />
                    <div className="h-10 rounded bg-white/[0.04]" />
                    <div className="h-10 rounded bg-white/[0.04]" />
                    <div className="h-10 rounded bg-white/[0.04]" />
                  </div>
                </div>

                {/* Category badge */}
                <span className="absolute top-14 left-4 rounded-md bg-black/40 backdrop-blur-sm px-2.5 py-1 text-[10px] font-medium text-white/80">
                  {example.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-base font-semibold text-white">{example.name}</h3>
                <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{example.description}</p>

                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <span>View Demo</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-sm">
            Create Your Website
          </Link>
        </div>
      </div>
    </section>
  );
}
