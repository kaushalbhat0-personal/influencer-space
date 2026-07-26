import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { ProductsPage } from "@/features/products/components/products-page";
import { productService } from "@/features/products/service";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const products = await productService.list(tenantId);
  return <ProductsPage initialData={products} />;
}
