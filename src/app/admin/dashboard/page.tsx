import { ProductService } from "@/services/product.service";
import { AffiliateService } from "@/services/affiliate.service";
import { GalleryService } from "@/services/gallery.service";
import { GameService } from "@/services/games.service";
import { DashboardClient } from "./_components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let products: Awaited<ReturnType<typeof ProductService.findAll>> = [];
  let affiliates: Awaited<ReturnType<typeof AffiliateService.findAll>> = [];
  let gallery: Awaited<ReturnType<typeof GalleryService.findAll>> = [];
  let games: Awaited<ReturnType<typeof GameService.findAll>> = [];

  try {
    [products, affiliates, gallery, games] = await Promise.all([
      ProductService.findAll(),
      AffiliateService.findAll(),
      GalleryService.findAll(),
      GameService.findAll(),
    ]);
  } catch {}

  const totalClicks = affiliates.reduce((sum, a) => sum + (a.clicks ?? 0), 0);
  const activeProducts = products.filter((p) => p.isActive).length;

  return (
    <DashboardClient
      productCount={products.length}
      activeProductCount={activeProducts}
      affiliateCount={affiliates.length}
      totalClicks={totalClicks}
      galleryCount={gallery.length}
      gamesCount={games.length}
    />
  );
}
