import { HeroSection } from "@/components/public/HeroSection";
import { ProductGrid } from "@/components/public/ProductGrid";
import { AffiliateGrid } from "@/components/public/AffiliateGrid";
import { InstagramFeed } from "@/components/public/InstagramFeed";
import { VideoCarousel } from "@/components/public/VideoCarousel";
import { SocialStats } from "@/components/public/SocialStats";
import { ProductService } from "@/services/product.service";
import { AffiliateService } from "@/services/affiliate.service";
import { GlassCard } from "@/components/ui/GlassCard";
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
  const [products, affiliates, config] = await Promise.all([
    safeFindAllActive(() => ProductService.findAllActive()),
    safeFindAllActive(() => AffiliateService.findAllActive()),
    getInfluencerConfig(),
  ]);

  return (
    <main className="min-h-screen bg-black">
      <HeroSection config={config} />

      <SocialStats />

      <section id="products" className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/90" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              {config.name}&apos;s Fitness Merchandise
            </span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50 sm:mb-12 sm:text-base">
            Programs and guides designed to help you transform
          </p>
          <ProductGrid products={products} />
        </div>
      </section>

      <section className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/95 to-black" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Tools & Gear I Recommend
            </span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50 sm:mb-12 sm:text-base">
            Products and services {config.name} trusts on her fitness journey
          </p>
          <AffiliateGrid affiliates={affiliates} />
        </div>
      </section>

      <InstagramFeed instagramUrl={config.social.instagram} />

      <VideoCarousel />

      <section className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <GlassCard withGoldBorder className="p-6 sm:p-8 md:p-12">
            <h3 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              Let&apos;s Transform Together
            </h3>
            <p className="mb-6 text-sm text-white/60 sm:mb-8 sm:text-base">
              Ready to start your fitness journey? Whether it&apos;s fat loss,
              hormonal balance, or postpartum recovery—{config.name} is
              here to guide you every step of the way.
            </p>
            <Link
              href="/contact"
              className="inline-block w-full rounded-full bg-amber-500/30 px-6 py-3 text-base font-semibold text-amber-300 backdrop-blur-sm transition-colors hover:bg-amber-500/40 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              Start Your Transformation →
            </Link>
          </GlassCard>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-white/30 sm:text-sm">
        <p>© {new Date().getFullYear()} {config.name}. All rights reserved.</p>
        <Link
          href="/admin/login"
          className="mt-2 inline-block text-white/10 transition-colors duration-300 hover:text-white/40"
        >
          Admin Login
        </Link>
      </footer>
    </main>
  );
}
