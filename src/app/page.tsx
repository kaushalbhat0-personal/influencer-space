import { VideoHero } from "@/components/public/VideoHero";
import { ProductGrid } from "@/components/public/ProductGrid";
import { AffiliateGrid } from "@/components/public/AffiliateGrid";
import { InstagramFeed } from "@/components/public/InstagramFeed";
import { VideoCarousel } from "@/components/public/VideoCarousel";
import { SocialStats } from "@/components/public/SocialStats";
import { GallerySection } from "@/components/public/GallerySection";
import { TimelineSection } from "@/components/public/TimelineSection";
import { GameCarousel } from "@/components/ui/GameCarousel";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ProductService } from "@/services/product.service";
import { AffiliateService } from "@/services/affiliate.service";
import { GalleryService } from "@/services/gallery.service";
import { TimelineService } from "@/services/timeline.service";
import { GameService } from "@/services/games.service";
import { getInfluencerConfig } from "@/config/influencer";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function safeFindAllActive<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [products, affiliates, galleryImages, timelineEvents, games, config] =
    await Promise.all([
      safeFindAllActive(() => ProductService.findAllActive()),
      safeFindAllActive(() => AffiliateService.findAllActive()),
      safeFindAllActive(() => GalleryService.findAllActive()),
      safeFindAllActive(() => TimelineService.findAllActive()),
      safeFindAllActive(() => GameService.findAllActive()),
      getInfluencerConfig(),
    ]);

  const galleryData = galleryImages.map((img) => ({
    id: img.id,
    url: img.imageUrl,
    title: img.title,
    description: img.description || "",
    category: img.category,
  }));

  const timelineData = timelineEvents.map((evt) => ({
    id: evt.id,
    year: evt.year,
    title: evt.title,
    description: evt.description,
    imageUrl: evt.imageUrl || undefined,
    stats: evt.stats || undefined,
  }));

  const gamesData = games.map((g) => ({
    id: g.id,
    name: g.name,
    logoUrl: g.logoUrl || undefined,
    description: g.description || undefined,
    genre: g.genre || undefined,
  }));

  return (
    <main className="min-h-screen bg-black">
      <VideoHero config={config} />

      <SocialStats />

      <GallerySection images={galleryData} />

      <TimelineSection events={timelineData} />

      <GameCarousel games={gamesData} />

      <section id="products" className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/90" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <AnimatedSection>
            <p className="mb-2 text-center font-gaming text-xs uppercase tracking-[0.2em] text-s8ul-cyan">
              Merch
            </p>
            <h2 className="mb-4 text-center font-gaming text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              The Armory
            </h2>
            <p className="mb-8 text-center text-sm text-white/50 sm:mb-12 sm:text-base">
              Official Snax & S8UL merchandise
            </p>
          </AnimatedSection>
          <ProductGrid products={products} />
        </div>
      </section>

      <section className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/95 to-black" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <AnimatedSection>
            <p className="mb-2 text-center font-gaming text-xs uppercase tracking-[0.2em] text-s8ul-pink">
              Gear
            </p>
            <h2 className="mb-4 text-center font-gaming text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              Gear I Use
            </h2>
            <p className="mb-8 text-center text-sm text-white/50 sm:mb-12 sm:text-base">
              The peripherals and gear Snax trusts for the grind
            </p>
          </AnimatedSection>
          <AffiliateGrid affiliates={affiliates} />
        </div>
      </section>

      <InstagramFeed instagramUrl={config.social.instagram} />

      <VideoCarousel />

      <section className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <AnimatedSection>
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8 md:p-12">
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-s8ul-cyan/5 via-transparent to-s8ul-pink/5" />
              </div>
              <h3 className="mb-4 font-gaming text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                Join the S8UL Squad
              </h3>
              <p className="mb-6 text-sm text-white/50 sm:mb-8 sm:text-base">
                From Hyderabad to the world — be part of the journey. Subscribe,
                follow, and let&apos;s build the biggest gaming community in India.
                Hyderabadi vibes only. &lt;3
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="https://youtube.com/@SnaxGaming"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-s8ul-pink to-s8ul-purple px-8 py-3 font-gaming text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:shadow-[0_0_25px_rgba(255,0,229,0.5)]"
                >
                  Subscribe →
                </Link>
                <Link
                  href="https://instagram.com/snaxgaming"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-s8ul-cyan/30 bg-s8ul-cyan/10 px-8 py-3 font-gaming text-xs font-bold uppercase tracking-wider text-s8ul-cyan backdrop-blur-sm transition-all hover:bg-s8ul-cyan/20 hover:shadow-[0_0_25px_rgba(0,245,255,0.3)]"
                >
                  Follow on IG
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-white/30 sm:text-sm">
        <p>© {new Date().getFullYear()} {config.name}. All rights reserved.</p>
        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-white/10">
          <span>#S8UL</span>
          <span>•</span>
          <Link
            href="/admin/login"
            className="transition-colors hover:text-white/40"
          >
            Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}
