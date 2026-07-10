import { HeroSection } from "@/components/public/HeroSection";
import { ProductGrid } from "@/components/public/ProductGrid";
import { AffiliateGrid } from "@/components/public/AffiliateGrid";
import { ProductService } from "@/services/product.service";
import { AffiliateService } from "@/services/affiliate.service";
import { GlassCard } from "@/components/ui/GlassCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, affiliates] = await Promise.all([
    ProductService.findAllActive(),
    AffiliateService.findAllActive(),
  ]);

  return (
    <main className="min-h-screen bg-black">
      <HeroSection />

      <section id="products" className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/90" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Merchandise
            </span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50 sm:mb-12 sm:text-base">
            Exclusive gear from the CreatorBrand collection
          </p>
          <ProductGrid products={products} />
        </div>
      </section>

      <section className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/95 to-black" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Affiliate Picks
            </span>
          </h2>
          <p className="mb-8 text-center text-sm text-white/50 sm:mb-12 sm:text-base">
            Products I personally recommend
          </p>
          <AffiliateGrid affiliates={affiliates} />
        </div>
      </section>

      <section className="relative px-4 py-12 sm:py-20 md:px-8">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <GlassCard withGoldBorder className="p-6 sm:p-8 md:p-12">
            <h3 className="mb-4 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              Let&apos;s Collaborate
            </h3>
            <p className="mb-6 text-sm text-white/60 sm:mb-8 sm:text-base">
              Have a brand deal, partnership, or just want to say hello?
              Reach out and let&apos;s create something amazing together.
            </p>
            <Link
              href="/contact"
              className="inline-block w-full rounded-full bg-amber-500/30 px-6 py-3 text-base font-semibold text-amber-300 backdrop-blur-sm transition-colors hover:bg-amber-500/40 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              Get in Touch →
            </Link>
          </GlassCard>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-white/30 sm:text-sm">
        <p>© {new Date().getFullYear()} CreatorBrand. Built with ❤️ + AI.</p>
      </footer>
    </main>
  );
}
