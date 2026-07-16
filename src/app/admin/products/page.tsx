import { getTenantContext } from "@/lib/tenant";
import { fetchProducts } from "@/actions/product.actions";
import { ProductsManager } from "./_components/products-manager";
import type { ProductData } from "@/actions/product.actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const tenant = await getTenantContext();
  if (!tenant) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  const result = await fetchProducts(tenant.id);
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
      <ProductsManager tenantId={tenant.id} initialProducts={products} />
    </div>
  );
}
