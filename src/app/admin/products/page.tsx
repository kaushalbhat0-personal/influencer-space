import Link from "next/link";
import { ProductService } from "@/services/product.service";
import { ProductsList } from "./_components/products-list";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PRODUCTS_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  let products: Awaited<ReturnType<typeof ProductService.findAll>> = [];
  let error: string | null = null;

  try {
    products = await ProductService.findAll();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load products";
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">Failed to load products</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
      </div>
    );
  }

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
          className="inline-flex items-center justify-center rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-s8ul-cyan/80"
        >
          + New Product
        </Link>
      </div>
      <ErrorBoundary>
        <ProductsList products={products} />
      </ErrorBoundary>
    </div>
  );
}
