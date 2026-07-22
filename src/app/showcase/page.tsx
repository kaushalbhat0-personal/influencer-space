import Link from "next/link";
import { showcaseService } from "@/lib/showcase/service";
import type { ShowcaseSite } from "@/lib/showcase/service";
import { Search, ExternalLink, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShowcasePage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const category = searchParams.category || undefined;
  const q = searchParams.q || undefined;

  const [sites, categories] = await Promise.all([
    showcaseService.getPublished({ category, search: q }),
    showcaseService.getCategories(),
  ]);

  const featured = sites.filter((s) => s.featured).slice(0, 3);

  return (
    <main className="min-h-screen bg-[var(--surface-root)]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">Creator Showcase</h1>
          <p className="mt-3 text-zinc-500">Explore websites built with CreatorStore. Every site is a real, published creator storefront.</p>
        </div>

        {/* Search + Categories */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center">
          <form className="flex gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input type="text" name="q" defaultValue={q} placeholder="Search creators..." className="admin-input pl-10 py-2 text-sm" />
            </div>
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-10">
          <Link href="/showcase" className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${!category ? "bg-indigo-500 text-white" : "bg-white/[0.04] text-zinc-400 hover:text-zinc-200"}`}>All</Link>
          {categories.map((c) => (
            <Link key={c} href={`/showcase?category=${encodeURIComponent(c)}`} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${category === c ? "bg-indigo-500 text-white" : "bg-white/[0.04] text-zinc-400 hover:text-zinc-200"}`}>{c}</Link>
          ))}
        </div>

        {/* Featured */}
        {featured.length > 0 && !category && !q && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Featured
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((site) => <ShowcaseCard key={site.id} site={site} />)}
            </div>
          </div>
        )}

        {/* All Sites */}
        <div>
          {sites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site) => <ShowcaseCard key={site.id} site={site} />)}
            </div>
          ) : (
            <div className="admin-card p-12 text-center">
              <Search className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No sites match your filter. Try a different category or search.</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-sm inline-flex items-center gap-2">
            Build Your Website <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function ShowcaseCard({ site }: { site: ShowcaseSite }) {
  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50 overflow-hidden transition-all hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/10">
      <div className="h-40 bg-gradient-to-br from-indigo-900/40 via-zinc-900 to-zinc-950 flex items-center justify-center relative">
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500/40" />
          <span className="h-2 w-2 rounded-full bg-amber-500/40" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/40" />
        </div>
        <p className="text-xs text-zinc-600 font-mono mt-6">{site.storefrontUrl}</p>
        {site.featured && (
          <span className="absolute top-3 right-3 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">Featured</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-zinc-500 uppercase">{site.category}</span>
        </div>
        <h3 className="text-base font-semibold text-white">{site.name}</h3>
        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{site.description}</p>
        {site.products && site.products.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {site.products.map((p) => (
              <span key={p.name} className="rounded-md bg-white/[0.03] border border-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-500">{p.name} · ₹{p.price}</span>
            ))}
          </div>
        )}
        <a href={site.storefrontUrl} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
          View Website <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
