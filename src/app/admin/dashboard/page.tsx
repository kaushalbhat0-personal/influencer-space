import { ProductService } from "@/services/product.service";
import { AffiliateService } from "@/services/affiliate.service";
import { DashboardClient } from "./_components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let products: Awaited<ReturnType<typeof ProductService.findAll>> = [];
  let affiliates: Awaited<ReturnType<typeof AffiliateService.findAll>> = [];

  try {
    [products, affiliates] = await Promise.all([
      ProductService.findAll(),
      AffiliateService.findAll(),
    ]);
  } catch {
    // Gracefully fallback to empty data
  }

  const totalClicks = affiliates.reduce(
    (sum, a) => sum + (a.clicks ?? 0),
    0,
  );
  const activeProducts = products.filter((p) => p.isActive).length;

  return (
    <DashboardClient
      productCount={products.length}
      activeProductCount={activeProducts}
      affiliateCount={affiliates.length}
      totalClicks={totalClicks}
    />
  );
}
