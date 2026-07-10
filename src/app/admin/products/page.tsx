import Link from "next/link";
import { ProductService } from "@/services/product.service";
import { ProductsList } from "./_components/products-list";
import { PRODUCTS_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await ProductService.findAll();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-sm text-gray-400">
            Manage your merchandise catalog
          </p>
        </div>
        <Link
          href={`${PRODUCTS_ROUTE}/new`}
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          + New Product
        </Link>
      </div>

      <ProductsList products={products} />
    </div>
  );
}
