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
    if (result.success) router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const result = await deleteProduct(product.id);
    if (result.success) router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`${PRODUCTS_ROUTE}/${product.id}/edit`} className="admin-btn-outline px-3 py-1.5 text-xs">
        Edit
      </Link>
      <button onClick={handleToggle} className="admin-btn-gold px-3 py-1.5 text-xs">
        {product.isActive ? "Deactivate" : "Activate"}
      </button>
      <button onClick={handleDelete} className="admin-btn-danger px-3 py-1.5 text-xs">
        Delete
      </button>
    </div>
  );
}
