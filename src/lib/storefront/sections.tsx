import { ProductGrid } from "@/components/public/ProductGrid";
import { GallerySection } from "@/components/public/GallerySection";
import { AffiliateGrid } from "@/components/public/AffiliateGrid";
import { ContentFeed } from "@/components/public/ContentFeed";
import { HeroBanner } from "@/app/[domain]/_components/hero-banner";
import { sectionRegistry } from "./registry";
import type { PublicPageData } from "@/services/public.service";
import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function registerDefaultSections() {
  if (sectionRegistry.size > 0) return;

  sectionRegistry.register({
    type: "hero", name: "Hero", priority: 1, isVisible: () => true,
    render: (data: PublicPageData) => {
      const h = data.hero;
      return <HeroBanner videoUrl={h.videoUrl || undefined} posterUrl={h.posterUrl || undefined} videoDesktopAlignment={h.videoDesktopAlignment} videoMobileAlignment={h.videoMobileAlignment} imageDesktopAlignment={h.imageDesktopAlignment} imageMobileAlignment={h.imageMobileAlignment} />;
    },
  });

  sectionRegistry.register({
    type: "products", name: "Products", priority: 10,
    isVisible: (data: PublicPageData) => data.products.length > 0,
    render: (data: PublicPageData) => (
      <Suspense key="products" fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
        <section id="products" className="py-8">
          <div className="mb-6"><h2 className="text-lg font-semibold text-white">Products</h2></div>
          <ProductGrid products={data.products} />
        </section>
      </Suspense>
    ),
  });

  sectionRegistry.register({
    type: "gallery", name: "Gallery", priority: 20,
    isVisible: (data: PublicPageData) => data.gallery.length > 0,
    render: (data: PublicPageData) => (
      <Suspense key="gallery" fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
        <section id="gallery" className="py-8">
          <div className="mb-6"><h2 className="text-lg font-semibold text-white">Hall of Fame</h2></div>
          <GallerySection items={data.gallery} />
        </section>
      </Suspense>
    ),
  });

  sectionRegistry.register({
    type: "links", name: "Links", priority: 30,
    isVisible: (data: PublicPageData) => data.links.length > 0,
    render: (data: PublicPageData) => (
      <Suspense key="links" fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
        <section id="links" className="py-8">
          <div className="mb-6"><h2 className="text-lg font-semibold text-white">Links</h2></div>
          <AffiliateGrid affiliates={data.links as never} />
        </section>
      </Suspense>
    ),
  });

  sectionRegistry.register({
    type: "feed", name: "Content Feed", priority: 40,
    isVisible: (data: PublicPageData) => data.feed.length > 0,
    render: (data: PublicPageData) => (
      <Suspense key="feed" fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
        <section id="feed" className="py-8">
          <div className="mb-6"><h2 className="text-lg font-semibold text-white">Latest Content</h2></div>
          <ContentFeed items={data.feed} />
        </section>
      </Suspense>
    ),
  });

  sectionRegistry.register({
    type: "footer", name: "Footer", priority: 99, isVisible: () => true,
    render: () => (
      <footer className="mt-12 border-t border-white/5 pt-6 pb-8 text-center">
        <p className="text-xs text-zinc-700">Powered by <a href={process.env.NEXT_PUBLIC_APP_URL || "https://influencer-space-alpha.vercel.app"} target="_blank" rel="follow" className="font-semibold text-zinc-500 transition-colors hover:text-zinc-300">CreatorStore</a></p>
      </footer>
    ),
  });
}
