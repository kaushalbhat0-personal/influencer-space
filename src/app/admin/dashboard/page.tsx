import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProductService } from "@/services/product.service";
import { AffiliateService } from "@/services/affiliate.service";
import { GalleryService } from "@/services/gallery.service";
import { GameService } from "@/services/games.service";
import { DashboardClient } from "./_components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] p-8">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-lg text-red-400">
            Error: Tenant ID is missing or not configured for this account. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  let products: Awaited<ReturnType<typeof ProductService.findAll>> = [];
  let affiliates: Awaited<ReturnType<typeof AffiliateService.findAll>> = [];
  let gallery: Awaited<ReturnType<typeof GalleryService.findAll>> = [];
  let games: Awaited<ReturnType<typeof GameService.findAll>> = [];

  try {
    [products, affiliates, gallery, games] = await Promise.all([
      ProductService.findAll(tenantId),
      AffiliateService.findAll(tenantId),
      GalleryService.findAll(tenantId),
      GameService.findAll(tenantId),
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
