"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createNewProduct,
  updateExistingProduct,
  removeProduct,
  duplicateProduct,
  archiveProduct,
  restoreProduct,
  publishProduct,
  unpublishProduct,
  bulkPublish,
  bulkArchive,
  bulkDelete,
} from "@/actions/product.actions";
import type { ProductData } from "@/actions/product.actions";
import { ProductCard, ProductCardSkeleton, ProductCardEmpty } from "@/components/products/ProductCard";
import { ProductEditor } from "@/components/products/ProductEditor";
import { ProductsToolbar } from "@/components/products/ProductsToolbar";
import { PreviewShell } from "@/components/admin/PreviewShell";
import { ProductGrid } from "@/components/public/ProductGrid";
import type { PublicProductData } from "@/services/public.service";

const ITEMS_PER_PAGE = 24;

export function ProductsManager({
  tenantId,
  initialProducts,
  initialTotal,
}: {
  tenantId: string;
  initialProducts: ProductData[];
  initialTotal: number;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [pending, startTransition] = useTransition();

  // Search & filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("order");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Editor
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preview
  const [previewProducts, setPreviewProducts] = useState<PublicProductData[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Build preview
  useEffect(() => {
    const mapped = products
      .filter((p) => p.status === "PUBLISHED")
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
      }));
    setPreviewProducts(mapped);
  }, [products]);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (sort) params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", String(ITEMS_PER_PAGE));

      const { fetchProducts } = await import("@/actions/product.actions");
      const result = await fetchProducts({
        tenantId,
        search: search || undefined,
        status: statusFilter || undefined,
        sort: sort || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      if (result.success && result.data) {
        setProducts(result.data.products);
        setTotal(result.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, statusFilter, sort, page]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sort]);

  useEffect(() => {
    refreshProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, sort]);

  // Bulk actions
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }, [products, selected]);

  const handleBulkPublish = useCallback(async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    startTransition(async () => {
      await bulkPublish(ids, tenantId);
      setSelected(new Set());
      await refreshProducts();
    });
  }, [selected, tenantId, refreshProducts]);

  const handleBulkArchive = useCallback(async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    startTransition(async () => {
      await bulkArchive(ids, tenantId);
      setSelected(new Set());
      await refreshProducts();
    });
  }, [selected, tenantId, refreshProducts]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} products? This cannot be undone.`)) return;
    startTransition(async () => {
      await bulkDelete(ids, tenantId);
      setSelected(new Set());
      await refreshProducts();
    });
  }, [selected, tenantId, refreshProducts]);

  // Single product actions
  const handleEdit = useCallback((product: ProductData) => {
    setEditingProduct(product);
    setEditorOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingProduct(null);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(async (formData: FormData) => {
    setSaving(true);
    try {
      if (editingProduct) {
        await updateExistingProduct(tenantId, formData);
      } else {
        await createNewProduct(tenantId, formData);
      }
      setEditorOpen(false);
      setEditingProduct(null);
      await refreshProducts();
    } finally {
      setSaving(false);
    }
  }, [editingProduct, tenantId, refreshProducts]);

  const handleDuplicate = useCallback(async (id: string) => {
    startTransition(async () => {
      await duplicateProduct(id, tenantId);
      await refreshProducts();
    });
  }, [tenantId, refreshProducts]);

  const handleArchive = useCallback(async (id: string) => {
    startTransition(async () => {
      await archiveProduct(id, tenantId);
      await refreshProducts();
    });
  }, [tenantId, refreshProducts]);

  const handleRestore = useCallback(async (id: string) => {
    startTransition(async () => {
      await restoreProduct(id, tenantId);
      await refreshProducts();
    });
  }, [tenantId, refreshProducts]);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await removeProduct(id, tenantId);
      await refreshProducts();
      router.refresh();
    });
  }, [tenantId, refreshProducts, router]);

  const handlePublish = useCallback(async (id: string) => {
    startTransition(async () => {
      await publishProduct(id, tenantId);
      await refreshProducts();
    });
  }, [tenantId, refreshProducts]);

  const handleUnpublish = useCallback(async (id: string) => {
    startTransition(async () => {
      await unpublishProduct(id, tenantId);
      await refreshProducts();
    });
  }, [tenantId, refreshProducts]);

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Products</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage your merchandise catalog and digital products.</p>
          </div>
          <button onClick={handleCreate} className="admin-btn-cyan px-4 py-2 text-xs shrink-0">
            Add Product
          </button>
        </div>

        {/* Toolbar */}
        <ProductsToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
          sort={sort}
          onSortChange={(v) => { setSort(v); setPage(1); }}
          total={total}
          selectedCount={selected.size}
          onBulkPublish={handleBulkPublish}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
        />

        {/* Select all */}
        {products.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === products.length && products.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan/30"
            />
            <span className="text-xs text-zinc-500">
              {selected.size === products.length ? "Deselect all" : "Select all"}
            </span>
          </label>
        )}

        {/* Loading */}
        {loading && products.length === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && products.length === 0 && (
          <ProductCardEmpty onCreate={handleCreate} />
        )}

        {/* Grid */}
        {!loading && products.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  selected={selected.has(product.id)}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onArchive={product.status !== "ARCHIVED" ? handleArchive : undefined}
                  onRestore={product.status === "ARCHIVED" ? handleRestore : undefined}
                  onDelete={handleDelete}
                  onPublish={product.status === "DRAFT" ? handlePublish : undefined}
                  onUnpublish={product.status === "PUBLISHED" ? handleUnpublish : undefined}
                  loading={pending}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="admin-btn-outline px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      p === page
                        ? "bg-s8ul-cyan/10 text-s8ul-cyan"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="admin-btn-outline px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Live Preview */}
      {previewProducts.length > 0 && (
        <PreviewShell>
          <ProductGrid products={previewProducts} preview />
        </PreviewShell>
      )}

      {/* Product Editor Drawer */}
      <ProductEditor
        product={editingProduct}
        tenantId={tenantId}
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingProduct(null); }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
