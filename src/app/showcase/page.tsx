import type { Metadata } from "next";
import Link from "next/link";
import { showcaseService, type ShowcaseSite } from "@/modules/tenant/application/showcase.service";
import { Search, ExternalLink, ArrowRight } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

// RCCF-LAUNCH-POLISH-05: consistent marketing chrome (nav/footer + metadata).
export const metadata: Metadata = {
  title: "Showcase",
  description: "Explore real creator storefronts built with CreatorStore.",
  alternates: { canonical: "/showcase" },
};

export default async function ShowcasePage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const category = searchParams.category || undefined;
  const q = searchParams.q || undefined;

  // RCCF-VISUAL-03B: single DB round-trip (was 2× listPublished ~2s)
  const { sites, categories } = await showcaseService.getPublishedWithCategories({ category, search: q });

  const featured = sites.filter((s) => (s as unknown as { featured?: boolean }).featured).slice(0, 3);
  // If no explicit featured flag (most tenants), promote first 3 as featured on unfiltered view for visual hierarchy
  const featuredFallback = featured.length === 0 && !category && !q ? sites.slice(0, 3) : featured;

  return (
    <main id="main-content" className="min-h-screen bg-[var(--surface-root)]">
      <MarketingNav />
      {/* 03A foundation: hero hierarchy with readable measure, intentional spacing */}
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-8 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-[65ch] text-center mb-8 sm:mb-10">
          <h1 className="platform-display">Creator Showcase</h1>
          <p className="platform-body mx-auto mt-3 max-w-[60ch] text-center">
            Every site here is a real, published creator storefront — built from a profile, owned on its own domain.
          </p>
          <p className="platform-metadata mt-2 text-center">
            Mystic Minutes · North Star — and every creator building with CreatorStore
          </p>
        </div>

        {/* Search + Categories — 03A controls: restrained indigo, role-based radius */}
        {sites.length > 0 || q || category ? (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-center items-stretch sm:items-center max-w-2xl mx-auto">
              <form className="flex gap-2 flex-1" action="/showcase" method="GET">
                {category && <input type="hidden" name="category" value={category} />}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" aria-hidden />
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Search creators..."
                    aria-label="Search creators"
                    className="admin-input pl-10 py-2.5 text-sm w-full"
                  />
                </div>
                <button type="submit" className="btn-primary px-5 text-sm shrink-0">
                  Search
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mb-10" role="tablist" aria-label="Filter by category">
              <Link
                href={q ? `/showcase?q=${encodeURIComponent(q)}` : "/showcase"}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors border ${
                  !category
                    ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                    : "bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                }`}
                aria-selected={!category}
                role="tab"
              >
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/showcase?category=${encodeURIComponent(c)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors border ${
                    category === c
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                      : "bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-selected={category === c}
                  role="tab"
                >
                  {c}
                </Link>
              ))}
            </div>
          </>
        ) : null}

        {/* Featured — 03A card hierarchy: elevated primary */}
        {featuredFallback.length > 0 && !category && !q && (
          <div className="mb-10">
            <h2 className="platform-section-label mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--color-warning)]" aria-hidden /> Featured
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredFallback.map((site) => (
                <ShowcaseCard key={site.id} site={site} featured />
              ))}
            </div>
          </div>
        )}

        {/* All Sites */}
        <div>
          {sites.length > 0 ? (
            <>
              {featuredFallback.length > 0 && !category && !q && (
                <h2 className="platform-section-label mb-4">All sites</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map((site) => (
                  <ShowcaseCard key={site.id} site={site} />
                ))}
              </div>
            </>
          ) : (
            <div className="platform-card-contextual p-10 sm:p-12 text-center max-w-2xl mx-auto" data-testid="showcase-empty">
              <Search className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-3" aria-hidden />
              <p className="font-display text-base font-semibold tracking-tight text-[var(--text-primary)]">No published sites yet.</p>
              <p className="platform-body mx-auto mt-2 text-sm max-w-[50ch]">
                Every site shown here is a real, published CreatorStore website — yours could be the first. Publish from the builder to appear here.
              </p>
            </div>
          )}
        </div>

        {/* CTA — 03A spacing, restrained */}
        <div className="mt-14 sm:mt-16 text-center">
          <p className="platform-body mx-auto mb-4 max-w-[50ch]">Start from your profile — your site is generated in minutes, then tuned in the visual builder.</p>
          <Link href="/signup?persona=creator" className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2">
            Build Your Website <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function getPreviewFallback(site: ShowcaseSite): { initials: string; accent: string } {
  const name = site.name?.trim() || "?";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  // deterministic subtle accent from name hash
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const accents = ["bg-[var(--surface-hover)]", "bg-[var(--surface-subtle)]", "bg-[var(--surface-card)]"];
  return { initials, accent: accents[hash % accents.length] };
}

function ShowcaseCard({ site, featured: isFeatured }: { site: ShowcaseSite; featured?: boolean }) {
  const { initials, accent } = getPreviewFallback(site);
  const isMystic = site.name.toLowerCase().includes("mystic") || site.id.toLowerCase().includes("mystic");
  const isNorthStar = site.name.toLowerCase().includes("north") || site.id.toLowerCase().includes("north");

  return (
    <div
      className={`group overflow-hidden transition-all flex flex-col ${
        isFeatured ? "platform-card-primary hover:shadow-[var(--shadow-card-hover)]" : "platform-card-secondary hover:border-[var(--border-strong)]"
      }`}
    >
      {/* Preview — prominent, intentional, no Spower Gaming asset */}
      <div className={`relative h-44 sm:h-48 overflow-hidden ${accent} border-b border-[var(--border-subtle)] flex items-center justify-center`}>
        {/* Use next/image for real preview if available; fallback to curated typographic preview */}
        {/* Canonical references: Mystic Minutes / North Star use subtle branded preview, not Spower screenshot */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-hover)] via-transparent to-transparent opacity-60" aria-hidden />
        {/* Window chrome */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-red-500/70 ring-1 ring-red-500/20" />
          <span className="h-2 w-2 rounded-full bg-amber-500/70 ring-1 ring-amber-500/20" />
          <span className="h-2 w-2 rounded-full bg-emerald-500/70 ring-1 ring-emerald-500/20" />
        </div>
        {isFeatured && (
          <span className="absolute top-3 right-3 rounded-[var(--radius-md)] bg-[var(--color-warning-surface)] border border-[var(--color-warning-border)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--color-warning)]">
            Featured
          </span>
        )}
        {/* Intentional preview content */}
        <div className="relative z-10 flex flex-col items-center gap-2 px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--surface-card)] border border-[var(--border)] text-sm font-bold tracking-tight text-[var(--text-primary)] shadow-sm">
            {initials}
          </div>
          <p className="font-display text-sm font-semibold tracking-tight text-[var(--text-primary)] text-center line-clamp-1">{site.name}</p>
          <p className="platform-caption text-center line-clamp-1">{site.storefrontUrl}</p>
          {(isMystic || isNorthStar) && (
            <span className="rounded-full bg-[var(--surface-card)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
              {isMystic ? "Mystic Minutes" : "North Star"} · Canonical
            </span>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="platform-caption uppercase tracking-widest">{site.category}</span>
        </div>
        <h3 className="font-display text-[15px] font-semibold tracking-tight text-[var(--text-primary)] line-clamp-1">{site.name}</h3>
        <p className="platform-body mt-1 text-sm line-clamp-2 !max-w-none flex-1">{site.description}</p>
        {site.products && site.products.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {site.products.slice(0, 3).map((p) => (
              <span key={p.name} className="rounded-[var(--radius-md)] bg-[var(--surface-hover)] border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                {p.name} · {typeof p.price === "number" ? formatCurrency(p.price) : ""}
              </span>
            ))}
          </div>
        )}
        <a
          href={site.storefrontUrl}
          target="_blank"
          rel="noopener"
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--primary-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] rounded-sm"
        >
          View Website <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}
