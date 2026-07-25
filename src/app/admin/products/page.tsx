import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { ProductsManager } from "./_components/products-manager";
import { ProductCardSkeleton } from "@/components/products/ProductCard";
import { DashboardWidgetError } from "@/components/ui/DashboardWidget";

export const dynamic = "force-dynamic";

async function ProductsContent({ tenantId }: { tenantId: string }) {
  const { fetchProducts } = await import("@/actions/product.actions");
  const result = await fetchProducts({ tenantId, page: 1, limit: 24 });

  if (!result.success) {
    return <DashboardWidgetError message={result.error || "Failed to load products"} />;
  }

  return (
    <ProductsManager
      tenantId={tenantId}
      initialProducts={result.data?.products ?? []}
      initialTotal={result.data?.total ?? 0}
    />
  );
}

function ProductsFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded bg-white/5 animate-pulse" />
      <div className="h-10 rounded bg-white/5 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <ContentContainer>
        <DashboardWidgetError message="No tenant configured. Please contact support." />
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <Suspense fallback={<ProductsFallback />}>
        <ProductsContent tenantId={tenantId} />
      </Suspense>
    </ContentContainer>
  );
}
