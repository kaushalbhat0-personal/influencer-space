"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createNewProduct,
  toggleProductStatus,
  removeProduct,
  updateProductOrder,
  updateExistingProduct,
} from "@/actions/product.actions";
import type { ProductData } from "@/actions/product.actions";
import type { PublicProductData } from "@/services/public.service";
import { PreviewShell } from "@/components/admin/PreviewShell";
import { ProductGrid } from "@/components/public/ProductGrid";
import { ImageUploader } from "@/components/admin/ImageUploader";
import type { ImageUploaderHandle } from "@/components/admin/ImageUploader";
import { EditEntityDrawer } from "@/components/admin/EditEntityDrawer";

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
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const uploaderRef = useRef<ImageUploaderHandle>(null);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const editUploaderRef = useRef<ImageUploaderHandle>(null);

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setError("");
    setPendingFilePreview(null);
    uploaderRef.current?.reset();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price.trim()) return;

    let imageUrl = "";
    try {
      imageUrl = (await uploaderRef.current?.upload()) ?? "";
    } catch {
      setError("Image upload failed");
      return;
    }

    setError("");
    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("description", description.trim());
    formData.set("price", price);
    formData.set("imageUrl", imageUrl);

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

  function openEdit(product: ProductData) {
    setEditName(product.name);
    setEditDescription(product.description ?? "");
    setEditPrice(String(product.price));
    setEditImageUrl(product.imageUrl ?? "");
    setError("");
    setEditingProduct(product);
  }

  function closeEdit() {
    setEditingProduct(null);
    editUploaderRef.current?.reset();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct || !editName.trim() || !editPrice.trim()) return;

    let finalImageUrl = editImageUrl.trim();
    try {
      const uploaded = await editUploaderRef.current?.upload();
      if (uploaded) finalImageUrl = uploaded;
    } catch {
      setError("Image upload failed");
      return;
    }

    setError("");
    const formData = new FormData();
    formData.set("id", editingProduct.id);
    formData.set("name", editName.trim());
    formData.set("description", editDescription.trim());
    formData.set("price", editPrice);
    formData.set("imageUrl", finalImageUrl);

    startTransition(async () => {
      const result = await updateExistingProduct(tenantId, formData);
      if (result.success && result.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? result.data! : p)),
        );
        closeEdit();
      } else {
        setError(result.error || "Failed to update product");
      }
    });
  }

  const previewProducts: PublicProductData[] = (() => {
    const mapped = products
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
      }));

    if (name.trim() || price.trim() || pendingFilePreview) {
      mapped.unshift({
        id: "pending",
        name: name.trim() || "New Product",
        description: description.trim() || null,
        price: price ? parseFloat(price) : 0,
        imageUrl: pendingFilePreview,
      });
    }

    return mapped;
  })();

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
            <ImageUploader
              ref={uploaderRef}
              tenantId={tenantId}
              folder="products"
              onFileSelect={(_, previewUrl) => setPendingFilePreview(previewUrl)}
              onUploadingChange={setIsUploading}
            />
            <button
              type="submit"
              disabled={pending || isUploading || !name.trim() || !price.trim()}
              className="admin-btn-cyan shrink-0 px-6 py-2.5"
            >
              {pending || isUploading ? "Adding..." : "Add Product"}
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

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(product)}
                      disabled={pending}
                      className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-s8ul-cyan/10 hover:text-s8ul-cyan"
                      title="Edit product"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
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
            </div>
          ))}
        </div>
      )}
    </div>

    {/* ─── Edit Drawer ─── */}
    <EditEntityDrawer
      open={!!editingProduct}
      onClose={closeEdit}
      title="Edit Product"
    >
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Name</label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="admin-input w-full"
            disabled={pending}
            required
          />
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Price (₹)</label>
          <input
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            className="admin-input w-full"
            disabled={pending}
            required
          />
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Description</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="admin-input w-full min-h-[80px] resize-none"
            disabled={pending}
            rows={3}
          />
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Image</label>
          {editImageUrl && (
            <div className="h-20 w-full overflow-hidden rounded-lg bg-zinc-800">
              <img src={editImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <ImageUploader
            ref={editUploaderRef}
            tenantId={tenantId}
            folder="products"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending || !editName.trim() || !editPrice.trim()}
          className="admin-btn-cyan w-full py-2.5"
        >
          {pending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </EditEntityDrawer>

    {/* ─── Live Preview ─── */}
    <PreviewShell>
      <ProductGrid products={previewProducts} preview />
    </PreviewShell>
  </div>
);
}
