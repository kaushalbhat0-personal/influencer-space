"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { CrudTable } from "@/features/_shared/components/crud-table";
import { EditDrawer } from "@/features/_shared/components/edit-drawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
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

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
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
        return <span className="text-xs text-zinc-400">{getProductTypeLabel(d.type)}</span>;
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
            <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200" aria-label={`Edit ${d.name}`}>
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => handleDelete(d.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Delete ${d.name}`}>
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
      <CrudTable
        columns={columns}
        data={products as unknown as Record<string, unknown>[]}
        keyExtractor={(p) => (p as unknown as ProductData).id}
        searchable
        searchKeys={["name", "type", "status"]}
        emptyMessage="No products yet. Create your first product."
      />

      <EditDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit ${editing.name}` : "New Product"}
        isSaving={isSaving}
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} />
          <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
          <Input label="Slug" value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400">Type</label>
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
              <label className="block text-xs font-medium text-zinc-400">Status</label>
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
            <label className="block text-xs font-medium text-zinc-400">How customers buy</label>
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
