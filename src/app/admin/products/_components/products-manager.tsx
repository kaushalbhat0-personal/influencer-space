"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createNewProduct,
  toggleProductStatus,
  removeProduct,
  updateProductOrder,
} from "@/actions/product.actions";
import type { ProductData } from "@/actions/product.actions";
import type { PublicProductData } from "@/services/public.service";
import { PreviewShell } from "@/components/admin/PreviewShell";
import { ProductGrid } from "@/components/public/ProductGrid";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export function ProductsManager({
  tenantId,
  initialProducts,
}: {
  tenantId: string;
  initialProducts: ProductData[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setImageUrl("");
    setError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price.trim()) return;

    setError("");
    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("description", description.trim());
    formData.set("price", price);
    formData.set("imageUrl", imageUrl.trim());

    startTransition(async () => {
      const result = await createNewProduct(tenantId, formData);
      if (result.success && result.data) {
        setProducts((prev) => [result.data!, ...prev]);
        resetForm();
      } else {
        setError(result.error || "Failed to create product");
      }
    });
  }

  async function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      const result = await toggleProductStatus(id, tenantId, !currentActive);
      if (result.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, isActive: !currentActive } : p,
          ),
        );
      } else {
        alert(result.error || "Failed to toggle product");
      }
    });
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await removeProduct(id, tenantId);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      } else {
        alert(result.error || "Failed to delete product");
      }
    });
  }

  function moveProduct(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= products.length) return;

    const reordered = [...products];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    const updates = reordered.map((p, i) => ({ id: p.id, order: i }));
    setProducts(reordered);

    startTransition(async () => {
      const result = await updateProductOrder(tenantId, updates);
      if (!result.success) {
        setProducts(products);
      }
    });
  }

  const previewProducts: PublicProductData[] = products
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
    }));

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
      {/* ─── Add Product Form ─── */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">
          Add New Product
        </h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              className="admin-input"
              disabled={pending}
              required
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              placeholder="Price (₹)"
              className="admin-input"
              disabled={pending}
              required
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="admin-input min-h-[60px] resize-none"
            disabled={pending}
            rows={2}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="admin-input flex-1"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !name.trim() || !price.trim()}
              className="admin-btn-cyan shrink-0 px-6 py-2.5"
            >
              {pending ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {/* ─── Products Grid ─── */}
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/5 p-10 text-center text-sm text-zinc-600">
          No products yet. Add your first product above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-white/10"
            >
              {/* ─── Thumbnail ─── */}
              {product.imageUrl ? (
                <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-800">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-zinc-800/50">
                  <svg className="h-8 w-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}

              {/* ─── Body ─── */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-display text-sm font-bold text-s8ul-cyan">
                    {formatINR(product.price)}
                  </span>
                </div>

                {/* ─── Controls ─── */}
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveProduct(index, -1)}
                      disabled={pending || index === 0}
                      className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                      title="Move up"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveProduct(index, 1)}
                      disabled={pending || index === products.length - 1}
                      className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                      title="Move down"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggle(product.id, product.isActive)}
                      disabled={pending}
                      className={`relative ml-2 h-5 w-9 rounded-full transition-colors ${
                        product.isActive ? "bg-s8ul-cyan" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-black transition-transform ${
                          product.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(product.id, product.name)}
                    disabled={pending}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete product"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* ─── Live Preview ─── */}
    <PreviewShell>
      <ProductGrid products={previewProducts} preview />
    </PreviewShell>
  </div>
);
}
