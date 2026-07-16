import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchProducts } from "@/actions/product.actions";
import { ProductsManager } from "./_components/products-manager";
import type { ProductData } from "@/actions/product.actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  const result = await fetchProducts(tenantId);
  const products: ProductData[] =
    result.success && result.data ? result.data : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Storefront</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your merchandise catalog and digital products.
        </p>
      </div>
      <ProductsManager tenantId={tenantId} initialProducts={products} />
    </div>
  );
}
