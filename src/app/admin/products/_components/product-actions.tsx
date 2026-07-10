"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProduct, toggleProductActive } from "@/actions/product.actions";
import { PRODUCTS_ROUTE } from "@/lib/constants";
import type { ProductData } from "@/services/product.service";

export function ProductActions({ product }: { product: ProductData }) {
  const router = useRouter();

  async function handleToggle() {
    const result = await toggleProductActive(product.id);
    if (result.success) {
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const result = await deleteProduct(product.id);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`${PRODUCTS_ROUTE}/${product.id}/edit`}
        className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
      >
        Edit
      </Link>
      <button
        onClick={handleToggle}
        className="rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        {product.isActive ? "Deactivate" : "Activate"}
      </button>
      <button
        onClick={handleDelete}
        className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Delete
      </button>
    </div>
  );
}
