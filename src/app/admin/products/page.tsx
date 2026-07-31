import { requireTenant } from "@/lib/auth/require-tenant";
import { ProductsPage } from "@/features/products/components/products-page";
import { productService } from "@/features/products/service";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { tenantId } = await requireTenant();

  const products = await productService.list(tenantId);
  return <ProductsPage initialData={products} tenantId={tenantId} />;
}
