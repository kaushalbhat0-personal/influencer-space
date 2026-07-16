import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPublicPageData } from "@/services/public.service";
import { BuyNowButton } from "./_components/buy-now-button";
import type { PublicPageData } from "@/services/public.service";

export const dynamic = "force-dynamic";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getYouTubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

async function getPageData(slug: string): Promise<{ tenantId: string; data: PublicPageData } | null> {
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ subdomain: slug }, { customDomain: slug }],
    },
  });
  if (!tenant) return null;
  const data = await getPublicPageData(tenant.id);
  return { tenantId: tenant.id, data };
}

export default async function PublicPage({
  params,
}: {
  params: { domain: string };
}) {
  const pageData = await getPageData(params.domain);
  if (!pageData) notFound();

  const { tenantId, data } = pageData;
  const { profile, hero, products, links, gallery, milestones } = data;
  const c = profile.colors;

  return (
    <main
      className="min-h-screen bg-zinc-950 text-white"
      style={
        {
          "--accent": c.accent,
          "--primary": c.primary,
          "--secondary": c.secondary,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* ─── Live Badge ─── */}
        {hero.showLiveBadge && hero.liveBadgeText && (
          <div className="mb-5 flex items-center justify-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider text-red-400">
              {hero.liveBadgeText}
            </span>
          </div>
        )}

        {/* ─── Profile Header ─── */}
        <div className="flex flex-col items-center text-center">
          {profile.profileImage && (
            <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 ring-2 ring-white/5">
              <img
                src={profile.profileImage}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight">{profile.name}</h1>
          {profile.tagline && (
            <p className="mt-1 text-sm text-zinc-400">{profile.tagline}</p>
          )}

          {/* ─── Hero Subtitle ─── */}
          {hero.subtitle && (
            <p className="mt-2 max-w-xs text-base font-semibold text-zinc-300">
              {hero.subtitle}
            </p>
          )}

          {/* ─── CTA Buttons ─── */}
          {(hero.ctaText || hero.ctaSecondaryText) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {hero.ctaText && hero.ctaLink && (
                <a
                  href={hero.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-5 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  {hero.ctaText}
                </a>
              )}
              {hero.ctaSecondaryText && hero.ctaSecondaryLink && (
                <a
                  href={hero.ctaSecondaryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
                >
                  {hero.ctaSecondaryText}
                </a>
              )}
            </div>
          )}

          {profile.bio && (
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
              {profile.bio}
            </p>
          )}

          {/* Social links */}
          <div className="mt-4 flex items-center gap-3">
            {profile.social.instagram && (
              <a
                href={profile.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-pink-400"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
            {profile.social.youtube && (
              <a
                href={profile.social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
                aria-label="YouTube"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            )}
            {profile.social.twitter && (
              <a
                href={profile.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-sky-400"
                aria-label="Twitter"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* ─── Hero Media ─── */}
        {(hero.videoUrl || hero.posterUrl) && (
          <div className="mt-8 overflow-hidden rounded-xl border border-white/10">
            {hero.videoUrl ? (
              <video
                src={hero.videoUrl}
                poster={hero.posterUrl || undefined}
                autoPlay
                muted
                loop
                playsInline
                className="aspect-video w-full object-cover"
              />
            ) : (
              <img
                src={hero.posterUrl}
                alt=""
                className="aspect-video w-full object-cover"
              />
            )}
          </div>
        )}

        {/* ─── Links Section ─── */}
        {links.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Links
            </h2>
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-5 py-3.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 hover:border-white/20 active:scale-[0.98]"
              >
                {link.imageUrl && (
                  <img
                    src={link.imageUrl}
                    alt=""
                    className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                  />
                )}
                <span className="flex-1 truncate">{link.title}</span>
                <svg
                  className="h-4 w-4 flex-shrink-0 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </section>
        )}

        {/* ─── Products Section ─── */}
        {products.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Store
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-all hover:border-white/20"
                >
                  {product.imageUrl && (
                    <div className="aspect-square w-full overflow-hidden bg-zinc-800">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5 p-3">
                    <p className="line-clamp-1 text-sm font-medium text-white">
                      {product.name}
                    </p>
                    {product.description && (
                      <p className="line-clamp-2 text-xs text-zinc-500">
                        {product.description}
                      </p>
                    )}
                    <p className="font-display text-base font-bold text-[var(--secondary)]">
                      {formatINR(product.price)}
                    </p>
                    <BuyNowButton
                      productId={product.id}
                      tenantId={tenantId}
                      productName={product.name}
                      imageUrl={product.imageUrl}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Milestones Section ─── */}
        {milestones.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Journey
            </h2>
            <div className="relative space-y-6 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-zinc-800">
              {milestones.map((m) => (
                <div key={m.id} className="relative">
                  <span className="absolute -left-5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[var(--secondary)] ring-4 ring-zinc-950" />
                  <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 font-display text-xs font-bold"
                        style={{
                          backgroundColor: `${c.secondary}20`,
                          color: c.secondary,
                        }}
                      >
                        {m.year}
                      </span>
                      {m.stats && (
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: `${c.accent}20`,
                            color: c.accent,
                          }}
                        >
                          {m.stats}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-white">
                      {m.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                      {m.description}
                    </p>
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt={m.title}
                        className="mt-3 w-full rounded-lg object-cover"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Gallery Section ─── */}
        {gallery.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Gallery
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="group aspect-square overflow-hidden rounded-xl bg-zinc-900"
                >
                  {item.isVideo ? (
                    <div className="relative h-full w-full">
                      {(() => {
                        const embed = getYouTubeEmbed(item.url);
                        if (embed) {
                          return (
                            <iframe
                              src={embed}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={item.caption ?? ""}
                            />
                          );
                        }
                        return (
                          <video
                            src={item.url}
                            className="h-full w-full object-cover"
                            controls
                            preload="metadata"
                          />
                        );
                      })()}
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption ?? ""}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Footer ─── */}
        <footer className="mt-12 border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-zinc-700">
            Powered by{" "}
            <span className="font-semibold text-zinc-500">CreatorStore</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
