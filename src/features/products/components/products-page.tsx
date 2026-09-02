"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageOpen } from "lucide-react";
import { ImageManager } from "@/components/products/ImageManager";
import type { Column } from "@/features/_shared/components/crud-table";
import type { ProductData, ProductFormInput } from "../types";
import { createProduct, updateProduct, deleteProduct } from "../actions";
import { getProductTypeLabel, getProductStatusPresentation, getCommerceModePresentation } from "../presentation";
import { PRODUCT_TYPE_REGISTRY } from "@/modules/product-types";
import { formatCurrency } from "@/lib/utils";

interface ProductsPageProps {
  initialData: ProductData[];
  tenantId: string;
}

export function ProductsPage({ initialData, tenantId }: ProductsPageProps) {
  const [products, setProducts] = useState<ProductData[]>(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProductData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormInput>({
    name: "",
    price: 0,
    type: "digital",
    commerceMode: "ONLINE",
    status: "PUBLISHED",
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", price: 0, type: "digital", commerceMode: "ONLINE", status: "PUBLISHED" });
    setDrawerOpen(true);
  };

  const openEdit = (product: ProductData) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? undefined,
      price: product.price,
      imageUrl: product.imageUrl ?? undefined,
      images: product.images,
      slug: product.slug ?? undefined,
      status: product.status,
      type: product.type,
      commerceMode: product.commerceMode,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      seoTitle: product.seoTitle ?? undefined,
      seoDescription: product.seoDescription ?? undefined,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        const updated = await updateProduct(editing.id, form);
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
      } else {
        const created = await createProduct(form);
        setProducts((prev) => [created, ...prev]);
      }
      setDrawerOpen(false);
    } catch (err) {
      // RCCF-72.18D.7.1 — guided creator UX for the selling gate: point the
      // creator at the canonical payment setup surface. Unknown failures
      // rethrow so nothing is silently swallowed.
      const message = err instanceof Error ? err.message : "";
      if (message.startsWith("Payment setup required")) {
        setSaveError(`${message} Open Admin → Payments to connect and verify your account.`);
      } else {
        throw err;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteProduct(confirmDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setDeleteSuccess(`"${confirmDelete.name}" deleted.`);
      setTimeout(() => setDeleteSuccess(null), 3000);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    { key: "name", header: "Name", render: (p: Record<string, unknown>) => (p as unknown as ProductData).name, sortable: true },
    {
      key: "status",
      header: "Status",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        const s = getProductStatusPresentation(d.status);
        return <Badge variant={s.badgeVariant}>{s.label}</Badge>;
      },
      sortable: true,
    },
    {
      key: "price",
      header: "Price",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        return formatCurrency(d.price);
      },
      sortable: true,
    },
    {
      key: "type",
      header: "Type",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        return <span className="text-xs text-[var(--text-muted)]">{getProductTypeLabel(d.type)}</span>;
      },
    },
    {
      key: "commerceMode",
      header: "Sells via",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        const c = getCommerceModePresentation(d.commerceMode);
        return <Badge variant={c.badgeVariant}>{c.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "",
      render: (p: Record<string, unknown>) => {
        const d = p as unknown as ProductData;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors" aria-label={`Edit ${d.name}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirmDelete(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors" aria-label={`Delete ${d.name}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <FeaturePage
      title="Products"
      description="Create, price, and manage the products your audience can buy."
      actions={
        <button onClick={openCreate} className="btn-primary text-xs">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      }
    >
      {deleteError && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-600" role="alert">
          {deleteError}
        </div>
      )}
      {deleteSuccess && (
        <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-700" role="status">
          {deleteSuccess}
        </div>
      )}
      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Create your first product to start selling to your audience."
          icon={PackageOpen}
          action={
            <button onClick={openCreate} className="btn-primary text-sm">
              <Plus className="h-4 w-4" /> Create Product
            </button>
          }
        />
      ) : (
        <CrudTable
          columns={columns}
          data={products as unknown as Record<string, unknown>[]}
          keyExtractor={(p) => (p as unknown as ProductData).id}
          searchable
          searchKeys={["name", "type", "status"]}
          emptyMessage="No products yet. Create your first product."
        />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Delete ${confirmDelete.name}`}>
          <div className="absolute inset-0 bg-[rgba(24,24,27,0.20)] backdrop-blur-sm" onClick={() => !isDeleting && setConfirmDelete(null)} />
          <div className="relative admin-card p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete &quot;{confirmDelete.name}&quot;?</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">This will permanently delete the product. This cannot be undone.</p>
            {deleteError && <p className="mt-3 text-xs text-red-600" role="alert">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="btn-secondary text-sm disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isDeleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50" aria-label={`Confirm delete ${confirmDelete.name}`}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New Product"}
        isSaving={isSaving}
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
          <Input label="Price (₹)" type="number" inputMode="decimal" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
          <Input label="Slug" value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <p className="text-xs text-[var(--text-muted)]">Slug is auto-generated from the name if left empty. Use lowercase letters, numbers, and hyphens only.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-muted)]">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProductFormInput["type"] }))}
                className="admin-input w-full text-sm"
              >
                {PRODUCT_TYPE_REGISTRY.map((t) => (
                  <option key={t.id} value={t.id}>{getProductTypeLabel(t.id)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--text-muted)]">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductFormInput["status"] }))}
                className="admin-input w-full text-sm"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[var(--text-muted)]">How customers buy</label>
            <select
              value={form.commerceMode}
              onChange={(e) => setForm((f) => ({ ...f, commerceMode: e.target.value as ProductFormInput["commerceMode"] }))}
              className="admin-input w-full text-sm"
            >
              <option value="ONLINE">Sell Online — customers pay through your online checkout</option>
              <option value="WHATSAPP">Order on WhatsApp — customers contact you on WhatsApp to place the order</option>
              <option value="BOTH">Online + WhatsApp — customers can either pay online or contact you on WhatsApp</option>
            </select>
          </div>
          <ImageManager
            tenantId={tenantId}
            entityId={editing?.id}
            images={(form.images ?? []).map((url, i) => ({ url, alt: "", order: i }))}
            onChange={(images) => {
              const urls = images.map((img) => img.url);
              setForm((f) => ({
                ...f,
                images: urls,
                imageUrl: urls[0] ?? undefined,
              }));
            }}
          />
          {saveError && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
              {saveError}{" "}
              <a href="/admin/payments" className="font-semibold text-cyan-300 underline">Set up payments</a>
            </div>
          )}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={isSaving || !form.name}
              className="btn-primary flex-1 text-sm"
            >
              {isSaving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </EditDrawer>
    </FeaturePage>
  );
}
